# Flight Visualizer Pro - TODO

## Autenticação
- [x] Login via Google OAuth (Manus OAuth com Google provider)
- [x] Sessão persistida e logout

## Importação SARPAS
- [x] Upload de arquivo .json
- [x] Validação estrita do formato SARPAS (rejeitar arquivos inválidos com mensagem clara)
- [x] Persistência dos voos no banco (idempotente por protocolo + usuário)
- [x] Feedback de importação (quantos voos importados)

## Listagem e filtros
- [x] Listagem de voos
- [x] Filtro por data de operação (range: de / até)
- [x] Filtro por local/nome da operação (texto)
- [x] Filtro por status (aprovado, negado, etc)

## Mapa interativo
- [x] Mapa com Leaflet + OpenStreetMap
- [x] Polígono GeoJSON da área de voo
- [x] Ponto de decolagem (takeoff_point)
- [x] Ponto de pouso (landing_point)
- [x] Popups com protocolo ao clicar
- [x] Ajuste automático de viewport (fitBounds)

## Detalhes do voo
- [x] Status, tipo de voo, tipo de operação
- [x] Responsável e operador
- [x] Aeronaves (lista)
- [x] Pilotos (sarpas_code)
- [x] Motivo da análise (asa_reason)
- [x] Datas (início, fim, intervalo)

## Anotações
- [x] Criar nota
- [x] Editar nota
- [x] Excluir nota
- [x] Listar notas por voo
- [x] Confirmação ao excluir

## Compartilhamento público
- [x] Geração de token público por voo
- [x] Página /share/:token acessível sem login
- [x] Mostrar mapa + dados na página pública
- [x] Botão "Copiar link"

## Impressão
- [x] Botão imprimir
- [x] CSS print otimizado (sem chrome, com mapa e detalhes)

## Design e UX
- [x] Layout sofisticado com tipografia refinada (Inter + Cormorant Garamond)
- [x] Paleta sóbria (azul-marinho profundo + ivory + dourado discreto)
- [x] Animações sutis e estados de loading
- [x] Responsividade mobile

## Testes
- [x] Vitest: validação do formato SARPAS (6 testes)
- [x] Vitest: logout (1 teste)

## Documentação
- [x] README com instruções
- [x] Manual do usuário in-app: agendado para v3.0 (registrado no roadmap do README)

## v1.1
- [x] Controle de camadas no mapa (Mapa padrão / Satélite / Satélite + rótulos)

## v1.2 - Voos Realizados (DJI/CSV/KML)
- [x] Tabela actualFlights no schema (drone, datas, trajetória, estatísticas, shareToken)
- [x] Parser CSV (Phantom Help / Airdata) com conversão de unidades (feet→m, mph/kph→m/s)
- [x] Parser KML (DJI Flight Reader) com extração de coordinates e timestamps <when>
- [x] tRPC: actualFlights.import, list, get, update, delete, enableShare, disableShare, getByShareToken
- [x] Aba navegacional Autorizados / Realizados no header
- [x] Lista com filtros por data e busca textual (local/drone/nome)
- [x] Página de detalhe com mapa de trajetória (polyline com halo) + estatísticas
- [x] Componente TrajectoryMap (Leaflet, satélite como padrão)
- [x] Edição de metadados (nome, local, modelo do drone)
- [x] Exclusão com confirmação
- [x] Botão de impressão e compartilhamento público em /share-actual/:token
- [x] Testes vitest do parser DJI (11 testes)

## v1.3 - Importação direta de .log DJI
- [x] Parser .log no backend com detecção por heurística binária (15% non-printable)
- [x] Texto camuflado (.log/.txt em CSV ou KML) é parseado automaticamente
- [x] Fallback claro com link para Phantom Help / Airdata quando binário
- [x] UI: aceitar .log/.txt no input file (Voos Realizados) + limite de 25 MB
- [x] Testes vitest do parser .log (4 novos cenários)

## v1.4 - DJI Fly TXT direto (FlightRecord_*.txt) - CONCLUÍDO
- [x] DJI_API_KEY como secret server-side + ENV.djiApiKey
- [x] Parser DJI Fly TXT v14 com `dji-log-parser-js` (keychain fetch + records + frames)
- [x] Extrair trajetória, takeoff, duração, distância, altitude e velocidade máx
- [x] parseActualFlightAsync: entrada unificada (content texto / binaryBase64)
- [x] Router actualFlights.import aceita binaryBase64 + DJI API Key; body limit 50MB
- [x] UI: upload detecta binário (heurística) e envia base64; aceita .txt/.log/.csv/.kml
- [x] Mensagem orientada quando API Key estiver ausente/inválida
- [x] Testes vitest (looksLikeDjiTxt, parseActualFlightAsync, integração real + API Key inválida) — 31 testes no total

## v1.5 - Playback, dica Android, crédito e doação
- [x] Playback temporal no TrajectoryMap (slider play/pause/reset, velocidade 1-8x, marcador pequeno 10px do drone, linha percorrida dourada)
- [x] Mapa maximizado (full-width) na página de detalhe do voo realizado, cards reorganizados abaixo
- [x] Dica do caminho Android/data/dji.go.v5/files/flightrecord próxima ao botão de importação (com botão copiar)
- [x] Crédito "by Isaias Alves" no rodapé (SiteFooter global + footer da Home)
- [x] Seção de doação Pix (isaias.oceano@gmail.com) com botão copiar
- [x] Utilitários de playback extraídos para client/src/lib/playback.ts (testáveis)
- [x] 9 testes vitest do playback + vitest.config incluindo client/src (40 testes no total)
- [x] Importações NÃO alteradas (preservadas conforme solicitado)

