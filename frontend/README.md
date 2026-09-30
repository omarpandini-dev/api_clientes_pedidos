# Gestão Fácil — frontend React

Interface React/Vite baseada no `template.png`. Consome diretamente os endpoints do backend e inclui:

- dashboard com indicadores, gráfico anual e pedidos recentes;
- clientes: paginação, filtros e cadastro;
- produtos: paginação, filtros, estoque e cadastro;
- pedidos: filtros, paginação e criação com seleção de cliente/produto;
- layout responsivo para desktop, tablet e celular.

## Desenvolvimento

Copie `.env.example` para `.env` e defina a mesma chave configurada no backend:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_API_KEY=SUA_CHAVE_COM_PELO_MENOS_32_CARACTERES
```

Execute:

```bash
npm install
npm run dev
```

Abra `http://localhost:8080`. O backend deve permitir essa origem em `CORS_ORIGINS`.

## Build

```bash
npm run build
npm run preview
```

O resultado estático será gravado em `dist/`.

## Easypanel

Crie um segundo serviço **App** apontando o Build Path para `/frontend` e use o `Dockerfile` dessa pasta. Configure os argumentos/variáveis de build:

```env
VITE_API_BASE_URL=https://api.seu-dominio.com
VITE_API_KEY=A_MESMA_CHAVE_CONFIGURADA_NO_BACKEND
```

Configure o domínio do frontend para a porta interna `80`. No serviço do backend, configure a origem exata:

```env
CORS_ORIGINS=https://app.seu-dominio.com
```

Depois faça novo deploy dos dois serviços.

## Segurança

Variáveis `VITE_*` são incorporadas ao JavaScript enviado ao navegador. Portanto, `VITE_API_KEY` não é um segredo real. Essa chave bloqueia chamadas casuais, mas qualquer usuário do site pode recuperá-la. Antes de disponibilizar o sistema publicamente, implemente login de usuários e tokens de curta duração no backend.
