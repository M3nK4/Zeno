# whatsapp-agent — zerox.technology

WhatsApp AI Agent per zerox.technology. Bot che risponde a messaggi di testo, vocali e immagini, con memoria conversazionale, handoff a umano, e pannello admin web.

## Regole obbligatorie per Claude Code

**QUESTE REGOLE SONO VINCOLANTI. Devono essere seguite SEMPRE, senza eccezioni.**

### Prima di qualsiasi lavoro

1. **LEGGERE SEMPRE** tutti i file di documentazione prima di iniziare:
   - `CLAUDE.md` — istruzioni progetto, struttura, convenzioni
   - `STATO-PROGETTO.md` — stato attuale del progetto
   - `docs/README.md` — documentazione utente
   - `docs/ARCHITECTURE.md` — architettura del sistema
   - `docs/ADMIN-PANEL.md` — pannello admin e API
   - `docs/DECISIONS.md` — decisioni e punti aperti
   - `docs/SETUP-VPS.md` — guida deploy
2. **LEGGERE SEMPRE** i file sorgente rilevanti prima di modificarli
3. **LEGGERE SEMPRE** i file di memoria in `~/.claude/projects/*/memory/`

### Dopo ogni modifica al codice

1. **AGGIORNARE SEMPRE** la documentazione se la modifica cambia:
   - Struttura file → `CLAUDE.md` (sezione struttura progetto)
   - API endpoints → `docs/ADMIN-PANEL.md`
   - Architettura → `docs/ARCHITECTURE.md`
   - Comandi/script → `CLAUDE.md` e `docs/README.md`
   - Decisioni → `docs/DECISIONS.md`
   - Stato progetto → `STATO-PROGETTO.md`
2. **AGGIORNARE SEMPRE** i file di memoria (`MEMORY.md`, `workflow.md`)
3. **VERIFICARE SEMPRE** dopo ogni modifica:
   - `npx tsc --noEmit` — 0 errori
   - `npx vitest run` — tutti i test passano
   - `npx eslint src/` — 0 errori

### Strumenti da usare

1. **Utilizzare le skill installate** in `.claude/skills/` come parte del workflow
2. **Utilizzare Agent Teams** per task complessi — parallelizzare il lavoro con agenti specializzati
3. **Ogni agente** deve usare almeno una skill pertinente al suo compito

### Principio guida

> La documentazione e il codice devono essere SEMPRE allineati. Se cambia uno, deve cambiare anche l'altro. Non esiste modifica "troppo piccola" per aggiornare i docs.

## Tech Stack

- **Node.js 20** + **TypeScript** (eseguito con tsx, no build step)
- **Express 4** — web server con helmet, CORS, rate limiting
- **better-sqlite3** — database locale (WAL mode, indici su phone+timestamp)
- **@anthropic-ai/sdk** + **openai** + **@google/genai** — 3 provider LLM switchabili (singleton client)
- **Evolution API** — bridge WhatsApp (Docker)
- **nodemailer** — notifiche email SMTP
- **bcrypt** + **jsonwebtoken** — auth pannello admin
- **pino** — structured logging
- **Vitest** — testing framework (46 test)
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
│   │   ├── openai.ts           # OpenAI SDK: singleton client, error handling
│   │   └── gemini.ts           # Google Gemini SDK: singleton client, error handling
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
│   └── llm-router.test.ts     # 9 test: routing provider (Claude/OpenAI/Gemini), errori
│
├── data/
│   └── agent.db                # SQLite database (auto-creato)
│
├── .claude/
│   ├── settings.json           # Permessi e configurazione Claude Code
│   └── skills/                 # 15 skill per sicurezza, code quality, architettura, testing
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
6. Chiama LLM (Claude, OpenAI o Gemini da config, singleton client)
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