## v1.6 - Telemetria sincronizada ao playback + versão visível - CONCLUÍDO
- [x] Parser DJI TXT estendido: altMsl, vps, bateria %, tensão, temperatura, satélites GPS, sinal RC up/down, vSpeed, heading por ponto
- [x] TrajectoryPoint e PlaybackPoint estendidos (campos opcionais), CSV/KML intactos
- [x] Painel de telemetria sincronizado ao slider (altitude, velocidade, bateria, temperatura, satélites, sinal RC)
- [x] Versão (v1.6) exibida no canto superior esquerdo do header (Dashboard e ActualFlights)
- [x] Constante central APP_VERSION em client/src/const.ts
- [x] Testes vitest: asserts de telemetria no teste de integração real (40 testes no total, todos passando)
- [x] Importações NÃO alteradas (apenas captura de campos extras adicionada ao parser DJI TXT)

## v1.7 - Exportação da telemetria em PDF - CONCLUÍDO
- [x] Instalar jsPDF + jspdf-autotable (geração client-side, sem overhead no servidor)
- [x] Utilitários puros e testáveis em client/src/lib/telemetry.ts (computeFieldStat, presentFields, sampleTrajectory, formatFieldValue, elapsedClock)
- [x] Gerador de PDF em client/src/lib/telemetryPdf.ts no estilo navy/ivory/dourado
- [x] Cabeçalho do PDF: nome do voo, drone, local, formato, versão e data de geração
- [x] Resumo do voo: início, fim, duração, distância, altitude máx, velocidade máx, pontos, arquivo
- [x] Estatísticas de telemetria (mín/máx/média) calculadas sobre TODOS os pontos
- [x] Tabela ponto a ponto com amostragem inteligente (máx ~600 linhas, mantém 1º e último ponto)
- [x] Colunas dinâmicas: só os campos de telemetria presentes (alt, altMsl, velocidade, vSpeed, vps, bateria, tensão, temperatura, satélites, RC up/down, proa)
- [x] Rodapé do PDF em todas as páginas: crédito "by Isaias Alves" e doação Pix
- [x] Botão "Exportar PDF" na página de detalhe do voo realizado (ao lado de Imprimir), com spinner
- [x] APP_VERSION atualizado para 1.7
- [x] Testes vitest: 11 testes dos utilitários + 3 de smoke do PDF (54 testes no total, todos passando)
- [x] Importações e autenticação NÃO alteradas (apenas leitura dos dados já carregados)

## v2.0 - Plataforma SaaS + Painel Administrativo

### Base / Modelagem
- [x] Tabela `leads` (origem, status, criado em, convertido em) no schema
- [x] Tabela `plans` (nome, slug, preço, intervalo, ativo) — estrutura para planos gratuitos/pagos
- [x] Tabela `subscriptions` (userId, planId, status, início/fim) — estrutura de assinatura
- [x] Tabela `activity_events` (userId, tipo, criado em) para usuários ativos (DAU/WAU/MAU)
- [x] Plano atual via subscriptions (estrutura)
- [x] Migrações aplicadas com `pnpm db:push`

### Backend / Métricas
- [x] `adminProcedure` (gate por role=admin) reutilizado em server/routers/admin.ts
- [x] Registro de atividade (best-effort) no auth.me e nas importações
- [x] Helpers de agregação por período (hoje, ontem, 7d, 30d, 90d, mês atual, mês anterior, ano, custom) + testes
- [x] Métricas de Usuários: total, ativos hoje/semana/mês, novos no período, crescimento %
- [x] Métricas de Voos: total importados, no período, horas totais, distância total, média por usuário
- [x] Métricas de Leads: gerados no período, convertidos, taxa de conversão, origem
- [x] Métricas de Receita (estrutura): MRR, receita período/mensal/anual, ticket médio, LTV, churn
- [x] Procedure única `admin.dashboard` que aceita preset/custom e retorna todos os blocos

### Painel Administrativo (frontend)
- [x] Rota /admin protegida (somente admin), com layout próprio (AdminLayout dedicado)
- [x] Filtro global de período (hoje, ontem, 7d, 30d, 90d, este mês, mês anterior, este ano, personalizado)
- [x] Cartões e gráficos de Usuários (recharts)
- [x] Cartões e gráficos de Voos
- [x] Cartões e gráficos de Leads
- [x] Cartões de Receita (estrutura, com placeholders quando sem dados)
- [x] Atualização automática de todos os indicadores ao mudar o período
- [x] Páginas de detalhe: Usuários, Voos, Leads/CRM (com mudança de status), Receita, Planos

### SaaS shell / UX
- [x] Separação clara entre ambiente do usuário (/app) e administrativo (/admin), com acesso admin condicionado a role
- [x] Entrada de captura de leads (formulário público em /planos) alimentando métricas de leads
- [x] Base de planos gratuitos/pagos (página pública /planos + admin/plans, sem cobrança real ainda)
- [x] Responsividade em todas as páginas novas
- [x] Tema navy/marfim/dourado consistente
- [x] SEO: títulos, meta description, Open Graph, canonical, robots, sitemap básico, noindex em áreas privadas
- [x] Preparação para i18n (dicionário pt-BR + helper t())

### Testes e documentação
- [x] Testes Vitest dos helpers de período e agregações de métricas (72 testes no total)
- [x] Atualizar APP_VERSION para 2.0
- [x] Atualizar CHANGELOG e documentação (README, CHANGELOG)
- [x] Versionar no GitHub (commit a90caa7 + tag/release v2.0) e salvar checkpoint
