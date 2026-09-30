import { createApp } from './app.js';
import { getEnv } from './config/env.js';
import { closePool, getPool } from './db/pool.js';

const env = getEnv();
const app = createApp(getPool());
const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`API escutando em 0.0.0.0:${env.PORT}`);
});

async function shutdown(signal) {
  console.log(`${signal} recebido; encerrando...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
