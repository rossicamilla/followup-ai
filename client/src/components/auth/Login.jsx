import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Login() {
  const [mode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('agent')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  async function handleSignup(e) {
    e.preventDefault()
    if (!name) return setError('Inserisci il tuo nome')
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name, role } }
    })
    setLoading(false)
    if (error) setError(error.message)
    else setMsg('Controlla la tua email per confermare l\'account')
  }

  return (
    <div className="min-h-screen bg-warm-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-700 text-lg leading-none">F</span>
          </div>
          <div>
            <div className="text-white font-700 text-xl tracking-tight">FollowUp AI</div>
            <div className="text-warm-400 text-xs">Confluencia · CRM interno</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl shadow-black/30">
          <h1 className="text-lg font-bold tracking-tight text-warm-900 mb-1">Accedi al tuo account</h1>
          <p className="text-sm text-warm-400 mb-6">Bentornato 👋</p>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}
          {msg && (
            <div className="bg-brand-50 border border-brand-100 text-brand-600 rounded-lg px-4 py-3 text-sm mb-4">
              {msg}
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
            {mode === 'signup' && (
              <Field label="Nome completo">
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Mario Rossi" className={input} required/>
              </Field>
            )}
            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="nome@azienda.it" className={input} autoComplete="email" required/>
            </Field>
            <Field label="Password">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className={input} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required/>
            </Field>
            {mode === 'signup' && (
              <Field label="Ruolo">
                <select value={role} onChange={e => setRole(e.target.value)} className={input}>
                  <option value="agent">Agente</option>
                  <option value="employee">Dipendente</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50 mt-2">
              {loading ? 'Caricamento...' : mode === 'login' ? 'Accedi' : 'Crea account'}
            </button>
          </form>

          <p className="text-center text-xs text-warm-300 mt-5">
            Accesso solo su invito. Contatta l'amministratore.
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-600 text-warm-500 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

const input = 'w-full border border-warm-200 rounded-lg px-3 py-2.5 text-sm text-warm-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-sans placeholder:text-warm-300'
