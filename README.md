# MyGameList Web

Front-end do MyGameList, construído com Vue, TypeScript, Vite e Pinia.

## Stack completo com Docker

Quando `MyGameListWeb` e `MyGameListApi` estiverem lado a lado dentro da pasta
`MyGameList`, o Compose da pasta compartilhada inicia o front-end, a API e o PostgreSQL:

```bash
cd ..
docker compose up --build -d
```

Depois, abra `http://localhost:5174`. Use `docker compose logs -f` para acompanhar os
serviços e `docker compose down` para encerrá-los sem apagar os dados do banco. Após uma
alteração no código, execute novamente `docker compose up --build -d` para reconstruir as
imagens.

## Pré-requisitos

- Node.js 22.18 ou 24.12+
- API do MyGameList em execução em `http://localhost:8080`

## Executar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. Para apontar o front-end para outra API, defina a variável
`VITE_API_BASE_URL` antes de iniciar o Vite:

```bash
VITE_API_BASE_URL=https://api.example.com npm run dev
```

## Autenticação

O cliente envia o cookie de sessão com `credentials: "include"`. Antes de requisições que
alteram dados, ele obtém o token CSRF da API e envia o valor do cookie `XSRF-TOKEN` no
cabeçalho `X-XSRF-TOKEN`. A sessão permanece no cookie `HttpOnly` criado pelo back-end e
não é armazenada no `localStorage`.

## Verificação

```bash
npm run lint
npm run build
npm run test:unit -- --run
npm run test:e2e -- --project=chromium
```

Os testes unitários usam Vitest. Os testes de interface usam Playwright; na primeira execução,
instale os navegadores com `npx playwright install`.

## Funcionalidades atuais

- cadastro, login, restauração da sessão e logout;
- pesquisa paginada no catálogo de jogos;
- inclusão, edição e remoção de jogos da lista pessoal;
- perfis e listas públicas paginadas de outros usuários.

O catálogo local é temporário. A integração com um provedor externo de jogos será adicionada
em uma etapa futura.

## Licença

Copyright 2026 João Vítor Motta Souto Maior.

Este projeto é licenciado sob a [Apache License 2.0](LICENSE).
Consulte também os avisos de autoria em [NOTICE](NOTICE).
A licença do código não concede direitos sobre capas, marcas ou dados de terceiros.
