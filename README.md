# 🎯 FollowUp AI — CRM con AI Integration

**Gestione contatti, task, e progetti con Claude API + Whisper voice transcription**

---

## 📋 Features

✅ **Pipeline contatti** — Kanban di contatti in stage (new → warm → hot → won)  
✅ **Note AI** — Registra voce o scrivi → Claude estrae automaticamente task  
✅ **Task Management** — Crea, assegna, filtra e completa task con deadline  
✅ **Projects** — Traccia prodotti in sviluppo (idea → test → pronto)  
✅ **Team Roles** — Admin/Manager/Agent con RLS database  
✅ **PWA** — Installabile come app mobile/desktop  

---

## 🚀 Setup Locale

### 1. **Clona il repo**
```bash
git clone https://github.com/kamykaramellaaa/followup-ai.git
cd followup-ai
npm install
```

### 2. **Configura le variabili ambiente** (`.env`)
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxx
ANTHROPIC_API_KEY=sk-ant-xxxx
OPENAI_API_KEY=sk-xxxx  # per Whisper
ALLOWED_ORIGINS=http://localhost:3001,https://yourdomain.com
NODE_ENV=development
```

### 3. **Setup Supabase Database**
- Vai su [Supabase Dashboard](https://supabase.com)
- SQL Editor → copia e esegui `supabase-setup.sql`
- Poi esegui `supabase-projects-new.sql` per aggiungere Projects

### 4. **Avvia il server**
```bash
npm start
# Server in ascolto su http://localhost:3001
```

### 5. **Accedi**
- Visita `http://localhost:3001`
- **Primo utente** deve essere promosso ad Admin manualmente:
  - Vai su Supabase → profiles table
  - Modifica il tuo `role` da `agent` → `admin`

---

## 📦 Deploy su Railway

### 1. **Push su GitHub** (già fatto ✓)

