import { useEffect, useState } from 'react'
import Icono from './Iconos'
import { agregarSeguimiento, eliminarSeguimiento, listarSeguimiento, modoNube } from '../services/almacenamiento'
import { fechaCorta } from '../utils/fechas'

export const TIPOS_SEGUIMIENTO = {
  radicado: { etiqueta: 'Radicado ante la entidad', color: 'bg-blue-600' },
  respuesta: { etiqueta: 'Respuesta de la entidad', color: 'bg-violet-600' },
  visita: { etiqueta: 'Visita / verificación', color: 'bg-amber-500' },
  nota: { etiqueta: 'Nota del veedor', color: 'bg-slate-500' },
}

const hoy = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' })
const aFecha = (yyyyMmDd) => `${yyyyMmDd}T12:00:00`

export default function Seguimiento({ denuncia, esAdmin }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [nuevo, setNuevo] = useState(null) // { tipo, detalle, fecha } mientras se escribe
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let activo = true
    setCargando(true)
    listarSeguimiento(denuncia.id)
      .then((r) => { if (activo) setItems(r) })
      .catch((e) => { if (activo) setError(e.message) })
      .finally(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [denuncia.id])

  const guardar = async (e) => {
    e.preventDefault()
    if (nuevo.detalle.trim().length < 3) return setError('Escribe el detalle del seguimiento.')
    setGuardando(true)
    setError('')
    try {
      const item = await agregarSeguimiento(denuncia.id, { ...nuevo, detalle: nuevo.detalle.trim() })
      setItems((prev) => [...prev, item].sort((a, b) => a.fecha.localeCompare(b.fecha)))
      setNuevo(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const borrar = async (id) => {
    try {
      await eliminarSeguimiento(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  // Línea de tiempo: reporte → seguimientos → solución
  const eventos = [
    { id: 'creada', fecha: denuncia.fechaCreacion, titulo: 'Denuncia reportada', color: 'bg-red-600' },
    ...items.map((i) => ({
      id: i.id, fecha: aFecha(i.fecha), titulo: TIPOS_SEGUIMIENTO[i.tipo]?.etiqueta ?? i.tipo,
      detalle: i.detalle, color: TIPOS_SEGUIMIENTO[i.tipo]?.color ?? 'bg-slate-500', borrable: true,
    })),
    ...(denuncia.estado === 'solucionado' && denuncia.fechaSolucion
      ? [{ id: 'solucion', fecha: denuncia.fechaSolucion, titulo: 'Solucionada', color: 'bg-emerald-600' }]
      : []),
  ]

  if (!modoNube && !esAdmin) return null

  return (
    <section>
      <h3 className="mb-3 text-sm font-bold text-slate-900">Seguimiento</h3>

      <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5">
        {eventos.map((ev) => (
          <li key={ev.id} className="relative">
            <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${ev.color}`} />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{ev.titulo}</p>
                <p className="text-xs text-slate-500">{fechaCorta(ev.fecha)}</p>
                {ev.detalle && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{ev.detalle}</p>}
              </div>
              {esAdmin && ev.borrable && (
                <button type="button" onClick={() => borrar(ev.id)} title="Eliminar este seguimiento"
                  className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600">
                  <Icono nombre="basura" className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </li>
        ))}
        {cargando && <li className="h-10 animate-pulse rounded-lg bg-slate-100" />}
      </ol>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {esAdmin && (nuevo ? (
        <form onSubmit={guardar} className="mt-4 space-y-2 rounded-xl border border-slate-200 p-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <select value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
              className="min-w-0 rounded-lg border border-slate-300 px-2 py-2 text-sm">
              {Object.entries(TIPOS_SEGUIMIENTO).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
            </select>
            <input type="date" value={nuevo.fecha} max={hoy()} onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })}
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </div>
          <textarea value={nuevo.detalle} onChange={(e) => setNuevo({ ...nuevo, detalle: e.target.value })} rows={2} maxLength={1000}
            placeholder="Ej: Radicado No. 2026-12345. Se solicitó intervención en 15 días hábiles."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400" />
          <p className="text-[11px] text-slate-500">Este registro es público: no incluyas datos personales.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setNuevo(null)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Agregar'}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setNuevo({ tipo: 'radicado', detalle: '', fecha: hoy() })}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400 hover:bg-slate-50">
          <Icono nombre="mas" /> Agregar seguimiento
        </button>
      ))}
    </section>
  )
}
