# WhatsApp AI Agent — zerox.technology

Agente WhatsApp intelligente per zerox.technology. Risponde a messaggi di testo, vocali e immagini usando Google Gemini, con memoria delle conversazioni e pannello admin web.

## Requisiti

- Node.js 20+ (vedi `.nvmrc`)
- Docker + Docker Compose (per Evolution API)
- Account WhatsApp (da collegare via QR code)
- API key Google Gemini

## Quick Start

```bash
# 1. Clona il progetto
git clone <repo-url>
cd whatsapp-agent

# 2. Installa dipendenze
npm install

# 3. Configura
cp .env.example .env
# Modifica .env con le tue credenziali (JWT_SECRET obbligatorio!)

# 4. Avvia Evolution API
docker compose up -d

# 5. Crea utente admin
npm run create-admin

# 6. Avvia il server
npm run dev

# 7. Apri il pannello admin
# http://localhost:3000/admin
```

## Configurazione Evolution API

1. Avvia con `docker compose up -d`
2. Vai su `http://localhost:8081` (Evolution API Manager)
3. Crea un'istanza con il nome configurato in `.env` (`EVOLUTION_INSTANCE`)
4. Scansiona il QR code con WhatsApp
5. Configura il webhook: `http://host:3000/webhook`

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Avvia in modalita sviluppo (auto-reload) |
| `npm start` | Avvia in produzione |
| `npm run create-admin` | Crea/aggiorna utente admin |
| `npm run create-admin -- <user> <pass>` | Crea con credenziali specifiche |
| `npm test` | Esegue la test suite (Vitest) |
| `npm run test:watch` | Test in watch mode |
| `npm run test:coverage` | Test con coverage report |
| `npm run lint` | Controlla codice con ESLint |
| `npm run lint:fix` | Fix automatico ESLint |
| `npm run format` | Formatta codice con Prettier |

## Pannello Admin

Accessibile su `http://localhost:3000/admin`:

- **Dashboard**: statistiche, stato Evolution API, conversazioni recenti
- **Impostazioni**: API key Gemini, modello, system prompt
- **Conversazioni**: storico completo con paginazione, ricerca full-text, vista chat

Le pagine protette (dashboard, settings, conversations) richiedono un cookie di sessione valido. Il login imposta sia un JWT in localStorage (per le API) sia un cookie HttpOnly (per l'accesso alle pagine).

## Funzionalita

- Risponde a messaggi di testo con contesto conversazionale
- Trascrive messaggi vocali (Whisper) e risponde
- Analizza immagini (Gemini Vision) e risponde
- Pannello admin protetto da login (JWT + cookie session)
- **Security**: helmet headers, rate limiting, CORS, validazione input
- **Health check**: `GET /health` per monitoraggio
- **Logging strutturato**: pino con output formattato
- **Test automatizzati** con Vitest

## Sicurezza

- `helmet` per security headers HTTP
- Rate limiting su tutti gli endpoint (globale, webhook, login)
- CORS configurabile via `CORS_ORIGIN` in `.env`
- Validazione `JWT_SECRET` all'avvio (blocca se usa default insicuro)
- Validazione input sul webhook (body, event, formato telefono)
- API key mascherate nelle risposte admin
- Password hashate con bcrypt (10 rounds)
- Pagine admin protette server-side via cookie HttpOnly

## Licenza

Proprietary — zerox.technology
