import { useApp } from '../../App'
import { supabase } from '../../lib/supabase'

const navItems = [
  {
    id: 'pipeline', label: 'Pipeline',
    icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4.5 h-4.5"><rect x="2" y="2" width="6" height="16" rx="1.5"/><rect x="12" y="2" width="6" height="10" rx="1.5"/><rect x="12" y="15" width="6" height="3" rx="1.5"/></svg>
  },
  {
    id: 'ai', label: 'Nota AI',
    icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4.5 h-4.5"><path d="M10 2a3.5 3.5 0 0 1 3.5 3.5v4a3.5 3.5 0 0 1-7 0v-4A3.5 3.5 0 0 1 10 2z"/><path d="M5 9.5a5 5 0 0 0 10 0M10 14.5v3"/></svg>
  },
  {
    id: 'tasks', label: 'Task',
    icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4.5 h-4.5"><path d="M7 10l2.5 2.5L13 7"/><circle cx="10" cy="10" r="8"/></svg>
  },
  {
    id: 'projects', label: 'Progetti',
    icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4.5 h-4.5"><path d="M3 6h14M3 10h14M3 14h8"/><circle cx="16" cy="14" r="2.5"/></svg>
  },
]

const roleColors = {
  admin: 'bg-purple-50 text-purple-700',
  manager: 'bg-blue-50 text-blue-700',
  agent: 'bg-brand-50 text-brand-600',
  employee: 'bg-warm-100 text-warm-600',
}

export default function Sidebar() {
  const { profile, view, setView } = useApp()

  return (
    <aside className="w-52 bg-white border-r border-warm-200 flex flex-col flex-shrink-0 h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-warm-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 18 18" fill="none" className="w-4 h-4">
              <path d="M3 9C3 5.7 5.7 3 9 3s6 2.7 6 6-2.7 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="9" r="2" fill="#fff"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-warm-900">FollowUp AI</div>
            <div className="text-2xs text-warm-400">Confluencia</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-none">
        <div className="px-2 mb-2">
          <p className="text-2xs font-700 text-warm-400 uppercase tracking-widest">Workspace</p>
        </div>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
              view === item.id
                ? 'bg-warm-100 text-warm-900'
                : 'text-warm-500 hover:bg-warm-50 hover:text-warm-900'
            }`}
          >
            <span className={view === item.id ? 'text-brand-500' : ''}>{item.icon}</span>
            {item.label}
          </button>
        ))}

        {profile?.role !== 'agent' && (
          <>
            <div className="px-2 pt-4 mb-2">
              <p className="text-2xs font-700 text-warm-400 uppercase tracking-widest">Team</p>
            </div>
            <button
              onClick={() => setView('team')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                view === 'team'
                  ? 'bg-warm-100 text-warm-900'
                  : 'text-warm-500 hover:bg-warm-50 hover:text-warm-900'
              }`}
            >
              <span className={view === 'team' ? 'text-brand-500' : ''}>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4.5 h-4.5">
                  <path d="M13 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path d="M3 17v-1a6 6 0 0 1 6-6 6 6 0 0 1 6 6v1"/>
                  <path d="M16 5a2 2 0 1 1 0 4M19 17v-1a4 4 0 0 0-3-3.87"/>
                </svg>
              </span>
              Membri
            </button>
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-warm-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-600 text-warm-900 truncate">{profile?.full_name}</div>
            <div className={`text-2xs font-600 px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${roleColors[profile?.role] || 'bg-warm-100 text-warm-600'}`}>
              {profile?.role}
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} title="Esci"
            className="text-warm-300 hover:text-warm-600 transition-colors flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
              <path d="M13 7l3 3-3 3M16 10H8"/><path d="M8 3H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
