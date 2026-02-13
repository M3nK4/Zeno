# Architettura

## Diagramma

```
Utente WhatsApp
      |
Evolution API (Docker, porta 8081)
      | webhook POST
Node.js Server (Express, porta 3000)
      |
      +-- Security Layer
      |     +-- helmet (security headers)
      |     +-- express-rate-limit (100/min globale, 60/min webhook, 5/15min login)
      |     +-- cors (origini configurabili)
      |     +-- validateConfig() (blocca avvio se JWT_SECRET insicuro)
      |
      +-- /webhook           <- riceve messaggi da Evolution API (rate limited)
      +-- /health            <- health check pubblico
      +-- /admin             <- pannello admin (file statici)
      +-- /admin/api/*       <- API REST protette da JWT (con paginazione)
      |
   Webhook Handler
      +-- Validazione input (body, event, formato telefono)
      +-- Testo -> diretto all'LLM
      +-- Vocale -> Whisper -> testo -> LLM
      +-- Immagine -> Vision API -> descrizione -> LLM
      |
   LLM Router
      +-- Claude (Anthropic SDK, singleton client)
      +-- OpenAI (OpenAI SDK, singleton client)
      +-- Gemini (Google Generative AI SDK, singleton client)
      |
   SQLite Database (WAL mode)
      +-- messages (storico conversazioni, indicizzato)
      +-- config (impostazioni)
      +-- admin_users (accesso pannello)
      |
   Logging (pino)
      +-- Structured JSON in produzione
      +-- Pretty print in sviluppo
      |
   Notifiche
      +-- Email via SMTP (nodemailer)
```

## Flusso messaggio

1. **Evolution API** riceve un messaggio WhatsApp e fa POST a `/webhook`
2. **handler.ts** valida il body (struttura, event, formato telefono)
3. Estrae tipo (testo/vocale/immagine), numero telefono, contenuto
4. Se vocale: scarica audio -> Whisper API -> trascrizione
5. Se immagine: scarica -> Vision API (Claude, OpenAI o Gemini) -> descrizione
6. Controlla keyword handoff -> se match, invia email e risposta fissa
7. Recupera storico conversazione da SQLite (ultimi N messaggi)
8. Costruisce array messaggi: [system prompt, storico, nuovo messaggio]
9. Chiama LLM (Claude, OpenAI o Gemini in base a config, singleton client)
10. Salva messaggi utente + risposta in SQLite
11. Invia risposta via Evolution API

## Database

SQLite locale (`data/agent.db`), creato automaticamente al primo avvio.

### messages
- `id` INTEGER PK AUTOINCREMENT
- `phone` TEXT NOT NULL — numero utente
- `role` TEXT NOT NULL CHECK(IN 'user','assistant')
- `content` TEXT NOT NULL — testo del messaggio
- `media_type` TEXT NULL — "voice", "image"
- `media_url` TEXT NULL
- `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
- **Indici**: `idx_messages_phone`, `idx_messages_timestamp`, `idx_messages_phone_timestamp`

### config
- `key` TEXT PK — nome impostazione
- `value` TEXT NOT NULL — valore

### admin_users
- `id` INTEGER PK AUTOINCREMENT
- `username` TEXT UNIQUE NOT NULL
- `password_hash` TEXT NOT NULL — bcrypt (10 rounds)

## Moduli chiave

| File | Responsabilita |
|------|---------------|
| `src/types.ts` | Interfacce TypeScript condivise (LlmRequest, DbMessage, EvolutionWebhookBody, PaginatedResult, ecc.) |
| `src/logger.ts` | Logger pino con pretty print |
| `src/config.ts` | Caricamento `.env` + validazione sicurezza all'avvio |
| `src/server.ts` | Bootstrap Express: helmet, CORS, rate limiting, routes, health check |
| `src/webhook/handler.ts` | Gestione messaggi: validazione, routing per tipo, chiamata LLM |
| `src/llm/router.ts` | Routing Claude/OpenAI/Gemini in base a config |
| `src/llm/claude.ts` | Client Anthropic (singleton, error handling, logging) |
| `src/llm/openai.ts` | Client OpenAI (singleton, error handling, logging) |
| `src/llm/gemini.ts` | Client Google Gemini (singleton, error handling, logging) |
| `src/media/voice.ts` | Trascrizione audio con Whisper |
| `src/media/image.ts` | Descrizione immagini con Vision API (Claude/OpenAI/Gemini) |
| `src/database/setup.ts` | Schema SQLite, init tabelle, indici, config default |
| `src/database/conversations.ts` | CRUD messaggi, storico, paginazione, statistiche |
| `src/database/settings.ts` | CRUD config, helper API key e SMTP |
| `src/handoff/notify.ts` | Keyword detection + invio email di escalation |
| `src/evolution/client.ts` | Wrapper REST per Evolution API |
| `src/admin/auth.ts` | Bcrypt + JWT + middleware auth |
| `src/admin/routes.ts` | API REST admin: stats, settings, conversations (paginate), search, health |

## Stack tecnologico

- **Runtime**: Node.js 20 + TypeScript strict (eseguito con tsx)
- **Web framework**: Express 4 + helmet + cors + express-rate-limit
- **Database**: better-sqlite3 (WAL mode, foreign keys, indici)
- **LLM**: @anthropic-ai/sdk, openai, @google/genai (singleton client per provider)
- **Auth**: bcrypt (10 rounds) + jsonwebtoken (24h)
- **Email**: nodemailer
- **HTTP client**: axios (30s timeout)
- **WhatsApp**: Evolution API (Docker)
- **Logging**: pino + pino-pretty
- **Testing**: Vitest + @vitest/coverage-v8 (46 test)
- **Linting**: ESLint (typescript-eslint strict) + Prettier
- **CI**: GitHub Actions (type check + test)
