import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useApp, useConfirm } from '../../App'
import ContactTimeline from '../contacts/ContactTimeline'
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core'

const STAGES = [
  { key: 'new',  label: 'Nuovi',  color: 'text-blue-600',  dot: 'bg-blue-400' },
  { key: 'warm', label: 'Tiepidi',color: 'text-amber-600', dot: 'bg-amber-400' },
  { key: 'hot',  label: 'Caldi',  color: 'text-orange-600',dot: 'bg-orange-400' },
  { key: 'won',  label: 'Vinti',  color: 'text-brand-600', dot: 'bg-brand-500' },
]

const AVATARS = ['bg-brand-100 text-brand-700', 'bg-blue-100 text-blue-700', 'bg-orange-100 text-orange-700', 'bg-purple-100 text-purple-700']

function ContactModal({ contact, onClose, onUpdated, onDeleted }) {
  const { profile } = useApp()
  const confirm = useConfirm()
  const [activeTab, setActiveTab] = useState('info')
  const [form, setForm] = useState({
    name: contact.name || '',
    company: contact.company || '',
    email: contact.email || '',
    phone: contact.phone || '',
    stage: contact.stage || 'new',
    notes: contact.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { contact: updated } = await api(`/api/contacts/${contact.id}`, { method: 'PATCH', body: form })
      onUpdated(updated)
      onClose()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  async function deleteContact() {
    if (!await confirm(`Eliminare "${contact.name}"?`, { danger: true, confirmLabel: 'Elimina' })) return
    setDeleting(true)
    try {
      await api(`/api/contacts/${contact.id}`, { method: 'DELETE' })
      onDeleted(contact.id)
      onClose()
    } catch (err) { alert(err.message) }
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-warm-100 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-700 flex-shrink-0">
            {contact.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-700 text-warm-900">{contact.name}</div>
            {contact.company && <div className="text-xs text-warm-400">{contact.company}</div>}
          </div>
          <button onClick={onClose} className="text-warm-300 hover:text-warm-600 p-1">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-warm-100 flex-shrink-0 overflow-x-auto scrollbar-none">
          {['info', 'storico'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-5 py-3 text-sm font-600 border-b-2 transition-colors whitespace-nowrap ${activeTab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-warm-400 hover:text-warm-700'}`}>
              {t === 'info' ? 'Informazioni' : '📋 Storico'}
            </button>
          ))}
        </div>

        {/* Storico tab */}
        {activeTab === 'storico' && (
          <div className="flex-1 overflow-y-auto p-5">
            <ContactTimeline contactId={contact.id} contactName={contact.name} contactEmail={contact.email} />
          </div>
        )}

        {/* Form */}
        {activeTab === 'info' && <form onSubmit={save} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
            </div>
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Azienda</label>
              <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
            </div>
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Telefono</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
            </div>
          </div>

          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Stage pipeline</label>
            <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50">
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Note</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50 resize-none"/>
          </div>

          {/* Task del contatto */}
          {(contact.tasks || []).length > 0 && (
            <div>
              <p className="text-xs font-700 text-warm-400 uppercase tracking-wider mb-2">Task collegate ({contact.tasks.length})</p>
              <div className="space-y-1">
                {contact.tasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-xs text-warm-600 bg-warm-50 rounded-lg px-3 py-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.completed ? 'bg-brand-400' : 'bg-warm-300'}`}/>
                    <span className={t.completed ? 'line-through text-warm-300' : ''}>{t.title}</span>
                    {t.due_date && <span className="ml-auto text-warm-400">{new Date(t.due_date + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-warm-100 flex gap-2 flex-shrink-0">
          {profile?.role === 'admin' && (
            <button onClick={deleteContact} disabled={deleting}
              className="text-sm text-red-500 hover:text-red-700 font-500 border border-red-200 hover:border-red-300 rounded-xl px-4 py-2 transition-colors disabled:opacity-40">
              {deleting ? 'Eliminazione...' : 'Elimina'}
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="text-sm text-warm-500 hover:text-warm-700 font-500 border border-warm-200 rounded-xl px-4 py-2 transition-colors">
            {activeTab === 'storico' ? 'Chiudi' : 'Annulla'}
          </button>
          {activeTab === 'info' && (
            <button onClick={save} disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-xl px-5 py-2 transition-colors disabled:opacity-40">
              {saving ? 'Salvo...' : 'Salva'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Pipeline() {
  const { profile } = useApp()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const load = () => {
    api('/api/contacts')
      .then(d => setContacts(d.contacts || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function handleUpdated(updated) {
    setContacts(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
  }

  function handleDeleted(id) {
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  async function handleDragEnd({ active, over }) {
    if (!over) return
    const newStage = over.id
    const contact = contacts.find(c => c.id === active.id)
    if (!contact || contact.stage === newStage) return
    const prevStage = contact.stage
    setContacts(prev => prev.map(c => c.id === active.id ? { ...c, stage: newStage } : c))
    try {
      await api(`/api/contacts/${active.id}`, { method: 'PATCH', body: { stage: newStage } })
    } catch (e) {
      setContacts(prev => prev.map(c => c.id === active.id ? { ...c, stage: prevStage } : c))
    }
  }

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
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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

                {/* Cards — droppable area */}
                <DroppableColumn id={stage.key}>
                  {loading && [1,2].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-warm-200 p-3 animate-pulse">
                      <div className="h-3 bg-warm-100 rounded mb-2 w-3/4" />
                      <div className="h-2.5 bg-warm-100 rounded w-1/2" />
                    </div>
                  ))}
                  {!loading && cards.map((c, i) => (
                    <ContactCard
                      key={c.id}
                      contact={c}
                      avatarClass={AVATARS[i % 4]}
                      onClick={() => setSelected(c)}
                    />
                  ))}
                  {!loading && cards.length === 0 && (
                    <div className="text-xs text-warm-300 text-center py-8">Nessun contatto</div>
                  )}
                </DroppableColumn>
              </div>
            )
          })}
        </div>
      </DndContext>

      {/* Contact modal */}
      {selected && (
        <ContactModal
          contact={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}

function DroppableColumn({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef}
      className={`flex-1 overflow-y-auto p-2 space-y-2 scrollbar-none transition-colors rounded-b-lg ${isOver ? 'bg-brand-50/50 ring-2 ring-inset ring-brand-200' : ''}`}>
      {children}
    </div>
  )
}

function ContactCard({ contact, avatarClass, onClick }) {
  const initials = contact.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const openTasks = (contact.tasks || []).filter(t => !t.completed).slice(0, 2)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: contact.id,
    data: { stage: contact.stage },
  })
  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, zIndex: 50 }
    : undefined

  return (
    <div
      ref={setNodeRef} style={{ ...dragStyle, opacity: isDragging ? 0.45 : 1 }}
      {...attributes}
      onClick={onClick}
      className="bg-white rounded-xl border border-warm-200 p-3 cursor-pointer hover:border-brand-300 hover:shadow-sm transition-all group/card"
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarClass}`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-600 text-warm-900 truncate">{contact.name}</div>
          <div className="text-xs text-warm-400 truncate">{contact.company}</div>
        </div>
        {/* Drag handle */}
        <div {...listeners}
          onClick={e => e.stopPropagation()}
          className="opacity-0 group-hover/card:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-warm-100 touch-none flex-shrink-0">
          <svg viewBox="0 0 8 14" fill="currentColor" className="w-2.5 h-3.5 text-warm-400">
            <circle cx="2" cy="2" r="1.1"/><circle cx="6" cy="2" r="1.1"/>
            <circle cx="2" cy="7" r="1.1"/><circle cx="6" cy="7" r="1.1"/>
            <circle cx="2" cy="12" r="1.1"/><circle cx="6" cy="12" r="1.1"/>
          </svg>
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
