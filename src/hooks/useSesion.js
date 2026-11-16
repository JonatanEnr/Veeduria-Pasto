import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

// Sesión del veedor/administrador. En modo local todos son "admin".
export function useSesion() {
  const [sesion, setSesion] = useState(null)
  const [esAdmin, setEsAdmin] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase) return
    if (!sesion) { setEsAdmin(false); return }
    supabase.rpc('es_admin').then(({ data }) => setEsAdmin(data === true))
  }, [sesion])

  const ingresar = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Correo o contraseña incorrectos')
  }, [])

  const salir = useCallback(() => supabase?.auth.signOut(), [])

  return { sesion, esAdmin, ingresar, salir, authDisponible: Boolean(supabase) }
}
