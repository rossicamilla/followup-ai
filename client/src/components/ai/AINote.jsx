import { useState, useRef } from 'react'
import { api } from '../../lib/api'
import { useApp } from '../../App'

const DEMOS = [
  { label: '📞 Chiamata', text: 'Ho chiamato Mario Rossi di Rossi Alimentari. Vuole sconto 5% sul lotto frozen 200kg. Richiamare giovedì con proposta.' },
  { label: '📧 Email', text: 'Email da Giulia Ferrari di GDO Nord Est. Ha visto campioni OOH!, vuole prezzi per 500 pz entro fine settimana.' },
  { label: '🤝 Fiera', text: 'Incontrato Luca Bianchi al Cibus. 3 ristoranti Milano, cerca dessert frozen. Ricontattare prossima settimana.' },
  { label: '⚡ Urgente', text: 'URGENTE — Anna Martini di SISA: fornitore in crisi, cercano 800 pz frozen entro venerdì. Richiamarla subito!' },
]

export default function AINote() {
  const { profile, team } = useApp()
  const [note, setNote] = useState('')
  const [assignee, setAssignee] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isRec, setIsRec] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [saved, setSaved] = useState(false)
  const mediaRec = useRef(null)
  const chunks = useRef([])

  async function toggleRec() {
    if (!isRec) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null)
      if (!stream) return alert('Microfono non disponibile')
      mediaRec.current = new MediaRecorder(stream)
      chunks.current = []
      mediaRec.current.ondataavailable = e => chunks.current.push(e.data)
      mediaRec.current.start()
      setIsRec(true)
    } else {
      mediaRec.current.stop()
      mediaRec.current.stream.getTracks().forEach(t => t.stop())
      setIsRec(false)
      await new Promise(r => mediaRec.current.onstop = r)
      const blob = new Blob(chunks.current, { type: 'audio/webm' })
      const form = new FormData()
      form.append('audio', blob, 'audio.webm')
      try {
        const d = await api('/api/transcribe', { method: 'POST', body: form })
        setNote(d.transcript)
        setTranscript(d.transcript)
      } catch { alert('Errore trascrizione') }
    }
  }

  async function analyze() {
    if (!note.trim()) return
    setLoading(true); setResult(null); setSaved(false)
    const asgnName = assignee ? team.find(m => m.id === assignee)?.full_name : profile?.full_name
    try {
      const d = await api('/api/ai/analyze', { method: 'POST', body: { note, assignee_name: asgnName } })
      setResult(d.analysis)
    } catch (e) { alert(e.message) }
    setLoading(false)
  }

  async function save() {
    if (!result) return
    const wDate = w => {
      const d = new Date()
      if (w === 'oggi') return d.toISOString().split('T')[0]
      if (w === 'domani') { d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] }
      d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]
    }
    try {
      const { contact } = await api('/api/contacts', { method: 'POST', body: {
        name: result.contact_name || 'Contatto', company: result.company,
        stage: result.suggested_stage || 'new', owner_id: assignee || profile?.id, notes: note
      }})
      for (const t of (result.tasks || []))
        await api(`/api/contacts/${contact.id}/tasks`, { method: 'POST', body: {
          title: t.text, task_type: t.type, due_date: wDate(t.when), urgent: t.urgent || false, assigned_to: assignee || profile?.id
        }})
      setSaved(true)
      setNote(''); setResult(null); setTranscript('')
    } catch (e) { alert(e.message) }
  }

  const urgColors = { alta: 'text-red-600 bg-red-50', media: 'text-amber-700 bg-amber-50', bassa: 'text-brand-600 bg-brand-50' }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-warm-200 flex-shrink-0">
        <h1 className="text-base font-bold tracking-tight text-warm-900">Nota AI</h1>
        <p className="text-xs text-warm-400 mt-0.5">Voce o testo → AI estrae task e li assegna al team</p>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Input panel */}
        <div className="flex-1 p-5 overflow-y-auto scrollbar-none border-b md:border-b-0 md:border-r border-warm-200">
          {/* Demo chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            {DEMOS.map((d, i) => (
              <button key={i} onClick={() => setNote(d.text)}
                className="text-xs font-500 px-3 py-1.5 rounded-full border border-warm-200 bg-white text-warm-600 hover:border-brand-300 hover:text-brand-600 transition-all">
                {d.label}
              </button>
            ))}
          </div>

          {/* Voice */}
          <p className="text-xs font-700 text-warm-400 uppercase tracking-wider mb-2">Registrazione vocale</p>
          <button onClick={toggleRec}
            className={`flex items-center gap-2.5 w-full px-4 py-3 rounded-xl border text-sm font-500 transition-all mb-3 ${
              isRec ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-white border-warm-200 text-warm-600 hover:border-warm-300'
            }`}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
              <path d="M8 1a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z"/><path d="M4 8a4 4 0 0 0 8 0M8 12v3"/>
            </svg>
            {isRec ? 'Registrazione in corso... (tocca per fermare)' : 'Inizia registrazione'}
          </button>

          {transcript && (
            <div className="bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 text-xs text-warm-600 mb-3 leading-relaxed">
              {transcript}
            </div>
          )}

          {/* Text */}
          <p className="text-xs font-700 text-warm-400 uppercase tracking-wider mb-2">Oppure scrivi</p>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={5}
            placeholder="Es: Ho chiamato Mario Rossi, interessato al lotto frozen da 200kg..."
            className="w-full text-sm border border-warm-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 bg-warm-50 text-warm-900 leading-relaxed mb-4"/>

          {team.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-600 text-warm-500">Assegna a:</span>
              <select value={assignee} onChange={e => setAssignee(e.target.value)}
                className="text-sm border border-warm-200 rounded-lg px-3 py-1.5 bg-white text-warm-700 focus:outline-none focus:border-brand-400">
                <option value="">Me stesso</option>
                {team.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          )}

          <button onClick={analyze} disabled={loading || !note.trim()}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-xl py-3 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/><span>Analisi...</span></> : <>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M13 8A5 5 0 1 1 3 8"/><path d="M10 5l3 3-3 3"/></svg>
              Analizza con AI
            </>}
          </button>
        </div>

        {/* Result panel */}
        <div className="md:w-80 flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-warm-200 bg-white flex items-center gap-2 flex-shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${result ? 'bg-brand-500 animate-pulse' : 'bg-warm-300'}`} />
            <span className="text-xs font-700 text-warm-400 uppercase tracking-wider">Risultato AI</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 scrollbar-none">
            {!result && !loading && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-warm-300">
                <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1" className="w-10 h-10 opacity-30">
                  <circle cx="20" cy="20" r="17"/><path d="M13 20c0-3.9 3.1-7 7-7s7 3.1 7 7-3.1 7-7 7"/><circle cx="20" cy="20" r="2.5"/>
                </svg>
                <p className="text-xs">Scrivi e premi Analizza</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Contact info */}
                <Section label="Contatto">
                  <div className="bg-warm-50 rounded-xl border border-warm-200 divide-y divide-warm-100">
                    {[['Nome', result.contact_name], ['Azienda', result.company], ['Urgenza', result.urgency]].map(([l, v]) => v && (
                      <div key={l} className="flex items-start gap-2 px-3 py-2">
                        <span className="text-xs text-warm-400 min-w-14">{l}</span>
                        <span className={`text-xs font-600 flex-1 ${l === 'Urgenza' ? `px-2 py-0.5 rounded-full ${urgColors[v] || ''}` : 'text-warm-900'}`}>{v}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Tasks */}
                {result.tasks?.length > 0 && (
                  <Section label={`Task (${result.tasks.length})`}>
                    <div className="space-y-1.5">
                      {result.tasks.map((t, i) => (
                        <div key={i} className="flex items-start gap-2 bg-white rounded-lg border border-warm-200 px-3 py-2">
                          <div className="w-3.5 h-3.5 border border-warm-300 rounded mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-500 text-warm-900">{t.text}</div>
                            <div className="flex gap-1 mt-1">
                              <span className="text-2xs font-600 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{t.type}</span>
                              {t.urgent && <span className="text-2xs font-600 bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">urgente</span>}
                            </div>
                          </div>
                          <span className="text-2xs text-warm-400 flex-shrink-0">{t.when}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Advice */}
                {result.ai_advice && (
                  <div className="bg-amber-50 border-l-2 border-amber-400 rounded-r-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
                    <div className="font-700 uppercase tracking-wider text-amber-600 mb-1">Consiglio AI</div>
                    {result.ai_advice}
                  </div>
                )}

                {saved && (
                  <div className="bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-sm text-brand-700 font-500 text-center">
                    ✓ Contatto salvato!
                  </div>
                )}
              </div>
            )}
          </div>

          {result && !saved && (
            <div className="px-4 py-3 border-t border-warm-200 bg-white flex gap-2 flex-shrink-0">
              <button onClick={() => { setResult(null); setNote(''); setTranscript('') }}
                className="text-sm text-warm-500 hover:text-warm-700 font-500 border border-warm-200 rounded-xl px-3 py-2 transition-colors">
                Nuova
              </button>
              <button onClick={save}
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-xl py-2 transition-colors">
                Salva contatto
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div>
      <p className="text-2xs font-700 text-warm-400 uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  )
}
