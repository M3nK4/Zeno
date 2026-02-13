# Architettura

## Diagramma

```
Utente WhatsApp
      |
Evolution API (Docker, porta 8080)
      | webhook POST
Node.js Server (Express, porta 3000)
      |
      +-- /webhook         <- riceve messaggi da Evolution API
      +-- /admin            <- pannello admin (file statici)
      +-- /admin/api/*      <- API REST protette da JWT
      |
   Message Handler
      +-- Testo -> diretto all'LLM
      +-- Vocale -> Whisper -> testo -> LLM
      +-- Immagine -> Vision API -> descrizione -> LLM
      |
   LLM Router
      +-- Claude (Anthropic SDK)
      +-- OpenAI (OpenAI SDK)
      |
   SQLite Database
      +-- messages (storico conversazioni)
      +-- config (impostazioni)
      +-- admin_users (accesso pannello)
      |
   Notifiche
      +-- Email via SMTP (nodemailer)
```

## Flusso messaggio

1. **Evolution API** riceve un messaggio WhatsApp e fa POST a `/webhook`
2. **handler.ts** estrae tipo (testo/vocale/immagine), numero telefono, contenuto
3. Se vocale: scarica audio -> Whisper API -> trascrizione
4. Se immagine: scarica -> Vision API (Claude o OpenAI) -> descrizione
5. Controlla keyword handoff -> se match, invia email e risposta fissa
6. Recupera storico conversazione da SQLite (ultimi N messaggi)
7. Costruisce array messaggi: [system prompt, storico, nuovo messaggio]
8. Chiama LLM (Claude o OpenAI in base a config)
9. Salva messaggi utente + risposta in SQLite
10. Invia risposta via Evolution API

## Database

SQLite locale (`data/agent.db`), creato automaticamente al primo avvio.

### messages
- `id` INTEGER PK
- `phone` TEXT — numero utente
- `role` TEXT — "user" o "assistant"
- `content` TEXT — testo del messaggio
- `media_type` TEXT NULL — "voice", "image"
- `media_url` TEXT NULL
- `timestamp` DATETIME

### config
- `key` TEXT PK — nome impostazione
- `value` TEXT — valore

### admin_users
- `id` INTEGER PK
- `username` TEXT UNIQUE
- `password_hash` TEXT — bcrypt

## Stack tecnologico

- **Runtime**: Node.js + TypeScript (eseguito con tsx)
- **Web framework**: Express 4
- **Database**: better-sqlite3 (WAL mode)
- **LLM**: @anthropic-ai/sdk, openai
- **Auth**: bcrypt + jsonwebtoken
- **Email**: nodemailer
- **HTTP client**: axios
- **WhatsApp**: Evolution API (Docker)
