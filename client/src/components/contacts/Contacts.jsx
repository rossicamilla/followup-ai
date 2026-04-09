import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useApp } from '../../App'
import ContactTimeline from './ContactTimeline'

const STAGES = [
  { key: 'new',  label: 'Nuovo',   dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700',   header: 'bg-blue-50' },
  { key: 'warm', label: 'Tiepido', dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700',  header: 'bg-amber-50' },
  { key: 'hot',  label: 'Caldo',   dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700',header: 'bg-orange-50' },
  { key: 'won',  label: 'Vinto',   dot: 'bg-brand-500',  badge: 'bg-brand-50 text-brand-600',  header: 'bg-brand-50' },
]
const stageMap = Object.fromEntries(STAGES.map(s => [s.key, s]))
const AVATARS = ['bg-brand-100 text-brand-700','bg-blue-100 text-blue-700','bg-orange-100 text-orange-700','bg-purple-100 text-purple-700','bg-amber-100 text-amber-700']

// ── Modal di modifica (form) ─────────────────────────────────────────
function EditModal({ contact, onClose, onSaved, onDeleted }) {
  const { profile, team } = useApp()
  const [form, setForm] = useState({
    name: contact.name || '',
    company: contact.company || '',
    email: contact.email || '',
    phone: contact.phone || '',
    stage: contact.stage || 'new',
    notes: contact.notes || '',
    owner_id: contact.owner?.id || '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api(`/api/contacts/${contact.id}`, { method: 'PATCH', body: form })
      onSaved(res.contact)
      onClose()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  async function del() {
    if (!confirm(`Eliminare "${contact.name}"?`)) return
    setDeleting(true)
    try {
      await api(`/api/contacts/${contact.id}`, { method: 'DELETE' })
      onDeleted(contact.id)
      onClose()
    } catch (err) { alert(err.message) }
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-warm-100 flex-shrink-0">
          <div className="flex-1 font-700 text-warm-900">Modifica contatto</div>
          <button onClick={onClose} className="text-warm-300 hover:text-warm-600 p-1">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>

        <form id="edit-contact-form" onSubmit={save} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-none">
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Stage</label>
              <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50">
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            {team.length > 0 && profile?.role !== 'agent' && (
              <div>
                <label className="text-xs font-600 text-warm-500 mb-1 block">Assegnato a</label>
                <select value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}
                  className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50">
                  <option value="">Me stesso</option>
                  {team.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Note</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={4}
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50 resize-none"/>
          </div>
        </form>

        <div className="px-5 py-4 border-t border-warm-100 flex gap-2 flex-shrink-0">
          {profile?.role === 'admin' && (
            <button onClick={del} disabled={deleting}
              className="text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl px-4 py-2 transition-colors disabled:opacity-40">
              {deleting ? '...' : 'Elimina'}
            </button>
          )}
          <div className="flex-1"/>
          <button onClick={onClose} className="text-sm text-warm-500 hover:text-warm-700 border border-warm-200 rounded-xl px-4 py-2 transition-colors">
            Annulla
          </button>
          <button form="edit-contact-form" type="submit" disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-xl px-5 py-2 transition-colors disabled:opacity-40">
            {saving ? 'Salvo...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal nuovo contatto ─────────────────────────────────────────────
function NewContactModal({ onClose, onSaved }) {
  const { profile, team } = useApp()
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', stage: 'new', notes: '', owner_id: '' })
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api('/api/contacts', { method: 'POST', body: form })
      onSaved(res.contact)
      onClose()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-warm-100 flex-shrink-0">
          <div className="flex-1 font-700 text-warm-900">Nuovo contatto</div>
          <button onClick={onClose} className="text-warm-300 hover:text-warm-600 p-1">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <form id="new-contact-form" onSubmit={save} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-none">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus
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
            <label className="text-xs font-600 text-warm-500 mb-1 block">Stage</label>
            <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50">
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          {team.length > 0 && profile?.role !== 'agent' && (
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Assegnato a</label>
              <select value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50">
                <option value="">Me stesso</option>
                {team.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Note</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50 resize-none"/>
          </div>
        </form>
        <div className="px-5 py-4 border-t border-warm-100 flex gap-2 justify-end flex-shrink-0">
          <button onClick={onClose} className="text-sm text-warm-500 hover:text-warm-700 border border-warm-200 rounded-xl px-4 py-2 transition-colors">Annulla</button>
          <button form="new-contact-form" type="submit" disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-xl px-5 py-2 transition-colors disabled:opacity-40">
            {saving ? 'Salvo...' : 'Crea'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Scheda anagrafica completa ────────────────────────────────────────
function ContactProfile({ contact: initialContact, onClose, onUpdated, onDeleted }) {
  const { profile } = useApp()
  const [contact, setContact] = useState(initialContact)
  const [activeTab, setActiveTab] = useState('riepilogo')
  const [editOpen, setEditOpen] = useState(false)

  const stage = stageMap[contact.stage] || stageMap.new
  const initials = contact.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const openTasks = (contact.tasks || []).filter(t => !t.completed)
  const doneTasks  = (contact.tasks || []).filter(t => t.completed)
  const today = new Date().toISOString().split('T')[0]

  function handleSaved(updated) {
    setContact(c => ({ ...c, ...updated }))
    onUpdated(updated)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-2xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">

          {/* Hero header */}
          <div className={`px-6 pt-6 pb-4 ${stage.header} flex-shrink-0`}>
            <div className="flex items-start gap-4">
              {/* Avatar grande */}
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl font-900 text-brand-700 flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-800 text-warm-900 leading-tight">{contact.name}</h2>
                {contact.company && <p className="text-sm text-warm-600 font-500 mt-0.5">{contact.company}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-700 px-2.5 py-1 rounded-full ${stage.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`}/>
                    {stage.label}
                  </span>
                  {contact.owner && (
                    <span className="text-xs text-warm-500 bg-white/70 px-2 py-0.5 rounded-full">
                      {contact.owner.full_name}
                    </span>
                  )}
                  {openTasks.length > 0 && (
                    <span className="text-xs font-600 text-warm-600 bg-white/70 px-2 py-0.5 rounded-full">
                      {openTasks.length} task {openTasks.some(t => t.urgent || t.due_date < today) ? '⚡' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Azioni rapide */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {contact.phone && (
                  <a href={`tel:${contact.phone}`}
                    className="w-9 h-9 rounded-xl bg-white/80 hover:bg-white flex items-center justify-center text-warm-600 hover:text-brand-600 transition-colors shadow-sm">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                      <path d="M14 11.5c0 .5-.1 1-.4 1.5-.3.5-.7.9-1.2 1.1-.9.4-1.9.2-2.8-.1-1.7-.7-3.3-1.8-4.6-3.1C3.7 9.6 2.6 8 1.9 6.3c-.4-.9-.5-1.9-.1-2.8.2-.5.6-.9 1.1-1.2C3.4 2 3.9 2 4.4 2c.2 0 .4 0 .5.1.2.1.4.3.5.5l1.6 2.3c.1.2.2.4.2.6s-.1.4-.2.6L6.2 7c.8 1.5 2.2 2.9 3.8 3.7l.9-.8c.2-.2.4-.2.6-.2s.4.1.6.2l2.3 1.6c.2.1.4.3.5.5.1.2.1.4.1.5z"/>
                    </svg>
                  </a>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`}
                    className="w-9 h-9 rounded-xl bg-white/80 hover:bg-white flex items-center justify-center text-warm-600 hover:text-brand-600 transition-colors shadow-sm">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                      <rect x="1" y="3" width="14" height="10" rx="1.5"/>
                      <path d="M1 4.5l7 5 7-5"/>
                    </svg>
                  </a>
                )}
                <button onClick={() => setEditOpen(true)}
                  className="w-9 h-9 rounded-xl bg-white/80 hover:bg-white flex items-center justify-center text-warm-600 hover:text-brand-600 transition-colors shadow-sm">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                    <path d="M11 2l3 3-8 8H3v-3l8-8z"/>
                  </svg>
                </button>
                <button onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-white/80 hover:bg-white flex items-center justify-center text-warm-400 hover:text-warm-700 transition-colors shadow-sm">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 3l10 10M13 3L3 13"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-warm-100 flex-shrink-0 overflow-x-auto scrollbar-none bg-white">
            {[
              { key: 'riepilogo', label: 'Riepilogo' },
              { key: 'task', label: `Task (${(contact.tasks || []).length})` },
              { key: 'storico', label: '📋 Storico AI' },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-5 py-3 text-sm font-600 border-b-2 transition-colors whitespace-nowrap ${activeTab === t.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-warm-400 hover:text-warm-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto scrollbar-none">

            {/* TAB: Riepilogo */}
            {activeTab === 'riepilogo' && (
              <div className="p-6 space-y-5">
                {/* Dati di contatto */}
                <div>
                  <h3 className="text-xs font-700 text-warm-400 uppercase tracking-wider mb-3">Dati di contatto</h3>
                  <div className="space-y-2">
                    {contact.email && (
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-warm-100 flex items-center justify-center flex-shrink-0">
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-warm-500">
                            <rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 4.5l7 5 7-5"/>
                          </svg>
                        </div>
                        <a href={`mailto:${contact.email}`} className="text-sm text-brand-600 hover:underline">{contact.email}</a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-warm-100 flex items-center justify-center flex-shrink-0">
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-warm-500">
                            <path d="M14 11.5c0 .5-.1 1-.4 1.5-.3.5-.7.9-1.2 1.1-.9.4-1.9.2-2.8-.1-1.7-.7-3.3-1.8-4.6-3.1C3.7 9.6 2.6 8 1.9 6.3c-.4-.9-.5-1.9-.1-2.8.2-.5.6-.9 1.1-1.2C3.4 2 3.9 2 4.4 2c.2 0 .4 0 .5.1.2.1.4.3.5.5l1.6 2.3c.1.2.2.4.2.6s-.1.4-.2.6L6.2 7c.8 1.5 2.2 2.9 3.8 3.7l.9-.8c.2-.2.4-.2.6-.2s.4.1.6.2l2.3 1.6c.2.1.4.3.5.5.1.2.1.4.1.5z"/>
                          </svg>
                        </div>
                        <a href={`tel:${contact.phone}`} className="text-sm text-brand-600 hover:underline">{contact.phone}</a>
                      </div>
                    )}
                    {!contact.email && !contact.phone && (
                      <p className="text-sm text-warm-300">Nessun dato di contatto</p>
                    )}
                  </div>
                </div>

                {/* Note */}
                {contact.notes && (
                  <div>
                    <h3 className="text-xs font-700 text-warm-400 uppercase tracking-wider mb-3">Note</h3>
                    <p className="text-sm text-warm-700 bg-warm-50 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                )}

                {/* Task urgenti in evidenza */}
                {openTasks.length > 0 && (
                  <div>
                    <h3 className="text-xs font-700 text-warm-400 uppercase tracking-wider mb-3">Task in corso ({openTasks.length})</h3>
                    <div className="space-y-2">
                      {openTasks.slice(0, 3).map(t => {
                        const overdue = t.due_date && t.due_date < today
                        return (
                          <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border ${overdue ? 'border-red-100 bg-red-50' : 'border-warm-100 bg-warm-50'}`}>
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${overdue ? 'bg-red-400' : 'bg-warm-300'}`}/>
                            <span className={`text-sm flex-1 ${overdue ? 'text-red-700 font-500' : 'text-warm-700'}`}>{t.title}</span>
                            {t.due_date && <span className={`text-xs flex-shrink-0 ${overdue ? 'text-red-500' : 'text-warm-400'}`}>{new Date(t.due_date+'T12:00:00').toLocaleDateString('it-IT',{day:'numeric',month:'short'})}</span>}
                          </div>
                        )
                      })}
                      {openTasks.length > 3 && (
                        <button onClick={() => setActiveTab('task')} className="text-xs text-brand-500 hover:text-brand-700 font-600">
                          + altri {openTasks.length - 3} task →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Task */}
            {activeTab === 'task' && (
              <div className="p-6">
                {(contact.tasks || []).length === 0 && (
                  <p className="text-sm text-warm-300 text-center py-8">Nessun task collegato</p>
                )}
                {openTasks.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-xs font-700 text-warm-400 uppercase tracking-wider mb-3">Aperti ({openTasks.length})</h3>
                    <div className="space-y-2">
                      {openTasks.map(t => {
                        const overdue = t.due_date && t.due_date < today
                        return (
                          <div key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border ${overdue ? 'border-red-100 bg-red-50' : 'border-warm-100 bg-white'}`}>
                            <div className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 ${overdue ? 'border-red-300' : 'border-warm-300'}`}/>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-500 ${overdue ? 'text-red-700' : 'text-warm-900'}`}>
                                {t.urgent && <span className="mr-1">⚡</span>}{t.title}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {t.type && <span className="text-2xs text-warm-400 capitalize">{t.type}</span>}
                                {t.due_date && <span className={`text-2xs ${overdue ? 'text-red-500 font-600' : 'text-warm-400'}`}>{new Date(t.due_date+'T12:00:00').toLocaleDateString('it-IT',{day:'numeric',month:'short'})}</span>}
                                {t.assigned_to && <span className="text-2xs text-warm-400">{t.assigned_to.full_name?.split(' ')[0]}</span>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {doneTasks.length > 0 && (
                  <div>
                    <h3 className="text-xs font-700 text-warm-400 uppercase tracking-wider mb-3">Completati ({doneTasks.length})</h3>
                    <div className="space-y-1">
                      {doneTasks.map(t => (
                        <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl">
                          <div className="w-4 h-4 rounded bg-brand-400 flex items-center justify-center flex-shrink-0">
                            <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5"/></svg>
                          </div>
                          <span className="text-sm text-warm-400 line-through">{t.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Storico */}
            {activeTab === 'storico' && (
              <div className="p-5">
                <ContactTimeline contactId={contact.id} contactName={contact.name} contactEmail={contact.email}/>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-warm-100 flex items-center gap-2 flex-shrink-0 bg-white">
            <button onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 text-sm font-600 text-warm-700 hover:text-brand-600 border border-warm-200 hover:border-brand-300 rounded-xl px-4 py-2 transition-colors">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M11 2l3 3-8 8H3v-3l8-8z"/></svg>
              Modifica
            </button>
            <div className="flex-1"/>
            <button onClick={onClose} className="text-sm text-warm-500 hover:text-warm-700 border border-warm-200 rounded-xl px-4 py-2 transition-colors">
              Chiudi
            </button>
          </div>
        </div>
      </div>

      {/* Modal modifica (sopra la scheda) */}
      {editOpen && (
        <EditModal
          contact={contact}
          onClose={() => setEditOpen(false)}
          onSaved={updated => { handleSaved(updated); setEditOpen(false) }}
          onDeleted={id => { onDeleted(id); setEditOpen(false); onClose() }}
        />
      )}
    </>
  )
}

// ── Lista contatti (vista principale) ────────────────────────────────
export default function Contacts() {
  const { profile } = useApp()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [selected, setSelected] = useState(null)   // contatto aperto in scheda
  const [newModal, setNewModal] = useState(false)   // modal nuovo contatto

  const load = () => {
    api('/api/contacts')
      .then(d => setContacts(d.contacts || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = contacts.filter(c => {
    if (filterStage && c.stage !== filterStage) return false
    if (search) {
      const q = search.toLowerCase()
      return c.name?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    }
    return true
  })

  function handleUpdated(updated) {
    setContacts(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
    if (selected?.id === updated.id) setSelected(c => ({ ...c, ...updated }))
  }

  function handleDeleted(id) {
    setContacts(prev => prev.filter(c => c.id !== id))
    setSelected(null)
  }

  function handleCreated(contact) {
    setContacts(prev => [contact, ...prev])
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-warm-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-base font-bold tracking-tight text-warm-900">Contatti</h1>
            <p className="text-xs text-warm-400 mt-0.5">{filtered.length} contatti</p>
          </div>
          <button onClick={() => setNewModal(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-lg px-4 py-2 transition-colors flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M8 3v10M3 8h10"/></svg>
            Nuovo
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-36 relative">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-300 pointer-events-none">
              <circle cx="6.5" cy="6.5" r="4.5"/><path d="M14 14l-3-3"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per nome, azienda, email..."
              className="w-full text-xs border border-warm-200 rounded-lg pl-8 pr-3 py-1.5 bg-white text-warm-700 focus:outline-none focus:border-brand-400"/>
          </div>
          <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
            className="text-xs border border-warm-200 rounded-lg px-3 py-1.5 bg-white text-warm-700 font-medium focus:outline-none focus:border-brand-400">
            <option value="">Tutti gli stage</option>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {loading && (
          <div className="p-6 space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-white rounded-xl border border-warm-200 animate-pulse"/>)}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-warm-300 gap-3 py-16">
            <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1" className="w-10 h-10 opacity-40">
              <path d="M20 12a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM6 34a14 14 0 0 1 28 0"/>
            </svg>
            <p className="text-sm">{search || filterStage ? 'Nessun risultato' : 'Nessun contatto. Creane uno!'}</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead className="bg-warm-50 border-b border-warm-200 sticky top-0">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-600 text-warm-500 uppercase tracking-wider">Contatto</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-warm-500 uppercase tracking-wider">Azienda</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-warm-500 uppercase tracking-wider">Stage</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-warm-500 uppercase tracking-wider">Responsabile</th>
                  <th className="text-left px-4 py-3 text-xs font-600 text-warm-500 uppercase tracking-wider">Task aperti</th>
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {filtered.map((c, i) => {
                  const stage = stageMap[c.stage]
                  const openTasks = (c.tasks || []).filter(t => !t.completed)
                  const urgentTask = openTasks.find(t => t.urgent || (t.due_date && t.due_date < today))
                  return (
                    <tr key={c.id} onClick={() => setSelected(c)}
                      className="hover:bg-warm-50 cursor-pointer transition-colors group">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 flex-shrink-0 ${AVATARS[i % 5]}`}>
                            {c.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-600 text-warm-900">{c.name}</div>
                            {c.email && <div className="text-xs text-warm-400">{c.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-warm-600">{c.company || '—'}</td>
                      <td className="px-4 py-3">
                        {stage && (
                          <span className={`inline-flex items-center gap-1.5 text-xs font-600 px-2 py-0.5 rounded-full ${stage.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`}/>
                            {stage.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-warm-500 text-xs">{c.owner?.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        {openTasks.length > 0
                          ? <span className={`text-xs font-600 ${urgentTask ? 'text-red-500' : 'text-warm-500'}`}>{urgentTask ? '⚡ ' : ''}{openTasks.length} aperte</span>
                          : <span className="text-xs text-warm-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-warm-400"><path d="M6 12l4-4-4-4"/></svg>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile list */}
            <div className="md:hidden divide-y divide-warm-100">
              {filtered.map((c, i) => {
                const stage = stageMap[c.stage]
                const openTasks = (c.tasks || []).filter(t => !t.completed)
                return (
                  <div key={c.id} onClick={() => setSelected(c)} className="flex items-center gap-3 px-4 py-3 hover:bg-warm-50 cursor-pointer transition-colors">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-700 flex-shrink-0 ${AVATARS[i % 5]}`}>
                      {c.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-600 text-warm-900 text-sm">{c.name}</div>
                      <div className="text-xs text-warm-400 truncate">{c.company || c.email}</div>
                    </div>
                    {stage && <span className={`text-2xs font-600 px-2 py-0.5 rounded-full flex-shrink-0 ${stage.badge}`}>{stage.label}</span>}
                    {openTasks.length > 0 && <span className="text-xs text-warm-400 flex-shrink-0">{openTasks.length} task</span>}
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-warm-300 flex-shrink-0"><path d="M6 12l4-4-4-4"/></svg>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Scheda anagrafica */}
      {selected && (
        <ContactProfile
          contact={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      {/* Modal nuovo contatto */}
      {newModal && (
        <NewContactModal
          onClose={() => setNewModal(false)}
          onSaved={c => { handleCreated(c); setNewModal(false) }}
        />
      )}
    </div>
  )
}
