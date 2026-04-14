import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useConfirm } from '../../App'

const PRI_COLORS = {
  alta:  'bg-red-100 text-red-600',
  media: 'bg-amber-100 text-amber-700',
  bassa: 'bg-warm-100 text-warm-500',
}
const MARKET_COLORS = {
  Retail:  'bg-violet-100 text-violet-700',
  Horeca:  'bg-orange-100 text-orange-700',
}

function Badge({ label, className }) {
  return <span className={`text-2xs font-600 px-2 py-0.5 rounded-full ${className}`}>{label}</span>
}

export default function StandbyView() {
  const confirm = useConfirm()
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState(null) // id del progetto in azione

  useEffect(() => {
    api('/api/projects?stage=standby')
      .then(d => setProjects(d.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function moveToStage(project, stage) {
    const labels = { idea: 'Idea', sviluppo: 'Sviluppo' }
    const ok = await confirm(`Spostare "${project.name}" in ${labels[stage]}?`, { confirmLabel: `Sposta in ${labels[stage]}` })
    if (!ok) return
    setActing(project.id)
    try {
      await api(`/api/projects/${project.id}`, { method: 'PATCH', body: { stage } })
      setProjects(prev => prev.filter(p => p.id !== project.id))
    } catch (e) { alert(e.message) }
    setActing(null)
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header count={0} />
        <div className="p-6 space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-warm-200 animate-pulse"/>)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header count={projects.length} />

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-warm-300">
          <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1" className="w-10 h-10 opacity-40">
            <rect x="4" y="4" width="32" height="32" rx="4"/>
            <path d="M12 20h16M20 12v16"/>
          </svg>
          <p className="text-sm">Nessun progetto in standby</p>
          <p className="text-xs text-warm-300 max-w-xs text-center">
            I progetti contrassegnati come "Standby" nel file Excel appariranno qui per essere revisionati.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-none">
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-3">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} acting={acting === p.id}
                onIdea={() => moveToStage(p, 'idea')}
                onSviluppo={() => moveToStage(p, 'sviluppo')}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Header({ count }) {
  return (
    <div className="px-6 py-4 bg-white border-b border-warm-200 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-amber-600">
            <circle cx="8" cy="8" r="6"/>
            <path d="M6 8h4M8 6v4"/>
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-warm-900">Da rivedere</h1>
          <p className="text-xs text-warm-400 mt-0.5">
            {count > 0 ? `${count} progett${count === 1 ? 'o' : 'i'} in standby` : 'Nessun progetto in standby'}
          </p>
        </div>
      </div>
      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
        Questi progetti sono stati marcati come <strong>Standby</strong> nel file Excel. Revisionali e spostali in Idea o Sviluppo quando sono pronti a ripartire.
      </div>
    </div>
  )
}

function ProjectCard({ project, acting, onIdea, onSviluppo }) {
  return (
    <div className="bg-white border border-warm-200 border-l-4 border-l-amber-400 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-700 text-warm-900 text-sm leading-snug">{project.name}</div>
          {project.supplier && (
            <div className="text-xs text-warm-400 mt-0.5">
              <span className="text-warm-300">Forn. </span>{project.supplier}
            </div>
          )}
          {project.client && (
            <div className="text-xs text-warm-400">
              <span className="text-warm-300">Buy. </span>{project.client}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {project.market && <Badge label={project.market} className={MARKET_COLORS[project.market] || 'bg-warm-100 text-warm-600'}/>}
          {project.priority && <Badge label={project.priority} className={PRI_COLORS[project.priority] || 'bg-warm-100 text-warm-500'}/>}
        </div>
      </div>

      {project.country_code && (
        <div className="text-xs text-warm-400 mb-2">
          🌍 <span className="font-600 text-warm-600">{project.country_code}</span>
          {project.country && ` — ${project.country}`}
        </div>
      )}

      {project.notes && (
        <div className="text-xs text-warm-500 bg-warm-50 rounded-xl px-3 py-2 mb-3 leading-relaxed line-clamp-3">
          {project.notes}
        </div>
      )}

      <div className="flex gap-2 mt-3 pt-3 border-t border-warm-100">
        <button onClick={onIdea} disabled={acting}
          className="flex-1 text-xs font-600 py-2 rounded-xl border border-warm-200 text-warm-600 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40">
          ← Riporta in Idea
        </button>
        <button onClick={onSviluppo} disabled={acting}
          className="flex-1 text-xs font-700 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-40">
          Riattiva in Sviluppo →
        </button>
      </div>
    </div>
  )
}
