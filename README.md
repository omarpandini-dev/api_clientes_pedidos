# API de Clientes, Produtos e Pedidos

Backend Node.js/Express com PostgreSQL, importação idempotente de Excel e execução em Docker. A API preserva os IDs da base (`CLI0001`, `PROD001`, `PED00001`) e gera novos IDs em faixas separadas.

## Requisitos e estrutura

- Docker com Compose (recomendado), ou Node.js 20+ e PostgreSQL 16+
- A planilha real em `dados/Base_Ficticia_Clientes_Produtos_Pedidos.xlsx`
- Nenhuma credencial fica no código; a aplicação usa variáveis de ambiente

```text
dados/          planilha de origem
migrations/     esquema e índices PostgreSQL
postman/        coleção importável
scripts/        migrations, validação e importação
src/            API, rotas, banco e regras de negócio
test/           testes automatizados
```

Os pedidos históricos usam o preço do produto da aba `Produtos` no momento da importação. As colunas calculadas por fórmula na aba `Pedidos` não são lidas: cliente, produto e UF vêm das relações; preço e total são derivados dos IDs e da quantidade. O saldo da aba `Produtos` é importado como estoque atual e **não** é descontado pela carga histórica.

## Execução local com Docker

Na raiz do projeto, execute exatamente:

```bash
docker compose up -d --build
docker compose exec api npm run migrate
docker compose exec api npm run import
curl http://localhost:3000/health
```

Resposta esperada do health:

```json
{ "status": "ok", "banco": "conectado" }
```

Para conferir a idempotência, rode novamente `docker compose exec api npm run import`. O resumo deve indicar `0 importados` e 100, 10 e 500 ignorados.

Os testes não precisam de um banco real, pois isolam a transação e simulam persistência para testar a repetição da carga:

```bash
docker compose exec api npm test
```

Para confirmar as quantidades diretamente no PostgreSQL:

```bash
docker compose exec postgres psql -U app -d clientes_pedidos -c "SELECT (SELECT COUNT(*) FROM clientes) AS clientes, (SELECT COUNT(*) FROM produtos) AS produtos, (SELECT COUNT(*) FROM pedidos) AS pedidos;"
```

O resultado esperado é `100 | 10 | 500` logo após a carga inicial. Cadastros feitos depois disso naturalmente aumentam as contagens.

### Execução sem Docker

Crie o banco, copie `.env.example` para `.env`, ajuste `DATABASE_URL` e execute:

```bash
npm install
npm run migrate
npm run validate:data
npm run import
npm test
npm start
```

## Endpoints

Todas as listagens retornam `{ "dados": [...], "paginacao": { "page", "limit", "total", "totalPages" }`. `page` começa em 1, `limit` assume 20 e aceita no máximo 100.

| Método | Rota | Parâmetros/finalidade |
|---|---|---|
| GET | `/health` | Saúde da API e conexão com o banco |
| GET | `/api/clientes` | `page`, `limit`, `nome`, `cidade` |
| GET | `/api/clientes/:id` | Busca pelo ID |
| POST | `/api/clientes` | Cadastra cliente; o ID é gerado pelo servidor |
| GET | `/api/produtos` | `page`, `limit`, `nome`, `categoria` |
| GET | `/api/produtos/:id` | Busca pelo ID |
| POST | `/api/produtos` | Cadastra produto; o ID é gerado pelo servidor |
| GET | `/api/pedidos` | `page`, `limit`, `clienteId`, `produtoId`, `status`, `dataInicio`, `dataFim` (`AAAA-MM-DD`) |
| GET | `/api/pedidos/:id` | Busca pelo ID, incluindo nomes relacionados |
| POST | `/api/pedidos` | Cria pedido e desconta estoque atomicamente |

### Exemplos

Cadastrar cliente (`POST /api/clientes`):

```json
{
  "nome": "Maria Oliveira",
  "email": "maria.oliveira@example.com",
  "telefone": "(11) 99999-9999",
  "cidade": "São Paulo",
  "uf": "SP",
  "segmento": "Tecnologia"
}
```

Resposta `201`:

