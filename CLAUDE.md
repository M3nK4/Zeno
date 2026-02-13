# whatsapp-agent — zerox.technology

WhatsApp AI Agent per zerox.technology. Bot che risponde a messaggi di testo, vocali e immagini, con memoria conversazionale, handoff a umano, e pannello admin web.

## Tech Stack

- **Node.js 20** + **TypeScript** (eseguito con tsx, no build step)
- **Express 4** — web server con helmet, CORS, rate limiting
- **better-sqlite3** — database locale (WAL mode, indici su phone+timestamp)
- **@anthropic-ai/sdk** + **openai** — provider LLM switchabili (singleton client)
- **Evolution API** — bridge WhatsApp (Docker)
- **nodemailer** — notifiche email SMTP
- **bcrypt** + **jsonwebtoken** — auth pannello admin
- **pino** — structured logging
- **Vitest** — testing framework (44 test)
- **ESLint** + **Prettier** — linting e formattazione

## Comandi

```bash
# Sviluppo
npm run dev            # Dev server con auto-reload (tsx watch)
npm start              # Produzione

# Admin
npm run create-admin   # Crea utente admin panel

# Testing
npm test               # Esegue test (vitest run)
npm run test:watch     # Test in watch mode
npm run test:coverage  # Test con coverage report

# Code Quality
npm run lint           # ESLint check
npm run lint:fix       # ESLint auto-fix
npm run format         # Prettier format

# Infrastruttura
docker compose up -d   # Avvia Evolution API + PostgreSQL
```

## Struttura progetto

```
whatsapp-agent/
├── src/
│   ├── server.ts               # Express: helmet, CORS, rate limiting, routes
│   ├── config.ts               # Env loader + validateConfig() per sicurezza
│   ├── types.ts                # Interfacce TypeScript condivise
│   ├── logger.ts               # Structured logging con pino
│   │
│   ├── webhook/
│   │   └── handler.ts          # Riceve messaggi Evolution API, valida input, smista per tipo
│   │
│   ├── llm/
│   │   ├── router.ts           # Sceglie provider in base a config DB
│   │   ├── claude.ts           # Anthropic SDK: singleton client, error handling
│   │   └── openai.ts           # OpenAI SDK: singleton client, error handling
│   │
│   ├── media/
│   │   ├── voice.ts            # Audio → Whisper API → testo (con error handling)
│   │   └── image.ts            # Immagine → Vision API → descrizione (type guards)
│   │
│   ├── database/
│   │   ├── setup.ts            # Schema SQLite + init tabelle + indici + default config
│   │   ├── conversations.ts    # CRUD messaggi, storico, statistiche, paginazione
│   │   └── settings.ts         # CRUD config, helper API key e SMTP
│   │
│   ├── handoff/
│   │   └── notify.ts           # Keyword detection + email via nodemailer
│   │
│   ├── evolution/
│   │   └── client.ts           # Wrapper Evolution API (sendText, downloadMedia)
│   │
│   └── admin/
│       ├── auth.ts             # Login, JWT, middleware protezione
│       ├── create-user.ts      # Script CLI creazione utente admin
│       ├── routes.ts           # API REST: stats, settings, conversations (paginate), search, health
│       └── public/             # File statici pannello admin
│           ├── index.html      # Login
│           ├── dashboard.html  # Statistiche + stato Evolution
│           ├── settings.html   # Config LLM, prompt, handoff, SMTP
│           ├── conversations.html # Lista + vista chat + ricerca
│           └── assets/
│               ├── style.css   # Tema dark, font Courier New, accent #00ff99
│               └── app.js      # Logica frontend vanilla JS
│
├── tests/                      # Test suite (Vitest)
│   ├── database.test.ts        # 17 test: CRUD, paginazione, stats, search
│   ├── auth.test.ts            # 11 test: bcrypt, JWT sign/verify
│   ├── handoff.test.ts         # 9 test: keyword detection, edge cases
│   └── llm-router.test.ts     # 7 test: routing provider, errori
│
├── data/
│   └── agent.db                # SQLite database (auto-creato)
│
├── docs/                       # Documentazione
├── .github/workflows/ci.yml   # CI: type check + test
├── docker-compose.yml          # Evolution API + PostgreSQL
├── .env.example                # Template variabili d'ambiente
├── vitest.config.ts            # Configurazione test
├── eslint.config.mjs           # ESLint strict + typescript-eslint
├── .prettierrc                 # Formattazione codice
├── .editorconfig               # Impostazioni editor
├── .nvmrc                      # Versione Node (20)
├── package.json
└── tsconfig.json
```

## Database (SQLite)

3 tabelle:
- **messages**: phone, role (user/assistant), content, media_type, media_url, timestamp
  - Indici: `idx_messages_phone`, `idx_messages_timestamp`, `idx_messages_phone_timestamp`
- **config**: key/value per tutte le impostazioni (LLM, prompt, SMTP, handoff)
- **admin_users**: username, password_hash (bcrypt)

## Architettura

### Flusso messaggio
1. Evolution API → POST `/webhook` (rate limit: 60/min per IP)
2. handler.ts: valida body e campi, estrai tipo (testo/vocale/immagine) e contenuto
3. Se vocale → Whisper, se immagine → Vision API
4. Controlla keyword handoff → se match, email + risposta fissa
5. Recupera storico da SQLite
6. Chiama LLM (Claude o OpenAI da config, singleton client)
7. Salva in DB, rispondi via Evolution API

### Sicurezza
- `helmet` per security headers HTTP
- Rate limiting: globale (100/min), webhook (60/min), login (5/15min)
- CORS configurabile via `CORS_ORIGIN`
- Validazione `JWT_SECRET` all'avvio (blocca se insicuro)
- Input validation sul webhook (body, event, formato telefono)
- API key mascherate nelle risposte admin

### Pannello Admin
- Login JWT (24h) su `/admin`
- API REST protette su `/admin/api/*` con paginazione
- File statici serviti da Express
- Health check: `GET /health` (pubblico) e `GET /admin/api/health` (dettagliato, autenticato)

### Config dinamica
- Le impostazioni in DB hanno priorità su `.env`
- API key, provider, modello, prompt, SMTP: tutto modificabile dal pannello senza restart

## Convenzioni

- Brand: sempre **zerox.technology** (lowercase, con punto)
- Accent color: `#00ff99`
- Font: `Courier New, monospace`
- Tema dark: `#0a0a0a` background
- Comunicazione in italiano
- TypeScript strict mode
- Structured logging con pino (no console.log nel codice applicativo)
- No unused imports, no dead code
