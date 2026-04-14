import { useState, useEffect, useRef } from 'react' // useRef usato per fileInputRef
import { api } from '../../lib/api'
import { useApp, useConfirm } from '../../App'
import {
  DndContext, PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable, DragOverlay,
} from '@dnd-kit/core'

// ── Costanti ──────────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    key: 'idea',
    label: 'Idea',
    color: 'text-slate-600',
    dot: 'bg-slate-400',
    headerBg: 'bg-slate-50',
    border: 'border-slate-200',
    cardBorder: 'border-l-slate-400',
    emptyColor: 'text-slate-400',
    nextStage: 'sviluppo',
    nextLabel: 'Sviluppo →',
  },
  {
    key: 'sviluppo',
    label: 'Sviluppo',
    color: 'text-blue-700',
    dot: 'bg-blue-500',
    headerBg: 'bg-blue-50',
    border: 'border-blue-200',
    cardBorder: 'border-l-blue-400',
    emptyColor: 'text-blue-400',
    nextStage: 'pronto',
    nextLabel: 'Pronto →',
  },
  {
    key: 'pronto',
    label: 'Pronto',
    color: 'text-emerald-700',
    dot: 'bg-emerald-500',
    headerBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    cardBorder: 'border-l-emerald-500',
    emptyColor: 'text-emerald-400',
    nextStage: null,
    nextLabel: 'Proponi →',
  },
]

const MARKETS = ['Horeca', 'Retail']
const MARKET_COLORS = {
  Retail:  'bg-violet-100 text-violet-700',
  Horeca:  'bg-orange-100 text-orange-700',
  Export:  'bg-cyan-100 text-cyan-700',
  Interno: 'bg-warm-100 text-warm-600',
}
const PRI_COLORS = {
  alta:  'bg-red-100 text-red-600',
  media: 'bg-amber-100 text-amber-700',
  bassa: 'bg-warm-100 text-warm-500',
}
const ORIGIN_COLORS = {
  cliente: 'bg-purple-100 text-purple-700',
  interna: 'bg-teal-100 text-teal-700',
}
const ORIGIN_LABELS = { cliente: 'Richiesta cliente', interna: 'Opportunità interna' }
const PRI_ORDER = { alta: 0, media: 1, bassa: 2 }

