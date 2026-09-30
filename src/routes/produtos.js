import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, AppError, escapeLike } from '../utils/http.js';
import { paginationMeta, parsePagination } from '../utils/pagination.js';

const idSchema = z.string().regex(/^PROD\d{3,}$/, 'ID deve seguir o formato PROD001');
const createSchema = z.object({
  nome: z.string().trim().min(2).max(200),
  categoria: z.string().trim().min(2).max(120),
  precoUnitario: z.coerce.number().finite().nonnegative().max(9_999_999_999.99),
  estoque: z.coerce.number().int().nonnegative(),
  status: z.enum(['Ativo', 'Inativo']).default('Ativo')
}).strict();

export function produtosRouter(pool) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit } = parsePagination(req.query);
    const filters = z.object({ nome: z.string().trim().max(200).optional(), categoria: z.string().trim().max(120).optional() }).parse(req.query);
    const values = [];
    const where = [];
    for (const [column, value] of [['nome', filters.nome], ['categoria', filters.categoria]]) {
      if (value) {
        values.push(`%${escapeLike(value)}%`);
        where.push(`${column} ILIKE $${values.length} ESCAPE '\\'`);
      }
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM produtos ${clause}`, values);
    values.push(limit, (page - 1) * limit);
    const result = await pool.query(
      `SELECT id, nome, categoria, preco_unitario AS "precoUnitario", estoque, status
       FROM produtos ${clause}
       ORDER BY id LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    res.json({ dados: result.rows, paginacao: paginationMeta(page, limit, countResult.rows[0].total) });
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const result = await pool.query(
      `SELECT id, nome, categoria, preco_unitario AS "precoUnitario", estoque, status
       FROM produtos WHERE id = $1`, [id]
    );
    if (!result.rowCount) throw new AppError(404, 'Produto não encontrado');
    res.json(result.rows[0]);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const seq = await pool.query("SELECT nextval('produto_id_seq') AS value");
    const id = `PROD${String(seq.rows[0].value).padStart(3, '0')}`;
    const result = await pool.query(
      `INSERT INTO produtos (id, nome, categoria, preco_unitario, estoque, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, categoria, preco_unitario AS "precoUnitario", estoque, status`,
      [id, input.nome, input.categoria, input.precoUnitario.toFixed(2), input.estoque, input.status]
    );
    res.status(201).json(result.rows[0]);
  }));

  return router;
}
