import { useEffect, useMemo, useState } from 'react'
import Icono from './Iconos'
import { BarraSegmentada, BarrasHorizontales, COLORES, Columnas, TarjetaGrafico } from './Graficos'
import { SECRETARIAS } from '../constants/secretarias'
import { diasEntre } from '../utils/fechas'

const promedio = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)

const PERIODOS = [
  { id: '30', etiqueta: '30 días', dias: 30 },
  { id: '90', etiqueta: '90 días', dias: 90 },
  { id: '365', etiqueta: '12 meses', dias: 365 },
  { id: 'todo', etiqueta: 'Todo', dias: null },
]

const SERIES_ESTADO = [
  { clave: 'pendiente', nombre: 'Pendientes', color: COLORES.pendiente },
  { clave: 'solucionado', nombre: 'Solucionadas', color: COLORES.solucionada },
]

const SERIES_TIEMPO = [
  { clave: 'resolver', nombre: 'Días promedio para resolver', color: COLORES.serie1 },
  { clave: 'espera', nombre: 'Días que llevan esperando (pendientes)', color: COLORES.serie2 },
]

const TRAMOS = [
  { etiqueta: '0–7', titulo: 'De 0 a 7 días', min: 0, max: 7 },
  { etiqueta: '8–30', titulo: 'De 8 a 30 días', min: 8, max: 30 },
  { etiqueta: '31–90', titulo: 'De 31 a 90 días', min: 31, max: 90 },
  { etiqueta: '91–180', titulo: 'De 91 a 180 días', min: 91, max: 180 },
  { etiqueta: '+180', titulo: 'Más de 180 días', min: 181, max: Infinity },
]

const ZONA_HORARIA = 'America/Bogota'
const claveMes = (fecha) => new Date(fecha).toLocaleDateString('sv-SE', { timeZone: ZONA_HORARIA }).slice(0, 7)
const nombreMes = (clave, conAnio = false) => {
  const [a, m] = clave.split('-').map(Number)
  const t = new Date(a, m - 1, 15).toLocaleDateString('es-CO', { month: 'short', ...(conAnio ? { year: 'numeric' } : {}) })
  return t.replace('.', '')
}

function resumen(lista) {
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

function Cifra({ etiqueta, valor, detalle, cambio }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{etiqueta}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{valor}</p>
      {(detalle || cambio) && (
        <p className="mt-1 text-[11px] text-slate-500">
          {cambio}
          {cambio && detalle && ' · '}
          {detalle}
        </p>
      )}
    </div>
  )
}

const textoCambio = (actual, anterior, periodo) => {
  if (anterior == null) return null
  const d = actual - anterior
  const signo = d > 0 ? '+' : d < 0 ? '−' : '±'
  return `${signo}${Math.abs(d)} vs ${periodo} anteriores`
}

