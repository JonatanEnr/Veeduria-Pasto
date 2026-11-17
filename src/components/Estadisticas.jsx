import { useEffect, useMemo } from 'react'
import Icono from './Iconos'
import { SECRETARIAS } from '../constants/secretarias'
import { diasEntre } from '../utils/fechas'

const promedio = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)

function Barra({ pendientes, solucionadas, maximo }) {
  const total = pendientes + solucionadas
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" style={{ width: `${Math.max(8, (total / maximo) * 100)}%` }}>
      <div className="bg-emerald-500" style={{ width: `${(solucionadas / total) * 100}%` }} />
      <div className="bg-red-500" style={{ width: `${(pendientes / total) * 100}%` }} />
    </div>
  )
}

export default function Estadisticas({ publicadas, onCerrar, onFiltrarSecretaria, onFiltrarZona }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  const { porEntidad, porComuna, global } = useMemo(() => {
    const resumen = (lista) => {
      const sol = lista.filter((d) => d.estado === 'solucionado')
      const pen = lista.filter((d) => d.estado === 'pendiente')
      return {
        total: lista.length,
        solucionadas: sol.length,
        pendientes: pen.length,
        pct: lista.length ? Math.round((sol.length / lista.length) * 100) : 0,
        diasResolver: promedio(sol.map((d) => diasEntre(d.fechaCreacion, d.fechaSolucion))),
        diasEspera: promedio(pen.map((d) => diasEntre(d.fechaCreacion))),
        masAntigua: pen.length ? Math.max(...pen.map((d) => diasEntre(d.fechaCreacion))) : null,
      }
    }
    const porEntidad = SECRETARIAS
      .map((s) => ({ ...s, ...resumen(publicadas.filter((d) => d.secretaria === s.id)) }))
      .filter((s) => s.total > 0)
      .sort((a, b) => b.pendientes - a.pendientes || (b.diasEspera ?? 0) - (a.diasEspera ?? 0))
    const zonas = new Map()
    for (const d of publicadas) {
      if (!d.zona) continue
      const actual = zonas.get(d.zona.clave) ?? { ...d.zona, lista: [] }
      actual.lista.push(d)
      zonas.set(d.zona.clave, actual)
    }
    const porZona = [...zonas.values()]
      .map(({ lista, ...z }) => ({ ...z, ...resumen(lista) }))
      .sort((a, b) => b.pendientes - a.pendientes || b.total - a.total)
    return { porEntidad, porZona, global: resumen(publicadas) }
  }, [publicadas])

  const maxEntidad = Math.max(1, ...porEntidad.map((s) => s.total))
  const maxZona = Math.max(1, ...porZona.map((c) => c.total))
  const grupos = [
    { titulo: 'Comunas · zona urbana', lista: porZona.filter((z) => z.tipo === 'comuna') },
    { titulo: 'Corregimientos · zona rural', lista: porZona.filter((z) => z.tipo === 'corregimiento') },
  ].filter((g) => g.lista.length)

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()}
        className="animar-subir flex h-[100dvh] w-full flex-col bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-2xl">
        <header className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <div className="flex-1">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">¿Quién responde en Pasto?</h2>
            <p className="text-xs text-slate-500">Calculado con las {global.total} denuncias publicadas en el mapa.</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icono nombre="x" className="h-5 w-5" />
          </button>
        </header>

        <div className="desplazable flex-1 space-y-7 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Denuncias', global.total],
              ['Tasa de solución', `${global.pct}%`],
              ['Días promedio para resolver', global.diasResolver ?? '—'],
              ['Pendiente más antigua', global.masAntigua != null ? `${global.masAntigua} días` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xl font-bold tabular-nums tracking-tight text-slate-900">{v}</p>
                <p className="text-[11px] font-medium leading-tight text-slate-500">{k}</p>
              </div>
            ))}
          </div>

          <section>
            <h3 className="mb-1 text-sm font-bold text-slate-900">Ranking de entidades</h3>
            <p className="mb-3 text-xs text-slate-500">Ordenadas por denuncias pendientes. Toca una para verlas en el mapa.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Entidad</th>
                    <th className="px-3 py-2 text-right">Pend.</th>
                    <th className="px-3 py-2 text-right">Resueltas</th>
                    <th className="px-3 py-2 text-right" title="Promedio de días que tardó en resolver">Días resolver</th>
                    <th className="px-3 py-2 text-right" title="Promedio de días que llevan esperando las pendientes">Días espera</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {porEntidad.map((s, i) => (
                    <tr key={s.id} onClick={() => onFiltrarSecretaria(s.id)} className="cursor-pointer hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-semibold tabular-nums text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <p className="flex items-center gap-2 font-semibold text-slate-900">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />{s.corto}
                        </p>
                        <div className="mt-1.5"><Barra pendientes={s.pendientes} solucionadas={s.solucionadas} maximo={maxEntidad} /></div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-red-700">{s.pendientes}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{s.solucionadas} <span className="text-xs text-slate-400">({s.pct}%)</span></td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{s.diasResolver ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{s.diasEspera ?? '—'}</td>
                    </tr>
                  ))}
                  {porEntidad.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Aún no hay datos.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="mb-1 text-sm font-bold text-slate-900">Por comuna y corregimiento</h3>
            <p className="mb-3 text-xs text-slate-500">Toca una zona para filtrar el mapa.</p>
            {grupos.length === 0 && <p className="text-sm text-slate-500">Aún no hay datos.</p>}
            {grupos.map((g) => (
              <div key={g.titulo} className="mb-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{g.titulo}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {g.lista.map((z) => (
                    <button key={z.clave} type="button" onClick={() => onFiltrarZona(z.clave)}
                      className="rounded-xl border border-slate-200 p-3 text-left hover:border-slate-300 hover:bg-slate-50">
                      <div className="mb-1.5 flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">{z.nombre}</span>
                        <span className="shrink-0 text-xs tabular-nums text-slate-500">
                          <span className="font-semibold text-red-700">{z.pendientes}</span> pend. · {z.total} total
                        </span>
                      </div>
                      <Barra pendientes={z.pendientes} solucionadas={z.solucionadas} maximo={maxZona} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-[11px] text-slate-400">
              Las comunas usan sus límites oficiales. En la zona rural, cada denuncia se asigna al corregimiento con la cabecera más cercana.
            </p>
          </section>

          <p className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Resueltas</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Pendientes</span>
          </p>
        </div>
      </div>
    </div>
  )
}
