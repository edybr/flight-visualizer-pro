# Deploy na AWS (EC2 + Docker)

Guia operacional do ambiente de produção em nuvem do Flight Visualizer Pro.

## Visão geral

A aplicação roda em uma instância **EC2** (Amazon Linux 2023) na região **sa-east-1**,
com **Docker Compose** orquestrando três serviços (ver [docker-compose.yml](docker-compose.yml)):

- `db` — MySQL 8 (volume persistente `dbdata`)
- `migrate` — aplica as migrações Drizzle e encerra
- `app` — servidor Node (Express + tRPC) servindo o frontend, na porta 80 → 3000

O código é entregue via **S3 + SSM** (sem SSH): um tarball do repositório fica no bucket
`flightviz-deploy-233231934823-saeast1`, e a instância baixa, extrai e roda
`docker compose up -d --build`.

## Recursos provisionados (sa-east-1)

| Recurso | Identificador |
| --- | --- |
| Instância EC2 | `i-0f7f217dc0e08c679` (t3.micro, 20GB gp3) |
| IP público (Elastic IP, fixo) | `54.207.140.164` (`eipalloc-09ae6a512f93ffb22`) |
| Security Group | `sg-0bb949cfee3243850` (entrada TCP 80) |
| Role/Instance Profile | `flightviz-ec2-role` (SSM + leitura do bucket) |
| Bucket de deploy | `flightviz-deploy-233231934823-saeast1` |
| VPC / Subnet | `vpc-0e6cc5e04e6294a32` / `subnet-00e5bed3e48796541` |

Os arquivos de infraestrutura estão em [deploy/aws/](aws/):
`user-data.sh` (bootstrap da instância), `remote-deploy.sh` (deploy executado via SSM),
`trust-policy.json` e `s3-read-policy.json` (IAM).

## Como acessar

- App: **http://54.207.140.164/**
- Login (provisório, sem OAuth da Manus): **http://54.207.140.164/api/dev-login?secret=SEGREDO**
  - O `SEGREDO` é o valor de `DEV_LOGIN_SECRET` em `deploy/.env` na instância.
  - `?role=user` no fim entra como usuário comum; o padrão é admin.

## Redeploy (após mudanças no código)

Tudo via CLI a partir da máquina local (requer AWS CLI configurado):

```bash
# 1. Empacotar o código (a partir da raiz do projeto)
tar -czf /tmp/flightviz-src.tgz \
  --exclude='./node_modules' --exclude='./.git' --exclude='./dist' \
  --exclude='./.pnpm-store' --exclude='./.env' --exclude='./.env.production' \
  --exclude='./deploy/.env' --exclude='./.webdev' --exclude='*.tgz' .

# 2. Subir para o S3
aws s3 cp /tmp/flightviz-src.tgz s3://flightviz-deploy-233231934823-saeast1/flightviz-src.tgz

# 3. Disparar o deploy na instância (reusa o remote-deploy.sh com os segredos atuais)
#    Veja remote-deploy.sh: ele baixa o código e roda docker compose up -d --build.
aws ssm send-command --instance-ids i-0f7f217dc0e08c679 \
  --document-name AWS-RunShellScript \
  --parameters commands='["aws s3 cp s3://flightviz-deploy-233231934823-saeast1/remote-deploy.sh /tmp/rd.sh","bash /tmp/rd.sh <MYSQL_PW> <JWT> <DEV_SECRET>"]' \
  --timeout-seconds 3600
```

## Operação (via SSM, sem SSH)

```bash
# Status dos containers
aws ssm send-command --instance-ids i-0f7f217dc0e08c679 --document-name AWS-RunShellScript \
  --parameters commands='["cd /opt/flightviz/app/deploy && docker compose ps -a"]'

# Logs do app
aws ssm send-command --instance-ids i-0f7f217dc0e08c679 --document-name AWS-RunShellScript \
  --parameters commands='["cd /opt/flightviz/app/deploy && docker compose logs --tail 50 app"]'

# Para ver o resultado de qualquer comando:
aws ssm get-command-invocation --command-id <CMD_ID> --instance-id i-0f7f217dc0e08c679
```

## Ligar/desligar para economizar

```bash
aws ec2 stop-instances  --instance-ids i-0f7f217dc0e08c679   # para de cobrar a instância (volume continua)
aws ec2 start-instances --instance-ids i-0f7f217dc0e08c679   # o IP permanece (Elastic IP fixo)
```

> O IP é fixo via **Elastic IP** (`eipalloc-09ae6a512f93ffb22` → `54.207.140.164`). Ele é
> gratuito enquanto associado a uma instância em execução; cobra ~US$3,6/mês apenas se ficar
> ocioso (instância parada ou EIP desassociado). Se for liberar o EIP: `aws ec2 release-address --allocation-id eipalloc-09ae6a512f93ffb22`.

## Limitações conhecidas

- **OAuth real (Google/Manus) não funciona fora da plataforma Manus** — por isso o
  `dev-login` protegido por segredo. Para login de verdade, implementar um provedor próprio.
- **Storage S3 da Manus / import de DJI TXT** dependem de credenciais da plataforma e não
  funcionam neste ambiente.
- **HTTP sem TLS.** Para HTTPS, é preciso um domínio + certificado (ex.: Caddy/Nginx + Let's Encrypt).

## Notas

- A instância tem swap de 2GB (a t3.micro tem só 1GB de RAM) e o build usa
  `NODE_OPTIONS=--max-old-space-size=2048` para o Vite não abortar por falta de memória.
