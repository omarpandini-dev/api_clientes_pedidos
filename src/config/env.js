import 'dotenv/config';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  DB_SSL: booleanString,
  XLSX_PATH: z.string().default('dados/Base_Ficticia_Clientes_Produtos_Pedidos.xlsx')
});

let cached;

export function getEnv() {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => issue.message).join('; ');
      throw new Error(`Configuração inválida: ${details}`);
    }
    cached = parsed.data;
  }
  return cached;
}
