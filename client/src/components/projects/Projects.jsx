import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useApp } from '../../App'

const STATUS = { active: { label: 'Attivo', cls: 'bg-brand-50 text-brand-600' }, on_hold: { label: 'In pausa', cls: 'bg-amber-50 text-amber-700' }, completed: { label: 'Completato', cls: 'bg-blue-50 text-blue-700' }, cancelled: { label: 'Annullato', cls: 'bg-warm-100 text-warm-500' } }
const PRI_DOT = { urgent: 'bg-red-500', high: 'bg-amber-400', medium: 'bg-brand-500', low: 'bg-warm-300' }

export default function Projects() {
  const { profile } = useApp()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [projectDetail, setProjectDetail] = useState(null)
  const [tab, setTab] = useState('overview')

  const load = () => api('/api/projects').then(d => setProjects(d.projects || [])).catch(() => {}).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  async function openProject(id) {
    setSelected(id); setTab('overview')
    const d = await api('/api/projects/' + id)
    setProjectDetail(d.project)
  }

  async function newProject() {
    const name = prompt('Nome del progetto:')
    if (!name) return
    const { project } = await api('/api/projects', { method: 'POST', body: { name, priority: 'medium', status: 'active', member_ids: [profile.id] } })
    await load()
    openProject(project.id)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 bg-white border-b border-warm-200 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-base font-bold tracking-tight text-warm-900">Progetti</h1>
          <p className="text-xs text-warm-400 mt-0.5">{projects.length} progetti</p>
        </div>
        {profile?.role !== 'agent' && (
          <button onClick={newProject} className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-600 rounded-lg px-4 py-2 transition-colors flex items-center gap-1.5">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M8 3v10M3 8h10"/></svg>
            Nuovo
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 scrollbar-none">
        {loading && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="h-36 bg-white rounded-2xl border border-warm-200 animate-pulse"/>)}</div>}

        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-warm-300 gap-2">
            <p className="text-sm">Nessun progetto. Creane uno!</p>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { n: projects.length, l: 'Totali' },
                { n: projects.filter(p => p.status === 'active').length, l: 'Attivi' },
                { n: projects.filter(p => p.priority === 'urgent').length, l: 'Urgenti', red: true },
                { n: projects.filter(p => p.status === 'completed').length, l: 'Completati' },
              ].map(({ n, l, red }) => (
                <div key={l} className="bg-white border border-warm-200 rounded-xl p-4 text-center">
                  <div className={`text-2xl font-700 tracking-tight ${red && n > 0 ? 'text-red-500' : 'text-warm-900'}`}>{n}</div>
                  <div className="text-xs text-warm-400 mt-0.5">{l}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map(p => {
                const tasks = p.project_tasks || []
                const done = tasks.filter(t => t.status === 'done').length
                const progress = tasks.length ? Math.round(done / tasks.length * 100) : 0
                const s = STATUS[p.status] || STATUS.active
                return (
                  <div key={p.id} onClick={() => openProject(p.id)}
                    className="bg-white border border-warm-200 rounded-2xl p-5 cursor-pointer hover:border-warm-300 hover:shadow-md transition-all">
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${p.status === 'active' ? 'bg-brand-50' : p.status === 'on_hold' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                        <svg viewBox="0 0 20 20" fill="none" stroke={p.status === 'active' ? '#1D9E75' : p.status === 'on_hold' ? '#D97706' : '#3B82F6'} strokeWidth="1.6" className="w-4.5 h-4.5">
                          <path d="M9 5H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-700 text-warm-900 leading-tight">{p.name}</div>
                      </div>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${PRI_DOT[p.priority] || 'bg-warm-200'}`} />
                    </div>

                    {tasks.length > 0 && (
                      <div className="mb-3">
                        <div className="h-1 bg-warm-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="text-xs text-warm-400 mt-1">{done}/{tasks.length} task · {progress}%</div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className={`text-2xs font-600 px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                      {p.due_date && <span className="text-xs text-warm-400 ml-auto">{new Date(p.due_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Project modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-warm-100 flex-shrink-0">
              <div className="flex-1 font-700 text-warm-900">{projectDetail?.name || '...'}</div>
              <button onClick={() => { setSelected(null); setProjectDetail(null) }} className="text-warm-300 hover:text-warm-600">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 3l10 10M13 3L3 13"/></svg>
              </button>
            </div>

            <div className="flex border-b border-warm-100 flex-shrink-0 overflow-x-auto scrollbar-none">
              {['overview', 'tasks', 'notes', 'milestones'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-5 py-3 text-sm font-600 capitalize whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-warm-400 hover:text-warm-700'}`}>
                  {t === 'overview' ? 'Panoramica' : t === 'tasks' ? 'Task' : t === 'notes' ? 'Note' : 'Milestone'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 scrollbar-none">
              {!projectDetail && <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-warm-200 border-t-brand-500 rounded-full animate-spin"/></div>}
              {projectDetail && tab === 'overview' && <ProjectOverview p={projectDetail} />}
              {projectDetail && tab === 'tasks' && <ProjectTasks tasks={projectDetail.project_tasks || []} />}
              {projectDetail && tab === 'notes' && <ProjectNotes notes={projectDetail.project_notes || []} />}
              {projectDetail && tab === 'milestones' && <ProjectMilestones ms={projectDetail.milestones || []} projectId={selected} refresh={() => openProject(selected)} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectOverview({ p }) {
  const tasks = p.project_tasks || [], ms = p.milestones || []
  const done = tasks.filter(t => t.status === 'done').length
  const progress = tasks.length ? Math.round(done / tasks.length * 100) : 0
  const s = STATUS[p.status] || STATUS.active
  return (
    <div className="space-y-4">
      <p className="text-sm text-warm-600 leading-relaxed">{p.description || 'Nessuna descrizione'}</p>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-600 px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>
        {p.due_date && <span className="text-xs text-warm-400">Scadenza: {new Date(p.due_date).toLocaleDateString('it-IT')}</span>}
      </div>
      {tasks.length > 0 && <div className="h-1.5 bg-warm-100 rounded-full overflow-hidden"><div className="h-full bg-brand-500 rounded-full" style={{ width: `${progress}%` }}/></div>}
      <div className="grid grid-cols-3 gap-3">
        {[{ n: tasks.length, l: 'Task totali' }, { n: done, l: 'Completati' }, { n: `${ms.filter(m => m.completed).length}/${ms.length}`, l: 'Milestone' }].map(({ n, l }) => (
          <div key={l} className="bg-warm-50 border border-warm-200 rounded-xl p-3 text-center">
            <div className="text-lg font-700 text-warm-900">{n}</div>
            <div className="text-xs text-warm-400">{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProjectTasks({ tasks }) {
  return (
    <div className="space-y-2">
      {tasks.length === 0 && <p className="text-sm text-warm-400">Nessun task</p>}
      {tasks.map(t => (
        <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border ${t.status === 'done' ? 'bg-warm-50 border-warm-100' : 'bg-white border-warm-200'}`}>
          <div className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 ${t.status === 'done' ? 'bg-brand-500 border-brand-500' : 'border-warm-300'}`}/>
          <span className={`flex-1 text-sm ${t.status === 'done' ? 'text-warm-400 line-through' : 'text-warm-900 font-500'}`}>{t.title}</span>
          {t.assignee && <span className="text-xs text-warm-400">{t.assignee.full_name?.split(' ')[0]}</span>}
        </div>
      ))}
    </div>
  )
}

function ProjectNotes({ notes }) {
  const typeColors = { update: 'bg-blue-50 text-blue-700', meeting: 'bg-brand-50 text-brand-600', call: 'bg-purple-50 text-purple-700', decision: 'bg-amber-50 text-amber-700', risk: 'bg-red-50 text-red-600' }
  return (
    <div className="space-y-3">
      {notes.length === 0 && <p className="text-sm text-warm-400">Nessuna nota</p>}
      {notes.map(n => (
        <div key={n.id} className="bg-white border border-warm-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-700 text-warm-900">{n.author?.full_name}</span>
            <span className={`text-2xs font-600 px-2 py-0.5 rounded-full ${typeColors[n.note_type] || ''}`}>{n.note_type}</span>
            <span className="text-2xs text-warm-400 ml-auto">{new Date(n.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>
          </div>
          <p className="text-sm text-warm-700 leading-relaxed">{n.content}</p>
          {n.ai_summary && <p className="text-xs text-warm-500 border-l-2 border-brand-200 pl-3 mt-2 leading-relaxed">{n.ai_summary}</p>}
        </div>
      ))}
    </div>
  )
}

function ProjectMilestones({ ms, projectId, refresh }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')

  async function add(e) {
    e.preventDefault()
    if (!title) return
    await api(`/api/projects/${projectId}/milestones`, { method: 'POST', body: { title, due_date: date || undefined } })
    setTitle(''); setDate(''); refresh()
  }

  async function toggle(id, completed) {
    await api(`/api/projects/${projectId}/milestones/${id}`, { method: 'PATCH', body: { completed } })
    refresh()
  }

  return (
    <div>
      <form onSubmit={add} className="flex gap-2 mb-4 flex-wrap">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titolo milestone..."
          className="flex-1 min-w-32 text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="text-sm border border-warm-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand-400 bg-warm-50"/>
        <button type="submit" className="bg-brand-500 text-white text-sm font-600 rounded-lg px-3 py-2 hover:bg-brand-600 transition-colors">+ Aggiungi</button>
      </form>
      <div className="space-y-2">
        {ms.length === 0 && <p className="text-sm text-warm-400">Nessuna milestone</p>}
        {ms.map(m => (
          <div key={m.id} className="flex items-center gap-3 p-3 bg-warm-50 border border-warm-200 rounded-xl">
            <button onClick={() => toggle(m.id, !m.completed)}
              className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${m.completed ? 'bg-brand-500 border-brand-500' : 'border-warm-300 hover:border-brand-400'}`}>
              {m.completed && <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5"/></svg>}
            </button>
            <span className={`flex-1 text-sm font-500 ${m.completed ? 'text-warm-400 line-through' : 'text-warm-900'}`}>{m.title}</span>
            {m.due_date && <span className="text-xs text-warm-400">{new Date(m.due_date + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
