# Decisioni aperte

Punti da definire insieme durante lo sviluppo e il deploy.

## 1. System Prompt
Il prompt di sistema attuale e generico. Da personalizzare con:
- Tono di voce specifico di zerox.technology
- Servizi offerti e pricing
- FAQ comuni
- Limiti su cosa l'agente puo/non puo fare
- Lingua di risposta (seguire l'utente? sempre italiano?)

## 2. Storico conversazione
- Attualmente configurato a 50 messaggi di contesto
- Valutare in base ai costi API (piu contesto = piu token = piu costi)
- Considerare un sistema di riassunto per conversazioni lunghe

## 3. Template email handoff
- Formato attuale: testo semplice con ultimi 10 messaggi
- Da valutare: HTML con formattazione, link diretto a WhatsApp
- Aggiungere pulsante "rispondi" che apre WhatsApp Web?

## 4. Rate limiting
- Al momento nessun limite messaggi/minuto per utente
- Da considerare per prevenire abusi e controllare costi API
- Possibile implementazione: max N messaggi per utente per minuto

## 5. Canali notifica aggiuntivi
- Attualmente solo email per handoff
- Possibile aggiunta: Telegram bot per notifiche real-time
- Webhook generico per integrazioni custom

## 6. Dominio pannello admin
- Attualmente servito sulla stessa porta del webhook (:3000)
- Opzione: sottodominio dedicato (es. admin.zerox.technology)
- Opzione: porta diversa con reverse proxy nginx

## 7. Backup database
- SQLite locale, nessun backup automatico
- Da configurare: cron job per backup periodico del file .db
- Alternativa: rotazione/esportazione periodica conversazioni

## 8. Multi-agente
- Attualmente un singolo agente per tutti gli utenti
- Futuro: profili diversi per diversi numeri WhatsApp
- Futuro: routing basato su lingua o tipo di richiesta
