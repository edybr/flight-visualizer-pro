# Guia de Contribuição — Flight Visualizer Pro

Obrigado por contribuir. Este guia resume as convenções do projeto.

## Fluxo de trabalho

O desenvolvimento segue uma abordagem schema-first e contratos tipados. Ao alterar dados,
edite `drizzle/schema.ts`, rode `pnpm db:push` e só então exponha a funcionalidade nas
procedures tRPC (`server/routers.ts`) e no frontend. Toda mudança deve ser coberta por
testes Vitest e validada com `pnpm check` e `pnpm test` antes de abrir um Pull Request.

## Convenções de código

O projeto usa TypeScript em todo o stack, com formatação via Prettier (`pnpm format`).
Prefira componentes shadcn/ui (`@/components/ui/*`) e utilitários Tailwind a CSS customizado.
Extraia lógica testável para `client/src/lib/` em funções puras, como já é feito em
`telemetry.ts` e `playback.ts`.

## Versionamento

A numeração de versões começa em 1.0 e é incrementada a cada publicação. Ao concluir uma
versão, atualize a constante `APP_VERSION` em `client/src/const.ts`, registre as mudanças e
os problemas resolvidos em `docs/CHANGELOG.md`, e garanta que todos os testes passem.

## Áreas sensíveis

As pastas sob `server/_core` e a infraestrutura do framework não devem ser alteradas sem
necessidade. As funcionalidades de importação e de autenticação são consideradas estáveis e
só devem ser modificadas mediante solicitação explícita.

## Pull Requests

Descreva claramente o objetivo da mudança, as versões afetadas e como testá-la. Inclua a
saída de `pnpm test` quando relevante.