const COUNTRIES = [
  { code: 'WW', name: 'Vari / Worldwide' },
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'SA', name: 'Arabia Saudita' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaigian' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BE', name: 'Belgio' },
  { code: 'BY', name: 'Bielorussia' },
  { code: 'MM', name: 'Birmania' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia-Erzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brasile' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'KH', name: 'Cambogia' },
  { code: 'CM', name: 'Camerun' },
  { code: 'CA', name: 'Canada' },
  { code: 'TD', name: 'Ciad' },
  { code: 'CL', name: 'Cile' },
  { code: 'CN', name: 'Cina' },
  { code: 'CY', name: 'Cipro' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KP', name: 'Corea del Nord' },
  { code: 'KR', name: 'Corea del Sud' },
  { code: "CI", name: "Costa d'Avorio" },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CU', name: 'Cuba' },
  { code: 'DK', name: 'Danimarca' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egitto' },
  { code: 'AE', name: 'Emirati Arabi Uniti' },
  { code: 'EE', name: 'Estonia' },
  { code: 'ET', name: 'Etiopia' },
  { code: 'PH', name: 'Filippine' },
  { code: 'FI', name: 'Finlandia' },
  { code: 'FR', name: 'Francia' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germania' },
  { code: 'GH', name: 'Ghana' },
  { code: 'JP', name: 'Giappone' },
  { code: 'JO', name: 'Giordania' },
  { code: 'EL', name: 'Grecia' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'IS', name: 'Islanda' },
  { code: 'IL', name: 'Israele' },
  { code: 'IT', name: 'Italia' },
  { code: 'KZ', name: 'Kazakistan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Lettonia' },
  { code: 'LB', name: 'Libano' },
  { code: 'LY', name: 'Libia' },
  { code: 'LT', name: 'Lituania' },
  { code: 'LU', name: 'Lussemburgo' },
  { code: 'MK', name: 'Macedonia' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MY', name: 'Malesia' },
  { code: 'MT', name: 'Malta' },
  { code: 'MA', name: 'Marocco' },
  { code: 'MX', name: 'Messico' },
  { code: 'MD', name: 'Moldavia' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MZ', name: 'Mozambico' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Norvegia' },
  { code: 'NZ', name: 'Nuova Zelanda' },
  { code: 'NL', name: 'Olanda' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PA', name: 'Panamá' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Perù' },
  { code: 'PL', name: 'Polonia' },
  { code: 'PT', name: 'Portogallo' },
  { code: 'QA', name: 'Qatar' },
  { code: 'GB', name: 'Regno Unito' },
  { code: 'CZ', name: 'Repubblica Ceca' },
  { code: 'DO', name: 'Repubblica Dominicana' },
  { code: 'RO', name: 'Romania' },
  { code: 'RW', name: 'Ruanda' },
  { code: 'RU', name: 'Russia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SY', name: 'Siria' },
  { code: 'SK', name: 'Slovacchia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ES', name: 'Spagna' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'US', name: "Stati Uniti d'America" },
  { code: 'ZA', name: 'Sudafrica' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SE', name: 'Svezia' },
  { code: 'CH', name: 'Svizzera' },
  { code: 'TJ', name: 'Tagikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailandia' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turchia' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'UA', name: 'Ucraina' },
  { code: 'UG', name: 'Uganda' },
  { code: 'HU', name: 'Ungheria' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
]

const DEFAULT_DEV_STEPS = [
  { id: '1', title: 'Ricerca fornitore',     completed: false },
  { id: '2', title: 'Campione ricevuto',     completed: false },
  { id: '3', title: 'Valutazione qualità',   completed: false },
  { id: '4', title: 'Analisi costo',         completed: false },
  { id: '5', title: 'Etichetta / Packaging', completed: false },
  { id: '6', title: 'Approvazione finale',   completed: false },
]

const STEP_COLORS = [
  { bg: 'bg-indigo-50',  border: 'border-l-indigo-400',  dot: 'bg-indigo-500',  text: 'text-indigo-700',  badge: 'bg-indigo-100 text-indigo-700'  },
  { bg: 'bg-blue-50',    border: 'border-l-blue-400',    dot: 'bg-blue-500',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700'      },
  { bg: 'bg-cyan-50',    border: 'border-l-cyan-400',    dot: 'bg-cyan-500',    text: 'text-cyan-700',    badge: 'bg-cyan-100 text-cyan-700'      },
  { bg: 'bg-teal-50',    border: 'border-l-teal-400',    dot: 'bg-teal-500',    text: 'text-teal-700',    badge: 'bg-teal-100 text-teal-700'      },
  { bg: 'bg-violet-50',  border: 'border-l-violet-400',  dot: 'bg-violet-500',  text: 'text-violet-700',  badge: 'bg-violet-100 text-violet-700'  },
  { bg: 'bg-purple-50',  border: 'border-l-purple-400',  dot: 'bg-purple-500',  text: 'text-purple-700',  badge: 'bg-purple-100 text-purple-700'  },
  { bg: 'bg-pink-50',    border: 'border-l-pink-400',    dot: 'bg-pink-500',    text: 'text-pink-700',    badge: 'bg-pink-100 text-pink-700'      },
  { bg: 'bg-orange-50',  border: 'border-l-orange-400',  dot: 'bg-orange-500',  text: 'text-orange-700',  badge: 'bg-orange-100 text-orange-700'  },
]

// Palette Gantt (row bg + bar color inline)
const GANTT_PALETTE = [
  { row: '#fafafa', bar: '#a5b4fc', barDone: '#6366f1', text: '#4338ca' }, // indigo
  { row: '#f0f9ff', bar: '#93c5fd', barDone: '#3b82f6', text: '#1d4ed8' }, // blue
  { row: '#ecfeff', bar: '#67e8f9', barDone: '#06b6d4', text: '#0e7490' }, // cyan
  { row: '#f0fdf4', bar: '#6ee7b7', barDone: '#10b981', text: '#047857' }, // teal/emerald
  { row: '#f5f3ff', bar: '#c4b5fd', barDone: '#8b5cf6', text: '#6d28d9' }, // violet
  { row: '#fdf4ff', bar: '#e879f9', barDone: '#a21caf', text: '#86198f' }, // fuchsia
  { row: '#fff1f2', bar: '#fda4af', barDone: '#f43f5e', text: '#be123c' }, // rose
  { row: '#fff7ed', bar: '#fdba74', barDone: '#f97316', text: '#c2410c' }, // orange
]

// ── Gantt View ────────────────────────────────────────────────────────────────
function GanttView({ steps, onEditDates }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const noDates = steps.every(s => !s.start_date && !s.end_date)

  // Raccoglie tutte le date presenti
  const allDates = []
  steps.forEach(s => {
    if (s.start_date) allDates.push(new Date(s.start_date))
    if (s.end_date)   allDates.push(new Date(s.end_date))
    if (s.completed_at) allDates.push(new Date(s.completed_at))
  })
  allDates.push(today)

  // Range: mese iniziale – mese finale, con 1 mese di padding su ogni lato
  let rStart = new Date(Math.min(...allDates.map(d => d.getTime())))
  let rEnd   = new Date(Math.max(...allDates.map(d => d.getTime())))
  rStart = new Date(rStart.getFullYear(), rStart.getMonth() - 1, 1)
  rEnd   = new Date(rEnd.getFullYear(),   rEnd.getMonth()   + 2, 0)

  const totalMs = rEnd.getTime() - rStart.getTime()
  const pct = ms => ((ms - rStart.getTime()) / totalMs * 100).toFixed(3) + '%'
  const pctW = (a, b) => (Math.max(0, b.getTime() - a.getTime()) / totalMs * 100).toFixed(3) + '%'

  // Colonne mesi
  const months = []
  let m = new Date(rStart.getFullYear(), rStart.getMonth(), 1)
  while (m <= rEnd) {
    const ms = new Date(m.getFullYear(), m.getMonth(), 1)
    const me = new Date(m.getFullYear(), m.getMonth() + 1, 0)
    months.push({
      label: m.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase() + ' ' + String(m.getFullYear()).slice(2),
      left:  pct(Math.max(ms.getTime(), rStart.getTime())),
      width: pctW(ms > rStart ? ms : rStart, me < rEnd ? me : rEnd),
    })
    m.setMonth(m.getMonth() + 1)
  }

  const todayLeft = pct(today.getTime())
  const LABEL_W = 152

  const fmt = d => new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 600 }}>

        {/* Banner se nessuna data impostata */}
        {noDates && (
          <div className="mx-4 mt-3 mb-1 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-700">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
              <rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M5 1v4M11 1v4M2 7h12"/>
            </svg>
            <span>Clicca su una fase per aggiungere le date di inizio e fine — le barre appariranno nel Gantt.</span>
          </div>
        )}

        {/* Header mesi */}
        <div className="flex sticky top-0 z-20 bg-white border-b border-warm-200">
          <div style={{ width: LABEL_W, minWidth: LABEL_W }} className="flex-shrink-0 border-r border-warm-200 py-2 px-3">
            <span className="text-2xs font-700 text-warm-400 uppercase tracking-wider">Fase</span>
          </div>
          <div className="flex-1 relative h-8">
            {months.map((mo, i) => (
              <div key={i} className="absolute top-0 h-full border-l border-warm-100 flex items-center justify-center"
                style={{ left: mo.left, width: mo.width }}>
                <span className="text-2xs font-700 text-warm-500 tracking-wide">{mo.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Righe step */}
        {steps.map((step, i) => {
          const pal = GANTT_PALETTE[i % GANTT_PALETTE.length]
          const startD = step.start_date ? new Date(step.start_date) : null
          const endD   = step.end_date   ? new Date(step.end_date)   : step.completed_at ? new Date(step.completed_at) : null
          const hasBoth = startD && endD
          const hasAny  = startD || endD

          return (
            <div key={step.id} className="flex border-b border-warm-100 group" style={{ background: pal.row }}>
              {/* Label */}
              <div style={{ width: LABEL_W, minWidth: LABEL_W, borderRight: '1px solid #e8e4de' }}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-3">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${step.completed ? 'bg-emerald-500' : 'bg-warm-300'}`}/>
                <span className={`text-xs font-600 leading-tight ${step.completed ? 'line-through text-warm-400' : 'text-warm-800'}`}>
                  {step.title}
                </span>
              </div>

              {/* Barra */}
              <div className="flex-1 relative" style={{ minHeight: 44 }}>
                {/* Griglie mesi */}
                {months.map((mo, mi) => (
                  <div key={mi} className="absolute inset-y-0 border-l border-warm-100/70" style={{ left: mo.left }}/>
                ))}

                {/* Linea oggi */}
                <div className="absolute inset-y-0 w-px z-10 pointer-events-none"
                  style={{ left: todayLeft, background: '#f87171' }}/>

                {hasBoth ? (
                  <div className="absolute inset-y-2 rounded-lg flex items-center px-2 transition-all"
                    style={{
                      left:  pct(startD.getTime()),
                      width: pctW(startD, endD),
                      minWidth: 6,
                      background: step.completed ? pal.barDone : pal.bar,
                    }}>
                    <span className="text-2xs font-600 text-white truncate drop-shadow-sm">{step.title}</span>
                  </div>
                ) : hasAny ? (
                  // Solo una data: punto/diamond
                  <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-sm rotate-45"
                    style={{ left: `calc(${pct((startD || endD).getTime())} - 6px)`, background: pal.barDone }}/>
                ) : (
                  // Nessuna data: placeholder sempre visibile
                  <button onClick={() => onEditDates(step)}
                    className="absolute inset-2 rounded-lg border-2 border-dashed border-warm-200 hover:border-blue-400 hover:bg-blue-50/50 flex items-center justify-center transition-colors">
                    <span className="text-2xs text-warm-400 group-hover:text-blue-500">+ date</span>
                  </button>
                )}

                {/* Tooltip date (visibile, cliccabile per modificare) */}
                {hasAny && !hasBoth && (
                  <button onClick={() => onEditDates(step)}
                    className="absolute inset-y-0 flex items-center opacity-60 hover:opacity-100 transition-opacity"
                    style={{ left: `calc(${pct((startD || endD).getTime())} + 10px)` }}>
                    <span className="text-2xs text-warm-500 bg-white rounded px-1.5 py-0.5 border border-warm-200 whitespace-nowrap shadow-sm">
                      {startD ? fmt(startD) : '?'} → {endD ? fmt(endD) : '+ fine'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Legenda oggi */}
        <div className="flex items-center gap-1.5 px-4 py-2 text-2xs text-warm-400">
          <div className="w-3 h-0.5 bg-red-400 rounded"/>
          <span>Oggi</span>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function MarketBadge({ market }) {
  if (!market) return null
  return <span className={`text-2xs font-700 px-2 py-0.5 rounded-full ${MARKET_COLORS[market] || 'bg-warm-100 text-warm-600'}`}>{market}</span>
}

function PriBadge({ priority }) {
  if (!priority) return null
  return <span className={`text-2xs font-700 px-2 py-0.5 rounded-full ${PRI_COLORS[priority]}`}>{priority}</span>
}

function OriginBadge({ origin }) {
  if (!origin) return null
  return <span className={`text-2xs font-700 px-2 py-0.5 rounded-full ${ORIGIN_COLORS[origin]}`}>{ORIGIN_LABELS[origin]}</span>
}

function StepProgress({ steps }) {
  if (!steps?.length) return null
  const done = steps.filter(s => s.completed).length
  const pct = Math.round(done / steps.length * 100)
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs text-warm-400">{done}/{steps.length} step</span>
        <span className="text-2xs font-700 text-blue-600">{pct}%</span>
      </div>
      <div className="h-1 bg-warm-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }}/>
      </div>
    </div>
  )
}

// ── Modal Idea ────────────────────────────────────────────────────────────────
function IdeaModal({ project, onClose, onSaved, onDeleted }) {
  const { profile } = useApp()
  const confirm = useConfirm()
  const isNew = !project
  const [form, setForm] = useState({
    name:         project?.name || '',
    market:       project?.market || 'Retail',
    priority:     project?.priority || 'media',
    origin:       project?.origin || '',
    supplier:     project?.supplier || '',
    weight_format: project?.weight_format || '',
    client:       project?.client || '',
    notes:        project?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { ...form, stage: 'idea', supplier: form.supplier || null, weight_format: form.weight_format || null, client: form.client || null, origin: form.origin || null }
      const d = isNew
        ? await api('/api/projects', { method: 'POST', body })
        : await api(`/api/projects/${project.id}`, { method: 'PATCH', body })
      onSaved(d.project, isNew)
      onClose()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  async function del() {
    if (!await confirm(`Eliminare "${project.name}"?`, { danger: true, confirmLabel: 'Elimina' })) return
    setDeleting(true)
    try {
      await api(`/api/projects/${project.id}`, { method: 'DELETE' })
      onDeleted(project.id)
      onClose()
    } catch (err) { alert(err.message) }
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b bg-slate-50 border-warm-100 rounded-t-2xl flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-slate-400"/>
          <span className="font-700 text-warm-900 text-sm flex-1">{isNew ? 'Nuova idea' : form.name}</span>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-700 p-1">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <form id="idea-form" onSubmit={save} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-none">
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Nome *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
          </div>
          {/* Origine */}
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1.5 block">Origine</label>
            <div className="flex gap-2">
              {['cliente','interna'].map(o => (
                <button key={o} type="button" onClick={() => set('origin', form.origin === o ? '' : o)}
                  className={`flex-1 py-2 rounded-xl text-xs font-600 border-2 transition-all ${form.origin === o ? `${ORIGIN_COLORS[o]} border-current` : 'border-warm-200 text-warm-400 hover:border-warm-300'}`}>
                  {ORIGIN_LABELS[o]}
                </button>
              ))}
            </div>
          </div>
          {/* Priorità */}
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1.5 block">Priorità</label>
            <div className="flex gap-2">
              {['bassa','media','alta'].map(p => (
                <button key={p} type="button" onClick={() => set('priority', p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-600 border-2 transition-all capitalize ${form.priority === p ? `${PRI_COLORS[p]} border-current` : 'border-warm-200 text-warm-400 hover:border-warm-300'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Mercato</label>
              <select value={form.market} onChange={e => set('market', e.target.value)}
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50">
                {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Formato / Peso</label>
              <input value={form.weight_format} onChange={e => set('weight_format', e.target.value)}
                placeholder="Es: 200g"
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Fornitore</label>
            <input value={form.supplier} onChange={e => set('supplier', e.target.value)}
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
          </div>
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Cliente / Buyer</label>
            <input value={form.client} onChange={e => set('client', e.target.value)}
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
          </div>
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Note</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50 resize-none"/>
          </div>
        </form>
        <div className="px-5 py-4 border-t border-warm-100 flex gap-2 flex-shrink-0">
          {!isNew && profile?.role === 'admin' && (
            <button onClick={del} disabled={deleting}
              className="text-sm text-red-500 border border-red-200 rounded-xl px-4 py-2 disabled:opacity-40">
              {deleting ? '...' : 'Elimina'}
            </button>
          )}
          <div className="flex-1"/>
          <button onClick={onClose} className="text-sm text-warm-500 border border-warm-200 rounded-xl px-4 py-2">Annulla</button>
          <button form="idea-form" type="submit" disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-xl px-5 py-2 disabled:opacity-40">
            {saving ? 'Salvo...' : isNew ? 'Crea' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Pronto ──────────────────────────────────────────────────────────────
function ProntoModal({ project, onClose, onSaved, onDeleted, onProponi }) {
  const { profile } = useApp()
  const confirm = useConfirm()
  const [form, setForm] = useState({
    name:          project?.name || '',
    market:        project?.market || 'Retail',
    supplier:      project?.supplier || '',
    weight_format: project?.weight_format || '',
    cost_per_unit: project?.cost_per_unit || '',
    country_code:  project?.country_code || '',
    country:       project?.country || '',
    client:        project?.client || '',
    notes:         project?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { ...form, cost_per_unit: form.cost_per_unit ? parseFloat(form.cost_per_unit) : null, supplier: form.supplier || null, weight_format: form.weight_format || null, country_code: form.country_code || null, country: form.country || null, client: form.client || null }
      const d = await api(`/api/projects/${project.id}`, { method: 'PATCH', body })
      onSaved(d.project, false)
      onClose()
    } catch (err) { alert(err.message) }
    setSaving(false)
  }

  async function del() {
    if (!await confirm(`Eliminare "${project.name}"?`, { danger: true, confirmLabel: 'Elimina' })) return
    setDeleting(true)
    try {
      await api(`/api/projects/${project.id}`, { method: 'DELETE' })
      onDeleted(project.id)
      onClose()
    } catch (err) { alert(err.message) }
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b bg-emerald-50 border-warm-100 rounded-t-2xl flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500"/>
          <span className="font-700 text-warm-900 text-sm flex-1 truncate">{form.name}</span>
          <button onClick={() => { onClose(); onProponi(project) }}
            className="text-xs font-600 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3"><path d="M2 8h10M8 4l6 4-6 4"/></svg>
            Proponi
          </button>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-700 p-1">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <form id="pronto-form" onSubmit={save} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-none">
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Nome *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Mercato</label>
              <select value={form.market} onChange={e => set('market', e.target.value)}
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50">
                {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Formato</label>
              <input value={form.weight_format} onChange={e => set('weight_format', e.target.value)}
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Fornitore</label>
              <input value={form.supplier} onChange={e => set('supplier', e.target.value)}
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
            </div>
            <div>
              <label className="text-xs font-600 text-warm-500 mb-1 block">Costo (€/pz)</label>
              <input type="number" step="0.01" value={form.cost_per_unit} onChange={e => set('cost_per_unit', e.target.value)}
                className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Cliente / Buyer</label>
            <input value={form.client} onChange={e => set('client', e.target.value)}
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
          </div>
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Paese di destinazione</label>
            <select
              value={form.country_code}
              onChange={e => {
                const c = COUNTRIES.find(c => c.code === e.target.value)
                set('country_code', e.target.value)
                set('country', c?.name || '')
              }}
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50 text-warm-700">
              <option value="">— Seleziona paese —</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-600 text-warm-500 mb-1 block">Note</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50 resize-none"/>
          </div>
        </form>
        <div className="px-5 py-4 border-t border-warm-100 flex gap-2 flex-shrink-0">
          {profile?.role === 'admin' && (
            <button onClick={del} disabled={deleting}
              className="text-sm text-red-500 border border-red-200 rounded-xl px-4 py-2 disabled:opacity-40">
              {deleting ? '...' : 'Elimina'}
            </button>
          )}
          <div className="flex-1"/>
          <button onClick={onClose} className="text-sm text-warm-500 border border-warm-200 rounded-xl px-4 py-2">Annulla</button>
          <button form="pronto-form" type="submit" disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-xl px-5 py-2 disabled:opacity-40">
            {saving ? 'Salvo...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Vista Sviluppo (full-page) ────────────────────────────────────────────────
function SviluppoView({ project: initialProject, onBack, onSaved, onDeleted, onAdvance }) {
  const { profile } = useApp()
  const confirm = useConfirm()
  const [project, setProject] = useState(initialProject)
  const [steps, setSteps] = useState(
    initialProject.dev_steps?.length ? initialProject.dev_steps : DEFAULT_DEV_STEPS
  )
  const [newStepTitle, setNewStepTitle] = useState('')
  const [advancing, setAdvancing] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(initialProject.name)
  const [notes, setNotes] = useState(initialProject.notes || '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [editingStepId, setEditingStepId] = useState(null)
  const [stepNotesValue, setStepNotesValue] = useState('')
  const [ganttMode, setGanttMode] = useState(false)
  const [editingDatesId, setEditingDatesId] = useState(null)
  const [datesForm, setDatesForm] = useState({ start_date: '', end_date: '' })

  const done = steps.filter(s => s.completed).length
  const pct = steps.length ? Math.round(done / steps.length * 100) : 0
  const allDone = steps.length > 0 && done === steps.length

  function syncUp(updated) {
    const merged = { ...project, dev_steps: updated }
    setProject(merged)
    onSaved(merged)
  }

  async function toggleStep(id) {
    const updated = steps.map(s =>
      s.id === id ? { ...s, completed: !s.completed, completed_at: !s.completed ? new Date().toISOString() : null } : s
    )
    setSteps(updated)
    await api(`/api/projects/${project.id}/steps`, { method: 'PATCH', body: { dev_steps: updated } })
    syncUp(updated)
  }

  async function addStep(e) {
    e.preventDefault()
    const title = newStepTitle.trim()
    if (!title) return
    const updated = [...steps, { id: Date.now().toString(), title, completed: false, completed_at: null }]
    setSteps(updated)
    setNewStepTitle('')
    await api(`/api/projects/${project.id}/steps`, { method: 'PATCH', body: { dev_steps: updated } })
    syncUp(updated)
  }

  async function removeStep(id) {
    const updated = steps.filter(s => s.id !== id)
    setSteps(updated)
    await api(`/api/projects/${project.id}/steps`, { method: 'PATCH', body: { dev_steps: updated } })
    syncUp(updated)
  }

  async function saveName() {
    if (!name.trim() || name === project.name) { setEditingName(false); return }
    await api(`/api/projects/${project.id}`, { method: 'PATCH', body: { name } })
    const updated = { ...project, name }
    setProject(updated)
    onSaved(updated)
    setEditingName(false)
  }

  async function saveNotes() {
    setEditingNotes(false)
    await api(`/api/projects/${project.id}`, { method: 'PATCH', body: { notes } })
    const updated = { ...project, notes }
    setProject(updated)
    onSaved(updated)
  }

  async function saveStepNotes(stepId) {
    const updated = steps.map(s => s.id === stepId ? { ...s, notes: stepNotesValue } : s)
    setSteps(updated)
    setEditingStepId(null)
    await api(`/api/projects/${project.id}/steps`, { method: 'PATCH', body: { dev_steps: updated } })
    syncUp(updated)
  }

  function openEditDates(step) {
    setEditingDatesId(step.id)
    setDatesForm({ start_date: step.start_date || '', end_date: step.end_date || '' })
  }

  async function saveStepDates(stepId) {
    const updated = steps.map(s => s.id === stepId
      ? { ...s, start_date: datesForm.start_date || null, end_date: datesForm.end_date || null }
      : s)
    setSteps(updated)
    setEditingDatesId(null)
    await api(`/api/projects/${project.id}/steps`, { method: 'PATCH', body: { dev_steps: updated } })
    syncUp(updated)
  }

  async function advance() {
    setAdvancing(true)
    try {
      const d = await api(`/api/projects/${project.id}`, { method: 'PATCH', body: { stage: 'pronto' } })
      onAdvance(d.project)
      onBack()
    } catch (err) { alert(err.message) }
    setAdvancing(false)
  }

  async function del() {
    if (!await confirm(`Eliminare "${project.name}"?`, { danger: true, confirmLabel: 'Elimina' })) return
    await api(`/api/projects/${project.id}`, { method: 'DELETE' })
    onDeleted(project.id)
    onBack()
  }

  // Indice del primo step non completato (step "corrente")
  const currentIdx = steps.findIndex(s => !s.completed)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      {/* ── Header ── */}
      <div className="px-5 py-3 bg-white border-b border-warm-200 flex items-center gap-2 flex-shrink-0">
        <button onClick={onBack}
          className="flex items-center gap-1 text-xs font-600 text-warm-400 hover:text-warm-800 transition-colors flex-shrink-0">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M10 3L5 8l5 5"/></svg>
          Progetti
        </button>
        <span className="text-warm-200 text-xs">/</span>
        {editingName ? (
          <input value={name} onChange={e => setName(e.target.value)}
            onBlur={saveName} onKeyDown={e => { if (e.key === 'Enter') saveName() }} autoFocus
            className="font-700 text-sm text-warm-900 border border-blue-300 rounded px-2 py-0.5 focus:outline-none bg-white min-w-0 flex-1"/>
        ) : (
          <span className="font-700 text-sm text-warm-900 cursor-pointer hover:text-blue-600 transition-colors truncate flex-1"
            onClick={() => setEditingName(true)}>
            {project.name}
          </span>
        )}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-2xs font-700 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Sviluppo</span>
          {project.market && <MarketBadge market={project.market}/>}
        </div>
        <div className="flex-shrink-0 flex items-center gap-1.5 ml-1">
          {/* Toggle timeline / gantt */}
          <div className="flex rounded-lg border border-warm-200 overflow-hidden">
            <button onClick={() => setGanttMode(false)}
              className={`px-2.5 py-1.5 text-xs font-600 transition-colors flex items-center gap-1
                ${!ganttMode ? 'bg-blue-500 text-white' : 'bg-white text-warm-400 hover:text-warm-700'}`}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                <circle cx="4" cy="4" r="1.5" fill="currentColor" stroke="none"/>
                <line x1="7" y1="4" x2="14" y2="4"/>
                <circle cx="4" cy="8" r="1.5" fill="currentColor" stroke="none"/>
                <line x1="7" y1="8" x2="14" y2="8"/>
                <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                <line x1="7" y1="12" x2="11" y2="12"/>
              </svg>
              Lista
            </button>
            <button onClick={() => setGanttMode(true)}
              className={`px-2.5 py-1.5 text-xs font-600 transition-colors flex items-center gap-1 border-l border-warm-200
                ${ganttMode ? 'bg-blue-500 text-white' : 'bg-white text-warm-400 hover:text-warm-700'}`}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                <rect x="1" y="3" width="7" height="2.5" rx="1" fill="currentColor" stroke="none"/>
                <rect x="4" y="7" width="8" height="2.5" rx="1" fill="currentColor" stroke="none"/>
                <rect x="2" y="11" width="10" height="2.5" rx="1" fill="currentColor" stroke="none"/>
              </svg>
              Gantt
            </button>
          </div>
          {profile?.role === 'admin' && (
            <button onClick={del} className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2.5 py-1.5 transition-colors">
              Elimina
            </button>
          )}
          <button onClick={advance} disabled={advancing}
            className={`text-xs font-700 rounded-lg px-4 py-1.5 transition-all flex items-center gap-1.5
              ${allDone ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'} disabled:opacity-40`}>
            {advancing ? '...' : <><span>Pronto</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M3 8h10M9 4l4 4-4 4"/></svg></>}
          </button>
        </div>
      </div>

      {/* ── Metadati + barra progresso ── */}
      <div className="px-5 py-2.5 border-b border-warm-100 bg-warm-50 flex-shrink-0">
        <div className="flex items-center gap-4 mb-2">
          {project.supplier && <span className="text-xs text-warm-500"><span className="text-warm-300 mr-0.5">Forn.</span>{project.supplier}</span>}
          {project.client   && <span className="text-xs text-warm-500"><span className="text-warm-300 mr-0.5">Buy.</span>{project.client}</span>}
          {project.weight_format && <span className="text-xs text-warm-400">{project.weight_format}</span>}
          {project.country_code && (
            <span className="text-xs text-warm-500 flex items-center gap-1">
              <span className="text-warm-300">🌍</span>
              <span className="font-600">{project.country_code}</span>
              {project.country && <span className="text-warm-400">— {project.country}</span>}
            </span>
          )}
          <div className="flex-1"/>
          <span className="text-xs text-warm-400">{done} / {steps.length} completati</span>
          <span className="text-xs font-700 text-blue-600">{pct}%</span>
        </div>
        <div className="h-1.5 bg-warm-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : '#3b82f6' }}/>
        </div>
      </div>

      {/* ── Gantt ── */}
      {ganttMode && (
        <div className="flex-1 overflow-auto scrollbar-none">
          <div className="p-4">
            <GanttView steps={steps} onEditDates={openEditDates}/>
          </div>
          {/* Modal date step nel gantt */}
          {editingDatesId && (() => {
            const step = steps.find(s => s.id === editingDatesId)
            return (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={e => e.target === e.currentTarget && setEditingDatesId(null)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5">
                  <div className="font-700 text-sm text-warm-900 mb-4">{step?.title}</div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-600 text-warm-500 mb-1 block">Data inizio</label>
                      <input type="date" value={datesForm.start_date}
                        onChange={e => setDatesForm(f => ({ ...f, start_date: e.target.value }))}
                        className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 bg-warm-50"/>
                    </div>
                    <div>
                      <label className="text-xs font-600 text-warm-500 mb-1 block">Data fine</label>
                      <input type="date" value={datesForm.end_date}
                        onChange={e => setDatesForm(f => ({ ...f, end_date: e.target.value }))}
                        className="w-full text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 bg-warm-50"/>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 justify-end">
                    <button onClick={() => setEditingDatesId(null)}
                      className="text-sm text-warm-500 border border-warm-200 rounded-xl px-4 py-2">Annulla</button>
                    <button onClick={() => saveStepDates(editingDatesId)}
                      className="text-sm font-600 bg-blue-500 text-white rounded-xl px-4 py-2 hover:bg-blue-600">Salva</button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── Timeline (lista) ── */}
      {!ganttMode && (
      <div className="flex-1 overflow-y-auto scrollbar-none">
        <div className="max-w-xl mx-auto px-6 pt-5 pb-10">

          {/* Riepilogo email */}
          {notes && !editingNotes && (
            <div className="flex gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-6">
              <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-indigo-700">
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M8 1a2 2 0 0 1 1.416 3.408L9 9H7l-.416-4.592A2 2 0 0 1 8 1zm-.5 9.5h1v1h-1zm0 2h1v1h-1z"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xs font-700 text-indigo-500 uppercase tracking-wider mb-1">Riepilogo email</div>
                <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-wrap">{notes}</p>
              </div>
              <button onClick={() => setEditingNotes(true)} title="Modifica"
                className="text-indigo-300 hover:text-indigo-600 p-1 flex-shrink-0 self-start transition-colors">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M10.5 2.5l3 3-8 8H2.5v-3l8-8z"/></svg>
              </button>
            </div>
          )}
          {editingNotes && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-6">
              <div className="text-2xs font-700 text-indigo-500 uppercase tracking-wider mb-2">Riepilogo email</div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} autoFocus
                className="w-full text-sm border border-indigo-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 bg-white resize-none"/>
              <div className="flex gap-2 mt-2">
                <button onClick={saveNotes} className="text-xs font-600 bg-indigo-500 text-white px-3 py-1 rounded-lg hover:bg-indigo-600">Salva</button>
                <button onClick={() => setEditingNotes(false)} className="text-xs text-warm-400 hover:text-warm-600 px-2 py-1">Annulla</button>
              </div>
            </div>
          )}
          {!notes && !editingNotes && (
            <button onClick={() => setEditingNotes(true)}
              className="text-xs text-warm-300 hover:text-indigo-500 flex items-center gap-1.5 mb-5 transition-colors">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M10.5 2.5l3 3-8 8H2.5v-3l8-8z"/></svg>
              Aggiungi note
            </button>
          )}

          {/* ── Timeline ── */}
          <div className="relative">
            {/* Linea verticale di sfondo */}
            <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-warm-200 rounded-full"/>

            {steps.map((step, i) => {
              const isActive  = i === currentIdx
              const isFuture  = !step.completed && i > currentIdx
              return (
                <div key={step.id} className="group relative flex gap-4 mb-1">

                  {/* Nodo della timeline */}
                  <div className="flex-shrink-0 flex flex-col items-center z-10 pt-3">
                    <button onClick={() => toggleStep(step.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                        ${step.completed
                          ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200'
                          : isActive
                          ? 'bg-white border-blue-500 shadow-sm shadow-blue-100 ring-4 ring-blue-50'
                          : 'bg-white border-warm-300 hover:border-blue-300'}`}>
                      {step.completed
                        ? <svg viewBox="0 0 10 10" fill="none" className="w-3 h-3"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8"/></svg>
                        : isActive
                        ? <div className="w-2 h-2 rounded-full bg-blue-500"/>
                        : null}
                    </button>
                  </div>

                  {/* Contenuto */}
                  <div className={`flex-1 min-w-0 pb-5 ${isFuture ? 'opacity-45' : ''}`}>
                    <div className="flex items-start gap-2 pt-2.5">
                      <span className={`flex-1 text-sm font-600 leading-snug
                        ${step.completed ? 'line-through text-warm-400' : isActive ? 'text-blue-700' : 'text-warm-800'}`}>
                        {step.title}
                      </span>

                      {/* Data completamento */}
                      {step.completed && step.completed_at && (
                        <span className="text-xs text-warm-300 flex-shrink-0 whitespace-nowrap mt-0.5">
                          {new Date(step.completed_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                        </span>
                      )}

                      {/* Bottone date */}
                      <button onClick={() => openEditDates(step)}
                        className={`p-1 rounded transition-all flex-shrink-0 mt-0.5
                          ${(step.start_date || step.end_date) ? 'text-amber-400 hover:text-amber-600' : 'text-warm-200 hover:text-warm-400 opacity-0 group-hover:opacity-100'}`}>
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                          <rect x="1.5" y="2.5" width="13" height="12" rx="1.5"/><path d="M5 1v3M11 1v3M1.5 7h13"/>
                        </svg>
                      </button>

                      {/* Bottone note */}
                      <button onClick={() => { setEditingStepId(step.id); setStepNotesValue(step.notes || '') }}
                        className={`p-1 rounded transition-all flex-shrink-0 mt-0.5
                          ${step.notes ? 'text-blue-400 hover:text-blue-600' : 'text-warm-200 hover:text-warm-400 opacity-0 group-hover:opacity-100'}`}>
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3"><path d="M10.5 2.5l3 3-8 8H2.5v-3l8-8z"/></svg>
                      </button>

                      {/* Bottone elimina */}
                      {profile?.role === 'admin' && (
                        <button onClick={() => removeStep(step.id)}
                          className="p-1 rounded transition-all flex-shrink-0 mt-0.5 text-warm-200 hover:text-red-400 opacity-0 group-hover:opacity-100">
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3"><path d="M4 4l8 8M12 4l-8 8"/></svg>
                        </button>
                      )}
                    </div>

                    {/* Date range chip */}
                    {(step.start_date || step.end_date) && editingDatesId !== step.id && (
                      <div className="flex items-center gap-1 mt-1">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 text-amber-400 flex-shrink-0">
                          <rect x="1.5" y="2.5" width="13" height="12" rx="1.5"/><path d="M5 1v3M11 1v3M1.5 7h13"/>
                        </svg>
                        <span className="text-xs text-warm-400">
                          {step.start_date ? new Date(step.start_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : '?'}
                          {' – '}
                          {step.end_date ? new Date(step.end_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : '?'}
                        </span>
                      </div>
                    )}

                    {/* Form date inline */}
                    {editingDatesId === step.id && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <input type="date" value={datesForm.start_date}
                          onChange={e => setDatesForm(f => ({ ...f, start_date: e.target.value }))}
                          className="text-xs border border-amber-200 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400 bg-amber-50"/>
                        <span className="text-xs text-warm-400">–</span>
                        <input type="date" value={datesForm.end_date}
                          onChange={e => setDatesForm(f => ({ ...f, end_date: e.target.value }))}
                          className="text-xs border border-amber-200 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400 bg-amber-50"/>
                        <button onClick={() => saveStepDates(step.id)}
                          className="text-xs font-600 bg-amber-500 text-white px-2.5 py-1 rounded-lg hover:bg-amber-600">Salva</button>
                        <button onClick={() => setEditingDatesId(null)}
                          className="text-xs text-warm-400 hover:text-warm-600 px-1 py-1">✕</button>
                      </div>
                    )}

                    {/* Note step — visualizzazione */}
                    {editingStepId === step.id ? (
                      <div className="mt-2">
                        <textarea value={stepNotesValue} onChange={e => setStepNotesValue(e.target.value)}
                          placeholder="Note su questo step..." rows={2} autoFocus
                          className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 bg-blue-50 resize-none"/>
                        <div className="flex gap-2 mt-1.5">
                          <button onClick={() => saveStepNotes(step.id)}
                            className="text-xs font-600 bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600">Salva</button>
                          <button onClick={() => setEditingStepId(null)}
                            className="text-xs text-warm-400 hover:text-warm-600 px-2 py-1">Annulla</button>
                        </div>
                      </div>
                    ) : step.notes ? (
                      <p className="mt-1.5 text-xs text-warm-500 leading-relaxed bg-warm-50 rounded-lg px-3 py-2 border border-warm-100">
                        {step.notes}
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            })}

            {/* Aggiungi step — nodo in fondo alla timeline */}
            <div className="relative flex gap-4">
              <div className="flex-shrink-0 z-10 pt-2">
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-warm-300 bg-white flex items-center justify-center">
                  <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 text-warm-300"><path d="M5 2v6M2 5h6"/></svg>
                </div>
              </div>
              <form onSubmit={addStep} className="flex-1 flex items-center gap-2 pt-1.5 pb-4">
                <input value={newStepTitle} onChange={e => setNewStepTitle(e.target.value)}
                  placeholder="Aggiungi step..."
                  className="flex-1 text-sm text-warm-600 bg-transparent focus:outline-none placeholder-warm-300 border-b border-transparent focus:border-warm-300 pb-0.5 transition-colors"/>
                {newStepTitle.trim() && (
                  <button type="submit"
                    className="text-xs font-600 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                    Aggiungi
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Pronto in fondo */}
          <div className="pt-2 flex justify-end">
            <button onClick={advance} disabled={advancing}
              className={`text-sm font-700 rounded-xl px-8 py-3 transition-all flex items-center gap-2 shadow-sm
                ${allDone ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'}
                disabled:opacity-40`}>
              {advancing ? '...' : <><span>Segna come Pronto</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M3 8h10M9 4l4 4-4 4"/></svg></>}
            </button>
          </div>

        </div>
      </div>
      )}
    </div>
  )
}

const IDEA_PRI_CARD = {
  alta:  { bg: 'bg-red-50',    border: 'border-red-200',    borderL: 'border-l-red-400',    divider: 'border-red-100',   text: 'text-red-900',   sub: 'text-red-400',   btn: 'bg-red-100 text-red-700 hover:bg-red-200'    },
  media: { bg: 'bg-orange-50', border: 'border-orange-200', borderL: 'border-l-orange-400', divider: 'border-orange-100',text: 'text-orange-900',sub: 'text-orange-400',btn: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  bassa: { bg: 'bg-yellow-50', border: 'border-yellow-200', borderL: 'border-l-yellow-400', divider: 'border-yellow-100',text: 'text-yellow-900',sub: 'text-yellow-500',btn: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
}

// ── Droppable column area ─────────────────────────────────────────────────────
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

// ── Card Kanban ───────────────────────────────────────────────────────────────
function ProjectCard({ project, col, onClick, onAdvance, onProponi, compact }) {
  const [advancing, setAdvancing] = useState(false)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id })
  const dragStyle = isDragging
    ? { opacity: 0 }
    : transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` }
    : undefined

  async function handleAdvance(e) {
    e.stopPropagation()
    if (col.key === 'pronto') { onProponi(project); return }
    setAdvancing(true)
    try {
      const d = await api(`/api/projects/${project.id}`, { method: 'PATCH', body: { stage: col.nextStage } })
      onAdvance(d.project)
    } catch (err) { alert(err.message) }
    setAdvancing(false)
  }

  const steps = project.dev_steps || []
  const pri = col.key === 'idea' ? (IDEA_PRI_CARD[project.priority] || null) : null

  const dragHandle = (
    <div {...listeners} onClick={e => e.stopPropagation()}
      className="cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-black/5 touch-none flex-shrink-0 -mr-1 -mt-0.5">
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
      className={`rounded-lg border border-l-4 px-2.5 py-2 cursor-pointer hover:shadow-sm transition-all flex items-center gap-2
        ${pri ? `${pri.bg} ${pri.border} ${pri.borderL}` : `bg-white border-warm-200 ${col.cardBorder}`}`}>
      {dragHandle}
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-600 truncate ${pri ? pri.text : 'text-warm-900'}`}>{project.name}</div>
      </div>
      {project.market && <MarketBadge market={project.market}/>}
    </div>
  )

  return (
    <div ref={setNodeRef} style={dragStyle}
      {...attributes}
      onClick={onClick}
      className={`rounded-xl border border-l-4 p-3 cursor-pointer hover:shadow-md transition-all
        ${pri
          ? `${pri.bg} ${pri.border} ${pri.borderL}`
          : `bg-white border-warm-200 ${col.cardBorder}`
        }`}>

      <div className="flex items-start justify-between gap-1 mb-1.5">
        <div className={`font-600 text-sm leading-snug flex-1 min-w-0 ${pri ? pri.text : 'text-warm-900'}`}>
          {project.name}
        </div>
        {dragHandle}
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {project.market && <MarketBadge market={project.market}/>}
        {col.key === 'idea' && project.origin && <OriginBadge origin={project.origin}/>}
      </div>

      {project.weight_format && <div className={`text-xs mb-1 ${pri ? pri.sub : 'text-warm-400'}`}>{project.weight_format}</div>}
      {project.supplier && <div className={`text-xs ${pri ? pri.sub : 'text-warm-500'}`}><span className="opacity-60">Forn. </span>{project.supplier}</div>}
      {project.client && <div className={`text-xs ${pri ? pri.sub : 'text-warm-500'}`}><span className="opacity-60">Buy. </span>{project.client}</div>}
      {project.country_code && <div className={`text-xs ${pri ? pri.sub : 'text-warm-400'}`}><span className="opacity-60">🌍 </span>{project.country_code}{project.country ? ` — ${project.country}` : ''}</div>}

      {col.key === 'sviluppo' && steps.length > 0 && <StepProgress steps={steps}/>}

      {/* Bottone avanzamento + scheda sviluppo */}
      <div className={`mt-2.5 pt-2 border-t flex items-center justify-between ${pri ? pri.divider : 'border-warm-100'}`}>
        {col.key === 'sviluppo' && (
          <span className={`text-2xs font-600 ${pri ? pri.sub : 'text-warm-400'}`}>
            {steps.filter(s => s.completed).length}/{steps.length || DEFAULT_DEV_STEPS.length} step
          </span>
        )}
        {col.key !== 'sviluppo' && <div/>}
        <button onClick={handleAdvance} disabled={advancing}
          className={`text-2xs font-700 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 disabled:opacity-30
            ${pri ? pri.btn : col.key === 'pronto' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
          {advancing ? '...' : col.nextLabel}
        </button>
      </div>
    </div>
  )
}

// ── Vista principale ──────────────────────────────────────────────────────────
export default function Projects({ onProponiPipeline }) {
  const { profile } = useApp()
  const [projects, setProjects]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(null)
  const [sviluppoView, setSviluppoView] = useState(null)
  const [filterMarket, setFilterMarket] = useState('')
  const [compact, setCompact]         = useState(false)
  const [syncing, setSyncing]         = useState(false)
  const [deduping, setDeduping]       = useState(false)
  const [syncResult, setSyncResult]   = useState(null)
  const [activeId, setActiveId]   = useState(null)
  const [overColId, setOverColId] = useState(null)
  const fileInputRef = useRef(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const load = () => api('/api/projects')
    .then(d => setProjects(d.projects || []))
    .catch(() => {})
    .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const filtered = projects.filter(p => !filterMarket || p.market === filterMarket)

  function sortByPriority() {
    setProjects(prev => {
      const ideaCards = prev.filter(p => p.stage === 'idea').sort((a, b) =>
        (PRI_ORDER[a.priority] ?? 99) - (PRI_ORDER[b.priority] ?? 99)
      )
      const rest = prev.filter(p => p.stage !== 'idea')
      return [...ideaCards, ...rest]
    })
  }

  function handleSaved(project) {
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, ...project } : p))
  }
  function handleCreated(project) { setProjects(prev => [project, ...prev]) }
  function handleDeleted(id) {
    setProjects(prev => prev.filter(p => p.id !== id))
    if (sviluppoView?.id === id) setSviluppoView(null)
  }
  function handleAdvanced(project) {
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, ...project } : p))
  }

  function handleDragStart({ active }) { setActiveId(active.id) }
  function handleDragOver({ over })   { setOverColId(over?.id ?? null) }

  async function handleDragEnd({ active, over }) {
    setActiveId(null); setOverColId(null)
    if (!over) return
    const newStage = over.id  // sempre una column key
    // projects non è mai stato modificato durante il drag → nessun stale closure
    const proj = projects.find(p => p.id === active.id)
    if (!proj || proj.stage === newStage) return
    const origStage = proj.stage
    setProjects(prev => prev.map(p => p.id === active.id ? { ...p, stage: newStage } : p))
    try {
      await api(`/api/projects/${active.id}`, { method: 'PATCH', body: { stage: newStage } })
    } catch {
      setProjects(prev => prev.map(p => p.id === active.id ? { ...p, stage: origStage } : p))
    }
  }

  async function handleDedup() {
    setDeduping(true); setSyncResult(null)
    try {
      const r = await api('/api/sync/dedup', { method: 'POST', body: {} })
      setSyncResult({ ok: true, inserted: 0, updated: 0, skipped: 0, deleted_duplicates: r.deleted })
      if (r.deleted > 0) load()
    } catch (err) { setSyncResult({ ok: false, error: err.message }) }
    setDeduping(false)
  }

  async function handleSync(e) {
    const file = e.target.files?.[0]; if (!file) return
    e.target.value = ''; setSyncing(true); setSyncResult(null)
    try {
      const form = new FormData(); form.append('file', file)
      const r = await api('/api/sync/progetti', { method: 'POST', body: form })
      setSyncResult({ ok: true, ...r }); load()
    } catch (err) { setSyncResult({ ok: false, error: err.message }) }
    setSyncing(false)
  }

  // Se è aperta la vista sviluppo, mostra quella al posto del kanban
  if (sviluppoView) {
    return (
      <SviluppoView
        project={sviluppoView}
        onBack={() => setSviluppoView(null)}
        onSaved={p => { handleSaved(p); setSviluppoView(prev => ({ ...prev, ...p })) }}
        onDeleted={handleDeleted}
        onAdvance={p => { handleAdvanced(p); setSviluppoView(null) }}
      />
    )
  }

  const colCounts = Object.fromEntries(
    COLUMNS.map(c => [c.key, filtered.filter(p => p.stage === c.key || (c.key === 'sviluppo' && p.stage === 'test')).length])
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-warm-200 flex items-center gap-3 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold tracking-tight text-warm-900">Progetti</h1>
          <div className="flex items-center gap-3 mt-1">
            {COLUMNS.map(c => (
              <span key={c.key} className="flex items-center gap-1 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}/>
                <span className={`font-600 ${c.color}`}>{c.label}</span>
                <span className="text-warm-400">{colCounts[c.key]}</span>
              </span>
            ))}
            <span className="text-warm-300 text-xs">· {filtered.length} totali</span>
          </div>
        </div>

        {/* Filtri mercato rapidi */}
        <div className="hidden md:flex items-center gap-1">
          {['', 'Horeca', 'Retail'].map(m => (
            <button key={m} onClick={() => setFilterMarket(m)}
              className={`text-xs font-600 px-2.5 py-1.5 rounded-lg border transition-colors ${filterMarket === m ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-warm-500 border-warm-200 hover:border-brand-300 hover:text-brand-600'}`}>
              {m || 'Tutti'}
            </button>
          ))}
        </div>

        {/* Ordina per priorità (solo colonna Idea) */}
        <button onClick={sortByPriority} title="Ordina Idea per priorità"
          className="hidden md:flex items-center gap-1 text-xs font-600 px-2.5 py-1.5 rounded-lg border border-warm-200 bg-white text-warm-500 hover:border-amber-300 hover:text-amber-600 transition-colors">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M2 4h8M2 8h5M2 12h3"/><path d="M12 3v10M9 10l3 3 3-3"/></svg>
          Priorità
        </button>

        {profile?.role === 'admin' && (
          <>
            <button onClick={handleDedup} disabled={deduping}
              className="text-xs font-600 rounded-lg px-3 py-2 border border-warm-200 hover:border-red-300 text-warm-500 hover:text-red-500 transition-colors disabled:opacity-40 flex items-center gap-1.5">
              {deduping
                ? <span className="w-3 h-3 border-2 border-red-300 border-t-transparent rounded-full animate-spin"/>
                : <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3"><path d="M4 4l8 8M12 4l-8 8"/></svg>
              }
              Elimina duplicati
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleSync}/>
            <button onClick={() => fileInputRef.current?.click()} disabled={syncing}
              className="text-xs font-600 rounded-lg px-3 py-2 border border-warm-200 hover:border-brand-400 text-warm-600 hover:text-brand-600 transition-colors flex items-center gap-1.5 disabled:opacity-40">
              {syncing ? <span className="w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"/> : <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3"><path d="M2 8a6 6 0 1 0 1-3.3"/><path d="M2 2v4h4"/></svg>}
              Sync
            </button>
          </>
        )}

        <button onClick={() => setCompact(v => !v)} title={compact ? 'Vista espansa' : 'Vista compatta'}
          className="p-2 rounded-lg border border-warm-200 hover:border-warm-300 text-warm-400 hover:text-warm-700 transition-colors flex-shrink-0">
          {compact
            ? <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="1.5" y="2" width="13" height="4" rx="1"/><rect x="1.5" y="8" width="13" height="4" rx="1"/></svg>
            : <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="1.5" y="1.5" width="13" height="6" rx="1"/><rect x="1.5" y="9" width="13" height="2.5" rx="1"/><rect x="1.5" y="13" width="13" height="1.5" rx="0.5"/></svg>
          }
        </button>

        {['admin', 'manager'].includes(profile?.role) && (
          <button onClick={() => setModal({ type: 'idea', project: null })}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-lg px-4 py-2 transition-colors flex items-center gap-1.5 flex-shrink-0">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M8 3v10M3 8h10"/></svg>
            Nuovo
          </button>
        )}
      </div>

      {/* Toast sync */}
      {syncResult && (
        <div className={`mx-4 mt-2 px-4 py-2.5 rounded-xl text-sm flex items-center justify-between gap-3 flex-shrink-0 ${syncResult.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span>{syncResult.ok
            ? `✓ ${syncResult.inserted > 0 || syncResult.updated > 0 || syncResult.deleted_duplicates > 0 ? `${syncResult.inserted} inseriti, ${syncResult.updated} aggiornati${syncResult.deleted_duplicates ? `, ${syncResult.deleted_duplicates} duplicati rimossi` : ''}` : 'Nessuna modifica necessaria'}`
            : `✗ ${syncResult.error}`}
          </span>
          <button onClick={() => setSyncResult(null)} className="opacity-50 hover:opacity-100">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
      )}

      {/* Kanban */}
      <DndContext sensors={sensors}
        onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-x-auto scrollbar-none bg-warm-50">
          {COLUMNS.map(col => {
            const cards = filtered.filter(p =>
              p.stage === col.key || (col.key === 'sviluppo' && p.stage === 'test')
            )
            return (
              <div key={col.key} className="flex-1 min-w-[240px] flex flex-col border-r border-warm-200 last:border-r-0">
                <div className={`px-3 py-3 ${col.headerBg} border-b ${col.border} flex items-center gap-2 flex-shrink-0`}>
                  <div className={`w-2 h-2 rounded-full ${col.dot}`}/>
                  <span className={`text-xs font-700 uppercase tracking-widest ${col.color}`}>{col.label}</span>
                  <span className={`ml-auto text-xs font-700 ${col.color} bg-white/60 px-2 py-0.5 rounded-full`}>{cards.length}</span>
                </div>
                {loading && (
                  <div className="p-2 space-y-2">
                    {[1,2].map(i => <div key={i} className="bg-white rounded-xl border border-warm-200 p-3 animate-pulse h-20"/>)}
                  </div>
                )}
                {!loading && (
                  <DroppableColumn id={col.key} isOver={overColId === col.key && !!activeId}>
                    <div className="space-y-1.5">
                      {cards.map(p => (
                        <ProjectCard key={p.id} project={p} col={col} compact={compact}
                          onClick={() => {
                            if (activeId) return
                            if (col.key === 'sviluppo') setSviluppoView(p)
                            else if (col.key === 'idea') setModal({ type: 'idea', project: p })
                            else setModal({ type: 'pronto', project: p })
                          }}
                          onAdvance={handleAdvanced}
                          onProponi={p => { onProponiPipeline?.(p) }}
                        />
                      ))}
                      {cards.length === 0 && (
                        <div className={`text-xs ${col.emptyColor} opacity-40 text-center py-10 border-2 border-dashed ${col.border} rounded-xl`}>
                          Nessun progetto
                        </div>
                      )}
                    </div>
                  </DroppableColumn>
                )}
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {(() => {
            if (!activeId) return null
            const p = projects.find(x => x.id === activeId)
            if (!p) return null
            const pri = IDEA_PRI_CARD[p.priority]
            return (
              <div className={`rounded-xl border border-l-4 p-3 shadow-xl cursor-grabbing
                ${pri ? `${pri.bg} ${pri.border} ${pri.borderL}` : 'bg-white border-warm-200 border-l-slate-400'}`}>
                <div className={`font-600 text-sm leading-snug ${pri ? pri.text : 'text-warm-900'}`}>{p.name}</div>
                {p.market && <div className="mt-1"><MarketBadge market={p.market}/></div>}
              </div>
            )
          })()}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      {modal?.type === 'idea' && (
        <IdeaModal
          project={modal.project}
          onClose={() => setModal(null)}
          onSaved={(p, isNew) => { isNew ? handleCreated(p) : handleSaved(p) }}
          onDeleted={handleDeleted}
        />
      )}
      {modal?.type === 'pronto' && (
        <ProntoModal
          project={modal.project}
          onClose={() => setModal(null)}
          onSaved={(p) => handleSaved(p)}
          onDeleted={handleDeleted}
          onProponi={p => { setModal(null); onProponiPipeline?.(p) }}
        />
      )}
    </div>
  )
}
