import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/auth/Login'
import Layout from './components/layout/Layout'
import Pipeline from './components/pipeline/Pipeline'
import Tasks from './components/tasks/Tasks'
import Projects from './components/projects/Projects'
import AINote from './components/ai/AINote'
import Team from './components/team/Team'

export const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('pipeline')
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); return }
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data }) => setProfile(data))
  }, [session])

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-warm-50">
      <div className="w-5 h-5 border-2 border-brand-100 border-t-brand-500 rounded-full animate-spin" />
    </div>
  )

  if (!session || !profile) return <Login />

  const views = {
    pipeline: <Pipeline />,
    tasks: <Tasks />,
    projects: <Projects />,
    ai: <AINote />,
    team: <Team />,
  }

  return (
    <AppContext.Provider value={{ profile, session, view, setView, team, setTeam }}>
      <Layout>{views[view]}</Layout>
    </AppContext.Provider>
  )
}
