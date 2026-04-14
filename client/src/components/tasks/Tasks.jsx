import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useApp, useConfirm } from '../../App'
import TaskEditModal from './TaskEditModal'
import NewTaskModal from './NewTaskModal'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const TYPE_BADGE = {
  chiamata: 'bg-blue-50 text-blue-600',
  email:    'bg-brand-50 text-brand-600',
  meeting:  'bg-purple-50 text-purple-600',
  task:     'bg-warm-100 text-warm-500',
}
const PRI_LEFT = {
  alta:  'border-l-red-400',
  media: 'border-l-amber-400',
  bassa: 'border-l-emerald-400',
}
const AV_COLORS = [
  'bg-blue-100 text-blue-700','bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700','bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700','bg-sky-100 text-sky-700',
]

function initials(n) { return (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() }
function avatarColor(name) {
  let h = 0
  for (const c of (name||'')) h = (h*31 + c.charCodeAt(0)) % AV_COLORS.length
  return AV_COLORS[h]
}

// ── Elemento collegato ────────────────────────────────────────────────────────
function LinkedBadge({ project, opportunity }) {
  if (project?.name) return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-sm flex-shrink-0">📦</span>
      <span className="text-xs font-500 text-warm-700 truncate">{project.name}</span>
    </div>
  )
  if (opportunity) {
    const name = opportunity.contact?.name || opportunity.contact_name || '—'
    const prod = opportunity.project?.name
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm flex-shrink-0">🎯</span>
        <span className="text-xs font-500 text-warm-700 truncate">{name}{prod ? ` · ${prod}` : ''}</span>
      </div>
    )
  }
  return <span className="text-xs text-warm-300">—</span>
}

// ── Riga task ─────────────────────────────────────────────────────────────────
function SortableTask({ task, today, onToggle, onDelete, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const overdue = !task.completed && task.due_date && task.due_date < today
  const priLeft = PRI_LEFT[task.priority] || 'border-l-transparent'

  const urgentRow = task.urgent && !task.completed
  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center gap-0 pl-3 pr-3 py-3 transition-colors group border-b border-warm-100 last:border-b-0 border-l-[3px] ${priLeft} cursor-pointer ${urgentRow ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-warm-50'}`}
      onClick={() => onEdit(task)}>

      {/* Drag handle */}
      <div {...attributes} {...listeners}
        className="flex-shrink-0 w-4 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-30 transition-opacity touch-none"
        onClick={e => e.stopPropagation()}>
        <svg viewBox="0 0 8 14" fill="currentColor" className="w-2 h-3.5 text-warm-400 mx-auto">
          <circle cx="2" cy="2" r="1.1"/><circle cx="6" cy="2" r="1.1"/>
          <circle cx="2" cy="7" r="1.1"/><circle cx="6" cy="7" r="1.1"/>
          <circle cx="2" cy="12" r="1.1"/><circle cx="6" cy="12" r="1.1"/>
        </svg>
      </div>

      {/* Checkbox */}
      <button onClick={e => { e.stopPropagation(); onToggle(task.id, !task.completed) }}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all mr-3 ${
          task.completed ? 'bg-brand-500 border-brand-500' : 'border-warm-300 hover:border-brand-400'
        }`}>
        {task.completed && (
          <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5">
            <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8"/>
          </svg>
        )}
      </button>

      {/* Titolo task — flex-1, ~45% */}
      <div className="flex-1 min-w-0 mr-4">
        <div className={`text-sm font-500 truncate ${
          task.completed ? 'text-warm-300 line-through' : overdue ? 'text-red-600' : 'text-warm-900'
        }`}>
          {task.urgent && !task.completed && <span className="mr-1">⚡</span>}
          {task.title}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {task.task_type && (
            <span className={`text-2xs font-600 px-1.5 py-0.5 rounded-full capitalize ${TYPE_BADGE[task.task_type] || TYPE_BADGE.task}`}>
              {task.task_type}
            </span>
          )}
          {task.ai_generated && (
            <span className="text-2xs font-700 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600">✦ AI</span>
          )}
          {task.notes && (
            <span className="text-2xs text-warm-400 truncate max-w-[160px]" title={task.notes}>
              📝 {task.notes}
            </span>
          )}
        </div>
      </div>

      {/* Obiettivo collegato — ~28%, solo desktop */}
      <div className="hidden md:block w-[26%] flex-shrink-0 min-w-0 mr-4">
        <LinkedBadge project={task.project} opportunity={task.opportunity} />
      </div>

      {/* Assegnato a — ~18%, solo desktop */}
      <div className="hidden md:flex w-[16%] flex-shrink-0 items-center gap-1.5 min-w-0 mr-4">
        {task.assigned_to ? (
          <>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-2xs font-700 flex-shrink-0 ${avatarColor(task.assigned_to.full_name)}`}>
              {initials(task.assigned_to.full_name)}
            </div>
            <span className="text-xs font-500 text-warm-700 truncate">{task.assigned_to.full_name}</span>
          </>
        ) : (
          <div className="w-6 h-6 rounded-full border-2 border-dashed border-warm-200"/>
        )}
      </div>

      {/* Scadenza — ~10%, solo desktop */}
      <div className="hidden md:flex w-[10%] flex-shrink-0 justify-start">
        {task.due_date ? (
          <span className={`text-xs font-500 px-2.5 py-1 rounded-full border whitespace-nowrap ${
            overdue ? 'bg-red-50 text-red-600 border-red-200' : 'text-warm-500 border-warm-200'
          }`}>
            {overdue ? '⚠ ' : ''}{new Date(task.due_date+'T12:00:00').toLocaleDateString('it-IT',{day:'numeric',month:'short'})}
          </span>
        ) : (
          <span className="text-xs text-warm-400 border border-warm-200 rounded-full px-2.5 py-1 whitespace-nowrap">Nessuna</span>
        )}
      </div>

      {/* Elimina */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1"
        onClick={e => e.stopPropagation()}>
        <button onClick={() => onDelete(task.id)}
          className="text-warm-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
        </button>
      </div>
    </div>
  )
}

