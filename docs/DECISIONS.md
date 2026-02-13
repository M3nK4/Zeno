# Decisioni di progetto

Scelte architetturali e punti aperti per lo sviluppo e il deploy.

## Decisioni prese

### Gemini come unico provider LLM (implementato)
- Provider unico: Google Gemini via `@google/genai` SDK
- Rimossi Claude (Anthropic) e OpenAI come provider alternativi
- Modelli supportati: Gemini 2.5 Flash, 2.5 Flash Lite, 2.5 Pro, 3 Flash (Preview), 3 Pro (Preview)
- Singleton client pattern per il client Gemini
- Supporto Vision per descrizione immagini con `inlineData`
- Pannello admin con campo API key Gemini e dropdown modelli

### Rimozione handoff e SMTP (implementato)
- Rimossa la funzionalita di handoff a umano (keyword detection + email)
- Rimossa la dipendenza `nodemailer`
- Rimossa la directory `src/handoff/`
- Rimosse le impostazioni SMTP e handoff dal pannello admin
- Semplificazione del flusso: tutti i messaggi vengono gestiti dall'AI

### Auth con cookie session per pagine admin (implementato)
- Login imposta sia JWT (in risposta JSON, per API) sia cookie HttpOnly `admin_session`
- Pagine protette (dashboard, settings, conversations) verificate server-side via `pageAuthMiddleware`
- Cookie: HttpOnly, SameSite=strict, path=/admin, scadenza 24h
- Se cookie assente o invalido, redirect a login
- Endpoint `/admin/api/logout` per cancellare il cookie
- Dipendenza `cookie-parser` aggiunta

### Rate Limiting (implementato)
- Globale: 100 richieste/minuto per IP
- Webhook: 60 richieste/minuto per IP
- Login: 5 tentativi per 15 minuti
- Implementato con `express-rate-limit`

### Security Headers (implementato)
- Helmet abilitato su tutte le risposte
- CORS configurabile tramite `CORS_ORIGIN` in `.env`
- Validazione `JWT_SECRET` all'avvio — blocca se usa default insicuro
- Helmet CSP configurato con `'unsafe-inline'` per script-src e script-src-attr (necessario per inline event handlers del pannello admin)

### Logging (implementato)
- Structured logging con pino
- Pretty print in sviluppo, JSON in produzione
- Utilizzato in LLM, media processing, server

### Testing (implementato)
- Framework: Vitest
- Test unitari: database, auth, LLM routing
- CI con GitHub Actions: type check + test

### Paginazione API (implementato)
- `/admin/api/conversations` e `/admin/api/search` paginati
- Parametri: `page` (default 1), `limit` (default 20, max 100)
- Risposta include metadata di paginazione

### Graceful Shutdown (implementato)
- Handler SIGTERM e SIGINT in `server.ts`
- Chiude correttamente il database SQLite prima dell'uscita
- Timeout forzato di 10 secondi se la chiusura non riesce
- Compatibile con PM2, Docker e systemd

## Punti aperti

### 1. System Prompt
Il prompt di sistema attuale e generico. Da personalizzare con:
- Tono di voce specifico di zerox.technology
- Servizi offerti e pricing
- FAQ comuni
- Limiti su cosa l'agente puo/non puo fare
- Lingua di risposta (seguire l'utente? sempre italiano?)

### 2. Storico conversazione
- Attualmente configurato a 50 messaggi di contesto
- Valutare in base ai costi API (piu contesto = piu token = piu costi)
- Considerare un sistema di riassunto per conversazioni lunghe

### 3. Dominio pannello admin
- Attualmente servito sulla stessa porta del webhook (:3000)
- Opzione: sottodominio dedicato (es. admin.zerox.technology)
- Opzione: porta diversa con reverse proxy nginx

### 4. Backup database
- SQLite locale, nessun backup automatico
- Da configurare: cron job per backup periodico del file .db
- Alternativa: rotazione/esportazione periodica conversazioni

### 5. Multi-agente
- Attualmente un singolo agente per tutti gli utenti
- Futuro: profili diversi per diversi numeri WhatsApp
- Futuro: routing basato su lingua o tipo di richiesta

### 6. Monitoring in produzione
- Aggiungere metriche Prometheus per:
  - Messaggi processati/minuto
  - Latenza LLM
  - Errori per tipo
- Dashboard Grafana per visualizzazione
