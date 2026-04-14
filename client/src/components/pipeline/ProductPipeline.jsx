import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useApp, useConfirm } from '../../App'
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core'

const STAGES = [
  {
    key: 'proposto',
    label: 'Proposto',
    dot: 'bg-slate-400',
    headerText: 'text-slate-600',
    colBg: 'bg-slate-50',
    colBorder: 'border-slate-200',
    cardBorder: 'border-l-slate-400',
    badge: 'bg-slate-100 text-slate-600',
    valueBg: 'bg-slate-100 text-slate-700',
  },
  {
    key: 'campione',
    label: 'Campione',
    dot: 'bg-amber-500',
    headerText: 'text-amber-700',
    colBg: 'bg-amber-50',
    colBorder: 'border-amber-200',
    cardBorder: 'border-l-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    valueBg: 'bg-amber-100 text-amber-800',
  },
  {
    key: 'offerta',
    label: 'Offerta',
    dot: 'bg-orange-500',
    headerText: 'text-orange-700',
    colBg: 'bg-orange-50',
    colBorder: 'border-orange-200',
    cardBorder: 'border-l-orange-400',
    badge: 'bg-orange-100 text-orange-700',
    valueBg: 'bg-orange-100 text-orange-800',
  },
  {
    key: 'ordine',
    label: 'Ordine',
    dot: 'bg-emerald-500',
    headerText: 'text-emerald-700',
    colBg: 'bg-emerald-50',
    colBorder: 'border-emerald-200',
    cardBorder: 'border-l-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    valueBg: 'bg-emerald-100 text-emerald-800',
  },
]
const stageMap = Object.fromEntries(STAGES.map(s => [s.key, s]))

