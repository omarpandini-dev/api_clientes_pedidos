import { ZodError } from 'zod';

export function notFoundHandler(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      detalhes: error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensagem: issue.message
      }))
    });
  }

  if (error.code === '23505') {
    return res.status(409).json({ erro: 'Já existe um registro com estes dados' });
  }

  if (error.code === '23503') {
    return res.status(400).json({ erro: 'Referência relacionada inválida' });
  }

  const status = error.status || 500;
  const body = { erro: status === 500 ? 'Erro interno do servidor' : error.message };
  if (error.details) body.detalhes = error.details;
  if (status === 500 && process.env.NODE_ENV !== 'test') console.error(error);
  return res.status(status).json(body);
}
