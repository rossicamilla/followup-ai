# ✅ Deploy Checklist — FollowUp AI

Usa questa checklist per deployare l'app in produzione.

---

## 📋 BEFORE DEPLOY

### Supabase Setup
- [ ] Crea un progetto Supabase (https://supabase.com)
- [ ] Copia `SUPABASE_URL` da Settings → API
- [ ] Copia `SUPABASE_ANON_KEY` da Settings → API
- [ ] Vai a SQL Editor
- [ ] Esegui il contenuto di `supabase-setup.sql` (crea tabelle base)
- [ ] Esegui il contenuto di `supabase-projects-new.sql` (crea projects + migliora tasks)
- [ ] Controlla che le tabelle siano create: profiles, contacts, tasks, projects, voice_notes

### API Keys
- [ ] **Anthropic**: vai a https://console.anthropic.com → copia API key
- [ ] **OpenAI**: vai a https://platform.openai.com → copia API key (per Whisper)
- [ ] Testa le chiavi localmente prima di deployare

### GitHub
- [ ] Repo push con `git push origin main` (già fatto ✓)
- [ ] Verifica che tutti i file siano su GitHub: https://github.com/kamykaramellaaa/followup-ai

---

## 🚀 LOCAL TESTING (Prima di Railway)

### 1. Setup locale
```bash
# Clona
git clone https://github.com/kamykaramellaaa/followup-ai.git
cd followup-ai

# Installa dipendenze
npm install
```

### 2. Crea `.env` (nella root)
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
NODE_ENV=development
PORT=3001
```

### 3. Avvia
```bash
npm start
# Visita http://localhost:3001
```

### 4. Test Flow
- [ ] Login con email/password
- [ ] Crea un contatto
- [ ] Registra una nota vocale (microfono)
- [ ] Verifica che Claude analizzi e creis task
- [ ] Crea un nuovo task manuale
- [ ] Filtra task per priority/type
- [ ] Assegna task a un collega
- [ ] Crea un nuovo progetto
- [ ] Sposta progetto tra stage

### 5. Se tutto funziona localmente → vai a Railway

---

## 🚂 RAILWAY DEPLOY

### 1. Crea account Railway
- [ ] Vai a https://railway.app
- [ ] Signup con GitHub
- [ ] Autorizza Railway ad accedere ai tuoi repo

### 2. Crea nuovo progetto
- [ ] Dashboard → New Project
- [ ] Deploy from GitHub
- [ ] Seleziona `kamykaramellaaa/followup-ai`
- [ ] Autorizza

### 3. Aggiungi variabili ambiente
- [ ] Railway → Variables
- [ ] Aggiungi:

```
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_ANON_KEY = eyJxxxxx
ANTHROPIC_API_KEY = sk-ant-xxxxx
OPENAI_API_KEY = sk-xxxxx
ALLOWED_ORIGINS = https://followup-ai-prod.up.railway.app
NODE_ENV = production
PORT = 3001  (opzionale, Railway ne assegna uno)
```

### 4. Deploy
- [ ] Railway farà auto-deploy da main branch
- [ ] Attendi ~2-3 minuti
- [ ] Copia il domain che ti assegna (tipo `followup-ai-prod.up.railway.app`)

### 5. Aggiorna il frontend
- [ ] Apri `public/index.html`
- [ ] Linea ~418: `const BACKEND = 'YOUR_BACKEND_URL';`
- [ ] Cambia con il tuo Railway domain:
  ```javascript
  const BACKEND = 'https://followup-ai-prod.up.railway.app';
  ```
- [ ] Salva, commit, push:
  ```bash
  git add public/index.html
  git commit -m "Update backend URL for production"
  git push origin main
  ```
- [ ] Railway rifarà auto-deploy

### 6. Test in produzione
- [ ] Vai a https://followup-ai-prod.up.railway.app
- [ ] Login
- [ ] Test workflow completo
- [ ] Verifica che i task si salvino nel DB
- [ ] Prova la registrazione vocale

---

## 🔧 FIRST USER SETUP (IMPORTANTE!)

Il primo utente che si registra deve essere promosso ad **Admin** manualmente:

### Via Supabase Dashboard
1. Vai a https://supabase.com → Select Project
2. Table Editor → `profiles`
3. Trova la riga con il tuo user
4. Modifica `role`: `agent` → `admin`
5. Salva

Adesso sei **Admin** e puoi:
- Creare altri utenti
- Assegnare ruoli (agent/manager/admin)
- Accedere a Team view

---

## ⚠️ TROUBLESHOOTING

### "Cannot connect to Supabase"
→ Controlla `SUPABASE_URL` e `SUPABASE_ANON_KEY`  
→ Copia da Supabase → Settings → API (zona sinistra)

### "Authentication error"
→ Controlla che le tabelle `auth.users` e `profiles` siano create  
→ Esegui di nuovo `supabase-setup.sql` completamente

### "Task non si salva"
→ Controlla che `tasks` table esista (da `supabase-setup.sql`)  
→ Verifica che `ANTHROPIC_API_KEY` sia valida

### "Whisper non funziona"
→ Controlla `OPENAI_API_KEY`  
→ File audio deve essere < 25MB
→ Formati supportati: webm, mp4, mp3, wav, ogg

### Railway mostra errore
→ Vai a Logs (nel dashboard Railway)  
→ Copia l'errore e controlla:
  - Variabili ambiente corrette?
  - File `.env` non caricato (normale, usa Variables)
  - Dipendenze installate? (controlla `npm install` localmente)

---

## 📱 DOMAIN CUSTOM (Opzionale)

Se vuoi un dominio personalizzato (es. `crm.confluencia.it`):

1. Railway → Settings → Custom Domain
2. Aggiungi il tuo dominio
3. Railway ti dà le istruzioni DNS
4. Configura DNS dal tuo registrar (GoDaddy, Namecheap, ecc.)
5. Aspetta 24h per propagazione

---

## 🔐 SECURITY CHECKLIST

- [ ] `ANTHROPIC_API_KEY` e `OPENAI_API_KEY` NON sono in git (solo in Railway Variables)
- [ ] `SUPABASE_ANON_KEY` è OK pubblica (è per i client, usare service key per backend sarebbe meglio ma non necessario qui)
- [ ] RLS (Row Level Security) è abilitato su Supabase
- [ ] HTTPS forzato (Railway fa auto)
- [ ] CORS configurato: `ALLOWED_ORIGINS` contiene solo tuoi domain

---

## 📞 SUPPORT

Se hai problemi:
1. Controlla i Logs (Railway Dashboard → Logs)
2. Leggi il README.md
3. Verifica che tutte le variabili siano corrette
4. Prova localmente prima di deployare in prod

---

## ✨ DONE!

Una volta che tutto è online:
- [ ] Condividi il link con il team
- [ ] Crea utenti per i colleghi (loro si registrano, tu li promote ad admin/manager/agent)
- [ ] Importa i contatti da Excel/CRM vecchio
- [ ] Importa i progetti dalla tua lista

**Buon deployment! 🚀**
