# Changelog — Flight Visualizer Pro

Histórico de versões. A numeração começa em 1.0 e é incrementada a cada publicação.

## v2.0 — Plataforma SaaS multiusuário + Painel administrativo

### Adicionado
- **Painel administrativo** (`/admin`), acessível apenas a administradores (`role = admin`), com layout dedicado (sidebar navy) e guarda de acesso.
- **Dashboard de Visão geral** com quatro blocos de indicadores:
  - **Usuários**: total cadastrados, ativos hoje/semana/mês, novos no período, crescimento percentual vs. período anterior, e gráfico de novos usuários ao longo do tempo.
  - **Voos**: total importados, importados no período, horas totais de voo, distância total, média de voos por usuário, e gráfico de importações.
  - **Leads**: gerados no período, convertidos, taxa de conversão e origem dos leads.
  - **Receita (estrutura)**: MRR, receita do período/mensal/anual, ticket médio, LTV estimado, churn rate e assinaturas ativas (preenchidos quando a cobrança for ativada).
- **Filtro global de período** com presets (hoje, ontem, últimos 7/30/90 dias, este mês, mês anterior, este ano) e intervalo **personalizado**; todos os indicadores e gráficos se atualizam automaticamente ao trocar o período.
- **Páginas administrativas de detalhe**: Usuários, Voos recentes, Leads/CRM (com alteração de status), Receita e Planos.
- **Página pública de Planos** (`/planos`) com três planos (Gratuito, Pro, Business) consumindo dados reais do banco, e **formulário público de captura de leads** que alimenta as métricas.
- **Estrutura de planos pagos**: tabelas `plans` e `subscriptions` (sem cobrança real ainda), preparando a base de monetização.
- **Separação de ambientes**: app do usuário (`/app`) e ambiente administrativo (`/admin`), com acesso ao painel exibido no app apenas para administradores.
- **SEO**: títulos e meta tags dinâmicos (`useSeo`), Open Graph/Twitter, canonical, `robots.txt`, `sitemap.xml` dinâmico com URLs absolutas e `noindex` nas áreas privadas (`/app`, `/admin`).
- **Base de internacionalização (i18n)**: dicionário pt-BR e helper `t()`, preparando o suporte a múltiplos idiomas.
- **Rastreio de atividade** (best-effort) para cálculo de usuários ativos (DAU/WAU/MAU).

### Banco de dados
- Novas tabelas: `leads`, `plans`, `subscriptions`, `activity_events`.
- Planos base inseridos: Gratuito, Pro, Business.

### Técnico
- Camada de período pura e testável em `shared/period.ts`.
- Camada de métricas em `server/adminMetrics.ts` e router `server/routers/admin.ts` (procedure única `admin.dashboard`).
- Série temporal e agregação de origem dos leads calculadas no servidor (em JS) para evitar incompatibilidades com `only_full_group_by` do MySQL.
- **72 testes Vitest no total** (adicionados testes de período e de contrato das métricas).

### Observação de stack
- O projeto permanece sobre o template Manus (React + tRPC + Express + Drizzle + MySQL), diferente das tecnologias preferidas do usuário (Next.js/NestJS/PostgreSQL/Auth0/Asaas/Docker). A documentação registra isso de forma transparente.

## v1.7 — Exportação da telemetria em PDF
- Botão "Exportar PDF" na página de detalhe do voo realizado (ao lado de Imprimir), com spinner.
- Geração de PDF no navegador com jsPDF + jspdf-autotable (sem carga no servidor).
- Cabeçalho (nome, drone, local, formato, versão, data), resumo do voo e estatísticas mín/máx/média sobre todos os pontos.
- Tabela ponto a ponto com amostragem inteligente (~600 linhas, mantendo o primeiro e o último ponto) e colunas dinâmicas.
- Rodapé com crédito de autoria e doação via Pix em todas as páginas.
- Utilitários puros em `client/src/lib/telemetry.ts` e gerador em `client/src/lib/telemetryPdf.ts`.
- 54 testes Vitest no total (11 de telemetria + 3 de smoke do PDF adicionados).

## v1.6 — Telemetria sincronizada ao playback
- Parser DJI TXT estendido (altMsl, vps, bateria, tensão, temperatura, satélites, sinal RC, vSpeed, heading).
- Painel de telemetria sincronizado ao slider de playback.
- Versão exibida no header; constante central `APP_VERSION`.

## v1.5 — Playback, crédito e doação
- Playback temporal no mapa de trajetória (play/pause/reset, velocidade ajustável).
- Mapa em largura total na página de detalhe.
- Crédito "by Isaias Alves" e seção de doação Pix no rodapé.
- Utilitários de playback extraídos para `client/src/lib/playback.ts`.

## v1.4 — Importação direta de DJI Fly TXT
- Parser de `FlightRecord_*.txt` com `dji-log-parser-js` (keychain + frames).
- `DJI_API_KEY` como segredo server-side.
- Upload detecta binário e envia base64; mensagens orientadas quando a chave falta.

## v1.3 — Importação direta de `.log` DJI
- Parser `.log` com detecção heurística de binário.
- Fallback com link para Phantom Help / Airdata quando o arquivo é binário.

## v1.2 — Voos Realizados (DJI / CSV / KML)
- Tabela `actual_flights` no schema.
- Parsers CSV (Phantom Help/Airdata) e KML (DJI Flight Reader) com conversão de unidades.
- Procedures tRPC para importar, listar, detalhar, editar, excluir e compartilhar.
- Mapa de trajetória, estatísticas e página pública `/share-actual/:token`.

## v1.1 — Camadas de mapa
- Controle de camadas no mapa (padrão / satélite / satélite + rótulos).

## v1.0 — Versão inicial
- Autenticação Google com sessão persistida.
- Importação SARPAS com validação estrita.
- Listagem de voos com filtros por data, texto e status.
- Mapa interativo com área de voo, decolagem e pouso.
- Anotações, compartilhamento público, impressão.
- Design sóbrio (azul-marinho + ivory + dourado) e responsivo.
