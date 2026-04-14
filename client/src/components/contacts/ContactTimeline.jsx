import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

const ICON_MAP = {
  contact: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <path d="M10 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path d="M1 14a6 6 0 0 1 12 0"/>
    </svg>
  ),
  task: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <path d="M2 4h12M2 8h8M2 12h5"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <path d="M3 8l3.5 3.5L13 5"/>
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <path d="M2 8h2l2-4 3 8 2-4h3"/>
    </svg>
  ),
  email: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5"/><path d="M1.5 6l6.5 4 6.5-4"/>
    </svg>
  ),
}

const ICON_COLORS = {
  contact:  'bg-brand-100 text-brand-600',
  task:     'bg-blue-100 text-blue-600',
  check:    'bg-green-100 text-green-600',
  activity: 'bg-amber-100 text-amber-600',
  email:    'bg-purple-100 text-purple-600',
}

function TimelineItem({ event }) {
  const icon = ICON_MAP[event.icon] || ICON_MAP.activity
  const color = ICON_COLORS[event.icon] || ICON_COLORS.activity
  const date = new Date(event.date)

  return (
    <div className="flex gap-3">
      {/* Icon */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
          {icon}
        </div>
        <div className="w-px flex-1 bg-warm-150 mt-1" />
      </div>

      {/* Content */}
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-600 text-warm-900">{event.label}</div>
            {event.detail && <div className="text-xs text-warm-500 mt-0.5">{event.detail}</div>}
            {event.assignee && (
              <div className="text-xs text-warm-400 mt-0.5">→ {event.assignee}</div>
            )}
          </div>
          <div className="text-2xs text-warm-400 flex-shrink-0 text-right mt-0.5">
            <div>{date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</div>
            <div>{date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
        {event.actor && (
          <div className="mt-1 flex items-center gap-1">
            <div className="w-3.5 h-3.5 rounded-full bg-warm-100 flex items-center justify-center text-2xs text-warm-500 font-700 flex-shrink-0">
              {event.actor[0]}
            </div>
            <span className="text-2xs text-warm-400">{event.actor}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function EmailItem({ email }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
          {ICON_MAP.email}
        </div>
        <div className="w-px flex-1 bg-warm-150 mt-1" />
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-600 text-warm-900 truncate">{email.subject || '(nessun oggetto)'}</div>
            <div className="text-xs text-warm-500 mt-0.5 line-clamp-2">{email.preview}</div>
          </div>
          <div className="text-2xs text-warm-400 flex-shrink-0 text-right mt-0.5">
            {new Date(email.received_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400"/>
          <span className="text-2xs text-warm-400">{email.from_name || email.from_email}</span>
          {!email.is_read && <span className="text-2xs text-purple-600 font-600 ml-1">non letta</span>}
        </div>
      </div>
    </div>
  )
}

export default function ContactTimeline({ contactId, contactName, contactEmail }) {
  const [timeline, setTimeline] = useState([])
  const [summary, setSummary] = useState('')
  const [emails, setEmails] = useState([])
  const [loadingTimeline, setLoadingTimeline] = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingEmails, setLoadingEmails] = useState(false)
  const [processingEmails, setProcessingEmails] = useState(false)
  const [outlookConnected, setOutlookConnected] = useState(null)

  useEffect(() => {
    api(`/api/contacts/${contactId}/timeline`)
      .then(d => setTimeline(d.timeline || []))
      .catch(() => {})
      .finally(() => setLoadingTimeline(false))

    api(`/api/contacts/${contactId}/summary`)
      .then(d => setSummary(d.summary || ''))
      .catch(() => {})
      .finally(() => setLoadingSummary(false))

    // Controlla e carica email Outlook
    setLoadingEmails(true)
    api('/api/outlook/emails?limit=50')
      .then(d => {
        if (d.not_connected) { setOutlookConnected(false); return }
        setOutlookConnected(true)
        // Filtra email che corrispondono a questo contatto (per email o nome)
        const filtered = (d.emails || []).filter(e => {
          if (!e.from_email && !e.from_name) return false
          if (contactEmail && e.from_email?.toLowerCase() === contactEmail.toLowerCase()) return true
          if (contactName && e.from_name?.toLowerCase().includes(contactName.split(' ')[0].toLowerCase())) return true
          return false
        })
        setEmails(filtered)
      })
      .catch(() => setOutlookConnected(false))
      .finally(() => setLoadingEmails(false))
  }, [contactId])

  async function processEmails() {
    setProcessingEmails(true)
    try {
      const d = await api('/api/outlook/process-emails', { method: 'POST' })
      alert(`Elaborati ${d.processed} email con Claude. I task sono stati creati automaticamente.`)
    } catch (e) { alert(e.message) }
    setProcessingEmails(false)
  }

  // Unisci timeline + email e ordina per data
  const allEvents = [
    ...timeline.map(e => ({ ...e, _type: 'timeline' })),
    ...emails.map(e => ({ ...e, _type: 'email', date: e.received_at }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date))

  return (
    <div className="space-y-5">
      {/* Riepilogo Claude */}
      <div className="bg-gradient-to-br from-brand-50 to-blue-50 border border-brand-100 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-brand-500">
            <circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5l2 2"/>
          </svg>
          <span className="text-xs font-700 text-brand-700 uppercase tracking-wider">Riepilogo</span>
        </div>
        {loadingSummary ? (
          <div className="space-y-1.5">
            {[1,2,3].map(i => <div key={i} className="h-3 bg-brand-100 rounded animate-pulse" style={{ width: `${70 + i * 10}%` }}/>)}
          </div>
        ) : summary ? (
          <p className="text-sm text-warm-700 leading-relaxed">{summary}</p>
        ) : (
          <p className="text-xs text-warm-400">Nessun dato sufficiente per il riepilogo.</p>
        )}
      </div>

      {/* Email Outlook */}
      {outlookConnected === false && (
        <div className="bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 text-xs text-warm-500">
          Connetti Outlook dalla barra laterale per vedere le email di questo contatto.
        </div>
      )}

      {outlookConnected && emails.length > 0 && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-700 text-warm-400 uppercase tracking-wider">{emails.length} email trovate</span>
          <button onClick={processEmails} disabled={processingEmails}
            className="text-xs font-600 text-brand-600 hover:text-brand-700 disabled:opacity-50">
            {processingEmails ? 'Elaborazione...' : '⚡ Analizza con AI'}
          </button>
        </div>
      )}

      {/* Timeline unificata */}
      <div>
        <p className="text-xs font-700 text-warm-400 uppercase tracking-wider mb-3">Cronologia</p>
        {loadingTimeline ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-7 h-7 rounded-full bg-warm-100 flex-shrink-0"/>
                <div className="flex-1 space-y-1.5 pt-1">
                  <div className="h-3 bg-warm-100 rounded w-2/3"/>
                  <div className="h-2.5 bg-warm-100 rounded w-1/3"/>
                </div>
              </div>
            ))}
          </div>
        ) : allEvents.length === 0 ? (
          <p className="text-sm text-warm-400">Nessun evento ancora.</p>
        ) : (
          <div>
            {allEvents.map((e, i) => (
              e._type === 'email'
                ? <EmailItem key={`email-${e.id}`} email={e} />
                : <TimelineItem key={`ev-${i}`} event={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
