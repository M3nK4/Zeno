# Deploy su VPS

## 1. Prerequisiti

- VPS con Ubuntu 22.04+ (o simile)
- Accesso SSH root
- Dominio/sottodominio (opzionale, per HTTPS)

## 2. Installa Docker

```bash
# Aggiorna sistema
sudo apt update && sudo apt upgrade -y

# Installa Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installa Docker Compose
sudo apt install -y docker-compose-plugin

# Verifica
docker --version
docker compose version
```

## 3. Installa Node.js

```bash
# Installa Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifica
node --version  # v20.x.x
npm --version
```

## 4. Clona il progetto

```bash
cd /opt
git clone <repo-url> whatsapp-agent
cd whatsapp-agent
npm install
```

## 5. Configura .env

```bash
cp .env.example .env
nano .env
```

Compila **obbligatoriamente**:
- `JWT_SECRET`: stringa casuale lunga almeno 32 caratteri (es. `openssl rand -hex 32`)
- `EVOLUTION_API_KEY`: chiave per Evolution API
- `EVOLUTION_INSTANCE`: nome istanza (es. `zerox`)
- `GEMINI_API_KEY`: chiave API Google Gemini

Opzionali:
- `CORS_ORIGIN`: origini consentite (default: `*`)

**IMPORTANTE**: `JWT_SECRET` deve essere una stringa unica e forte. Il server non si avvia se usa il valore di default.

## 6. Avvia Evolution API

```bash
docker compose up -d

# Verifica che sia partita
docker compose logs -f evolution-api
```

## 7. Crea istanza WhatsApp

Apri `http://<ip-vps>:8081` nel browser e:

1. Crea una nuova istanza con nome = `EVOLUTION_INSTANCE` dal .env
2. Configura il webhook: `http://localhost:3000/webhook`
3. Scansiona il QR code con WhatsApp dal telefono

## 8. Crea utente admin

```bash
npm run create-admin
# Oppure con credenziali custom:
npm run create-admin -- mio-user mia-password
```

## 9. Avvia il server

### Opzione A: con PM2 (consigliato)

```bash
# Installa pm2
sudo npm install -g pm2

# Avvia
pm2 start npm --name "whatsapp-agent" -- start

# Auto-restart al reboot
pm2 startup
pm2 save
```

### Opzione B: con systemd

```bash
sudo tee /etc/systemd/system/whatsapp-agent.service << 'EOF'
[Unit]
Description=WhatsApp AI Agent — zerox.technology
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/whatsapp-agent
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable whatsapp-agent
sudo systemctl start whatsapp-agent
```

## 10. (Opzionale) HTTPS con nginx

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Configura nginx
sudo tee /etc/nginx/sites-available/whatsapp-agent << 'EOF'
server {
    listen 80;
    server_name agent.zerox.technology;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/whatsapp-agent /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d agent.zerox.technology
```

## 11. Verifica

1. Controlla il health check: `curl http://localhost:3000/health`
2. Apri `http://<ip-vps>:3000/admin` (o il dominio HTTPS)
3. Login con le credenziali create
4. Configura API key Gemini e system prompt dalle impostazioni
5. Invia un messaggio WhatsApp al numero collegato
6. Verifica che l'agente risponda

## Aggiornamento

```bash
cd /opt/whatsapp-agent
git pull
npm install
npm test                  # Verifica che i test passino
pm2 restart whatsapp-agent  # o: sudo systemctl restart whatsapp-agent
```

## Troubleshooting

| Problema | Soluzione |
|----------|----------|
| Server non si avvia | Controlla che `JWT_SECRET` in `.env` sia impostato (min 32 caratteri) |
| Evolution API non parte | `docker compose logs evolution-api` |
| QR code non appare | Verifica che la porta 8081 sia accessibile |
| Bot non risponde | Controlla che il webhook sia configurato in Evolution API |
| Errore API key | Controlla che la chiave Gemini sia inserita nelle impostazioni o nel `.env` |
| Rate limit raggiunto | Attendi il reset (1 min globale, 15 min login) |
