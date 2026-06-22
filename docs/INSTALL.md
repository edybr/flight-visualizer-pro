# Instalação e Execução — Flight Visualizer Pro

Guia para rodar o projeto localmente e prepará-lo para publicação.

## Pré-requisitos

| Ferramenta | Versão recomendada |
| --- | --- |
| Node.js | 22+ |
| pnpm | 10+ |
| MySQL / TiDB | instância acessível via `DATABASE_URL` |

## 1. Clonar e instalar

```bash
git clone <url-do-repositorio>
cd cópia-de-flight-visualizer-pro
pnpm install
```

## 2. Configurar variáveis de ambiente

Crie um arquivo `.env` (não versionado) com as variáveis necessárias. No ambiente Manus
WebDev, a maioria é injetada automaticamente; em execução externa, defina-as manualmente.

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Conexão MySQL/TiDB (`mysql://user:pass@host:port/db`) |
| `JWT_SECRET` | Sim | Segredo para assinar o cookie de sessão |
| `VITE_APP_ID` | Sim | ID da aplicação OAuth |
| `OAUTH_SERVER_URL` | Sim | Base do backend OAuth |
| `VITE_OAUTH_PORTAL_URL` | Sim | Portal de login usado pelo frontend |
| `DJI_API_KEY` | Para DJI TXT | Chave do parser `dji-log-parser-js` |

> Os arquivos `.env*` estão no `.gitignore` e **nunca** devem ser commitados.

## 3. Preparar o banco de dados

```bash
pnpm db:push
```

Esse comando gera as migrações a partir de `drizzle/schema.ts` e as aplica ao banco
configurado em `DATABASE_URL`.

## 4. Rodar em desenvolvimento

```bash
pnpm dev
```

O servidor sobe em `http://localhost:3000` com hot reload do frontend e do backend.

## 5. Build de produção

```bash
pnpm build   # gera o frontend (Vite) e o bundle do servidor (esbuild)
pnpm start   # executa o build em modo produção
```

> **Atenção ao runtime:** o servidor não deve fixar a porta no código; o ambiente de
> deploy define a porta. Evite processos que precisem sobreviver entre requisições.

## 6. Testes e verificação

```bash
pnpm check   # checagem de tipos
pnpm test    # suíte Vitest (54 testes)
```

Execute ambos antes de cada publicação.

## Publicação

No ambiente Manus WebDev, a publicação é feita pelo botão **Publish** da interface, após a
criação de um checkpoint. Cada publicação deve incrementar a `APP_VERSION`
(`client/src/const.ts`) e registrar as mudanças em [`CHANGELOG.md`](CHANGELOG.md).
