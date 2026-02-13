# whatsapp-agent — zerox.technology

WhatsApp AI Agent per zerox.technology. Bot che risponde a messaggi di testo, vocali e immagini, con memoria conversazionale, handoff a umano, e pannello admin web.

## Tech Stack

- **Node.js** + **TypeScript** (eseguito con tsx, no build step)
- **Express 4** — web server
- **better-sqlite3** — database locale (WAL mode)
- **@anthropic-ai/sdk** + **openai** — provider LLM switchabili
- **Evolution API** — bridge WhatsApp (Docker)
- **nodemailer** — notifiche email SMTP
- **bcrypt** + **jsonwebtoken** — auth pannello admin

## Comandi

```bash
npm run dev            # Dev server con auto-reload (tsx watch)
npm start              # Produzione
npm run create-admin   # Crea utente admin panel
docker compose up -d   # Avvia Evolution API + PostgreSQL
```

## Struttura progetto

```
whatsapp-agent/
├── src/
│   ├── server.ts               # Express: avvia server, registra routes
│   ├── config.ts               # Loader variabili d'ambiente (.env)
│   │
│   ├── webhook/
│   │   └── handler.ts          # Riceve messaggi Evolution API, smista per tipo
│   │
│   ├── llm/
│   │   ├── router.ts           # Sceglie provider in base a config DB
│   │   ├── claude.ts           # Anthropic SDK: chat con storico
│   │   └── openai.ts           # OpenAI SDK: chat con storico
│   │
│   ├── media/
│   │   ├── voice.ts            # Audio → Whisper API → testo
│   │   └── image.ts            # Immagine → Vision API → descrizione
│   │
│   ├── database/
│   │   ├── setup.ts            # Schema SQLite + init tabelle + default config
│   │   ├── conversations.ts    # CRUD messaggi, storico, statistiche
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
│       ├── routes.ts           # API REST: stats, settings, conversations, search
│       └── public/             # File statici pannello admin
│           ├── index.html      # Login
│           ├── dashboard.html  # Statistiche + stato Evolution
│           ├── settings.html   # Config LLM, prompt, handoff, SMTP
│           ├── conversations.html # Lista + vista chat + ricerca
│           └── assets/
│               ├── style.css   # Tema dark, font Courier New, accent #00ff99
│               └── app.js      # Logica frontend vanilla JS
│
├── data/
│   └── agent.db                # SQLite database (auto-creato)
│
├── docs/                       # Documentazione
├── docker-compose.yml          # Evolution API + PostgreSQL
├── .env.example                # Template variabili d'ambiente
├── package.json
└── tsconfig.json
```

## Database (SQLite)

3 tabelle:
- **messages**: phone, role (user/assistant), content, media_type, media_url, timestamp
- **config**: key/value per tutte le impostazioni (LLM, prompt, SMTP, handoff)
- **admin_users**: username, password_hash (bcrypt)

## Architettura

### Flusso messaggio
1. Evolution API → POST `/webhook`
2. handler.ts: estrai tipo (testo/vocale/immagine) e contenuto
3. Se vocale → Whisper, se immagine → Vision API
4. Controlla keyword handoff → se match, email + risposta fissa
5. Recupera storico da SQLite
6. Chiama LLM (Claude o OpenAI da config)
7. Salva in DB, rispondi via Evolution API

### Pannello Admin
- Login JWT (24h) su `/admin`
- API REST protette su `/admin/api/*`
- File statici serviti da Express

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
- No unused imports, no dead code