export default function Estadisticas({ publicadas, onCerrar, onFiltrarSecretaria, onFiltrarZona, onSeleccionar }) {
  const [periodo, setPeriodo] = useState('todo')

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  const a = useMemo(() => {
    const p = PERIODOS.find((x) => x.id === periodo)
    const ahora = Date.now()
    const desde = p.dias ? ahora - p.dias * 86400000 : null
    const enPeriodo = desde ? publicadas.filter((d) => new Date(d.fechaCreacion).getTime() >= desde) : publicadas
    const anterior = desde
      ? publicadas.filter((d) => {
          const t = new Date(d.fechaCreacion).getTime()
          return t >= desde - p.dias * 86400000 && t < desde
        })
      : null
    // Solucionadas DENTRO del periodo (por fecha de solución), para comparar actividad
    const solucionadasEn = (ini, fin) => publicadas.filter((d) => {
      if (d.estado !== 'solucionado' || !d.fechaSolucion) return false
      const t = new Date(d.fechaSolucion).getTime()
      return (ini == null || t >= ini) && t < fin
    }).length

    // Meses del periodo
    const primero = enPeriodo.length
      ? Math.min(...enPeriodo.map((d) => new Date(d.fechaCreacion).getTime()))
      : ahora
    const inicioMeses = desde ?? primero
    const meses = []
    const cursor = new Date(new Date(inicioMeses).toLocaleDateString('sv-SE', { timeZone: ZONA_HORARIA }).slice(0, 7) + '-01T12:00:00')
    const fin = claveMes(ahora)
    while (meses.length < 36) {
      const k = cursor.toISOString().slice(0, 7)
      meses.push(k)
      if (k >= fin) break
      cursor.setMonth(cursor.getMonth() + 1)
    }
    const variosAnios = new Set(meses.map((m) => m.slice(0, 4))).size > 1
    const porMes = meses.slice(-24).map((m) => {
      const del = enPeriodo.filter((d) => claveMes(d.fechaCreacion) === m)
      return {
        etiqueta: nombreMes(m, variosAnios && m.endsWith('-01')),
        titulo: nombreMes(m, true),
        valores: {
          pendiente: del.filter((d) => d.estado === 'pendiente').length,
          solucionado: del.filter((d) => d.estado === 'solucionado').length,
        },
      }
    })

    const porEntidad = SECRETARIAS
      .map((s) => ({ ...s, ...resumen(enPeriodo.filter((d) => d.secretaria === s.id)) }))
      .filter((s) => s.total > 0)
      .sort((x, y) => y.pendientes - x.pendientes || (y.diasEspera ?? 0) - (x.diasEspera ?? 0))

    const pendientes = enPeriodo.filter((d) => d.estado === 'pendiente')
    const antiguedad = TRAMOS.map((t) => ({
      etiqueta: t.etiqueta,
      titulo: t.titulo,
      valores: { pendiente: pendientes.filter((d) => { const n = diasEntre(d.fechaCreacion); return n >= t.min && n <= t.max }).length },
    }))

    const urbanas = enPeriodo.filter((d) => d.zona?.tipo === 'comuna')
    const rurales = enPeriodo.filter((d) => d.zona?.tipo === 'corregimiento')

    const zonas = new Map()
    for (const d of enPeriodo) {
      if (!d.zona) continue
      const z = zonas.get(d.zona.clave) ?? { ...d.zona, lista: [] }
      z.lista.push(d)
      zonas.set(d.zona.clave, z)
    }
    const porZona = [...zonas.values()]
      .map(({ lista, ...z }) => ({ ...z, ...resumen(lista) }))
      .sort((x, y) => y.pendientes - x.pendientes || y.total - x.total)

    const masApoyadas = [...pendientes].filter((d) => d.apoyos > 0).sort((x, y) => y.apoyos - x.apoyos).slice(0, 5)

    return {
      p, global: resumen(enPeriodo), anterior: anterior && resumen(anterior),
      solucionadasPeriodo: solucionadasEn(desde, ahora + 1),
      solucionadasAnterior: desde ? solucionadasEn(desde - p.dias * 86400000, desde) : null,
      porMes, porEntidad, antiguedad, porZona, masApoyadas,
      urbano: resumen(urbanas), rural: resumen(rurales),
    }
  }, [publicadas, periodo])

  const { global: g } = a
  const etiquetaPeriodo = a.p.dias ? a.p.etiqueta : null
  const vacio = g.total === 0

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()}
        className="animar-subir flex h-[100dvh] w-full flex-col bg-slate-50 shadow-2xl sm:h-auto sm:max-h-[94vh] sm:max-w-5xl sm:rounded-2xl">
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:rounded-t-2xl sm:px-6 sm:py-4"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">¿Quién responde en Pasto?</h2>
              <p className="text-xs text-slate-500">Análisis de las denuncias publicadas en el mapa.</p>
            </div>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <Icono nombre="x" className="h-5 w-5" />
            </button>
          </div>
          {/* Un solo filtro, arriba de todo: aplica a todas las gráficas */}
          <div className="mt-3 inline-grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1 text-xs font-semibold" role="radiogroup" aria-label="Periodo">
            {PERIODOS.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={periodo === p.id} onClick={() => setPeriodo(p.id)}
                className={`rounded-md px-3 py-1.5 transition ${periodo === p.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                {p.etiqueta}
              </button>
            ))}
          </div>
        </header>

        <div className="desplazable flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {/* Cifras clave */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cifra etiqueta="Denuncias reportadas" valor={g.total}
              cambio={etiquetaPeriodo && textoCambio(g.total, a.anterior?.total, etiquetaPeriodo)} />
            <Cifra etiqueta="Tasa de solución" valor={`${g.pct}%`}
              detalle={`${g.solucionadas} de ${g.total} resueltas`} />
            <Cifra etiqueta="Días promedio para resolver" valor={g.diasResolver ?? '—'}
              detalle={g.diasResolver == null ? 'aún no hay resueltas' : null} />
            <Cifra etiqueta="Pendiente más antigua" valor={g.masAntigua != null ? `${g.masAntigua} días` : '—'}
              detalle={g.diasEspera != null ? `en promedio esperan ${g.diasEspera} días` : null} />
          </div>

          {etiquetaPeriodo && (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600">
              En los últimos {etiquetaPeriodo} se <strong className="text-slate-900">resolvieron {a.solucionadasPeriodo}</strong> denuncias
              {' '}({textoCambio(a.solucionadasPeriodo, a.solucionadasAnterior, etiquetaPeriodo)}), y se
              {' '}<strong className="text-slate-900">reportaron {g.total}</strong> nuevas.
            </p>
          )}

          {vacio ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              No hay denuncias publicadas en este periodo.
            </div>
          ) : (
            <>
              <TarjetaGrafico titulo="Denuncias por mes" subtitulo="Según el mes en que se reportaron y su estado actual."
                series={SERIES_ESTADO}
                tabla={{ columnas: ['Mes', 'Pendientes', 'Solucionadas', 'Total'],
                  filas: a.porMes.map((m) => [m.titulo, m.valores.pendiente, m.valores.solucionado, m.valores.pendiente + m.valores.solucionado]) }}>
                <Columnas datos={a.porMes} series={SERIES_ESTADO} />
              </TarjetaGrafico>

              <div className="grid gap-4 lg:grid-cols-2">
                <TarjetaGrafico titulo="Ranking de entidades" subtitulo="Ordenadas por denuncias pendientes. Toca una para verlas en el mapa."
                  series={SERIES_ESTADO}
                  tabla={{ columnas: ['Entidad', 'Pendientes', 'Solucionadas', '% resuelto'],
                    filas: a.porEntidad.map((s) => [s.corto, s.pendientes, s.solucionadas, `${s.pct}%`]) }}>
                  <BarrasHorizontales series={SERIES_ESTADO} onClic={(f) => onFiltrarSecretaria(f.clave)}
                    filas={a.porEntidad.map((s) => ({ clave: s.id, etiqueta: s.corto, punto: s.color, valores: { pendiente: s.pendientes, solucionado: s.solucionadas } }))} />
                </TarjetaGrafico>

                <TarjetaGrafico titulo="¿Cuánto tardan en responder?" subtitulo="Días promedio para resolver contra días que llevan esperando las pendientes."
                  series={SERIES_TIEMPO}
                  tabla={{ columnas: ['Entidad', 'Días para resolver', 'Días esperando'],
                    filas: a.porEntidad.map((s) => [s.corto, s.diasResolver ?? '—', s.diasEspera ?? '—']) }}>
                  <BarrasHorizontales series={SERIES_TIEMPO} modo="agrupado" sufijo=" días"
                    filas={a.porEntidad.map((s) => ({ clave: s.id, etiqueta: s.corto, punto: s.color, valores: { resolver: s.diasResolver, espera: s.diasEspera } }))} />
                </TarjetaGrafico>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <TarjetaGrafico titulo="Antigüedad de las pendientes" subtitulo="Cuántas denuncias siguen sin solución, según los días que llevan abiertas."
                  tabla={{ columnas: ['Días abierta', 'Pendientes'], filas: a.antiguedad.map((t) => [t.titulo, t.valores.pendiente]) }}>
                  <Columnas datos={a.antiguedad} series={[{ clave: 'pendiente', nombre: 'Pendientes', color: COLORES.pendiente }]} etiquetarUltima={false} />
                </TarjetaGrafico>

                <TarjetaGrafico titulo="Zona urbana vs. zona rural" subtitulo="Cómo se reparten las denuncias y cómo responde la administración en cada zona."
                  series={[{ nombre: 'Urbana (comunas)', color: COLORES.serie1 }, { nombre: 'Rural (corregimientos)', color: COLORES.serie2 }]}
                  tabla={{ columnas: ['Zona', 'Denuncias', '% resuelto', 'Días para resolver', 'Días esperando'],
                    filas: [['Urbana', a.urbano.total, `${a.urbano.pct}%`, a.urbano.diasResolver ?? '—', a.urbano.diasEspera ?? '—'],
                      ['Rural', a.rural.total, `${a.rural.pct}%`, a.rural.diasResolver ?? '—', a.rural.diasEspera ?? '—']] }}>
                  <BarraSegmentada partes={[
                    { nombre: 'Urbana (comunas)', valor: a.urbano.total, color: COLORES.serie1 },
                    { nombre: 'Rural (corregimientos)', valor: a.rural.total, color: COLORES.serie2 },
                  ]} />
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    {[['Urbana', a.urbano, COLORES.serie1], ['Rural', a.rural, COLORES.serie2]].map(([n, r, c]) => (
                      <div key={n} className="rounded-xl bg-slate-50 p-3">
                        <dt className="mb-1 flex items-center gap-1.5 font-semibold text-slate-900">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c }} />{n}
                        </dt>
                        <dd className="text-slate-600"><strong className="text-slate-900">{r.pct}%</strong> resueltas</dd>
                        <dd className="text-slate-600">{r.diasResolver != null ? <><strong className="text-slate-900">{r.diasResolver}</strong> días para resolver</> : 'sin resueltas aún'}</dd>
                        <dd className="text-slate-600">{r.pendientes} pendientes</dd>
                      </div>
                    ))}
                  </dl>
                </TarjetaGrafico>
              </div>

              <TarjetaGrafico titulo="Por comuna y corregimiento" subtitulo="Toca una zona para ver sus denuncias en el mapa."
                series={SERIES_ESTADO}
                tabla={{ columnas: ['Zona', 'Tipo', 'Pendientes', 'Solucionadas', '% resuelto'],
                  filas: a.porZona.map((z) => [z.nombre, z.tipo === 'comuna' ? 'Urbana' : 'Rural', z.pendientes, z.solucionadas, `${z.pct}%`]) }}>
                <BarrasHorizontales series={SERIES_ESTADO} onClic={(f) => onFiltrarZona(f.clave)}
                  filas={a.porZona.map((z) => ({ clave: z.clave, etiqueta: z.tipo === 'corregimiento' ? `${z.nombre} (rural)` : z.nombre, valores: { pendiente: z.pendientes, solucionado: z.solucionadas } }))} />
                <p className="mt-3 text-[11px] text-slate-400">
                  Las comunas usan sus límites oficiales. En la zona rural, cada denuncia se asigna al corregimiento con la vereda o cabecera más cercana.
                </p>
              </TarjetaGrafico>

              {a.masApoyadas.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-bold text-slate-900">Las que más confirman los vecinos</h3>
                  <p className="mb-3 text-xs text-slate-500">Pendientes con más «Yo también lo veo».</p>
                  <ol className="divide-y divide-slate-100">
                    {a.masApoyadas.map((d, i) => (
                      <li key={d.id}>
                        <button type="button" onClick={() => onSeleccionar(d)} className="flex w-full items-center gap-3 py-2 text-left hover:bg-slate-50">
                          <span className="w-5 text-center text-sm font-bold text-slate-400">{i + 1}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">{d.titulo}</span>
                            <span className="block truncate text-xs text-slate-500">{d.zona?.nombre ?? d.barrio} · {diasEntre(d.fechaCreacion)} días sin solución</span>
                          </span>
                          <span className="shrink-0 text-sm font-bold text-slate-900">{d.apoyos}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
