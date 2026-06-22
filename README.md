# Flight Visualizer Pro

Aplicação web para **visualização e gerenciamento de voos de drone**. O sistema importa
autorizações de voo no formato **SARPAS** (JSON) e logs de voos realmente executados
(DJI Fly TXT, CSV de Phantom Help/Airdata e KML do DJI Flight Reader), exibindo a área e a
trajetória em mapas interativos, com filtros, anotações, compartilhamento público,
playback temporal da telemetria e exportação de relatório em **PDF**.

> Versão atual: **v2.0** — plataforma SaaS multiusuário com painel administrativo (Usuários, Voos, Leads e Receita), filtro global de período e base de planos.
> O histórico completo de versões está em [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

---

## Sumário

- [Visão geral](#visão-geral)
- [Stack tecnológica](#stack-tecnológica)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e execução local](#instalação-e-execução-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados](#banco-de-dados)
- [Testes](#testes)
- [Documentação adicional](#documentação-adicional)
- [Roadmap](#roadmap)
- [Créditos](#créditos)

---

## Visão geral

O Flight Visualizer Pro foi pensado para operadores de drone que precisam organizar tanto
as **autorizações de voo (SARPAS)** quanto os **registros de voos efetivamente realizados**.
A aplicação distingue dois domínios:

| Domínio | Origem dos dados | O que visualiza |
| --- | --- | --- |
| **Voos Autorizados** | Arquivo JSON SARPAS | Polígono da área autorizada, pontos de decolagem/pouso, dados da operação |
| **Voos Realizados** | DJI Fly TXT, CSV (Phantom Help/Airdata), KML | Trajetória real, telemetria ponto a ponto, estatísticas e playback |

Ambos os domínios suportam anotações, compartilhamento por link público (sem login),
impressão otimizada e, no caso dos voos realizados, exportação da telemetria em PDF.

---

## Stack tecnológica

| Camada | Tecnologia |
| --- | --- |
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS 4 |
| UI | shadcn/ui + Lucide Icons + tipografia Inter / Cormorant Garamond |
| Mapas | Leaflet + OpenStreetMap (camadas padrão, satélite e satélite + rótulos) |
| Backend | Node.js + Express 4 + tRPC 11 (contratos tipados ponta a ponta) |
| ORM | Drizzle ORM |
| Banco | MySQL / TiDB |
| Autenticação | OAuth (provider Google) |
| Geração de PDF | jsPDF + jspdf-autotable (no navegador) |
| Parser DJI TXT | `dji-log-parser-js` |
| Testes | Vitest |

> **Nota sobre as preferências de stack do usuário.** As instruções de preferência citam
> Next.js, NestJS, PostgreSQL, Auth0, Redis e Asaas. Este projeto foi originalmente
> construído sobre o template Manus WebDev (React + tRPC + Express + Drizzle + MySQL), que
> difere dessas escolhas. A documentação descreve fielmente o que está implementado hoje;
> uma eventual migração de stack pode ser planejada como evolução futura.

---

## Funcionalidades

### Autenticação
- Login via OAuth com provider Google, sessão persistida em cookie e logout.

### Voos Autorizados (SARPAS)
- Importação de arquivo `.json` com validação estrita do schema SARPAS.
- Persistência idempotente por `(userId, protocolo)`.
- Listagem com filtros por intervalo de data, texto livre (local/operação) e status.
- Mapa interativo com polígono GeoJSON da área, pontos de decolagem e pouso e popups.
- Página de detalhe com status, tipo de operação, responsável, operador, pilotos e aeronaves.

### Voos Realizados (DJI / CSV / KML)
- Importação de DJI Fly TXT (`FlightRecord_*.txt`), CSV (Phantom Help/Airdata) e KML.
- Detecção automática de binário vs. texto, com envio em base64 quando necessário.
- Trajetória completa com estatísticas pré-calculadas (duração, distância, altitude e velocidade máximas).
- Mapa de trajetória (polyline com halo) e **playback temporal** com slider, play/pause/reset e velocidade ajustável.
- Painel de telemetria sincronizado ao playback: altitude, velocidade, bateria, tensão, temperatura, satélites GPS e sinal RC.
- **Exportação de telemetria em PDF** com cabeçalho, resumo, estatísticas (mín/máx/média) e tabela ponto a ponto com amostragem inteligente.

### Recursos comuns
- Anotações por voo (criar, editar, excluir, listar) com confirmação de exclusão.
- Compartilhamento público por token (`/share/:token` e `/share-actual/:token`), acessível sem login.
- Impressão com CSS otimizado.
- Crédito de autoria e seção de doação via Pix no rodapé.

### Plataforma SaaS e painel administrativo (v2.0)
- **Painel administrativo** (`/admin`) restrito a administradores, com layout dedicado e guarda de acesso por `role`.
- **Dashboard de indicadores** em quatro blocos — Usuários, Voos, Leads e Receita (estrutura) — com cartões e gráficos.
- **Filtro global de período** (hoje, ontem, últimos 7/30/90 dias, este mês, mês anterior, este ano e personalizado), atualizando todos os indicadores automaticamente.
- **Páginas administrativas** de Usuários, Voos recentes, Leads/CRM (com alteração de status), Receita e Planos.
- **Página pública de Planos** (`/planos`) e **formulário de captura de leads** que alimenta as métricas.
- **Base de planos pagos** (tabelas `plans` e `subscriptions`) preparada para monetização futura, sem cobrança real ativada.
- **SEO** (títulos/meta dinâmicos, Open Graph, canonical, `robots.txt`, `sitemap.xml`, `noindex` em áreas privadas) e **base de i18n** (pt-BR).

O detalhamento por versão está em [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

---

## Arquitetura

A aplicação roda como um único processo Node.js. O Express serve tanto o build do frontend
quanto a API tRPC sob `/api/trpc`. O fluxo geral:

```
Navegador (React + tRPC client)
        │  HTTPS
        ▼
Express  ──►  /api/oauth/callback   (OAuth Google → cookie de sessão)
        ──►  /api/trpc/*            (procedures tipadas)
        │
        ▼
tRPC routers (server/routers.ts)
        │
        ▼
Helpers de banco (server/db.ts)  ──►  Drizzle ORM  ──►  MySQL/TiDB
```

Os parsers de log (`server/djiLog.ts`, `server/sarpas.ts`) transformam os arquivos
importados em estruturas normalizadas antes da persistência. A geração de PDF acontece
inteiramente no cliente (`client/src/lib/telemetryPdf.ts`), sem carga adicional no servidor.

Diagramas e detalhes adicionais estão em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Estrutura de pastas

```
client/
  src/
    pages/        Páginas (Home, Dashboard, ActualFlights, ActualFlightDetail, Shared*, ...)
    components/   UI reutilizável (FlightMap, TrajectoryMap, SiteFooter, ui/*)
    lib/          Utilitários testáveis (telemetry.ts, telemetryPdf.ts, playback.ts)
    const.ts      Constantes do cliente (APP_VERSION, getLoginUrl)
    pages/admin/  Painel administrativo (AdminDashboard, AdminUsers, AdminFlights, AdminLeads, AdminRevenue, AdminPlans)
    components/admin/  Componentes do admin (AdminLayout, PeriodFilter, StatCard, TrendChart)
    lib/          Utilitários (telemetry, telemetryPdf, playback, seo, i18n, format)
drizzle/
  schema.ts       Tabelas: users, flights, notes, actual_flights, leads, plans, subscriptions, activity_events
  migrations/     Migrações geradas pelo drizzle-kit
server/
  routers.ts      Procedures tRPC (auth, flights, actualFlights, notes)
  routers/admin.ts  Procedures administrativas (dashboard, listagens, leads, planos)
  adminMetrics.ts Camada de agregação de métricas por período
  db.ts           Helpers de consulta (Drizzle)
  djiLog.ts       Parsers DJI TXT / CSV / KML
  sarpas.ts       Validação e parsing SARPAS
  storage.ts      Helpers de armazenamento S3
shared/
  const.ts        Constantes compartilhadas (COOKIE_NAME, etc.)
  period.ts       Resolução de períodos (presets + custom), pura e testável
  types.ts        Tipos compartilhados
docs/             Documentação (arquitetura, instalação, changelog, manual)
```

> As pastas `server/_core` e demais diretórios de infraestrutura pertencem ao framework e
> não devem ser editadas sem necessidade.

---

## Pré-requisitos

- Node.js 22+
- pnpm 10+
- Uma instância MySQL/TiDB acessível (string de conexão em `DATABASE_URL`)

---

## Instalação e execução local

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente (ver seção abaixo)

# 3. Aplicar o schema ao banco
pnpm db:push

# 4. Subir o servidor de desenvolvimento
pnpm dev
```

A aplicação ficará disponível em `http://localhost:3000`.

Scripts disponíveis:

| Script | Descrição |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento com hot reload |
| `pnpm build` | Build do frontend e bundle do servidor |
| `pnpm start` | Executa o build de produção |
| `pnpm check` | Checagem de tipos TypeScript |
| `pnpm test` | Executa a suíte Vitest |
| `pnpm db:push` | Gera e aplica migrações Drizzle |

O passo a passo detalhado está em [`docs/INSTALL.md`](docs/INSTALL.md).

---

## Variáveis de ambiente

As variáveis de sistema são injetadas pelo ambiente Manus WebDev e **não devem ser
commitadas**. As principais:

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | String de conexão MySQL/TiDB |
| `JWT_SECRET` | Assinatura do cookie de sessão |
| `VITE_APP_ID` | ID da aplicação OAuth |
| `OAUTH_SERVER_URL` | Base do backend OAuth |
| `VITE_OAUTH_PORTAL_URL` | Portal de login (frontend) |
| `DJI_API_KEY` | Chave para o parser de DJI Fly TXT (`dji-log-parser-js`) |

> Nunca faça commit de arquivos `.env`. O `.gitignore` já cobre `.env*` e segredos.

---

## Banco de dados

O schema é definido em `drizzle/schema.ts` e versionado em `drizzle/migrations/`. Tabelas:

| Tabela | Função |
| --- | --- |
| `users` | Usuários autenticados via OAuth (campo `role`: user/admin) |
| `flights` | Voos autorizados (SARPAS) |
| `notes` | Anotações associadas a um voo |
| `actual_flights` | Voos realizados com trajetória e telemetria em JSON |
| `leads` | Leads capturados (origem, status, conversão) para o CRM/funil |
| `plans` | Planos comerciais (Gratuito, Pro, Business) |
| `subscriptions` | Assinaturas de usuários a planos (estrutura) |
| `activity_events` | Eventos de atividade para métricas DAU/WAU/MAU |

O fluxo recomendado é **editar o schema → `pnpm db:push` → verificar**.

---

## Testes

```bash
pnpm test
```

A suíte atual contém **72 testes** distribuídos em parsers (SARPAS e DJI), utilitários de
telemetria, geração de PDF, playback, autenticação, resolução de períodos e contrato das
métricas administrativas. Todos os testes devem passar antes de cada publicação.

---

## Documentação adicional

| Documento | Conteúdo |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitetura, fluxo de dados e decisões técnicas |
| [`docs/INSTALL.md`](docs/INSTALL.md) | Instalação, execução e variáveis de ambiente |
| [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md) | Manual do usuário final |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Histórico de versões (1.0 → 2.0) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Guia de contribuição |

---

## Roadmap

- **v2.x** — Ativação de cobrança real (planos pagos) e preenchimento dos indicadores de receita; gráficos de altitude/bateria no PDF; exportação CSV.
- **v3.0** — Manual do usuário acessível diretamente por um menu de ajuda dentro da aplicação.

---

## Créditos

Desenvolvido por **Isaias Alves**.
Apoie o projeto via Pix: `isaias.oceano@gmail.com`.
