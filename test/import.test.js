import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { persistWorkbookData, readWorkbook } from '../scripts/import-lib.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workbookPath = path.join(root, 'dados', 'Base_Ficticia_Clientes_Produtos_Pedidos.xlsx');

function fakeDatabase() {
  const tables = { clientes: new Set(), produtos: new Set(), pedidos: new Set() };
  return {
    tables,
    client: {
      async query(sql, params = []) {
        const match = sql.match(/INSERT INTO\s+(clientes|produtos|pedidos)/i);
        if (!match) return { rowCount: 0, rows: [] };
        const table = match[1].toLowerCase();
        const id = params[0];
        if (tables[table].has(id)) return { rowCount: 0, rows: [] };
        tables[table].add(id);
        return { rowCount: 1, rows: [] };
      }
    }
  };
}

test('lê a planilha real, valida contagens e deriva dados sem resultados de fórmulas', () => {
  const data = readWorkbook(workbookPath);
  assert.equal(data.clientes.length, 100);
  assert.equal(data.produtos.length, 10);
  assert.equal(data.pedidos.length, 500);
  const pedido = data.pedidos[0];
  const produto = data.produtos.find((item) => item.id === pedido.produtoId);
  assert.equal(pedido.precoUnitario, produto.precoUnitario);
  assert.equal(Number(pedido.valorTotal), Number(produto.precoUnitario) * pedido.quantidade);
});

test('a carga é idempotente: segunda execução ignora todos os registros', async () => {
  const data = readWorkbook(workbookPath);
  const db = fakeDatabase();
  const first = await persistWorkbookData(db.client, data);
  const second = await persistWorkbookData(db.client, data);

  assert.deepEqual(first, {
    clientes: { importados: 100, ignorados: 0 },
    produtos: { importados: 10, ignorados: 0 },
    pedidos: { importados: 500, ignorados: 0 }
  });
  assert.deepEqual(second, {
    clientes: { importados: 0, ignorados: 100 },
    produtos: { importados: 0, ignorados: 10 },
    pedidos: { importados: 0, ignorados: 500 }
  });
});