// ── Modal crea/modifica opportunità (admin e manager) ─────────────────────────
function OpportunityModal({ opp, preProject, onClose, onSaved, onDeleted }) {
  const { profile } = useApp()
  const confirm = useConfirm()
  const isNew = !opp
  const [projects, setProjects] = useState([])
  const [contacts, setContacts] = useState([])
  const [agents, setAgents] = useState([])
  const [form, setForm] = useState({
    project_id:   opp?.project?.id || preProject?.id || '',
    contact_id:   opp?.contact?.id || '',
    contact_name: opp?.contact_name || opp?.contact?.name || '',
    stage:        opp?.stage || 'proposto',
    notes:        opp?.notes || '',
    value_estimate: opp?.value_estimate || '',
    assigned_to:  opp?.assigned?.id || '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api('/api/projects').then(d => setProjects((d.projects || []).filter(p => p.stage === 'pronto')))
    api('/api/contacts').then(d => setContacts(d.contacts || []))
    api('/api/team/members').then(d => setAgents((d.members || []).filter(m => m.role === 'agent')))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        project_id:     form.project_id,
        contact_id:     form.contact_id || null,
        contact_name:   form.contact_name || null,
        stage:          form.stage,
        notes:          form.notes || null,
        value_estimate: form.value_estimate ? parseFloat(form.value_estimate) : null,
        assigned_to:    form.assigned_to || null,
      }
      const d = isNew
        ? await api('/api/pipeline', { method: 'POST', body })
        : await api(`/api/pipeline/${opp.id}`, { method: 'PATCH', body })
      onSaved(d.opportunity, isNew)
      onClose()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  async function del() {
    if (!await confirm('Eliminare questa opportunità?', { danger: true, confirmLabel: 'Elimina' })) return
    setDeleting(true)
    try {
      await api(`/api/pipeline/${opp.id}`, { method: 'DELETE' })
      onDeleted(opp.id)
      onClose()
    } catch (err) { alert(err.message) }
    setDeleting(false)
  }

  const currentStage = stageMap[form.stage]

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">

        <div className={`flex items-center gap-3 px-5 py-4 border-b ${currentStage?.headerBg || 'bg-white'} border-warm-100 rounded-t-2xl flex-shrink-0`}>
          <div className={`w-2.5 h-2.5 rounded-full ${currentStage?.dot || 'bg-warm-300'}`}/>
          <span className="font-700 text-warm-900 text-sm flex-1">
            {isNew ? 'Nuova opportunità' : (opp.project?.name || 'Opportunità')}
          </span>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-700 p-1">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>

        <form id="opp-form" onSubmit={save} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-none">

          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Prodotto *</label>
            {(preProject || opp) ? (
              <div className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 bg-warm-50 text-warm-700 font-500">
                {opp?.project?.name || preProject?.name || '—'}
                {(opp?.project?.weight_format || preProject?.weight_format) && (
                  <span className="text-warm-400"> — {opp?.project?.weight_format || preProject?.weight_format}</span>
                )}
              </div>
            ) : (
              <>
                <select value={form.project_id} onChange={e => set('project_id', e.target.value)} required
                  className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50">
                  <option value="">Seleziona prodotto...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.weight_format ? ` — ${p.weight_format}` : ''}</option>)}
                </select>
                {projects.length === 0 && (
                  <p className="text-xs text-warm-400 mt-1">Nessun prodotto in "Pronto". Spostane uno dalla sezione Progetti.</p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Fase</label>
            <div className="grid grid-cols-4 gap-1.5">
              {STAGES.map(s => (
                <button key={s.key} type="button" onClick={() => set('stage', s.key)}
                  className={`py-1.5 rounded-lg text-xs font-600 border transition-all ${form.stage === s.key ? `${s.badge} border-current` : 'border-warm-200 text-warm-400 hover:border-warm-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Cliente / Buyer</label>
            <select value={form.contact_id} onChange={e => {
              const c = contacts.find(c => c.id === e.target.value)
              set('contact_id', e.target.value)
              if (c) set('contact_name', c.name)
            }}
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50">
              <option value="">Seleziona da rubrica...</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
            </select>
            <input value={form.contact_name} onChange={e => { set('contact_name', e.target.value); set('contact_id', '') }}
              placeholder="...oppure scrivi nome libero"
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 mt-1.5 focus:outline-none focus:border-brand-400 bg-warm-50"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Valore stimato (€)</label>
              <input type="number" step="0.01" value={form.value_estimate} onChange={e => set('value_estimate', e.target.value)}
                placeholder="0.00"
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
            </div>
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Assegna ad agente</label>
              <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50">
                <option value="">Nessuno</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Note</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              placeholder="Feedback, condizioni, prossimi passi..."
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50 resize-none"/>
          </div>

        </form>

        <div className="px-5 py-4 border-t border-warm-100 flex gap-2 flex-shrink-0">
          {!isNew && profile?.role === 'admin' && (
            <button onClick={del} disabled={deleting}
              className="text-sm text-red-500 hover:text-red-700 font-500 border border-red-200 rounded-xl px-4 py-2 disabled:opacity-40">
              {deleting ? '...' : 'Elimina'}
            </button>
          )}
          <div className="flex-1"/>
          <button onClick={onClose} className="text-sm text-warm-500 border border-warm-200 rounded-xl px-4 py-2">Annulla</button>
          <button form="opp-form" type="submit" disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-xl px-5 py-2 disabled:opacity-40">
            {saving ? 'Salvo...' : isNew ? 'Crea' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal aggiornamento agente (solo stage + note) ────────────────────────────
function AgentUpdateModal({ opp, onClose, onSaved }) {
  const [form, setForm] = useState({ stage: opp.stage, notes: opp.notes || '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const currentStage = stageMap[form.stage]

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const d = await api(`/api/pipeline/${opp.id}`, { method: 'PATCH', body: { stage: form.stage, notes: form.notes } })
      onSaved(d.opportunity, false)
      onClose()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl">
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${currentStage?.headerBg || 'bg-white'} border-warm-100 rounded-t-2xl flex-shrink-0`}>
          <div className={`w-2.5 h-2.5 rounded-full ${currentStage?.dot || 'bg-warm-300'}`}/>
          <div className="flex-1 min-w-0">
            <div className="font-700 text-warm-900 text-sm truncate">{opp.project?.name || '—'}</div>
            <div className="text-xs text-warm-400 mt-0.5">{opp.contact?.name || opp.contact_name || ''}</div>
          </div>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-700 p-1">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <form id="agent-opp-form" onSubmit={save} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-none">
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1.5 block">Fase</label>
            <div className="grid grid-cols-2 gap-2">
              {STAGES.map(s => (
                <button key={s.key} type="button" onClick={() => set('stage', s.key)}
                  className={`py-2 rounded-xl text-xs font-600 border-2 transition-all ${form.stage === s.key ? `${s.badge} border-current` : 'border-warm-200 text-warm-400 hover:border-warm-300'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Note</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={4}
              placeholder="Aggiorna con feedback, prossimi passi..."
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50 resize-none"/>
          </div>
        </form>
        <div className="px-5 py-4 border-t border-warm-100 flex gap-2 flex-shrink-0 justify-end">
          <button onClick={onClose} className="text-sm text-warm-500 border border-warm-200 rounded-xl px-4 py-2">Annulla</button>
          <button form="agent-opp-form" type="submit" disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-xl px-5 py-2 disabled:opacity-40">
            {saving ? 'Salvo...' : 'Aggiorna'}
          </button>
        </div>
      </div>
    </div>
  )
}

const STAGE_NEXT = { proposto: 'campione', campione: 'offerta', offerta: 'ordine' }
const STAGE_NEXT_LABEL = { proposto: 'Campione →', campione: 'Offerta →', offerta: 'Ordine →' }

// ── Droppable column ──────────────────────────────────────────────────────────
function DroppableColumn({ id, isOver, children }) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`flex flex-col flex-1 min-h-0 transition-colors duration-100 ${isOver ? 'bg-blue-50/60' : ''}`}>
      <div className="flex-1 overflow-y-auto p-2 scrollbar-none min-h-[200px]">
        {children}
      </div>
    </div>
  )
}

// ── Card opportunità ──────────────────────────────────────────────────────────
function OppCard({ opp, stage, onClick, onAdvanced, onClose, compact }) {
  const [advancing, setAdvancing] = useState(false)
  const [closing, setClosing] = useState(false)
  const clientLabel = opp.contact?.name || opp.contact_name || '—'
  const clientCompany = opp.contact?.company
  const nextStage = STAGE_NEXT[opp.stage]

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: opp.id })
  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)`, zIndex: 50, opacity: 0.45 }
    : undefined

  async function handleAdvance(e) {
    e.stopPropagation()
    if (!nextStage) return
    setAdvancing(true)
    try {
      const d = await api(`/api/pipeline/${opp.id}`, { method: 'PATCH', body: { stage: nextStage } })
      onAdvanced(d.opportunity)
    } catch (err) { alert(err.message) }
    setAdvancing(false)
  }

  async function handleClose(e) {
    e.stopPropagation()
    setClosing(true)
    await onClose(opp)
    setClosing(false)
  }

  const dragHandle = (
    <div {...listeners} onClick={e => e.stopPropagation()}
      className="cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-warm-100 touch-none flex-shrink-0">
      <svg viewBox="0 0 8 14" fill="currentColor" className="w-2.5 h-3.5 text-warm-300 hover:text-warm-500 transition-colors">
        <circle cx="2" cy="2" r="1.1"/><circle cx="6" cy="2" r="1.1"/>
        <circle cx="2" cy="7" r="1.1"/><circle cx="6" cy="7" r="1.1"/>
        <circle cx="2" cy="12" r="1.1"/><circle cx="6" cy="12" r="1.1"/>
      </svg>
    </div>
  )

  // Compact card
  if (compact) return (
    <div ref={setNodeRef} style={dragStyle} {...attributes}
      onClick={onClick}
      className={`bg-white rounded-lg border border-l-4 border-warm-200 ${stage.cardBorder} px-2.5 py-2 cursor-pointer hover:shadow-sm transition-all flex items-center gap-2`}>
      {dragHandle}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-700 text-warm-900 truncate">{clientLabel}</div>
        <div className="text-2xs text-warm-400 truncate">{opp.project?.name || '—'}</div>
      </div>
      {opp.value_estimate && (
        <span className={`text-2xs font-700 px-1.5 py-0.5 rounded-md ${stage.valueBg} flex-shrink-0`}>
          €{Number(opp.value_estimate).toLocaleString('it-IT')}
        </span>
      )}
    </div>
  )

  // Expanded card (default)
  return (
    <div ref={setNodeRef} style={dragStyle} {...attributes}
      onClick={onClick}
      className={`bg-white rounded-xl border border-l-4 border-warm-200 ${stage.cardBorder} p-3.5 cursor-pointer hover:shadow-md transition-all`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-700 text-xs ${stage.badge}`}>
          {(clientLabel[0] || '?').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-700 text-warm-900 truncate">{clientLabel}</div>
          {clientCompany && <div className="text-2xs text-warm-400 truncate">{clientCompany}</div>}
        </div>
        {dragHandle}
      </div>
      <div className="text-xs text-warm-600 font-500 truncate mb-1">{opp.project?.name || '—'}</div>
      {opp.project?.weight_format && (
        <div className="text-2xs text-warm-400 mb-2">{opp.project.weight_format}</div>
      )}
      {opp.assigned && (
        <span className={`text-2xs font-600 px-2 py-0.5 rounded-full ${stage.badge}`}>
          {opp.assigned.full_name}
        </span>
      )}
      {opp.value_estimate && (
        <div className={`mt-2 pt-2 border-t border-warm-100 text-sm font-700 ${stage.valueBg} px-2 py-1 rounded-lg`}>
          € {Number(opp.value_estimate).toLocaleString('it-IT')}
        </div>
      )}
      {opp.notes && (
        <div className="mt-1.5 text-2xs text-warm-400 line-clamp-2">{opp.notes}</div>
      )}
      {(nextStage || onClose) && (
        <div className="mt-2.5 pt-2 border-t border-warm-100 flex items-center justify-end gap-1.5">
          {nextStage && (
            <button onClick={handleAdvance} disabled={advancing}
              className={`text-2xs font-700 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${stage.badge} hover:opacity-80 disabled:opacity-30`}>
              {advancing ? '...' : STAGE_NEXT_LABEL[opp.stage]}
            </button>
          )}
          {onClose && (
            <button onClick={handleClose} disabled={closing}
              className="text-2xs font-700 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all flex items-center gap-1 disabled:opacity-30">
              {closing ? '...' : <><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M2 6l2.5 2.5L10 3"/></svg> Chiudi ordine</>}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Vista Statistiche ─────────────────────────────────────────────────────────
function StatsView({ onClose }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/pipeline/stats')
      .then(d => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-brand-100 border-t-brand-500 rounded-full animate-spin"/>
    </div>
  )
  if (!stats) return null

  const fmt = v => v > 0 ? `€ ${Number(v).toLocaleString('it-IT', { minimumFractionDigits: 0 })}` : '—'

  return (
    <div className="flex-1 overflow-y-auto scrollbar-none bg-warm-50 p-6 space-y-6">

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Ordini chiusi', value: stats.ordiniVinti, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Valore vinto', value: fmt(stats.totaleVinto), color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Opportunità attive', value: stats.ordiniAttivi, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Pipeline attiva', value: fmt(stats.totaleAttivo), color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.bg}`}>
            <div className={`text-2xl font-800 ${k.color}`}>{k.value}</div>
            <div className="text-xs text-warm-500 mt-1 font-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Per prodotto */}
        <div className="bg-white rounded-2xl border border-warm-200 p-4">
          <h3 className="text-xs font-700 text-warm-400 uppercase tracking-widest mb-3">Per prodotto</h3>
          {stats.perProdotto.length === 0 && <p className="text-xs text-warm-300">Nessun dato</p>}
          <div className="space-y-2">
            {stats.perProdotto.map(p => (
              <div key={p.name} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-600 text-warm-800 truncate">{p.name}</div>
                  <div className="text-2xs text-warm-400">{p.count} ordini</div>
                </div>
                <div className="text-xs font-700 text-emerald-700 flex-shrink-0">{fmt(p.value)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Per agente */}
        <div className="bg-white rounded-2xl border border-warm-200 p-4">
          <h3 className="text-xs font-700 text-warm-400 uppercase tracking-widest mb-3">Per agente</h3>
          {stats.perAgente.length === 0 && <p className="text-xs text-warm-300">Nessun dato</p>}
          <div className="space-y-2">
            {stats.perAgente.map(a => (
              <div key={a.name} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xs font-700 flex-shrink-0">
                  {a.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-600 text-warm-800 truncate">{a.name}</div>
                  <div className="text-2xs text-warm-400">{a.count} ordini</div>
                </div>
                <div className="text-xs font-700 text-emerald-700 flex-shrink-0">{fmt(a.value)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Per mercato */}
        <div className="bg-white rounded-2xl border border-warm-200 p-4">
          <h3 className="text-xs font-700 text-warm-400 uppercase tracking-widest mb-3">Per mercato</h3>
          {stats.perMercato.length === 0 && <p className="text-xs text-warm-300">Nessun dato</p>}
          <div className="space-y-2">
            {stats.perMercato.map(m => (
              <div key={m.name} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-600 text-warm-800">{m.name}</div>
                  <div className="text-2xs text-warm-400">{m.count} ordini</div>
                </div>
                <div className="text-xs font-700 text-emerald-700 flex-shrink-0">{fmt(m.value)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Vista Storico ─────────────────────────────────────────────────────────────
function StoricoView() {
  const [storico, setStorico] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/pipeline?storico=true')
      .then(d => setStorico(d.pipeline || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totale = storico.reduce((s, o) => s + (Number(o.value_estimate) || 0), 0)

  return (
    <div className="flex-1 overflow-y-auto scrollbar-none bg-warm-50 p-6">
      {loading && (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl border border-warm-200 animate-pulse"/>)}
        </div>
      )}
      {!loading && storico.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-warm-300 gap-3">
          <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1" className="w-10 h-10 opacity-40">
            <circle cx="20" cy="20" r="16"/><path d="M20 12v8l5 5"/>
          </svg>
          <p className="text-sm">Nessun ordine chiuso ancora</p>
        </div>
      )}
      {!loading && storico.length > 0 && (
        <>
          {totale > 0 && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-600 text-emerald-700">Totale valore ordini chiusi</span>
              <span className="text-lg font-800 text-emerald-700">€ {totale.toLocaleString('it-IT')}</span>
            </div>
          )}
          <div className="space-y-2">
            {storico.map(o => (
              <div key={o.id} className="bg-white rounded-xl border border-warm-200 border-l-4 border-l-emerald-400 p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-700 text-warm-900 truncate">
                    {o.contact?.name || o.contact_name || '—'}
                  </div>
                  <div className="text-xs text-warm-500 mt-0.5 truncate">
                    {o.project?.name || '—'}
                    {o.project?.weight_format && ` — ${o.project.weight_format}`}
                  </div>
                  {o.notes && <div className="text-2xs text-warm-400 mt-1 line-clamp-1">{o.notes}</div>}
                </div>
                <div className="flex-shrink-0 text-right">
                  {o.value_estimate && (
                    <div className="text-sm font-800 text-emerald-700">€ {Number(o.value_estimate).toLocaleString('it-IT')}</div>
                  )}
                  <div className="text-2xs text-warm-400 mt-0.5">
                    {o.closed_at
                      ? new Date(o.closed_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                      : new Date(o.updated_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                    }
                  </div>
                  {o.assigned && <div className="text-2xs text-warm-400">{o.assigned.full_name}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Vista principale ──────────────────────────────────────────────────────────
export default function ProductPipeline({ preProject, onModalClose }) {
  const { profile } = useApp()
  const confirm = useConfirm()
  const isAgent = profile?.role === 'agent'
  const canCreate = ['admin', 'manager'].includes(profile?.role)

  const [pipeline, setPipeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [filterProject, setFilterProject] = useState('')
  const [projects, setProjects] = useState([])
  const [tab, setTab] = useState('kanban') // 'kanban' | 'storico' | 'stats'
  const [compact, setCompact] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [overColId, setOverColId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  useEffect(() => {
    if (preProject) { setTab('kanban'); setModal('new') }
  }, [preProject])

  const load = () => api('/api/pipeline')
    .then(d => setPipeline(d.pipeline || []))
    .catch(() => {})
    .finally(() => setLoading(false))

  useEffect(() => {
    load()
    if (!isAgent) {
      api('/api/projects').then(d => setProjects((d.projects || []).filter(p => p.stage === 'pronto')))
    }
  }, [])

  async function handleClose(opp) {
    if (!await confirm(`Chiudere l'ordine per "${opp.contact?.name || opp.contact_name}"?`, { title: 'Verranno create 3 task di follow-up.', confirmLabel: 'Chiudi ordine' })) return
    try {
      const d = await api(`/api/pipeline/${opp.id}/close`, { method: 'POST', body: {} })
      setPipeline(prev => prev.filter(o => o.id !== opp.id))
    } catch (err) { alert(err.message) }
  }

  const filtered = pipeline.filter(o => !filterProject || o.project?.id === filterProject)
  const stageCounts = Object.fromEntries(STAGES.map(s => [s.key, filtered.filter(o => o.stage === s.key).length]))
  const totalValue = filtered
    .filter(o => o.stage === 'ordine' && o.value_estimate)
    .reduce((acc, o) => acc + Number(o.value_estimate), 0)

  function handleSaved(opp, isNew) {
    if (isNew) setPipeline(prev => [opp, ...prev])
    else setPipeline(prev => prev.map(o => o.id === opp.id ? opp : o))
  }

  function handleDeleted(id) {
    setPipeline(prev => prev.filter(o => o.id !== id))
  }

  function closeModal() {
    setModal(null)
    if (onModalClose) onModalClose()
  }

  function openCard(opp) {
    setModal(isAgent ? { type: 'agent', opp } : opp)
  }

  function handleDragStart({ active }) { setActiveId(active.id) }
  function handleDragOver({ over }) { setOverColId(over?.id ?? null) }

  async function handleDragEnd({ active, over }) {
    setActiveId(null); setOverColId(null)
    if (!over) return
    const newStage = over.id   // sempre un column key
    const opp = pipeline.find(o => o.id === active.id)
    if (!opp || opp.stage === newStage) return
    const prevStage = opp.stage
    setPipeline(prev => prev.map(o => o.id === active.id ? { ...o, stage: newStage } : o))
    try {
      await api(`/api/pipeline/${active.id}`, { method: 'PATCH', body: { stage: newStage } })
    } catch {
      setPipeline(prev => prev.map(o => o.id === active.id ? { ...o, stage: prevStage } : o))
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-warm-200 flex items-center gap-3 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold tracking-tight text-warm-900">
            {isAgent ? 'Le mie opportunità' : 'Pipeline Vendite'}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {tab === 'kanban' && STAGES.map(s => (
              <span key={s.key} className="flex items-center gap-1 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>
                <span className={`font-600 ${s.headerText}`}>{s.label}</span>
                <span className="text-warm-400">{stageCounts[s.key]}</span>
              </span>
            ))}
            {tab === 'kanban' && totalValue > 0 && (
              <span className="text-xs text-emerald-700 font-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                € {totalValue.toLocaleString('it-IT')} in ordine
              </span>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="hidden md:flex items-center gap-1 bg-warm-100 rounded-lg p-1">
          {[
            { key: 'kanban', label: 'Pipeline' },
            { key: 'storico', label: 'Storico' },
            { key: 'stats', label: 'Statistiche' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`text-xs font-600 px-3 py-1.5 rounded-md transition-all ${tab === t.key ? 'bg-white text-warm-900 shadow-sm' : 'text-warm-500 hover:text-warm-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {!isAgent && tab === 'kanban' && projects.length > 0 && (
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="text-xs border border-warm-200 rounded-lg px-2 py-1.5 bg-white text-warm-700 focus:outline-none focus:border-brand-400 hidden md:block">
            <option value="">Tutti i prodotti</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}

        {tab === 'kanban' && (
          <button onClick={() => setCompact(v => !v)} title={compact ? 'Vista espansa' : 'Vista compatta'}
            className="p-2 rounded-lg border border-warm-200 hover:border-warm-300 text-warm-400 hover:text-warm-700 transition-colors flex-shrink-0">
            {compact
              ? <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="1.5" y="2" width="13" height="4" rx="1"/><rect x="1.5" y="8" width="13" height="4" rx="1"/></svg>
              : <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="1.5" y="1.5" width="13" height="6" rx="1"/><rect x="1.5" y="9" width="13" height="2.5" rx="1"/><rect x="1.5" y="13" width="13" height="1.5" rx="0.5"/></svg>
            }
          </button>
        )}

        {canCreate && tab === 'kanban' && (
          <button onClick={() => setModal('new')}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-lg px-4 py-2 transition-colors flex items-center gap-1.5 flex-shrink-0">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M8 3v10M3 8h10"/></svg>
            Nuova
          </button>
        )}
      </div>

      {/* Contenuto per tab */}
      {tab === 'stats' && <StatsView />}
      {tab === 'storico' && <StoricoView />}

      {/* Kanban */}
      {tab === 'kanban' && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="flex flex-1 overflow-x-auto scrollbar-none bg-warm-50">
            {STAGES.map(stage => {
              const cards = filtered.filter(o => o.stage === stage.key)
              return (
                <div key={stage.key} className={`flex-1 min-w-[220px] flex flex-col border-r border-warm-200 last:border-r-0 ${stage.colBg}`}>
                  <div className={`px-3 py-3 border-b ${stage.colBorder} flex items-center gap-2 flex-shrink-0`}>
                    <div className={`w-2 h-2 rounded-full ${stage.dot}`}/>
                    <span className={`text-xs font-700 uppercase tracking-widest ${stage.headerText}`}>{stage.label}</span>
                    <span className={`ml-auto text-xs font-700 ${stage.headerText} bg-white/80 px-2 py-0.5 rounded-full`}>{cards.length}</span>
                  </div>
                  {loading && (
                    <div className="p-2 space-y-2">
                      {[1,2].map(i => <div key={i} className="bg-white rounded-xl border border-warm-200 p-3 animate-pulse h-20"/>)}
                    </div>
                  )}
                  {!loading && (
                    <DroppableColumn id={stage.key} isOver={overColId === stage.key && !!activeId}>
                      <div className="space-y-1.5">
                        {cards.map(o => (
                          <OppCard key={o.id} opp={o} stage={stage} compact={compact}
                            onClick={() => openCard(o)}
                            onAdvanced={opp => setPipeline(prev => prev.map(p => p.id === opp.id ? opp : p))}
                            onClose={stage.key === 'ordine' ? handleClose : null}
                          />
                        ))}
                        {cards.length === 0 && (
                          <div className={`text-xs ${stage.headerText} opacity-40 text-center py-10 border-2 border-dashed ${stage.colBorder} rounded-xl`}>
                            Nessuna opportunità
                          </div>
                        )}
                      </div>
                    </DroppableColumn>
                  )}
                </div>
              )
            })}
          </div>
        </DndContext>
      )}

      {/* Modal admin/manager */}
      {modal && modal !== 'new' && !modal.type && canCreate && (
        <OpportunityModal
          opp={modal}
          preProject={null}
          onClose={closeModal}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
      {modal === 'new' && canCreate && (
        <OpportunityModal
          opp={null}
          preProject={preProject}
          onClose={closeModal}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {/* Modal agente */}
      {modal?.type === 'agent' && (
        <AgentUpdateModal
          opp={modal.opp}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
