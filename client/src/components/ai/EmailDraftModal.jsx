import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

export default function EmailDraftModal({ task, onClose }) {
  const [draft, setDraft] = useState('')
  const [action, setAction] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api('/api/ai/suggest-followup', {
      method: 'POST',
      body: {
        contact_name: task.contact?.name || '',
        company: task.contact?.company || '',
        stage: 'warm',
        last_interaction: '',
        open_tasks: task.title
      }
    }).then(d => {
      setDraft(d.suggestion?.message_draft || '')
      setAction(d.suggestion?.action || '')
      setReason(d.suggestion?.reason || '')
    }).catch(() => setDraft('Errore nella generazione della bozza'))
     .finally(() => setLoading(false))
  }, [])

  function copy() {
    navigator.clipboard.writeText(draft).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-warm-100">
          <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center text-brand-500 text-sm">✉</div>
          <div className="flex-1">
            <div className="text-sm font-700 text-warm-900">Bozza email AI</div>
            <div className="text-xs text-warm-400 truncate">{task.title}</div>
          </div>
          <button onClick={onClose} className="text-warm-300 hover:text-warm-600 transition-colors">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-warm-400">
              <div className="w-4 h-4 border-2 border-warm-200 border-t-brand-500 rounded-full animate-spin" />
              Claude sta scrivendo...
            </div>
          )}

          {!loading && (
            <>
              {action && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
                  💡 {action}
                </div>
              )}
              {reason && <p className="text-xs text-warm-500 leading-relaxed">📌 {reason}</p>}

              <div>
                <label className="block text-xs font-700 text-warm-400 uppercase tracking-wider mb-2">Bozza email</label>
                <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={7}
                  className="w-full text-sm border border-warm-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 text-warm-900 leading-relaxed bg-warm-50"/>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-warm-100 flex gap-2">
          <button onClick={copy} disabled={loading}
            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-xl py-2.5 transition-colors disabled:opacity-40">
            {copied ? '✓ Copiato!' : 'Copia testo'}
          </button>
          <button onClick={onClose} className="px-4 text-sm text-warm-500 hover:text-warm-900 font-500 border border-warm-200 rounded-xl transition-colors">
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
