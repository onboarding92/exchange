# BitChange Deployment – Step by Step

This guide explains how to deploy BitChange on a fresh Ubuntu 22.04 server.

---

## 1. Requirements

- VPS (4 vCPU, 8GB RAM, 160GB SSD)
- Domain (example: exchange.yourdomain.com)
- SMTP provider
- Basic Linux knowledge

---

## 2. Create VPS & Secure It
```bash
ssh root@SERVER_IP
apt update && apt upgrade -y
adduser exchange
usermod -aG sudo exchange
Enable firewall:

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
## 3. Install Docker
apt install -y ca-certificates curl gnupg lsb-release
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
usermod -aG docker exchange
Reconnect as exchange user.

## 4. Clone Repository
cd /srv
mkdir -p /srv/exchange
chown exchange:exchange /srv/exchange
cd /srv/exchange
git clone https://github.com/onboarding92/exchange.git .
## 5. Configure Backend ENV
cd server
cp .env.production.example .env.production
Set:

SESSION_SECRET=your-random-secret

SMTP credentials

APP_DOMAIN=https://exchange.yourdomain.com

## 6. Configure Client ENV
cd client
cp .env.production.example .env.production
Set:

VITE_API_URL=https://exchange.yourdomain.com/api

## 7. Build & Test (Optional)
cd server
npm install
npm test

cd ../client
npm install
npm run build
## 8. Run With Docker
cd /srv/exchange
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
## 9. HTTPS Setup
Use Certbot with Nginx on host OR internal nginx.

## 10. Health Check
curl https://exchange.yourdomain.com/health
