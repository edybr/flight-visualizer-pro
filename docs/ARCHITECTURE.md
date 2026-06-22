# Arquitetura — Flight Visualizer Pro

Este documento descreve a arquitetura técnica da aplicação, o fluxo de dados e as
principais decisões de projeto.

## Visão de alto nível

A aplicação é um monólito Node.js que serve o frontend (build estático do Vite) e a API
no mesmo processo. A comunicação cliente-servidor usa **tRPC**, garantindo contratos
tipados de ponta a ponta sem necessidade de manter schemas REST manuais.

```
┌─────────────────────────────────────────────────────────────┐
│ Navegador                                                     │
│  React 19 + Vite + Tailwind                                   │
│  tRPC client  ──────────────┐                                 │
│  Geração de PDF (jsPDF)      │                                 │
└──────────────────────────────┼────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Express (single Node process)                                 │
│  /api/oauth/callback  → fluxo OAuth Google → cookie de sessão │
│  /api/trpc/*          → procedures tipadas                    │
│  estáticos do build do frontend                               │
└──────────────────────────────┬────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ tRPC routers (server/routers.ts)                              │
│  auth · flights · actualFlights · notes                       │
└──────────────────────────────┬────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Helpers de banco (server/db.ts) → Drizzle ORM → MySQL/TiDB    │
└─────────────────────────────────────────────────────────────┘
```

## Camadas e responsabilidades

### Frontend (`client/`)
- **Páginas** (`client/src/pages/`): Home, Dashboard, ActualFlights, ActualFlightDetail,
  FlightDetail, SharedFlight, SharedActualFlight, NotFound.
- **Componentes** (`client/src/components/`): mapas (FlightMap, TrajectoryMap, Map),
  layout (DashboardLayout, SiteFooter) e biblioteca UI (`ui/`, shadcn/ui).
- **Utilitários** (`client/src/lib/`): funções puras e testáveis —
  `telemetry.ts` (estatísticas, amostragem e formatação), `telemetryPdf.ts` (geração do
  relatório) e `playback.ts` (lógica do playback temporal).
- A geração de PDF é feita **no navegador** com jsPDF + jspdf-autotable, evitando
  qualquer carga no servidor (compatível com o runtime serverless).

### Backend (`server/`)
- **`routers.ts`**: define as procedures tRPC, separadas por domínio. Procedures de leitura
  e escrita protegidas usam `protectedProcedure`; acesso público (compartilhamento) usa
  `publicProcedure`.
- **`db.ts`**: helpers de consulta sobre Drizzle, retornando linhas cruas.
- **`sarpas.ts`**: validação estrita e parsing de arquivos SARPAS.
- **`djiLog.ts`**: parsers de DJI Fly TXT, CSV (Phantom Help/Airdata) e KML, com detecção
  heurística de conteúdo binário vs. texto e normalização de unidades.
- **`storage.ts`**: helpers de armazenamento em S3 para arquivos grandes.
- **`_core/`**: infraestrutura do framework (contexto tRPC, OAuth, bridge com o Vite). Não
  deve ser editada sem necessidade.

### Banco de dados (`drizzle/`)
Schema-first: o arquivo `schema.ts` é a fonte da verdade. Alterações seguem o ciclo
**editar schema → `pnpm db:push` → verificar**. As migrações ficam em `drizzle/migrations/`.

## Modelo de dados

```
users (1) ──< (N) flights ──< (N) notes
users (1) ──< (N) actual_flights
```

| Tabela | Campos-chave | Observações |
| --- | --- | --- |
| `users` | `openId` (único) | Identidade OAuth; campo `role` (user/admin) |
| `flights` | `(userId, protocol)` único | Voos SARPAS; `requestedArea`, `aircrafts` etc. em JSON; `shareToken` |
| `notes` | `flightId` | Anotações por voo |
| `actual_flights` | `userId`, `flightDate` | Voo realizado; `trajectory` em JSON (até milhares de pontos); `shareToken` |

A `trajectory` em `actual_flights` é um array JSON de pontos cronológicos contendo, quando
disponíveis, os campos: `t`, `lat`, `lng`, `alt`, `altMsl`, `speed`, `vSpeed`, `vps`,
`battery`, `voltage`, `batTemp`, `gpsNum`, `rcUp`, `rcDown`, `heading`. Estatísticas
agregadas (duração, distância, altitude e velocidade máximas) são pré-calculadas na
importação para evitar recomputo a cada acesso.

## Autenticação

- O login redireciona ao portal OAuth com `provider=google` (ver `client/src/const.ts`).
- O callback `/api/oauth/callback` valida o código, faz upsert do usuário e grava um cookie
  de sessão assinado com `JWT_SECRET`.
- Cada requisição a `/api/trpc` reconstrói o contexto e disponibiliza `ctx.user`.

## Geração de PDF

O relatório de telemetria é montado no cliente em três blocos: cabeçalho com metadados,
resumo do voo, estatísticas mín/máx/média calculadas sobre **todos** os pontos, e uma tabela
ponto a ponto com **amostragem inteligente** (limite de ~600 linhas, sempre preservando o
primeiro e o último ponto). As colunas são dinâmicas — apenas os campos de telemetria
efetivamente presentes na trajetória são exibidos. O rodapé inclui o crédito de autoria e a
informação de doação via Pix em todas as páginas.

## Restrições de runtime

A aplicação roda como um único processo Node em ambiente serverless (Autoscale):
sem processos persistentes, sem dependências não-Node e com limite de tempo por requisição.
Operações pesadas (como a montagem do PDF) são feitas no cliente justamente para respeitar
essas restrições.
