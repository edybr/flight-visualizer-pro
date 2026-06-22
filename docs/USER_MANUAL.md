# Manual do Usuário — Flight Visualizer Pro

Este manual explica, em linguagem simples, como usar a aplicação no dia a dia.

> A partir da versão 3.0, este manual será disponibilizado também dentro da aplicação,
> acessível por um menu de ajuda. Até lá, ele vive aqui na documentação.

## 1. Entrar na aplicação

Na tela inicial, clique em **Entrar com Google**. Após autorizar, você será redirecionado
para o painel principal. Sua sessão fica salva; para sair, use a opção de **logout**.

## 2. Voos Autorizados (SARPAS)

Esta área concentra as autorizações de voo. Para importar uma autorização, abra a aba
**Autorizados** e envie o arquivo `.json` exportado do SARPAS. A aplicação valida o formato
e, se estiver correto, registra o voo. Arquivos fora do padrão são recusados com uma
mensagem indicando o problema.

Na listagem você pode filtrar por intervalo de datas, por texto (local ou nome da operação)
e por status. Ao abrir um voo, você verá o **mapa da área autorizada** (com os pontos de
decolagem e pouso) e todos os dados da operação: responsável, operador, pilotos, aeronaves,
datas e motivo da análise.

## 3. Voos Realizados (DJI / CSV / KML)

Esta área guarda os voos efetivamente executados. Abra a aba **Realizados** e importe o
registro do voo. São aceitos: o arquivo `FlightRecord_*.txt` do DJI Fly, o CSV exportado de
serviços como Phantom Help/Airdata e o KML do DJI Flight Reader. A aplicação identifica
automaticamente o tipo de arquivo.

> **Onde encontrar o arquivo do DJI no Android:** geralmente em
> `Android/data/dji.go.v5/files/flightrecord`. A aplicação exibe esse caminho próximo ao
> botão de importação, com um botão para copiá-lo.

Ao abrir um voo realizado, você verá o **mapa da trajetória** ocupando a largura da tela e,
abaixo, os cartões com estatísticas (duração, distância, altitude e velocidade máximas).

### Playback da telemetria

Use o controle de **playback** sobre o mapa para reproduzir o voo no tempo. Você pode dar
play/pause, reiniciar e ajustar a velocidade de reprodução. Enquanto o voo "anda", o painel
de telemetria mostra os valores instantâneos (altitude, velocidade, bateria, temperatura,
satélites GPS e sinal de rádio) sincronizados com o ponto atual.

### Exportar PDF

No detalhe de um voo realizado, clique em **Exportar PDF**. A aplicação gera um relatório
completo com o cabeçalho do voo, um resumo, as estatísticas (mínimo, máximo e média) e uma
tabela ponto a ponto da telemetria. Em trajetórias muito longas, os pontos são amostrados de
forma inteligente para manter o PDF legível, sempre preservando o início e o fim do voo.

## 4. Anotações

Em qualquer voo você pode adicionar **anotações** operacionais. É possível criar, editar e
excluir notas; a exclusão pede confirmação para evitar perdas acidentais.

## 5. Compartilhar um voo

Para mostrar um voo a alguém sem que a pessoa precise fazer login, gere um **link público**.
A aplicação cria um endereço de compartilhamento que exibe o mapa e os dados do voo. Use o
botão **Copiar link** para enviá-lo. Você pode desativar o compartilhamento a qualquer
momento.

## 6. Imprimir

O botão **Imprimir** gera uma versão otimizada do voo para papel ou PDF do navegador, com o
mapa e os dados, sem os elementos de navegação.

## 7. Apoiar o projeto

A aplicação é desenvolvida por **Isaias Alves**. Se quiser apoiar, há uma seção de doação
via **Pix** no rodapé (`isaias.oceano@gmail.com`), com botão para copiar a chave.
