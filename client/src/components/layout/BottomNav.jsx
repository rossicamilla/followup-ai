import { useApp } from '../../App'

const items = [
  { id: 'pipeline', label: 'Pipeline', icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5"><rect x="2" y="2" width="6" height="16" rx="1.5"/><rect x="12" y="2" width="6" height="10" rx="1.5"/><rect x="12" y="15" width="6" height="3" rx="1.5"/></svg> },
  { id: 'ai',       label: 'AI',       icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5"><path d="M10 2a3.5 3.5 0 0 1 3.5 3.5v4a3.5 3.5 0 0 1-7 0v-4A3.5 3.5 0 0 1 10 2z"/><path d="M5 9.5a5 5 0 0 0 10 0M10 14.5v3"/></svg> },
  { id: 'tasks',    label: 'Task',     icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5"><path d="M7 10l2.5 2.5L13 7"/><circle cx="10" cy="10" r="8"/></svg> },
  { id: 'projects', label: 'Progetti', icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5"><path d="M3 6h14M3 10h14M3 14h8"/><circle cx="16" cy="14" r="2.5"/></svg> },
]

export default function BottomNav() {
  const { view, setView } = useApp()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-warm-200 pb-safe z-40">
      <div className="flex justify-around items-center py-2">
        {items.map(item => (
          <button key={item.id} onClick={() => setView(item.id)}
            className={`flex flex-col items-center gap-1 px-4 py-1 text-2xs font-500 transition-colors ${
              view === item.id ? 'text-brand-500' : 'text-warm-400'
            }`}>
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
