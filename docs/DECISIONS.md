# Decisioni di progetto

Scelte architetturali e punti aperti per lo sviluppo e il deploy.

## Decisioni prese

### Rate Limiting (implementato)
- Globale: 100 richieste/minuto per IP
- Webhook: 60 richieste/minuto per IP
- Login: 5 tentativi per 15 minuti
- Implementato con `express-rate-limit`

### Security Headers (implementato)
- Helmet abilitato su tutte le risposte
- CORS configurabile tramite `CORS_ORIGIN` in `.env`
- Validazione `JWT_SECRET` all'avvio — blocca se usa default insicuro

### Logging (implementato)
- Structured logging con pino
- Pretty print in sviluppo, JSON in produzione
- Utilizzato in LLM, media processing, handoff

### Testing (implementato)
- Framework: Vitest
- 44 test unitari: database, auth, handoff, LLM routing
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

### 3. Template email handoff
- Formato attuale: testo semplice con ultimi 10 messaggi
- Da valutare: HTML con formattazione, link diretto a WhatsApp
- Aggiungere pulsante "rispondi" che apre WhatsApp Web?

### 4. Canali notifica aggiuntivi
- Attualmente solo email per handoff
- Possibile aggiunta: Telegram bot per notifiche real-time
- Webhook generico per integrazioni custom

### 5. Dominio pannello admin
- Attualmente servito sulla stessa porta del webhook (:3000)
- Opzione: sottodominio dedicato (es. admin.zerox.technology)
- Opzione: porta diversa con reverse proxy nginx

### 6. Backup database
- SQLite locale, nessun backup automatico
- Da configurare: cron job per backup periodico del file .db
- Alternativa: rotazione/esportazione periodica conversazioni

### 7. Multi-agente
- Attualmente un singolo agente per tutti gli utenti
- Futuro: profili diversi per diversi numeri WhatsApp
- Futuro: routing basato su lingua o tipo di richiesta

### 8. Monitoring in produzione
- Aggiungere metriche Prometheus per:
  - Messaggi processati/minuto
  - Latenza LLM
  - Errori per tipo
- Dashboard Grafana per visualizzazione
