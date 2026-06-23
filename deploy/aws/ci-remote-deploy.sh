#!/bin/bash
# Executado na instância EC2 via SSM pelo GitHub Actions.
# Faz pull da imagem já construída no GHCR e sobe (não compila nada aqui).
# Args: <ghcr_user> <ghcr_token> <image_tag>
# Obs: sem `set -x` de propósito, para não vazar o token nos logs.
set -euo pipefail

GHCR_USER="$1"
GHCR_TOKEN="$2"
IMAGE_TAG="$3"
BUCKET=flightviz-deploy-233231934823-saeast1

# Atualiza os arquivos de deploy (compose + Caddyfile); o .env da instância é
# preservado (não vem no tarball).
cd /opt/flightviz
aws s3 cp "s3://$BUCKET/deploy.tgz" ./deploy.tgz
tar -xzf deploy.tgz -C app
cd app/deploy

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
export IMAGE_TAG
docker compose pull
docker compose up -d --remove-orphans
docker logout ghcr.io >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true
echo "deploy ok (IMAGE_TAG=$IMAGE_TAG)"
