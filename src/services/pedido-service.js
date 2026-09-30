import Decimal from 'decimal.js';
import { AppError } from '../utils/http.js';

export async function criarPedido(pool, input) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const clienteResult = await client.query(
      'SELECT id FROM clientes WHERE id = $1',
      [input.clienteId]
    );
    if (clienteResult.rowCount === 0) {
      throw new AppError(400, `Cliente ${input.clienteId} não encontrado`);
    }

    const produtoResult = await client.query(
      `SELECT id, nome, preco_unitario, estoque, status
       FROM produtos
       WHERE id = $1
       FOR UPDATE`,
      [input.produtoId]
    );
    if (produtoResult.rowCount === 0) {
      throw new AppError(400, `Produto ${input.produtoId} não encontrado`);
    }

    const produto = produtoResult.rows[0];
    if (produto.status.toLowerCase() !== 'ativo') {
      throw new AppError(409, `Produto ${input.produtoId} não está ativo`);
    }
    if (produto.estoque < input.quantidade) {
      throw new AppError(409, `Estoque insuficiente: disponível ${produto.estoque}`);
    }

    const precoUnitario = new Decimal(produto.preco_unitario).toFixed(2);
    const valorTotal = new Decimal(precoUnitario).times(input.quantidade).toFixed(2);
    const sequenceResult = await client.query("SELECT nextval('pedido_id_seq') AS value");
    const id = `PED${String(sequenceResult.rows[0].value).padStart(5, '0')}`;

    await client.query(
      `UPDATE produtos
       SET estoque = estoque - $1, atualizado_em = NOW()
       WHERE id = $2`,
      [input.quantidade, input.produtoId]
    );

    await client.query(
      `INSERT INTO pedidos
        (id, data_pedido, cliente_id, produto_id, quantidade, preco_unitario,
         valor_total, forma_pagamento, status)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, 'Processando')`,
      [id, input.clienteId, input.produtoId, input.quantidade, precoUnitario,
        valorTotal, input.formaPagamento]
    );

    await client.query('COMMIT');
    return { id, precoUnitario, valorTotal };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Mantém o erro original.
    }
    throw error;
  } finally {
    client.release();
  }
}
