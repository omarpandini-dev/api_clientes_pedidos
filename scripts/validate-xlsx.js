import path from 'node:path';
import 'dotenv/config';
import { readWorkbook } from './import-lib.js';

const filePath = path.resolve(process.env.XLSX_PATH || 'dados/Base_Ficticia_Clientes_Produtos_Pedidos.xlsx');
const data = readWorkbook(filePath);
console.log(JSON.stringify({
  arquivo: data.filePath,
  clientes: data.clientes.length,
  produtos: data.produtos.length,
  pedidos: data.pedidos.length,
  referenciasValidas: true,
  formulasIgnoradas: true
}, null, 2));