// ── Vista principale ──────────────────────────────────────────────────────────
export default function Tasks() {
  const { profile } = useApp()
  const confirm = useConfirm()
  const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager'

  const [tasks, setTasks]                   = useState([])
  const [loading, setLoading]               = useState(true)
  const [viewTab, setViewTab]               = useState('a-me')
  const [filterPri, setFilterPri]           = useState('')
  const [includeCompleted, setIncludeCompleted] = useState(false)
  const [searchQuery, setSearchQuery]       = useState('')
  const [editTask, setEditTask]             = useState(null)
  const [showNew, setShowNew]               = useState(false)
  const [processingEmails, setProcessingEmails] = useState(false)
  const [emailResult, setEmailResult]       = useState(null)
  const [outlookConnected, setOutlookConnected] = useState(false)
  const [syncing, setSyncing]               = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const load = () => {
    api('/api/tasks')
      .then(d => setTasks(d.tasks || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (isAdminOrManager) {
      api('/api/outlook/status').then(d => setOutlookConnected(d.connected)).catch(() => {})
    }
  }, [profile])

  async function syncCRM() {
    setSyncing(true); setEmailResult(null)
    try {
      const r = await api('/api/outlook/sync-now', { method: 'POST', body: {} })
      setEmailResult({ ok: true, syncMsg: `${r.processed} email analizzate · ${r.updated} aggiornamenti CRM` })
      if (r.updated > 0) load()
    } catch (e) {
      setEmailResult({ ok: false, error: e.message })
    }
    setSyncing(false)
  }

  async function processEmails() {
    setProcessingEmails(true); setEmailResult(null)
    try {
      const r = await api('/api/outlook/process-emails', { method: 'POST', body: {} })
      setEmailResult({ ok: true, count: r.processed })
      if (r.processed > 0) load()
    } catch (e) { setEmailResult({ ok: false, error: e.message }) }
    setProcessingEmails(false)
  }

  const tabFiltered = !isAdminOrManager
    ? tasks
    : viewTab === 'a-me'
      ? tasks.filter(t => t.assigned_to?.id === profile?.id)
      : tasks.filter(t => t.created_by === profile?.id && t.assigned_to?.id !== profile?.id)

  const filtered = tabFiltered.filter(t => {
    if (!includeCompleted && t.completed) return false
    if (filterPri && t.priority !== filterPri) return false
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const countAMe  = tasks.filter(t => t.assigned_to?.id === profile?.id && !t.completed).length
  const countDaMe = tasks.filter(t => t.created_by === profile?.id && t.assigned_to?.id !== profile?.id && !t.completed).length
  const openCount = filtered.filter(t => !t.completed).length

  async function toggle(id, completed) {
    await api(`/api/tasks/${id}`, { method: 'PATCH', body: { completed } })
    load()
  }
  async function deleteTask(id) {
    if (!await confirm('Eliminare questo task?', { danger: true, confirmLabel: 'Elimina' })) return
    await api(`/api/tasks/${id}`, { method: 'DELETE' })
    load()
  }
  async function deleteCompleted() {
    const completedIds = tabFiltered.filter(t => t.completed).map(t => t.id)
    if (!completedIds.length) return
    if (!await confirm(`Eliminare ${completedIds.length} task completate?`, { danger: true, confirmLabel: 'Elimina' })) return
    await Promise.all(completedIds.map(id => api(`/api/tasks/${id}`, { method: 'DELETE' })))
    load()
  }
  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    setTasks(prev => {
      const ids = filtered.map(t => t.id)
      const oldIdx = ids.indexOf(active.id), newIdx = ids.indexOf(over.id)
      const reorderedIds = arrayMove(ids, oldIdx, newIdx)
      const result = [...prev]
      const positions = prev.reduce((acc, t, i) => { if (ids.includes(t.id)) acc.push(i); return acc }, [])
      reorderedIds.forEach((id, i) => { result[positions[i]] = prev.find(t => t.id === id) })
      return result
    })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      {/* Header */}
      <div className="px-6 pt-5 pb-0 bg-white flex-shrink-0">

        {/* Riga titolo + contatore */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-bold tracking-tight text-warm-900">Task & Reminder</h1>
            <p className="text-xs text-warm-400 mt-0.5">
              {openCount > 0 ? `${openCount} aperte` : 'Nessun task aperto'}
              {tasks.filter(t => t.ai_generated && !t.completed).length > 0 && (
                <span className="ml-2 text-purple-500 font-600">
                  · {tasks.filter(t => t.ai_generated && !t.completed).length} da email
                </span>
              )}
            </p>
          </div>
          {outlookConnected && isAdminOrManager && (
            <div className="flex items-center gap-1.5">
              <button onClick={syncCRM} disabled={syncing}
                title="Sincronizza email con CRM: aggiorna progetti, pipeline e contatti"
                className="flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-40">
                {syncing
                  ? <span className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"/>
                  : <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M2 8a6 6 0 1 0 1-3.3"/><path d="M2 2v4h4"/></svg>
                }
                {syncing ? 'Sync...' : 'Sync CRM'}
              </button>
              <button onClick={processEmails} disabled={processingEmails}
                className="flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40">
                {processingEmails
                  ? <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/>
                  : <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><rect x="1.5" y="3.5" width="13" height="10" rx="1.5"/><path d="M1.5 6.5h13M5.5 6.5v7"/></svg>
                }
                {processingEmails ? 'Analisi...' : 'Email'}
              </button>
            </div>
          )}
        </div>

        {emailResult && (
          <div className={`mb-3 px-3 py-2 rounded-xl text-xs font-500 flex items-center justify-between ${
            emailResult.ok ? 'bg-purple-50 text-purple-700' : 'bg-red-50 text-red-600'
          }`}>
            <span>{emailResult.ok ? (emailResult.syncMsg || (emailResult.count > 0 ? `✦ ${emailResult.count} email analizzate` : '✦ Nessuna email nuova')) : `✗ ${emailResult.error}`}</span>
            <button onClick={() => setEmailResult(null)} className="opacity-50 hover:opacity-100 ml-2">✕</button>
          </div>
        )}

        {/* Tab + Nuovo task sulla stessa riga */}
        <div className="flex items-end justify-between border-b border-warm-100">
          {isAdminOrManager ? (
            <div className="flex items-center gap-0">
              {[
                { k: 'a-me',  label: 'Assegnate a me', count: countAMe  },
                { k: 'da-me', label: 'Assegnate da me', count: countDaMe },
              ].map(({ k, label, count }) => (
                <button key={k} onClick={() => setViewTab(k)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-600 border-b-2 transition-all ${
                    viewTab === k ? 'border-brand-500 text-warm-900' : 'border-transparent text-warm-400 hover:text-warm-600'
                  }`}>
                  {label}
                  {count > 0 && (
                    <span className={`text-2xs font-700 px-1.5 py-0.5 rounded-full ${
                      viewTab === k ? 'bg-brand-500 text-white' : 'bg-warm-100 text-warm-500'
                    }`}>{count}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div/>
          )}
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-sm font-700 rounded-xl px-4 py-2 mb-1.5 shadow-sm transition-all">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 flex-shrink-0">
              <path d="M8 3v10M3 8h10"/>
            </svg>
            Nuovo task
          </button>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex items-center gap-3 px-6 py-2.5 border-b border-warm-100 flex-shrink-0 bg-white">
        {/* Priorità */}
        <select value={filterPri} onChange={e => setFilterPri(e.target.value)}
          className="text-xs border border-warm-200 rounded-lg px-2.5 py-1.5 bg-white text-warm-600 font-500 focus:outline-none focus:border-brand-400">
          <option value="">Tutte le priorità</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="bassa">Bassa</option>
        </select>

        {/* Spacer */}
        <div className="flex-1"/>

        {/* Elimina completate — visibile solo quando il toggle è attivo */}
        {includeCompleted && tabFiltered.some(t => t.completed) && (
          <button onClick={deleteCompleted}
            className="text-xs font-600 text-red-500 hover:text-red-600 border border-red-200 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
            Elimina completate
          </button>
        )}

        {/* Includi completate */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <div onClick={() => setIncludeCompleted(v => !v)}
            className={`w-8 rounded-full relative transition-colors flex-shrink-0 ${includeCompleted ? 'bg-brand-500' : 'bg-warm-200'}`}
            style={{height:'18px'}}>
            <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${includeCompleted ? 'left-[17px]' : 'left-0.5'}`}/>
          </div>
          <span className="text-xs text-warm-500 font-500 whitespace-nowrap">Includi completate</span>
        </label>

        {/* Cerca */}
        <div className="relative">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-warm-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <circle cx="6.5" cy="6.5" r="4"/><path d="M11 11l2.5 2.5"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cerca task..."
            className="text-xs border border-warm-200 rounded-lg pl-8 pr-3 py-1.5 bg-white text-warm-700 font-500 focus:outline-none focus:border-brand-400 w-44"
          />
        </div>
      </div>

      {/* Intestazioni colonne */}
      <div className="flex items-center pl-10 pr-3 py-2 bg-warm-50 border-b border-warm-100 flex-shrink-0">
        <div className="flex-1 mr-4 text-2xs font-700 text-warm-400 uppercase tracking-wider">Titolo task</div>
        <div className="hidden md:block w-[26%] mr-4 flex-shrink-0 text-2xs font-700 text-warm-400 uppercase tracking-wider">Obiettivo collegato</div>
        <div className="hidden md:block w-[16%] mr-4 flex-shrink-0 text-2xs font-700 text-warm-400 uppercase tracking-wider">Assegnato a</div>
        <div className="hidden md:block w-[10%] flex-shrink-0 text-2xs font-700 text-warm-400 uppercase tracking-wider">Scadenza</div>
        <div className="w-16 flex-shrink-0"/>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {loading && (
          <div className="p-6 space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-12 bg-warm-50 rounded-xl animate-pulse"/>)}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-warm-300 gap-3 pb-20">
            <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1" className="w-10 h-10 opacity-40">
              <path d="M14 20l5 5L26 14"/><circle cx="20" cy="20" r="17"/>
            </svg>
            <p className="text-sm">
              {viewTab === 'a-me' && isAdminOrManager ? 'Nessun task assegnato a te'
               : viewTab === 'da-me' ? 'Nessun task che hai assegnato ad altri'
               : 'Nessun task.'}
            </p>
            <button onClick={() => setShowNew(true)}
              className="mt-1 text-sm font-600 text-brand-500 hover:text-brand-600 transition-colors">
              + Crea il primo task
            </button>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <div>
                {filtered.map(t => (
                  <SortableTask key={t.id} task={t} today={today}
                    onToggle={toggle} onDelete={deleteTask} onEdit={setEditTask}/>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Modali */}
      {showNew && (
        <NewTaskModal onClose={() => setShowNew(false)} onCreated={() => { load(); setShowNew(false) }}/>
      )}
      {editTask && (
        <TaskEditModal task={editTask} onClose={() => setEditTask(null)}
          onSaved={() => { load(); setEditTask(null) }}/>
      )}
    </div>
  )
}
