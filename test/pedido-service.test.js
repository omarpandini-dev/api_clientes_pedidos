import test from 'node:test';
import assert from 'node:assert/strict';
import { criarPedido } from '../src/services/pedido-service.js';

function makePool({ clienteExiste = true, produto = { id: 'PROD001', nome: 'Caderno', preco_unitario: '24.90', estoque: 10, status: 'Ativo' } } = {}) {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      calls.push({ sql: normalized, params });
      if (normalized.startsWith('SELECT id FROM clientes')) {
        return { rowCount: clienteExiste ? 1 : 0, rows: clienteExiste ? [{ id: 'CLI0001' }] : [] };
      }
      if (normalized.includes('FROM produtos') && normalized.includes('FOR UPDATE')) {
        return { rowCount: produto ? 1 : 0, rows: produto ? [produto] : [] };
      }
      if (normalized.startsWith("SELECT nextval('pedido_id_seq')")) {
        return { rowCount: 1, rows: [{ value: '100000' }] };
      }
      return { rowCount: 1, rows: [] };
    },
    release() { calls.push({ sql: 'RELEASE', params: [] }); }
  };
  return { pool: { async connect() { return client; } }, calls };
}

const input = {
  clienteId: 'CLI0001',
  produtoId: 'PROD001',
  quantidade: 3,
  formaPagamento: 'Pix'
};

test('cria pedido, calcula total no servidor e atualiza estoque na mesma transação', async () => {
  const { pool, calls } = makePool();
  const result = await criarPedido(pool, input);

  assert.deepEqual(result, { id: 'PED100000', precoUnitario: '24.90', valorTotal: '74.70' });
  assert.ok(calls.some((call) => call.sql === 'BEGIN'));
  assert.ok(calls.some((call) => call.sql.includes('FOR UPDATE')));
  assert.ok(calls.some((call) => call.sql.startsWith('UPDATE produtos') && call.params[0] === 3));
  const insert = calls.find((call) => call.sql.startsWith('INSERT INTO pedidos'));
  assert.deepEqual(insert.params, ['PED100000', 'CLI0001', 'PROD001', 3, '24.90', '74.70', 'Pix']);
  assert.ok(calls.some((call) => call.sql === 'COMMIT'));
});

test('recusa cliente inexistente e desfaz a transação', async () => {
  const { pool, calls } = makePool({ clienteExiste: false });
  await assert.rejects(() => criarPedido(pool, input), /Cliente CLI0001 não encontrado/);
  assert.ok(calls.some((call) => call.sql === 'ROLLBACK'));
  assert.ok(!calls.some((call) => call.sql.startsWith('UPDATE produtos')));
});

test('recusa produto inexistente', async () => {
  const { pool } = makePool({ produto: null });
  await assert.rejects(() => criarPedido(pool, input), /Produto PROD001 não encontrado/);
});

test('recusa quantidade maior que o estoque sem alterar o produto', async () => {
  const { pool, calls } = makePool({
    produto: { id: 'PROD001', nome: 'Caderno', preco_unitario: '24.90', estoque: 2, status: 'Ativo' }
  });
  await assert.rejects(() => criarPedido(pool, input), /Estoque insuficiente: disponível 2/);
  assert.ok(calls.some((call) => call.sql === 'ROLLBACK'));
  assert.ok(!calls.some((call) => call.sql.startsWith('UPDATE produtos')));
});

test('recusa produto inativo', async () => {
  const { pool } = makePool({
    produto: { id: 'PROD001', nome: 'Caderno', preco_unitario: '24.90', estoque: 10, status: 'Inativo' }
  });
  await assert.rejects(() => criarPedido(pool, input), /não está ativo/);
});
