import { supabase } from './supabase'

export async function api(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const isFormData = opts.body instanceof FormData

  const res = await fetch(path, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...(!isFormData && opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...opts.headers,
    },
    body: isFormData ? opts.body : (opts.body ? JSON.stringify(opts.body) : undefined),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Errore server')
  return data
}
