import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import EmailDraftModal from '../ai/EmailDraftModal'

const TYPE_BADGE = { chiamata: 'bg-blue-50 text-blue-700', email: 'bg-brand-50 text-brand-700', meeting: 'bg-purple-50 text-purple-700', task: 'bg-warm-100 text-warm-600' }
const PRI_BADGE  = { alta: 'bg-red-50 text-red-600', media: 'bg-amber-50 text-amber-700', bassa: 'bg-brand-50 text-brand-600' }

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPri, setFilterPri] = useState('')
  const [filterType, setFilterType] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [draftTask, setDraftTask] = useState(null)

  const load = () => {
    api('/api/tasks')
      .then(d => setTasks(d.tasks || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = tasks.filter(t => {
    if (filterStatus && String(t.completed) !== filterStatus) return false
    if (filterPri && t.priority !== filterPri) return false
    if (filterType && t.type !== filterType) return false
    return true
  })

  async function toggle(id, completed) {
    await api(`/api/tasks/${id}`, { method: 'PATCH', body: { completed } })
    load()
  }

  async function addTask(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await api('/api/tasks', { method: 'POST', body: { title: newTitle, type: 'task', priority: 'media' } })
    setNewTitle('')
    load()
  }

  async function deleteTask(id) {
    if (!confirm('Eliminare questo task?')) return
    await api(`/api/tasks/${id}`, { method: 'DELETE' })
    load()
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-warm-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-base font-bold tracking-tight text-warm-900">Task & Reminder</h1>
            <p className="text-xs text-warm-400 mt-0.5">{filtered.length} task</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: filterStatus, set: setFilterStatus, opts: [['','Tutti'],['false','Aperti'],['true','Completati']], placeholder:'Stato' },
            { value: filterPri, set: setFilterPri, opts: [['','Priorità'],['alta','Alta'],['media','Media'],['bassa','Bassa']], placeholder:'Priorità' },
            { value: filterType, set: setFilterType, opts: [['','Tipo'],['task','Task'],['chiamata','Chiamata'],['email','Email'],['meeting','Meeting']], placeholder:'Tipo' },
          ].map((f, i) => (
            <select key={i} value={f.value} onChange={e => f.set(e.target.value)}
              className="text-xs border border-warm-200 rounded-lg px-3 py-1.5 bg-white text-warm-700 font-medium focus:outline-none focus:border-brand-400">
              {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {loading && (
          <div className="p-6 space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-white rounded-xl border border-warm-200 animate-pulse" />)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-warm-300 gap-2">
            <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1" className="w-10 h-10 opacity-40">
              <path d="M14 20l5 5L26 14"/><circle cx="20" cy="20" r="17"/>
            </svg>
            <p className="text-sm">Nessun task. Creane uno!</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="divide-y divide-warm-100">
            {filtered.map(t => {
              const overdue = !t.completed && t.due_date && t.due_date < today
              return (
                <div key={t.id} className="flex items-start gap-3 px-6 py-3.5 hover:bg-warm-50 transition-colors group">
                  {/* Checkbox */}
                  <button onClick={() => toggle(t.id, !t.completed)}
                    className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                      t.completed ? 'bg-brand-500 border-brand-500' : 'border-warm-300 hover:border-brand-400'
                    }`}>
                    {t.completed && <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5"/></svg>}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-500 ${t.completed ? 'text-warm-300 line-through' : overdue ? 'text-red-600' : 'text-warm-900'}`}>
                      {t.urgent && !t.completed && <span className="mr-1">⚡</span>}
                      {t.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {t.type && <Badge text={t.type} cls={TYPE_BADGE[t.type]} />}
                      {t.priority && <Badge text={t.priority} cls={PRI_BADGE[t.priority]} />}
                      {t.due_date && (
                        <span className={`text-2xs font-500 ${overdue ? 'text-red-500' : 'text-warm-400'}`}>
                          {overdue ? '⚠ ' : ''}{new Date(t.due_date + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {t.assigned_to && <span className="text-2xs text-warm-400">{t.assigned_to.full_name}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => setDraftTask(t)} title="Bozza email AI"
                      className="text-xs text-warm-400 hover:text-brand-500 p-1 rounded hover:bg-brand-50 transition-colors">✉</button>
                    <button onClick={() => deleteTask(t.id)}
                      className="text-warm-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                        <path d="M4 4l8 8M12 4l-8 8"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add task bar */}
      <form onSubmit={addTask} className="px-4 py-3 bg-white border-t border-warm-200 flex gap-2 flex-shrink-0">
        <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
          placeholder="Aggiungi un task..."
          className="flex-1 text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/10 transition-all bg-warm-50"/>
        <button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-lg px-4 py-2 transition-colors">
          Aggiungi
        </button>
      </form>

      {draftTask && <EmailDraftModal task={draftTask} onClose={() => setDraftTask(null)} />}
    </div>
  )
}

function Badge({ text, cls }) {
  return <span className={`text-2xs font-600 px-2 py-0.5 rounded-full capitalize ${cls}`}>{text}</span>
}
