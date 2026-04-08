import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

const STAGES = [
  { key: 'new',  label: 'Nuovi',  color: 'text-blue-600',  dot: 'bg-blue-400' },
  { key: 'warm', label: 'Tiepidi',color: 'text-amber-600', dot: 'bg-amber-400' },
  { key: 'hot',  label: 'Caldi',  color: 'text-orange-600',dot: 'bg-orange-400' },
  { key: 'won',  label: 'Vinti',  color: 'text-brand-600', dot: 'bg-brand-500' },
]

const AVATARS = ['bg-brand-100 text-brand-700', 'bg-blue-100 text-blue-700', 'bg-orange-100 text-orange-700', 'bg-purple-100 text-purple-700']

export default function Pipeline() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/contacts')
      .then(d => setContacts(d.contacts || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-warm-200 flex items-center gap-3 flex-shrink-0">
        <div>
          <h1 className="text-base font-bold tracking-tight text-warm-900">Pipeline</h1>
          <p className="text-xs text-warm-400 mt-0.5">{contacts.length} contatti attivi</p>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex flex-1 overflow-x-auto scrollbar-none bg-warm-50">
        {STAGES.map(stage => {
          const cards = contacts.filter(c => c.stage === stage.key)
          return (
            <div key={stage.key} className="min-w-[240px] flex-1 flex flex-col border-r border-warm-200 last:border-r-0">
              {/* Column header */}
              <div className="px-4 py-3 bg-white border-b border-warm-200 flex items-center gap-2 flex-shrink-0">
                <div className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                <span className={`text-xs font-700 uppercase tracking-widest ${stage.color}`}>{stage.label}</span>
                <span className="ml-auto text-xs font-600 text-warm-400 bg-warm-100 px-2 py-0.5 rounded-full">{cards.length}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-none">
                {loading && [1,2].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-warm-200 p-3 animate-pulse">
                    <div className="h-3 bg-warm-100 rounded mb-2 w-3/4" />
                    <div className="h-2.5 bg-warm-100 rounded w-1/2" />
                  </div>
                ))}
                {!loading && cards.map((c, i) => (
                  <ContactCard key={c.id} contact={c} avatarClass={AVATARS[i % 4]} />
                ))}
                {!loading && cards.length === 0 && (
                  <div className="text-xs text-warm-300 text-center py-8">Nessun contatto</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ContactCard({ contact, avatarClass }) {
  const initials = contact.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const openTasks = (contact.tasks || []).filter(t => !t.completed).slice(0, 2)

  return (
    <div className="bg-white rounded-xl border border-warm-200 p-3 cursor-pointer hover:border-warm-300 hover:shadow-sm transition-all">
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarClass}`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-600 text-warm-900 truncate">{contact.name}</div>
          <div className="text-xs text-warm-400 truncate">{contact.company}</div>
        </div>
      </div>

      {contact.owner && (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-1 h-1 rounded-full bg-brand-400" />
          <span className="text-xs text-warm-500">{contact.owner.full_name}</span>
        </div>
      )}

      {openTasks.map(t => (
        <div key={t.id} className="flex items-center gap-1.5 py-1 border-t border-warm-100">
          <div className={`w-1 h-1 rounded-full flex-shrink-0 ${
            t.due_date && t.due_date < new Date().toISOString().split('T')[0] ? 'bg-red-400' : 'bg-warm-200'
          }`} />
          <span className="text-xs text-warm-500 truncate">{t.title}</span>
        </div>
      ))}
    </div>
  )
}
