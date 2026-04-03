# 📧 Setup Microsoft Azure — Outlook Calendar Integration

Guida passo-passo per configurare l'integrazione Outlook Calendar con FollowUp AI.

---

## 📋 Prerequisites

- Account Microsoft 365 aziendale (o personale)
- Admin access su Azure Portal
- Email admin: `admin@confluencia.it`

---

## 🔐 Step 1: Registra l'app su Azure Portal

### 1.1 Vai ad Azure Portal
- https://portal.azure.com
- Login con `admin@confluencia.it`

### 1.2 Crea un'app registration
1. Sidebar sinistro → **Azure Active Directory**
2. **App registrations** → **New registration**
3. Nome: `FollowUp AI Calendar Integration`
4. Account type: **Accounts in this organizational directory only** (se aziendale)
   - Oppure: **Accounts in any organizational directory and personal Microsoft accounts** (se personale)
5. Redirect URI: **Web** → `https://yourdomain.railway.app/api/outlook/callback`
   - Localmente: `http://localhost:3001/api/outlook/callback`
6. Click **Register**

### 1.3 Copia i dati (li useremo dopo)
Dalla pagina dell'app, copia:
- **Application (client) ID** → `MICROSOFT_CLIENT_ID`
- **Directory (tenant) ID** → `MICROSOFT_TENANT`

Questi valori vanno in `.env` su Railway.

---

## 🔑 Step 2: Crea un Client Secret

1. Sidebar → **Certificates & secrets**
2. **Client secrets** → **New client secret**
3. Description: `FollowUp AI Backend`
4. Expires: **24 months**
5. Click **Add**
6. **Copia subito il Value** (non lo vedrai più!) → `MICROSOFT_CLIENT_SECRET`

⚠️ **IMPORTANTE**: Salva il secret in un posto sicuro (password manager). Non è più visibile dopo.

---

## 🎫 Step 3: Configura le API Permissions

1. Sidebar → **API permissions**
2. **Add a permission**
3. **Microsoft Graph** → **Delegated permissions**
4. Cerca: `Calendars.ReadWrite`
5. Checkmark su `Calendars.ReadWrite` e `offline_access`
6. Click **Add permissions**

Dovrebbe apparire:
```
Calendars.ReadWrite (Delegated)
offline_access (Delegated)
```

---

## 🌐 Step 4: Configura Redirect URI (se non l'hai fatto)

1. Sidebar → **Authentication**
2. **Platform configurations** → **Add a platform** → **Web**
3. Redirect URIs:
   ```
   http://localhost:3001/api/outlook/callback
   https://yourdomain.railway.app/api/outlook/callback
   ```
4. Controlla:
   - ✅ "Allow public client flows" = OFF
   - ✅ "Supported account types" = scelto prima
5. **Save**

---

## 🚀 Step 5: Configura Railway Variables

Una volta che hai i 3 dati da Azure:
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT`

Vai su **Railway Dashboard** → **Project** → **Variables**:

```env
MICROSOFT_CLIENT_ID = xxxx-xxxx-xxxx-xxxx
MICROSOFT_CLIENT_SECRET = xxxxx (quello che hai copiato)
MICROSOFT_TENANT = xxxx-xxxx-xxxx-xxxx
MICROSOFT_REDIRECT_URI = https://yourdomain.railway.app/api/outlook/callback
FRONTEND_URL = https://yourdomain.railway.app
```

Salva e redeploy.

---

## ✅ Step 6: Esegui il SQL in Supabase

Una volta deployato su Railway:

1. Vai a Supabase Dashboard
2. SQL Editor
3. Copia il contenuto di `supabase-outlook.sql`
4. Esegui

Questo crea le tabelle:
- `outlook_tokens` — per salvare i token OAuth
- `task_outlook_sync` — per tracciare i collegamenti task ↔ Outlook events

---

## 🎯 Step 7: Testa l'integrazione

1. Accedi all'app: `https://yourdomain.railway.app`
2. Clicca il bottone **📧 Connetti Outlook** (topbar in alto a destra)
3. Si apre una finestra di login Microsoft
4. Login con `admin@confluencia.it` (o un account Microsoft 365)
5. Autorizza l'accesso a Calendar
6. Redirect automatico back all'app
7. Bottone diventa **✓ Outlook connesso**

---

## 📌 Step 8: Crea un task e vedi se sincronizza

1. Vai in **Task**
2. Crea un nuovo task con una **deadline**
3. Il task dovrebbe apparire automaticamente in **Outlook Calendar**
4. Controlla su Outlook (web.outlook.com o app desktop)

Se vedi l'evento:
- ✅ **Integration funziona!**

Se non appare:
- Controlla i Logs su Railway (Dashboard → Logs)
- Verifica che le variabili siano corrette
- Controlla che le API permissions siano state aggiunte

---

## 🔄 Sincronizzazione bidirezionale

### Task → Outlook Calendar ✅
Quando crei o aggiorni un task, **automaticamente**:
- Crea un evento in Outlook
- Imposta reminder a 8 ore prima (mattino stesso)
- Categorizza l'evento

### Outlook Calendar → Task ❌ (Non implementato)
Se completi l'evento in Outlook, **non sincronizza automaticamente** nell'app.
(Puoi farlo manualmente dal modal task)

---

## 🛠️ Troubleshooting

### "Cannot authorize - invalid client"
→ Controlla che `MICROSOFT_CLIENT_ID` sia corretto  
→ Controlla che l'Redirect URI sia esatto in Azure

### "Access denied"
→ Verifica che `Calendars.ReadWrite` sia nelle API permissions  
→ Controlla che l'utente abbia accesso a Outlook

### "Token expired"
→ L'app refresha automaticamente i token  
→ Se continua a fare errori, ricollega Outlook

### Evento non appare in Outlook
→ Controlla che la deadline del task sia futura  
→ Aspetta 1-2 minuti per la sincronizzazione  
→ Refresha Outlook Calendar

---

## 📋 Checklist finale

- [ ] App registration creata su Azure
- [ ] Client ID copiato
- [ ] Client Secret copiato
- [ ] Tenant ID copiato
- [ ] API Permissions aggiunte (Calendars.ReadWrite)
- [ ] Redirect URI configurato
- [ ] Railway variables salvate
- [ ] App deployata
- [ ] SQL eseguito in Supabase
- [ ] Test: connessione Outlook funziona
- [ ] Test: task con deadline sincronizza
- [ ] ✨ FATTO!

---

## 📞 Support

Se hai problemi:
1. Controlla i Logs (Railway Dashboard)
2. Verifica le variabili environment
3. Controlla Azure Portal per gli errori di API
4. Ricollega Outlook (bottone 📧)

---

**Buon setup! Una volta fatto, il team riceverà automaticamente i reminder Outlook per ogni task.** 🎉
