import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, AppError, escapeLike } from '../utils/http.js';
import { paginationMeta, parsePagination } from '../utils/pagination.js';

const idSchema = z.string().regex(/^CLI\d{4,}$/, 'ID deve seguir o formato CLI0001');
const createSchema = z.object({
  nome: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(254),
  telefone: z.string().trim().min(5).max(40),
  cidade: z.string().trim().min(2).max(120),
  uf: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  segmento: z.string().trim().min(2).max(100),
  dataCadastro: z.string().date().optional()
}).strict();

export function clientesRouter(pool) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const { page, limit } = parsePagination(req.query);
    const filters = z.object({ nome: z.string().trim().max(200).optional(), cidade: z.string().trim().max(120).optional() }).parse(req.query);
    const values = [];
    const where = [];
    if (filters.nome) {
      values.push(`%${escapeLike(filters.nome)}%`);
      where.push(`nome ILIKE $${values.length} ESCAPE '\\'`);
    }
    if (filters.cidade) {
      values.push(`%${escapeLike(filters.cidade)}%`);
      where.push(`cidade ILIKE $${values.length} ESCAPE '\\'`);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM clientes ${clause}`, values);
    values.push(limit, (page - 1) * limit);
    const result = await pool.query(
      `SELECT id, nome, email, telefone, cidade, uf, segmento,
              data_cadastro AS "dataCadastro"
       FROM clientes ${clause}
       ORDER BY id LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    const total = countResult.rows[0].total;
    res.json({ dados: result.rows, paginacao: paginationMeta(page, limit, total) });
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const result = await pool.query(
      `SELECT id, nome, email, telefone, cidade, uf, segmento,
              data_cadastro AS "dataCadastro"
       FROM clientes WHERE id = $1`, [id]
    );
    if (!result.rowCount) throw new AppError(404, 'Cliente não encontrado');
    res.json(result.rows[0]);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const seq = await pool.query("SELECT nextval('cliente_id_seq') AS value");
    const id = `CLI${String(seq.rows[0].value).padStart(4, '0')}`;
    const result = await pool.query(
      `INSERT INTO clientes (id, nome, email, telefone, cidade, uf, segmento, data_cadastro)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, CURRENT_DATE))
       RETURNING id, nome, email, telefone, cidade, uf, segmento,
                 data_cadastro AS "dataCadastro"`,
      [id, input.nome, input.email, input.telefone, input.cidade, input.uf,
        input.segmento, input.dataCadastro || null]
    );
    res.status(201).json(result.rows[0]);
  }));

  return router;
}
