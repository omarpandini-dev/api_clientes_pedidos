CREATE SEQUENCE IF NOT EXISTS cliente_id_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS produto_id_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS pedido_id_seq START WITH 100000;

CREATE TABLE IF NOT EXISTS clientes (
  id VARCHAR(30) PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  telefone VARCHAR(40) NOT NULL,
  cidade VARCHAR(120) NOT NULL,
  uf CHAR(2) NOT NULL CHECK (uf ~ '^[A-Z]{2}$'),
  segmento VARCHAR(100) NOT NULL,
  data_cadastro DATE NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id ~ '^CLI[0-9]{4,}$')
);

CREATE TABLE IF NOT EXISTS produtos (
  id VARCHAR(30) PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  categoria VARCHAR(120) NOT NULL,
  preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario >= 0),
  estoque INTEGER NOT NULL CHECK (estoque >= 0),
  status VARCHAR(30) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id ~ '^PROD[0-9]{3,}$')
);

CREATE TABLE IF NOT EXISTS pedidos (
  id VARCHAR(30) PRIMARY KEY,
  data_pedido DATE NOT NULL,
  cliente_id VARCHAR(30) NOT NULL REFERENCES clientes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  produto_id VARCHAR(30) NOT NULL REFERENCES produtos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario >= 0),
  valor_total NUMERIC(14,2) NOT NULL CHECK (valor_total >= 0),
  forma_pagamento VARCHAR(80) NOT NULL,
  status VARCHAR(30) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id ~ '^PED[0-9]{5,}$'),
  CHECK (valor_total = ROUND(preco_unitario * quantidade, 2))
);

CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes (LOWER(nome));
CREATE INDEX IF NOT EXISTS idx_clientes_cidade ON clientes (LOWER(cidade));
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos (LOWER(nome));
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos (LOWER(categoria));
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_produto_id ON pedidos (produto_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos (status);
CREATE INDEX IF NOT EXISTS idx_pedidos_data ON pedidos (data_pedido DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_data ON pedidos (cliente_id, data_pedido DESC);
