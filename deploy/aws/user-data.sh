#!/bin/bash
set -eux

# Docker
dnf update -y
dnf install -y docker
systemctl enable --now docker

# Plugin docker compose v2
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Swap de 2GB (a instância tem só 1GB; o build do Vite precisa de mais)
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Marca que o setup terminou (usado para checar prontidão via SSM)
touch /var/lib/flightviz-userdata-done
