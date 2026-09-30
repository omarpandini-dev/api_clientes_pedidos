import path from 'node:path';
import { getEnv } from '../src/config/env.js';
import { getPool, closePool } from '../src/db/pool.js';
import { persistWorkbookData, readWorkbook } from './import-lib.js';

const env = getEnv();
const filePath = path.resolve(env.XLSX_PATH);
const data = readWorkbook(filePath);
console.log(`Planilha validada: ${data.clientes.length} clientes, ${data.produtos.length} produtos, ${data.pedidos.length} pedidos.`);

const pool = getPool();
const client = await pool.connect();
try {
  const counts = await persistWorkbookData(client, data);
  for (const [name, count] of Object.entries(counts)) {
    console.log(`${name}: ${count.importados} importados, ${count.ignorados} ignorados`);
  }
  console.log('Importação concluída. O estoque inicial dos produtos não foi alterado pelos pedidos históricos.');
} finally {
  client.release();
  await closePool();
}
