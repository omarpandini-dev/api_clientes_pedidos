import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, AppError } from '../utils/http.js';
import { paginationMeta, parsePagination } from '../utils/pagination.js';
import { criarPedido } from '../services/pedido-service.js';

const idSchema = z.string().regex(/^PED\d{5,}$/, 'ID deve seguir o formato PED00001');
const createSchema = z.object({
  clienteId: z.string().regex(/^CLI\d{4,}$/),
  produtoId: z.string().regex(/^PROD\d{3,}$/),
  quantidade: z.coerce.number().int().positive(),
  formaPagamento: z.string().trim().min(2).max(80)
}).strict();

const select = `
  SELECT p.id, p.data_pedido AS "dataPedido", p.cliente_id AS "clienteId",
         c.nome AS "clienteNome", c.uf AS "clienteUf",
         p.produto_id AS "produtoId", pr.nome AS "produtoNome",
         p.quantidade, p.preco_unitario AS "precoUnitario",
         p.valor_total AS "valorTotal", p.forma_pagamento AS "formaPagamento",
         p.status
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id
  JOIN produtos pr ON pr.id = p.produto_id`;

export function pedidosRouter(pool) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit } = parsePagination(req.query);
    const filters = z.object({
      clienteId: z.string().regex(/^CLI\d{4,}$/).optional(),
      produtoId: z.string().regex(/^PROD\d{3,}$/).optional(),
      status: z.string().trim().max(30).optional(),
      dataInicio: z.string().date().optional(),
      dataFim: z.string().date().optional()
    }).refine((data) => !data.dataInicio || !data.dataFim || data.dataInicio <= data.dataFim, {
      message: 'dataInicio não pode ser posterior a dataFim', path: ['dataInicio']
    }).parse(req.query);

    const values = [];
    const where = [];
    const add = (sql, value) => { values.push(value); where.push(`${sql} $${values.length}`); };
    if (filters.clienteId) add('p.cliente_id =', filters.clienteId);
    if (filters.produtoId) add('p.produto_id =', filters.produtoId);
    if (filters.status) {
      values.push(filters.status);
      where.push(`LOWER(p.status) = LOWER($${values.length})`);
    }
    if (filters.dataInicio) add('p.data_pedido >=', filters.dataInicio);
    if (filters.dataFim) add('p.data_pedido <=', filters.dataFim);
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM pedidos p ${clause}`, values);
    values.push(limit, (page - 1) * limit);
    const result = await pool.query(
      `${select} ${clause}
       ORDER BY p.data_pedido DESC, p.id DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    res.json({ dados: result.rows, paginacao: paginationMeta(page, limit, countResult.rows[0].total) });
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const result = await pool.query(`${select} WHERE p.id = $1`, [id]);
    if (!result.rowCount) throw new AppError(404, 'Pedido não encontrado');
    res.json(result.rows[0]);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const created = await criarPedido(pool, input);
    const result = await pool.query(`${select} WHERE p.id = $1`, [created.id]);
    res.status(201).json(result.rows[0]);
  }));

  return router;
}