```json
{
  "id": "CLI1001",
  "nome": "Maria Oliveira",
  "email": "maria.oliveira@example.com",
  "telefone": "(11) 99999-9999",
  "cidade": "São Paulo",
  "uf": "SP",
  "segmento": "Tecnologia",
  "dataCadastro": "2026-09-30"
}
```

Cadastrar produto (`POST /api/produtos`):

```json
{
  "nome": "Mouse sem fio",
  "categoria": "Eletrônicos",
  "precoUnitario": 89.90,
  "estoque": 25,
  "status": "Ativo"
}
```

Gerar pedido (`POST /api/pedidos`):

```json
{
  "clienteId": "CLI0001",
  "produtoId": "PROD001",
  "quantidade": 2,
  "formaPagamento": "Pix"
}
```

Resposta `201` (preço, total e nomes são definidos pelo servidor):

```json
{
  "id": "PED100000",
  "dataPedido": "2026-09-30",
  "clienteId": "CLI0001",
  "clienteNome": "Lucas Lima Garcia",
  "clienteUf": "CE",
  "produtoId": "PROD001",
  "produtoNome": "Caderno Universitário",
  "quantidade": 2,
  "precoUnitario": "24.90",
  "valorTotal": "49.80",
  "formaPagamento": "Pix",
  "status": "Processando"
}
```

Erros de validação retornam `400`, recursos ausentes em consultas retornam `404`, e conflito de estoque ou produto inativo retorna `409`. A criação de pedido bloqueia a linha do produto com `SELECT ... FOR UPDATE`; cálculo, inserção e baixa de estoque ocorrem na mesma transação, evitando sobrevenda concorrente.

## Postman

Importe [postman/API-Clientes-Produtos-Pedidos.postman_collection.json](postman/API-Clientes-Produtos-Pedidos.postman_collection.json). A coleção define `baseUrl` como `http://localhost:3000`; troque pelo domínio HTTPS de produção no Easypanel.

Ordem sugerida:

1. Rode **Health**.
2. Liste e consulte clientes/produtos importados.
3. Cadastre um cliente; o script salva seu ID em `clienteId`.
4. Cadastre um produto; o script salva seu ID em `produtoId`.
5. Crie um pedido e consulte o `pedidoId` salvo automaticamente.
6. Teste erros alterando um ID para inexistente ou usando quantidade superior ao estoque.

## Implantação no Easypanel/Hostinger

1. Envie este repositório para um Git remoto aceito pelo Easypanel ou use a opção **Upload** com um arquivo compactado do projeto.
2. No projeto do Easypanel, crie um serviço **PostgreSQL**. Defina nome do banco, usuário e uma senha forte gerada para produção. Não publique a porta do banco na internet.
3. Copie a URL de conexão interna fornecida pelo serviço PostgreSQL.
4. Crie um serviço **App**, selecione a origem, use `/` como Build Path e construção por `Dockerfile` (o Easypanel também o detecta quando está na raiz).
5. Configure a porta interna `3000` e um domínio com HTTPS.
6. Configure as variáveis:

```text
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://USUARIO:SENHA@HOST_INTERNO:5432/NOME_DO_BANCO
DB_SSL=false
XLSX_PATH=dados/Base_Ficticia_Clientes_Produtos_Pedidos.xlsx
```

Use `DB_SSL=true` somente se a conexão fornecida exigir TLS. Não copie os valores de exemplo como credenciais reais.

7. Faça o deploy. O container escuta em `0.0.0.0:$PORT`.
8. Abra o terminal do serviço da aplicação no Easypanel e execute, nesta ordem:

```bash
npm run migrate
npm run import
```

9. Confirme no log da importação as contagens 100/10/500. Reexecutar o importador é seguro e deve ignorar os IDs existentes.
10. Verifique `https://SEU-DOMINIO/health`. O retorno esperado é HTTP 200 com `{"status":"ok","banco":"conectado"}`.

Antes de cada nova versão, execute `npm test`. Em implantações futuras, rode `npm run migrate` antes de liberar tráfego; o executor registra migrations aplicadas e ignora as anteriores.

Referências oficiais: [App Service](https://easypanel.io/docs/services/app), [Postgres Service](https://easypanel.io/docs/services/postgres) e [Builders/Dockerfile](https://easypanel.io/docs/builders).
