#!/bin/bash
# Executado na instância EC2 via SSM. Args: <mysql_pw> <jwt_secret> <dev_login_secret>
set -euxo pipefail

MYSQL_PW="$1"
JWT="$2"
DEV="$3"
BUCKET=flightviz-deploy-233231934823-saeast1

# Espera o user-data terminar (Docker + swap instalados)
for i in $(seq 1 60); do [ -f /var/lib/flightviz-userdata-done ] && break; sleep 5; done
# Espera o Docker responder
for i in $(seq 1 40); do docker info >/dev/null 2>&1 && break; sleep 3; done

# Baixa e extrai o código
mkdir -p /opt/flightviz
cd /opt/flightviz
aws s3 cp "s3://$BUCKET/flightviz-src.tgz" ./src.tgz
rm -rf app && mkdir app
tar -xzf src.tgz -C app
cd app

# Gera o .env de produção
cat > deploy/.env <<EOF
MYSQL_ROOT_PASSWORD=$MYSQL_PW
MYSQL_DATABASE=flightviz
DATABASE_URL=mysql://root:$MYSQL_PW@db:3306/flightviz
JWT_SECRET=$JWT
ALLOW_DEV_LOGIN=true
DEV_LOGIN_SECRET=$DEV
VITE_APP_ID=flight-visualizer-pro
OAUTH_SERVER_URL=https://oauth.invalid
VITE_OAUTH_PORTAL_URL=https://oauth.invalid
DJI_API_KEY=
EOF

# Sobe tudo (MySQL -> migração -> app). Build acontece na instância.
cd deploy
docker compose up -d --build
echo "=== STATUS ==="
docker compose ps
