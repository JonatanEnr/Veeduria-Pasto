import { useCallback, useEffect, useState } from 'react'
import {
  listarDenuncias, crearDenuncia, cambiarEstado, eliminarDenuncia,
} from '../services/almacenamiento'

export function useDenuncias() {
  const [denuncias, setDenuncias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const recargar = useCallback(async () => {
    setCargando(true)
    try {
      setDenuncias(await listarDenuncias())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { recargar() }, [recargar])

  // Lanza el error para que el formulario lo muestre
  const agregar = useCallback(async (datos) => {
    const nueva = await crearDenuncia(datos)
    setDenuncias((prev) => [nueva, ...prev])
    return nueva
  }, [])

  const alternarEstado = useCallback(async (id) => {
    const actual = denuncias.find((d) => d.id === id)
    if (!actual) return
    try {
      const nuevo = actual.estado === 'solucionado' ? 'pendiente' : 'solucionado'
      const actualizada = await cambiarEstado(id, nuevo)
      setDenuncias((prev) => prev.map((d) => (d.id === id ? actualizada : d)))
    } catch (e) {
      setError(e.message)
    }
  }, [denuncias])

  const eliminar = useCallback(async (id) => {
    const actual = denuncias.find((d) => d.id === id)
    if (!actual) return
    try {
      await eliminarDenuncia(actual)
      setDenuncias((prev) => prev.filter((d) => d.id !== id))
    } catch (e) {
      setError(e.message)
    }
  }, [denuncias])

  return {
    denuncias, cargando, error, limpiarError: () => setError(null),
    recargar, agregar, alternarEstado, eliminar,
  }
}
