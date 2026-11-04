# MyGameList Web

Front-end do MyGameList, construído com Vue, TypeScript, Vite e Pinia.

## Ambientes com Docker

O código é o mesmo nos dois ambientes e os arquivos dos dois ambientes devem acompanhar
as branches `dev` e `main`. A diferença fica na configuração e no momento de promover
uma versão validada para `main`.

| Ambiente | Dockerfile | Compose | Comportamento |
| --- | --- | --- | --- |
| Desenvolvimento | `Dockerfile.dev` | `compose.dev.yaml` | Ferramentas de desenvolvimento e código local |
| Produção | `Dockerfile` | `compose.prod.yaml` | Build compilado, sem montagem do código local |

Com os dois repositórios lado a lado na pasta `MyGameList`, execute na pasta compartilhada:

```bash
./start-dev.sh
./seed-dev.sh
```

Acesse `http://localhost:5174`; a API fica em `http://localhost:8080` e o banco em
`localhost:5433`. `./logs-dev.sh` acompanha os logs e `./stop-dev.sh` encerra o ambiente
preservando os dados. `./reset-dev.sh` apaga e recria somente o banco de desenvolvimento.
As portas de desenvolvimento ficam restritas ao computador local.

O Compose da raiz inclui os arquivos de cada repositório, usando Docker Compose 2.20.3+
([documentação de include](https://docs.docker.com/compose/how-tos/multiple-compose-files/include/)).
O `compose.yaml` da raiz continua sendo um atalho para desenvolvimento.

### Produção

Antes de disponibilizar publicamente, revisar as vulnerabilidades de dependências apontadas
pelo `npm audit` durante a instalação. A imagem final contém apenas Nginx e os arquivos
estáticos; isso não dispensa avaliar dependências usadas para gerar o JavaScript.

Na pasta compartilhada, copie `.env.prod.example` para `.env.prod`, preencha uma senha
forte para `DATABASE_PASSWORD` e a origem pública HTTPS em `FRONTEND_ORIGIN` (sem caminho
nem barra final). Nunca publique o arquivo real com credenciais.

```bash
docker compose --env-file .env.prod -f compose.prod.yaml config --quiet
docker compose --env-file .env.prod -f compose.prod.yaml up --build -d --wait
```

Esse ambiente usa o projeto `mygamelist-prod`, com volume separado do desenvolvimento.
O banco e a API não publicam portas; o front atende em `127.0.0.1:8081`, ajustável por
`PROD_WEB_PORT`. É necessário configurar um proxy HTTPS confiável no host para publicar
o domínio, preservar `Host` e sobrescrever `X-Forwarded-Proto` com `https`.

O Nginx do front encaminha `/api` para a API na mesma origem, preservando o caminho.
A imagem de produção usa `VITE_API_BASE_URL` vazio, então o navegador usa URLs relativas.
Isso permite ler o cookie CSRF na origem do front. A API usa o perfil `prod`, cookies de
sessão `Secure` e documentação Swagger desativada. Login por HTTP local não é um teste
válido desse ambiente: os cookies de sessão exigem HTTPS.

A configuração prepara a execução; domínio, certificados, hospedagem e backups ainda
precisam ser definidos antes de disponibilizar o serviço. Não use `down --volumes` em
produção, pois isso apaga o banco. Para encerrar preservando os dados:

```bash
docker compose --env-file .env.prod -f compose.prod.yaml down
```

## Pré-requisitos

- Node.js 22.18 ou 24.12+
- API do MyGameList em execução em `http://localhost:8080`

## Desenvolvimento do front no Docker

Para iniciar somente o front a partir deste repositório (com a API já em execução):

```bash
docker compose -f compose.dev.yaml up --build -d --wait
```

As alterações em `src` e `public` aparecem automaticamente pelo Vite. Mudanças nas
dependências ou na configuração do Vite exigem reconstruir a imagem. O Compose de
produção do front espera um serviço `api:8080` na mesma rede; use o Compose da raiz para
iniciar o conjunto completo.

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
