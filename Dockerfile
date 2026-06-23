# ---- build stage (mantém devDependencies: vite, esbuild, drizzle-kit) ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable

# Instala dependências com cache eficiente
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

# Copia o restante e gera o build (frontend Vite + bundle do servidor esbuild)
COPY . .

# Variáveis VITE_ são embutidas no bundle do frontend em tempo de build.
# Mesmo usando o dev-login, getLoginUrl() faz new URL(VITE_OAUTH_PORTAL_URL) e
# lançaria exceção se vier vazio — então geramos um .env.production com valores
# válidos (placeholders) antes do build.
ARG VITE_APP_ID=flight-visualizer-pro
ARG VITE_OAUTH_PORTAL_URL=https://oauth.invalid
RUN printf 'VITE_APP_ID=%s\nVITE_OAUTH_PORTAL_URL=%s\n' "$VITE_APP_ID" "$VITE_OAUTH_PORTAL_URL" > .env.production

# Eleva o limite de heap do V8 para o build não abortar por OOM em máquinas
# pequenas (ex.: t3.micro com swap). Só afeta o estágio de build.
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN pnpm build

# ---- runtime stage ----
# NÃO removemos as devDependencies: o bundle do servidor (esbuild --packages=external)
# importa o `vite` de forma eager mesmo em produção (server/_core/vite.ts), então o
# node_modules precisa ficar completo no runtime.
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
# Migrações Drizzle (.sql + meta/_journal.json) — aplicadas no startup (runMigrations).
COPY --from=build /app/drizzle ./drizzle

EXPOSE 3000
CMD ["node", "dist/index.js"]
