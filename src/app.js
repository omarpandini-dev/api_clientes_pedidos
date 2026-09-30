import express from 'express';
import { clientesRouter } from './routes/clientes.js';
import { produtosRouter } from './routes/produtos.js';
import { pedidosRouter } from './routes/pedidos.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { apiKeyAuth } from './middleware/api-key-auth.js';
import { cors } from './middleware/cors.js';

export function createApp(pool, apiKey, corsOrigins) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors(corsOrigins));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', banco: 'conectado' });
    } catch {
      res.status(503).json({ status: 'erro', banco: 'indisponível' });
    }
  });
  app.use('/api', apiKeyAuth(apiKey));
  app.use('/api/clientes', clientesRouter(pool));
  app.use('/api/produtos', produtosRouter(pool));
  app.use('/api/pedidos', pedidosRouter(pool));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
