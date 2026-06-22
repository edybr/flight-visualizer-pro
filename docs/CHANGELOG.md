# Changelog — Flight Visualizer Pro

Histórico de versões. A numeração começa em 1.0 e é incrementada a cada publicação.

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