### 2. **Crea un progetto Railway**
- Vai su [railway.app](https://railway.app)
- New Project → GitHub repo
- Seleziona `kamykaramellaaa/followup-ai`

### 3. **Configure variabili**
Railway → Variables:
- `SUPABASE_URL` 
- `SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `ALLOWED_ORIGINS` = `https://yourdomain.railway.app`
- `NODE_ENV` = `production`

### 4. **Deploy**
- Railway auto-deploy da main branch
- URL sarà tipo: `https://followup-ai-prod.up.railway.app`

### 5. **Aggiorna Frontend**
```html
<!-- public/index.html -->
const BACKEND = 'https://followup-ai-prod.up.railway.app';  <!-- aggiorna questo -->
```

---

## 📝 API Endpoints

### **Pipeline Contatti**
- `GET /api/contacts` — lista contatti
- `POST /api/contacts` — nuovo contatto
- `PATCH /api/contacts/:id` — aggiorna stage/info
- `DELETE /api/contacts/:id`

### **Task Management**
- `GET /api/tasks` — lista task personali
- `POST /api/tasks` — crea task manuale
- `PATCH /api/tasks/:id` — aggiorna (tipo, priority, deadline, assegna)
- `DELETE /api/tasks/:id`

### **Note + AI Analysis**
- `POST /api/transcribe` — carica audio → Whisper
- `POST /api/ai/analyze` — analizza testo/nota → **salva automaticamente task nel DB**
- `POST /api/ai/suggest-followup` — suggerisci prossimo follow-up

### **Projects (Prodotti in sviluppo)**
- `GET /api/projects?stage=sviluppo&priority=alta` — filtra per stage/priorità
- `POST /api/projects` — nuovo progetto
- `PATCH /api/projects/:id` — aggiorna stage/costo/supplier
- `DELETE /api/projects/:id`
- `GET /api/projects/stats/overview` — dashboard

### **Team**
- `GET /api/team` — lista team member
- `POST /api/team` — aggiungi utente (admin only)

---

## 🔐 Row Level Security (RLS)

Tutti i dati sono protetti a livello database:
- **Contatti**: vedi solo tuoi o quelli del tuo manager
- **Task**: vedi solo assegnati a te o creati da te
- **Projects**: vedi solo tuoi o del tuo team
- **Admin** vede tutto

---

## 🎵 Voice Features

### Registrazione nota (Whisper API)
1. Clicca il bottone microfono
2. Parla
3. Carica automaticamente a OpenAI Whisper
4. Claude analizza il testo e crea i task

### Privacy
- Audio NON è salvato permanentemente
- Solo il testo della trascrizione è memorizzato
- Tutto cifrato in transit (HTTPS)

---

## 📱 PWA (Progressive Web App)

L'app è installabile come app nativa:
- **Desktop**: Clicca "Installa" nella barra  
- **Mobile**: Aggiungi alla home screen (iOS) o "Installa app" (Android)
- Funziona offline (con service worker)

---

## 🧪 Test

### Demo Mode
Compila il file `.env` e prova con i demo:
```javascript
const DEMOS = [
  "Ho chiamato Mario Rossi...",
  "Email da Giulia Ferrari...",
  // vedi nel file
]
```

Clicca "Usa esempio" nella sezione Note AI.

---

## 🐛 Troubleshooting

### "Cannot GET /api/tasks"
→ Backend non in ascolto o route non registrata  
→ Controlla `index.js` e che la route sia: `app.use('/api/tasks', require('./routes/tasks'))`

### "Errore analisi AI"
→ Controlla che `ANTHROPIC_API_KEY` sia valida  
→ Nota deve essere >= 5 caratteri

### "Whisper non funziona"
→ Controlla `OPENAI_API_KEY`  
→ Supporta: webm, mp4, mp3, wav, ogg

### Credenziali Supabase sbagliate
→ Copia da Supabase → Settings → API  
→ Usa la ANON KEY, non la service role

---

## 📊 Database Schema

### `profiles`
- `id` (UUID) — user ID da Auth
- `full_name` — nome utente
- `role` — admin | manager | agent
- `manager_id` — chi ti superviziona

### `contacts`
- `id`, `name`, `company`, `email`, `phone`
- `stage` — new | warm | hot | won | lost
- `owner_id` — chi lo gestisce
- `notes`, `source`

### `tasks`
- `id`, `title`, `type` (task/chiamata/email/meeting)
- `due_date`, `urgent`, `completed`
- `priority` — bassa | media | alta
- `contact_id` — collegato a quale contatto (opzionale)
- `project_id` — collegato a quale progetto (opzionale)
- `assigned_to` — a chi è assegnato
- `ai_generated` — creato da Claude? true/false

### `projects`
- `id`, `name`, `description`
- `market` — Retail | Horeca | Export | Interno
- `stage` — idea | sviluppo | test | pronto
- `priority` — bassa | media | alta
- `supplier`, `weight_format`, `cost_per_unit`
- `owner_id` — chi gestisce il progetto

### `voice_notes`
- `id`, `contact_id`
- `transcript` — testo della trascrizione
- `ai_analysis` — JSON con l'analisi di Claude
- `audio_url` — link al file (opzionale)

---

## 🔄 Workflow Tipico

1. **Registra una nota vocale** (microfono)
   ↓
2. **Whisper trascrrive** il testo
   ↓
3. **Claude analizza** e estrae:
   - Nome contatto / azienda
   - Intenzione
   - Task necessari
   - Urgenza
   - Stadio pipeline consigliato
   ↓
4. **Task salvati automaticamente** nel database
   ↓
5. **Tu puoi**:
   - Assegnare a colleghi
   - Cambiare deadline / priorità
   - Segnare completato

---

## 📖 Documentazione API Completa

```bash
# Crea task manuale
curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Richiamare Mario",
    "type": "chiamata",
    "priority": "alta",
    "due_date": "2026-04-10",
    "urgent": true
  }'

# Lista task
curl http://localhost:3001/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"

# Aggiorna task
curl -X PATCH http://localhost:3001/api/tasks/TASK_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "completed": true,
    "assigned_to_id": "USER_ID"
  }'
```

---

## 🎯 Prossimi Step

- [ ] Importa i progetti existenti da Excel
- [ ] Setup email notifications (quando task assegnato)
- [ ] Integrazione Plaud (per Confluence)
- [ ] Dashboard statistiche avanzate
- [ ] Esportazione report (PDF/CSV)

---

## 📄 License

Privato — Confluencia

---

**Domande?** — Contatta Camilla o il team
