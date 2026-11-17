import { useCallback, useEffect, useState } from 'react'
import {
  listarDenuncias, crearDenuncia, solucionarDenuncia, reabrirDenuncia, moderarDenuncia,
  eliminarDenuncia, apoyarDenuncia, denunciasApoyadas,
} from '../services/almacenamiento'

// esAdmin cambia lo que se trae: el veedor ve también lo que está en revisión
// y los datos de contacto del denunciante.
export function useDenuncias(esAdmin) {
  const [denuncias, setDenuncias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [apoyadas, setApoyadas] = useState(denunciasApoyadas)

  const recargar = useCallback(async () => {
    setCargando(true)
    try {
      setDenuncias(await listarDenuncias({ admin: esAdmin }))
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [esAdmin])

  useEffect(() => { recargar() }, [recargar])

  const reemplazar = (actualizada) =>
    setDenuncias((prev) => prev.map((d) => (d.id === actualizada.id ? actualizada : d)))

  // Lanza el error para que el formulario lo muestre.
  // Devuelve la denuncia (admin) o null (ciudadano: queda en revisión).
  const agregar = useCallback(async (datos, tokenCaptcha) => {
    const nueva = await crearDenuncia(datos, { admin: esAdmin, tokenCaptcha })
    if (nueva) setDenuncias((prev) => [nueva, ...prev])
    return nueva
  }, [esAdmin])

  const ejecutar = useCallback(async (fn) => {
    try { await fn() } catch (e) { setError(e.message) }
  }, [])

  const solucionar = useCallback((id, fotoDespues) => ejecutar(async () => {
    reemplazar(await solucionarDenuncia(id, fotoDespues))
  }), [ejecutar])

  const reabrir = useCallback((id) => ejecutar(async () => {
    const actual = denuncias.find((d) => d.id === id)
    if (actual) reemplazar(await reabrirDenuncia(actual))
  }), [denuncias, ejecutar])

  const moderar = useCallback((id, decision) => ejecutar(async () => {
    reemplazar(await moderarDenuncia(id, decision))
  }), [ejecutar])

  const eliminar = useCallback((id) => ejecutar(async () => {
    const actual = denuncias.find((d) => d.id === id)
    if (!actual) return
    await eliminarDenuncia(actual)
    setDenuncias((prev) => prev.filter((d) => d.id !== id))
  }), [denuncias, ejecutar])

  const apoyar = useCallback((id) => ejecutar(async () => {
    const total = await apoyarDenuncia(id)
    setDenuncias((prev) => prev.map((d) => (d.id === id ? { ...d, apoyos: total } : d)))
    setApoyadas(denunciasApoyadas())
  }), [ejecutar])

  return {
    denuncias, cargando, error, limpiarError: () => setError(null), apoyadas,
    recargar, agregar, solucionar, reabrir, moderar, eliminar, apoyar,
  }
}
