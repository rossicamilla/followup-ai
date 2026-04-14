import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { api } from './lib/api'
import Login from './components/auth/Login'
import Layout from './components/layout/Layout'
import Pipeline from './components/pipeline/Pipeline'
import ProductPipeline from './components/pipeline/ProductPipeline'
import Tasks from './components/tasks/Tasks'
import Projects from './components/projects/Projects'
import StandbyView from './components/projects/StandbyView'
import AINote from './components/ai/AINote'
import Team from './components/team/Team'
import Contacts from './components/contacts/Contacts'

export const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

// ── Confirm dialog globale ────────────────────────────────────────────────────
const ConfirmContext = createContext(null)
export function useConfirm() { return useContext(ConfirmContext) }

function ConfirmDialog({ config, onResolve }) {
  if (!config) return null
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        {config.title && <p className="text-sm font-700 text-warm-900 mb-1">{config.title}</p>}
        <p className="text-sm text-warm-600 mb-5">{config.message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => onResolve(false)}
            className="text-sm text-warm-500 border border-warm-200 rounded-xl px-4 py-2 hover:bg-warm-50">
            Annulla
          </button>
          <button onClick={() => onResolve(true)} autoFocus
            className={`text-sm font-600 rounded-xl px-5 py-2 text-white ${config.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-500 hover:bg-brand-600'}`}>
            {config.confirmLabel || 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 8000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl shadow-lg text-sm font-600 flex items-center gap-2 transition-all
      ${type === 'success' ? 'bg-brand-500 text-white' : 'bg-red-500 text-white'}`}>
      {type === 'success'
        ? <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M3 8l3.5 3.5L13 5"/></svg>
        : <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M4 4l8 8M12 4l-8 8"/></svg>
      }
      {msg}
    </div>
  )
}

// ── Pannello notifiche AI ─────────────────────────────────────────────────────
function AINotifPanel({ onClose, onNavigate }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/ai-log').then(d => setItems(d.items || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function dismiss(id) {
    await api(`/api/ai-log/${id}/review`, { method: 'POST', body: {} })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function dismissAll() {
    await api('/api/ai-log/review-all', { method: 'POST', body: {} })
    setItems([])
  }

  const ACTION_LABELS = {
    idea_created:      { label: 'Nuova idea creata', color: 'bg-blue-100 text-blue-700' },
    project_updated:   { label: 'Progetto aggiornato', color: 'bg-amber-100 text-amber-700' },
    pipeline_created:  { label: 'Aggiunto a Vendite', color: 'bg-purple-100 text-purple-700' },
    pipeline_updated:  { label: 'Vendite aggiornato', color: 'bg-orange-100 text-orange-700' },
    contact_updated:   { label: 'Contatto aggiornato', color: 'bg-teal-100 text-teal-700' },
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-warm-100 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-amber-400"/>
          <span className="font-700 text-warm-900 text-sm flex-1">Modifiche AI da revisionare</span>
          {items.length > 1 && (
            <button onClick={dismissAll} className="text-xs text-warm-400 hover:text-warm-700 underline">Segna tutte come viste</button>
          )}
          <button onClick={onClose} className="text-warm-400 hover:text-warm-700 p-1">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-none">
          {loading && <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-warm-100 rounded-xl animate-pulse"/>)}</div>}
          {!loading && items.length === 0 && (
            <div className="text-center py-10 text-warm-400 text-sm">Nessuna modifica in attesa</div>
          )}
          {items.map(item => {
            const meta = ACTION_LABELS[item.action] || { label: item.action, color: 'bg-warm-100 text-warm-600' }
            return (
              <div key={item.id} className="flex items-start gap-3 bg-warm-50 rounded-xl p-3 border border-warm-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-2xs font-700 px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                    <span className="text-2xs text-warm-400">{new Date(item.created_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs font-600 text-warm-900 truncate">{item.entity_name}</p>
                  {item.details?.notes_added && <p className="text-2xs text-warm-500 mt-0.5 line-clamp-2">{item.details.notes_added}</p>}
                  {item.details?.steps_completed?.length > 0 && (
                    <p className="text-2xs text-emerald-600 mt-0.5">✓ {item.details.steps_completed.join(', ')}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {item.entity_type === 'project' && (
                    <button onClick={() => { onNavigate('projects'); onClose() }}
                      className="text-2xs font-600 px-2 py-1 rounded-lg bg-brand-100 text-brand-700 hover:bg-brand-200">
                      Vai
                    </button>
                  )}
                  {item.entity_type === 'pipeline' && (
                    <button onClick={() => { onNavigate('vendite'); onClose() }}
                      className="text-2xs font-600 px-2 py-1 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200">
                      Vai
                    </button>
                  )}
                  {item.entity_type === 'contact' && (
                    <button onClick={() => { onNavigate('contacts'); onClose() }}
                      className="text-2xs font-600 px-2 py-1 rounded-lg bg-teal-100 text-teal-700 hover:bg-teal-200">
                      Vai
                    </button>
                  )}
                  <button onClick={() => dismiss(item.id)}
                    className="text-2xs font-600 px-2 py-1 rounded-lg border border-warm-200 text-warm-400 hover:text-warm-700">
                    Visto
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('tasks')
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [pipelinePreProject, setPipelinePreProject] = useState(null)
  const [aiNotifCount, setAiNotifCount] = useState(0)
  const [showAIPanel, setShowAIPanel] = useState(false)

  // ── Confirm dialog state ──────────────────────────────────────────────────
  const [confirmConfig, setConfirmConfig] = useState(null)
  const confirmResolveRef = useRef(null)

  const confirm = useCallback((message, options = {}) => {
    return new Promise(resolve => {
      confirmResolveRef.current = resolve
      setConfirmConfig({ message, ...options })
    })
  }, [])

  function handleConfirmResolve(result) {
    setConfirmConfig(null)
    confirmResolveRef.current?.(result)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ol = params.get('outlook')
    if (ol === 'success') {
      setToast({ msg: 'Outlook connesso con successo!', type: 'success' })
      window.history.replaceState({}, '', window.location.pathname)
    } else if (ol === 'error') {
      const msg = params.get('msg')
      setToast({ msg: msg ? `Outlook: ${decodeURIComponent(msg)}` : 'Errore connessione Outlook. Riprova.', type: 'error' })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); setTeam([]); return }
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => setProfile(data))
    api('/api/team/stats').then(d => setTeam(d.members || [])).catch(() => {})
  }, [session])

  // Poll notifiche AI ogni minuto
  useEffect(() => {
    if (!session) return
    const fetchCount = () =>
      api('/api/ai-log/count').then(d => setAiNotifCount(d.count || 0)).catch(() => {})
    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    return () => clearInterval(interval)
  }, [session])

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-warm-50">
      <div className="w-5 h-5 border-2 border-brand-100 border-t-brand-500 rounded-full animate-spin" />
    </div>
  )

  if (!session || !profile) return <Login />

  function handleProponiPipeline(project) {
    setPipelinePreProject(project)
    setView('vendite')
  }

  const views = {
    pipeline: <Pipeline />,
    tasks: <Tasks />,
    projects: <Projects onProponiPipeline={handleProponiPipeline} />,
    contacts: <Contacts />,
    ai: <AINote />,
    team: <Team />,
    vendite: (
      <ProductPipeline
        preProject={pipelinePreProject}
        onModalClose={() => setPipelinePreProject(null)}
      />
    ),
    standby: <StandbyView />,
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      <AppContext.Provider value={{ profile, session, view, setView, team, setTeam, aiNotifCount, setAiNotifCount, openAIPanel: () => setShowAIPanel(true) }}>
        {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        <ConfirmDialog config={confirmConfig} onResolve={handleConfirmResolve} />
        {showAIPanel && <AINotifPanel onClose={() => setShowAIPanel(false)} onNavigate={v => setView(v)} />}
        <Layout>{views[view]}</Layout>
      </AppContext.Provider>
    </ConfirmContext.Provider>
  )
}
