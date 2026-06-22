# Flight Visualizer Pro · v1.4

Aplicação web sofisticada para visualização e gerenciamento de voos operacionais a
partir de arquivos no formato **SARPAS**. Permite importar arquivos JSON validados,
filtrar voos por data e local, visualizar a área de voo em um mapa interativo,
adicionar anotações operacionais e gerar links públicos de compartilhamento.

## Stack tecnológica

| Camada | Tecnologia |
| --- | --- |
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS 4 |
| UI | shadcn/ui + Lucide Icons + Cormorant Garamond/Inter |
| Mapa | Leaflet + OpenStreetMap |
| Backend | Node.js + Express + tRPC 11 |
| ORM | Drizzle ORM |
| Banco | MySQL/TiDB |
| Autenticação | OAuth (Google provider) |
| Testes | Vitest |

> Observação: este projeto foi entregue dentro do ambiente **Manus WebDev**, que
> oferece um wrapper de OAuth para o provider Google. O parâmetro `provider=google`
> é enviado explicitamente no fluxo de login (`client/src/const.ts`).

## Funcionalidades (v1.0)

1. **Autenticação Google** com sessão persistida e logout.
2. **Importação SARPAS** com validação estrita do schema. Arquivos fora do padrão
   são rejeitados com mensagens claras indicando o ponto da falha.
3. **Listagem de voos** com filtros por intervalo de data, texto livre
   (operação, protocolo ou região CINDACTA) e status (Aprovado/Negado).
4. **Mapa interativo** exibindo polígonos GeoJSON da área de voo, pontos de
   decolagem e pouso e popups com o protocolo. Polígonos verdes para voos
   aprovados, vermelhos para negados.
5. **Painel de detalhes** com status, tipo, intervalo, responsável, operador
   padrão, pilotos, aeronaves e motivo da análise.
6. **Anotações por voo** com criação, edição, exclusão e confirmação.
7. **Compartilhamento público** via link único (`/share/:token`) acessível sem
   login. Dados sensíveis (CPF, telefone, e-mail) são removidos da resposta
   pública.
8. **Impressão** com layout dedicado contemplando o painel textual e o mapa.

## Estrutura do projeto

```
flight-visualizer/
├── client/
│   └── src/
│       ├── components/FlightMap.tsx       # Mapa Leaflet reutilizável
│       ├── pages/Home.tsx                 # Landing pública
│       ├── pages/Dashboard.tsx            # Lista e filtros
│       ├── pages/FlightDetail.tsx         # Detalhe + anotações + share + print
│       └── pages/SharedFlight.tsx         # Visualização pública sem login
├── server/
│   ├── routers.ts                         # tRPC: flights, notes, auth
│   ├── db.ts                              # Queries Drizzle
│   ├── sarpas.ts                          # Validador estrito do schema SARPAS
│   └── sarpas.test.ts                     # Suite Vitest do validador
└── drizzle/schema.ts                      # Tabelas: users, flights, notes
```

## Como rodar localmente

```bash
pnpm install
pnpm db:push          # aplica migrações
pnpm dev              # http://localhost:3000
pnpm test             # roda a suite vitest
```

## Modelo de dados (resumo)

- `users`: identidade OAuth (openId, e-mail, nome, role).
- `flights`: 1 linha por (userId, protocol). Campos textuais principais e blobs
  JSON preservando `requested_area`, `aircrafts`, `flight_pilots`,
  `operation_responsible`, `default_operator`. Possui `shareToken` único para
  acesso público.
- `notes`: anotações ligadas a um voo, exibidas em ordem decrescente.

## Validação SARPAS

O validador `validateSarpasFile` (em `server/sarpas.ts`) exige:

- Raiz como array com ao menos 1 voo.
- Em cada voo: `protocol`, `status`, `flight_type`, `operation_type`,
  `operation_name`, `operation_start`, `operation_finish`, `interval`.
- `requested_area` com pelo menos 1 item contendo `takeoff_point`,
  `landing_point` (GeoJSON Point) e `route_coordinates` (GeoJSON Polygon).

Cobertura de testes: 6 casos cobrindo aceitação, payload não-array, array vazio,
faltas de campos, polígono malformado e `requested_area` vazia.

## Voos Realizados (logs de drone)

Além dos voos **autorizados** (SARPAS), o app possui a aba **Voos Realizados**, que
importa a trajetória efetivamente executada pelo drone e a desenha sobre o mapa
(satélite por padrão), com estatísticas de duração, distância, altitude e velocidade
máximas.

Formatos aceitos na importação (`server/djiLog.ts`):

| Formato | Origem | Decodificação |
| --- | --- | --- |
| `FlightRecord_*.txt` | App **DJI Fly** (binário criptografado v13+) | Automática no servidor via `dji-log-parser-js` + `DJI_API_KEY` |
| `.csv` | Phantom Help LogViewer / Airdata | Direta (texto) |
| `.kml` | DJI Flight Reader | Direta (texto) |
| `.log` / `.txt` (texto) | Exportações em texto legível | Direta (CSV/KML embutido) |

O upload no cliente detecta automaticamente se o arquivo é binário (heurística de
bytes não-imprimíveis) e o envia como base64; caso contrário envia como texto. A
descriptografia de logs DJI v13+ requer uma **DJI API Key** de um app do tipo
**Open API** (ativado), configurada como secret `DJI_API_KEY`. Quando a chave está
ausente ou inválida, a importação retorna uma mensagem orientada.

## Notas de release

### v1.4
- Importação direta do `FlightRecord_*.txt` do DJI Fly com descriptografia
  server-side (`dji-log-parser-js`, keychains via `DJI_API_KEY`).
- Detecção de arquivo binário no upload (envio base64) e entrada unificada
  (`parseActualFlightAsync`).
- Mensagens orientadas para API Key ausente/inválida.
- 31 testes Vitest (inclui integração real de descriptografia).

### v1.3
- Aceitação de `.log`/`.txt` com detecção por heurística binária e fallback
  orientado (Phantom Help / Airdata) quando criptografado.

### v1.2
- Nova aba **Voos Realizados** com parsers CSV (Phantom Help/Airdata) e KML
  (DJI Flight Reader), mapa de trajetória (`TrajectoryMap`), edição de
  metadados, exclusão, compartilhamento público (`/share-actual/:token`) e
  impressão.

### v1.1
- Controle de camadas no mapa: Mapa padrão / Satélite / Satélite + rótulos.

### v1.0
- Importação SARPAS com upsert idempotente por (usuário, protocolo).
- Filtros por data, texto (operação, protocolo, regional) e status.
- Mapa Leaflet com auto-fit, popups e marcadores.
- Anotações privadas com CRUD completo.
- Link público por voo com sanitização de PII.
- Botão de impressão com CSS print dedicado.
- Layout sofisticado: paleta navy + ivory + dourado discreto, tipografia em
  Cormorant Garamond + Inter.

## Roadmap (próximas versões)

- v2.0: matching automático SARPAS ↔ Realizado e análise de conformidade
  (percentual da trajetória dentro da área autorizada).
- v2.x: playback temporal da trajetória; exportação PDF do voo.
- v3.0: manual do usuário in-app acessível pelo menu principal (compromisso do
  perfil do projeto).
