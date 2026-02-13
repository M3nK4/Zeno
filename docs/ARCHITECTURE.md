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
      +-- /admin             <- pannello admin (login page pubblica)
      +-- /admin/*.html      <- pagine protette via cookie session (pageAuthMiddleware)
      +-- /admin/api/*       <- API REST protette da JWT (con paginazione)
      |
   Webhook Handler
      +-- Validazione input (body, event, formato telefono)
      +-- Testo -> diretto all'LLM
      +-- Vocale -> Whisper -> testo -> LLM
      +-- Immagine -> Gemini Vision -> descrizione -> LLM
      |
   LLM (Gemini only)
      +-- Google Generative AI SDK (@google/genai, singleton client)
      |
   SQLite Database (WAL mode)
      +-- messages (storico conversazioni, indicizzato)
      +-- config (impostazioni)
      +-- admin_users (accesso pannello)
      |
   Logging (pino)
      +-- Structured JSON in produzione
      +-- Pretty print in sviluppo
```

## Flusso messaggio

1. **Evolution API** riceve un messaggio WhatsApp e fa POST a `/webhook`
2. **handler.ts** valida il body (struttura, event, formato telefono)
3. Estrae tipo (testo/vocale/immagine), numero telefono, contenuto
4. Se vocale: scarica audio -> Whisper API -> trascrizione
5. Se immagine: scarica -> Gemini Vision -> descrizione
6. Recupera storico conversazione da SQLite (ultimi N messaggi)
7. Costruisce array messaggi: [system prompt, storico, nuovo messaggio]
8. Chiama Gemini (singleton client)
9. Salva messaggi utente + risposta in SQLite
10. Invia risposta via Evolution API

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
| `src/server.ts` | Bootstrap Express: helmet, CORS, rate limiting, cookie-parser, routes, health check, pageAuthMiddleware |
| `src/webhook/handler.ts` | Gestione messaggi: validazione, routing per tipo, chiamata LLM |
| `src/llm/router.ts` | Instrada a Gemini (unico provider) |
| `src/llm/gemini.ts` | Client Google Gemini (singleton, error handling, logging) |
| `src/media/voice.ts` | Trascrizione audio con Whisper |
| `src/media/image.ts` | Descrizione immagini con Gemini Vision |
| `src/database/setup.ts` | Schema SQLite, init tabelle, indici, config default |
| `src/database/conversations.ts` | CRUD messaggi, storico, paginazione, statistiche |
| `src/database/settings.ts` | CRUD config, helper API key Gemini |
| `src/evolution/client.ts` | Wrapper REST per Evolution API |
| `src/admin/auth.ts` | Bcrypt + JWT + cookie session + pageAuthMiddleware + logout |
| `src/admin/routes.ts` | API REST admin: stats, settings, conversations (paginate), search, health |

## Stack tecnologico

- **Runtime**: Node.js 20 + TypeScript strict (eseguito con tsx)
- **Web framework**: Express 4 + helmet + cors + express-rate-limit + cookie-parser
- **Database**: better-sqlite3 (WAL mode, foreign keys, indici)
- **LLM**: @google/genai (Gemini, singleton client)
- **Auth**: bcrypt (10 rounds) + jsonwebtoken (24h) + cookie-parser (HttpOnly session cookie)
- **HTTP client**: axios (30s timeout)
- **WhatsApp**: Evolution API (Docker)
- **Logging**: pino + pino-pretty
- **Testing**: Vitest + @vitest/coverage-v8
- **Linting**: ESLint (typescript-eslint strict) + Prettier
- **CI**: GitHub Actions (type check + test)
