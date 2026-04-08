import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

const ROLE_COLORS = { admin: 'bg-purple-50 text-purple-700', manager: 'bg-blue-50 text-blue-700', agent: 'bg-brand-50 text-brand-600', employee: 'bg-warm-100 text-warm-600' }
const AV_COLORS = ['bg-brand-100 text-brand-700', 'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-orange-100 text-orange-700']

export default function Team() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/team/stats')
      .then(d => setMembers(d.members || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-warm-200 flex-shrink-0">
        <h1 className="text-base font-bold tracking-tight text-warm-900">Membri del team</h1>
        <p className="text-xs text-warm-400 mt-0.5">{members.length} persone</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 scrollbar-none">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-warm-200 animate-pulse"/>)}
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map((m, i) => {
              const initials = m.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={m.id} className="bg-white border border-warm-200 rounded-2xl p-5 hover:border-warm-300 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${AV_COLORS[i % 4]}`}>
                      {initials}
                    </div>
                    <div>
                      <div className="text-sm font-700 text-warm-900">{m.full_name}</div>
                      <span className={`text-2xs font-600 px-2 py-0.5 rounded-full ${ROLE_COLORS[m.role] || ''}`}>{m.role}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { n: m.contacts_total, l: 'Contatti' },
                      { n: m.tasks_open, l: 'Task aperti' },
                      { n: m.tasks_urgent, l: 'Urgenti', red: m.tasks_urgent > 0 },
                    ].map(({ n, l, red }) => (
                      <div key={l} className="bg-warm-50 rounded-xl p-3 text-center">
                        <div className={`text-lg font-700 ${red ? 'text-red-500' : 'text-warm-900'}`}>{n}</div>
                        <div className="text-2xs text-warm-400 mt-0.5">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
