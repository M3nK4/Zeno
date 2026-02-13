# Pannello Admin

## Accesso

- URL: `http://<host>:3000/admin`
- Login con username/password
- Sessione JWT (24h), salvata in localStorage

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
| Provider | Claude o OpenAI (dropdown) |
| Modello | Lista modelli del provider selezionato |
| API Key Claude | Chiave Anthropic (mascherata) |
| API Key OpenAI | Chiave OpenAI (mascherata) |
| System Prompt | Textarea con le istruzioni per l'agente |
| Max storico | Numero messaggi di contesto (5-200) |
| Email handoff | Destinatario notifiche escalation |
| Keyword handoff | Parole chiave separate da virgola |
| SMTP | Host, porta, username, password |

Le API key gia salvate appaiono mascherate. Vengono sovrascritte solo se il campo contiene un nuovo valore.

### Conversazioni (`/admin/conversations.html`)
- Lista conversazioni raggruppate per numero
- Ricerca full-text nei messaggi
- Click su una conversazione: vista chat completa
- Badge tipo media (voice/image)
- Navigazione indietro alla lista

## API REST

Tutte le API sotto `/admin/api/` richiedono header `Authorization: Bearer <token>`.

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/admin/api/login` | Login, ritorna JWT |
| GET | `/admin/api/stats` | Statistiche dashboard |
| GET | `/admin/api/settings` | Tutte le impostazioni (key mascherate) |
| POST | `/admin/api/settings` | Aggiorna impostazioni |
| GET | `/admin/api/conversations` | Lista conversazioni |
| GET | `/admin/api/conversations/:phone` | Messaggi di una conversazione |
| GET | `/admin/api/search?q=...` | Ricerca nei messaggi |

## Sicurezza

- Password hashata con bcrypt (10 rounds)
- JWT con scadenza 24h
- API key mascherate nelle risposte GET
- Valori mascherati non sovrascrivono quelli salvati
