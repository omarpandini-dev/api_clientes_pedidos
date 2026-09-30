import fs from 'node:fs';
import path from 'node:path';
import Decimal from 'decimal.js';
import XLSX from 'xlsx';

const EXPECTED = { Clientes: 100, Produtos: 10, Pedidos: 500 };

function required(value, label, row) {
  if (value === null || value === undefined || String(value).trim() === '') {
    throw new Error(`${label} ausente na linha ${row}`);
  }
  return String(value).trim();
}

function dateOnly(value, label, row) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} inválida na linha ${row}`);
  return date.toISOString().slice(0, 10);
}

function uniqueById(rows, type) {
  const seen = new Set();
  for (const [index, row] of rows.entries()) {
    if (seen.has(row.id)) throw new Error(`${type}: ID duplicado ${row.id} na linha ${index + 2}`);
    seen.add(row.id);
  }
}

export function readWorkbook(filePath, { enforceExpectedCounts = true } = {}) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new Error(`Planilha não encontrada: ${resolved}`);
  const workbook = XLSX.readFile(resolved, { cellDates: true });
  for (const name of Object.keys(EXPECTED)) {
    if (!workbook.Sheets[name]) throw new Error(`Aba obrigatória ausente: ${name}`);
  }
  const sheetRows = (name) => XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: null, raw: true });
  const rawClientes = sheetRows('Clientes');
  const rawProdutos = sheetRows('Produtos');
  const rawPedidos = sheetRows('Pedidos');
  if (enforceExpectedCounts) {
    for (const [name, rows] of [['Clientes', rawClientes], ['Produtos', rawProdutos], ['Pedidos', rawPedidos]]) {
      if (rows.length !== EXPECTED[name]) throw new Error(`Aba ${name}: esperado ${EXPECTED[name]}, encontrado ${rows.length}`);
    }
  }

  const clientes = rawClientes.map((row, index) => {
    const line = index + 2;
    const id = required(row['ID do Cliente'], 'ID do Cliente', line);
    if (!/^CLI\d{4,}$/.test(id)) throw new Error(`ID de cliente inválido ${id} na linha ${line}`);
    const uf = required(row.UF, 'UF', line).toUpperCase();
    if (!/^[A-Z]{2}$/.test(uf)) throw new Error(`UF inválida na linha ${line}`);
    return {
      id,
      nome: required(row.Nome, 'Nome', line),
      email: required(row['E-mail'], 'E-mail', line),
      telefone: required(row.Telefone, 'Telefone', line),
      cidade: required(row.Cidade, 'Cidade', line),
      uf,
      segmento: required(row.Segmento, 'Segmento', line),
      dataCadastro: dateOnly(row['Data de Cadastro'], 'Data de Cadastro', line)
    };
  });

  const produtos = rawProdutos.map((row, index) => {
    const line = index + 2;
    const id = required(row['ID do Produto'], 'ID do Produto', line);
    if (!/^PROD\d{3,}$/.test(id)) throw new Error(`ID de produto inválido ${id} na linha ${line}`);
    const preco = new Decimal(row['Preço Unitário (R$)']);
    const estoque = Number(row.Estoque);
    if (!preco.isFinite() || preco.isNegative()) throw new Error(`Preço inválido na linha ${line}`);
    if (!Number.isInteger(estoque) || estoque < 0) throw new Error(`Estoque inválido na linha ${line}`);
    return {
      id,
      nome: required(row.Produto, 'Produto', line),
      categoria: required(row.Categoria, 'Categoria', line),
      precoUnitario: preco.toFixed(2),
      estoque,
      status: required(row.Status, 'Status', line)
    };
  });
  uniqueById(clientes, 'Clientes');
  uniqueById(produtos, 'Produtos');
  const clientesById = new Map(clientes.map((item) => [item.id, item]));
  const produtosById = new Map(produtos.map((item) => [item.id, item]));

  const pedidos = rawPedidos.map((row, index) => {
    const line = index + 2;
    const id = required(row['ID do Pedido'], 'ID do Pedido', line);
    if (!/^PED\d{5,}$/.test(id)) throw new Error(`ID de pedido inválido ${id} na linha ${line}`);
    const clienteId = required(row['ID do Cliente'], 'ID do Cliente', line);
    const produtoId = required(row['ID do Produto'], 'ID do Produto', line);
    if (!clientesById.has(clienteId)) throw new Error(`Cliente ${clienteId} não existe (Pedidos linha ${line})`);
    const produto = produtosById.get(produtoId);
    if (!produto) throw new Error(`Produto ${produtoId} não existe (Pedidos linha ${line})`);
    const quantidade = Number(row.Quantidade);
    if (!Number.isInteger(quantidade) || quantidade <= 0) throw new Error(`Quantidade inválida na linha ${line}`);
    const precoUnitario = produto.precoUnitario;
    return {
      id,
      dataPedido: dateOnly(row['Data do Pedido'], 'Data do Pedido', line),
      clienteId,
      produtoId,
      quantidade,
      precoUnitario,
      valorTotal: new Decimal(precoUnitario).times(quantidade).toFixed(2),
      formaPagamento: required(row['Forma de Pagamento'], 'Forma de Pagamento', line),
      status: required(row.Status, 'Status', line)
    };
  });
  uniqueById(pedidos, 'Pedidos');
  return { clientes, produtos, pedidos, filePath: resolved };
}

export async function persistWorkbookData(client, data) {
  const counts = {
    clientes: { importados: 0, ignorados: 0 },
    produtos: { importados: 0, ignorados: 0 },
    pedidos: { importados: 0, ignorados: 0 }
  };
  await client.query('BEGIN');
  try {
    for (const item of data.clientes) {
      const result = await client.query(
        `INSERT INTO clientes (id, nome, email, telefone, cidade, uf, segmento, data_cadastro)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [item.id, item.nome, item.email, item.telefone, item.cidade, item.uf, item.segmento, item.dataCadastro]
      );
      counts.clientes[result.rowCount ? 'importados' : 'ignorados']++;
    }
    for (const item of data.produtos) {
      const result = await client.query(
        `INSERT INTO produtos (id, nome, categoria, preco_unitario, estoque, status)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [item.id, item.nome, item.categoria, item.precoUnitario, item.estoque, item.status]
      );
      counts.produtos[result.rowCount ? 'importados' : 'ignorados']++;
    }
    for (const item of data.pedidos) {
      const result = await client.query(
        `INSERT INTO pedidos (id, data_pedido, cliente_id, produto_id, quantidade,
          preco_unitario, valor_total, forma_pagamento, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [item.id, item.dataPedido, item.clienteId, item.produtoId, item.quantidade,
          item.precoUnitario, item.valorTotal, item.formaPagamento, item.status]
      );
      counts.pedidos[result.rowCount ? 'importados' : 'ignorados']++;
    }
    await client.query('COMMIT');
    return counts;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
