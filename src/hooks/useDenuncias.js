import { useCallback, useEffect, useState } from 'react'
import {
  listarDenuncias, crearDenuncia, cambiarEstado, moderarDenuncia, eliminarDenuncia,
} from '../services/almacenamiento'

// esAdmin cambia lo que se trae: el veedor ve también lo que está en revisión
// y los datos de contacto del denunciante.
export function useDenuncias(esAdmin) {
  const [denuncias, setDenuncias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

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
  const agregar = useCallback(async (datos) => {
    const nueva = await crearDenuncia(datos, { admin: esAdmin })
    if (nueva) setDenuncias((prev) => [nueva, ...prev])
    return nueva
  }, [esAdmin])

  const ejecutar = useCallback(async (fn) => {
    try { await fn() } catch (e) { setError(e.message) }
  }, [])

  const alternarEstado = useCallback((id) => ejecutar(async () => {
    const actual = denuncias.find((d) => d.id === id)
    if (!actual) return
    reemplazar(await cambiarEstado(id, actual.estado === 'solucionado' ? 'pendiente' : 'solucionado'))
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

  return {
    denuncias, cargando, error, limpiarError: () => setError(null),
    recargar, agregar, alternarEstado, moderar, eliminar,
  }
}
