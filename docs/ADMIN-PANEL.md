# Pannello Admin

## Accesso

- URL: `http://<host>:3000/admin`
- Login con username/password
- Sessione JWT (24h), salvata in localStorage
- Rate limit login: 5 tentativi per 15 minuti

## Pagine

### Login (`/admin/`)
- Form username + password
- Redirect automatico a dashboard se gia autenticati

### Dashboard (`/admin/dashboard.html`)
- **Statistiche**: messaggi oggi, utenti attivi, conversazioni totali, messaggi totali
- **Stato Evolution API**: indicatore connesso/disconnesso
- **Conversazioni recenti**: ultime 5 con anteprima

### Impostazioni (`/admin/settings.html`)

| Campo | Descrizione |
|-------|-------------|
| Provider | Claude, OpenAI o Gemini (dropdown) |
| Modello | Lista modelli del provider selezionato |
| API Key Claude | Chiave Anthropic (mascherata) |
| API Key OpenAI | Chiave OpenAI (mascherata) |
| API Key Gemini | Chiave Google AI (mascherata) |
| System Prompt | Textarea con le istruzioni per l'agente |
| Max storico | Numero messaggi di contesto (5-200) |
| Email handoff | Destinatario notifiche escalation |
| Keyword handoff | Parole chiave separate da virgola |
| SMTP | Host, porta, username, password |

Le API key gia salvate appaiono mascherate. Vengono sovrascritte solo se il campo contiene un nuovo valore (i valori mascherati con `••••••••` vengono ignorati).

### Conversazioni (`/admin/conversations.html`)
- Lista conversazioni raggruppate per numero (con paginazione)
- Ricerca full-text nei messaggi (con paginazione)
- Click su una conversazione: vista chat completa
- Badge tipo media (voice/image)
- Navigazione indietro alla lista

## API REST

Tutte le API sotto `/admin/api/` richiedono header `Authorization: Bearer <token>`, tranne `/login`.

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/admin/api/login` | Login, ritorna JWT (rate limit: 5/15min) |
| GET | `/admin/api/stats` | Statistiche dashboard + stato Evolution |
| GET | `/admin/api/settings` | Tutte le impostazioni (API key mascherate) |
| POST | `/admin/api/settings` | Aggiorna impostazioni (solo chiavi consentite) |
| GET | `/admin/api/conversations?page=1&limit=20` | Lista conversazioni (paginata) |
| GET | `/admin/api/conversations/:phone` | Tutti i messaggi di una conversazione |
| GET | `/admin/api/search?q=...&page=1&limit=20` | Ricerca nei messaggi (paginata) |
| GET | `/admin/api/health` | Health check dettagliato (DB + Evolution) |

### Paginazione

Le API `/conversations` e `/search` supportano paginazione tramite query params:
- `page` — numero pagina (default: 1)
- `limit` — risultati per pagina (default: 20, max: 100)

Risposta paginata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Health Check

`GET /health` (pubblico, senza auth):
```json
{ "status": "ok", "timestamp": "2025-01-15T10:30:00.000Z" }
```

`GET /admin/api/health` (autenticato, dettagliato):
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "services": {
    "database": { "status": "ok" },
    "evolution": { "status": "connected", "instance": "zerox" }
  }
}
```

## Sicurezza

- Password hashata con bcrypt (10 rounds)
- JWT con scadenza 24h
- API key mascherate nelle risposte GET
- Valori mascherati non sovrascrivono quelli salvati
- Rate limiting su login (5 tentativi / 15 minuti)
- Security headers via helmet
- CORS configurabile
