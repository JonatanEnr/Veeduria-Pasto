// Gráficos ligeros en HTML/CSS (sin librerías). Siguen las reglas de la guía de
// visualización: barras delgadas (≤24px) con punta redondeada de 4px y base recta,
// 2px de separación entre segmentos, rejilla en línea fina, leyenda para ≥2 series,
// etiquetas selectivas, información al pasar el cursor o con el teclado, y una
// vista de tabla para cada gráfico.
// Paletas validadas con scripts/validate_palette.js (modo claro, fondo blanco).
import { useRef, useState } from 'react'

export const COLORES = {
  pendiente: '#dc2626', // estado: crítico (siempre con etiqueta/leyenda)
  solucionada: '#059669', // estado: bien
  serie1: '#2a78d6', // categórico, ranura 1 (azul)
  serie2: '#eb6834', // categórico, ranura 2 (naranja)
}

const fmt = (n) => (n == null ? '—' : new Intl.NumberFormat('es-CO').format(n))

// Máximo "redondo" para el eje: 1, 2, 5 × 10^k
function maximoRedondo(v) {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}

// ---------------- Tooltip compartido ----------------
function useTooltip() {
  const caja = useRef(null)
  const [tip, setTip] = useState(null)
  const mostrar = (el, contenido) => {
    if (!caja.current) return
    const c = caja.current.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const x = Math.min(Math.max(r.left - c.left + r.width / 2, 80), c.width - 80)
    setTip({ x, y: r.top - c.top, contenido })
  }
  const ocultar = () => setTip(null)
  const props = (contenido, etiqueta) => ({
    tabIndex: 0,
    'aria-label': etiqueta,
    onMouseEnter: (e) => mostrar(e.currentTarget, contenido),
    onMouseLeave: ocultar,
    onFocus: (e) => mostrar(e.currentTarget, contenido),
    onBlur: ocultar,
  })
  const capa = tip && (
    <div role="tooltip"
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
      style={{ left: tip.x, top: tip.y - 8 }}>
      {tip.contenido}
    </div>
  )
  return { caja, props, capa }
}

function LineasTooltip({ titulo, filas }) {
  return (
    <span className="block">
      <span className="mb-0.5 block font-semibold">{titulo}</span>
      {filas.map(([color, nombre, valor]) => (
        <span key={nombre} className="flex items-center gap-1.5">
          {color && <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />}
          <span className="text-white/80">{nombre}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums">{valor}</span>
        </span>
      ))}
    </span>
  )
}

// ---------------- Tarjeta con leyenda y vista de tabla ----------------
export function Leyenda({ series }) {
  if (!series || series.length < 2) return null
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {series.map((s) => (
        <li key={s.nombre} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
          {s.nombre}
        </li>
      ))}
    </ul>
  )
}

export function TarjetaGrafico({ titulo, subtitulo, series, tabla, children, className = '' }) {
  const [verTabla, setVerTabla] = useState(false)
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>
      <header className="mb-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900">{titulo}</h3>
          {subtitulo && <p className="mt-0.5 text-xs text-slate-500">{subtitulo}</p>}
        </div>
        {tabla && (
          <button type="button" onClick={() => setVerTabla((v) => !v)}
            className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            {verTabla ? 'Ver gráfico' : 'Ver tabla'}
          </button>
        )}
      </header>
      {!verTabla && series && <div className="mb-3"><Leyenda series={series} /></div>}
      {verTabla && tabla ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                {tabla.columnas.map((c, i) => <th key={c} className={`py-1.5 pr-3 font-semibold ${i ? 'text-right' : ''}`}>{c}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tabla.filas.map((f, i) => (
                <tr key={i}>
                  {f.map((v, j) => <td key={j} className={`py-1.5 pr-3 text-slate-700 ${j ? 'text-right tabular-nums' : ''}`}>{typeof v === 'number' ? fmt(v) : v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : children}
    </section>
  )
}

// ---------------- Columnas (apiladas o de una serie) ----------------
export function Columnas({ datos, series, alto = 150, etiquetarUltima = true }) {
  const { caja, props, capa } = useTooltip()
  const totales = datos.map((d) => series.reduce((s, x) => s + (d.valores[x.clave] ?? 0), 0))
  const max = maximoRedondo(Math.max(...totales, 1))
  const marcas = [0, max / 2, max]
  const ultimo = datos.length - 1

  return (
    <div ref={caja} className="relative">
      <div className="flex">
        {/* Eje Y */}
        <div className="relative mr-2 w-7 shrink-0" style={{ height: alto }}>
          {marcas.map((m) => (
            <span key={m} className="absolute right-0 translate-y-1/2 text-[10px] tabular-nums text-slate-400" style={{ bottom: `${(m / max) * 100}%` }}>
              {fmt(m)}
            </span>
          ))}
        </div>
        {/* Área de dibujo */}
        <div className="relative flex-1" style={{ height: alto }}>
          {marcas.map((m) => (
            <div key={m} className={`absolute inset-x-0 h-px ${m === 0 ? 'bg-slate-300' : 'bg-slate-100'}`} style={{ bottom: `${(m / max) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end">
            {datos.map((d, i) => {
              const total = totales[i]
              const visibles = series.filter((s) => (d.valores[s.clave] ?? 0) > 0)
              return (
                <div key={d.etiqueta} className="relative flex h-full flex-1 items-end justify-center">
                  <div {...props(
                    <LineasTooltip titulo={d.titulo ?? d.etiqueta} filas={[
                      ...series.map((s) => [series.length > 1 ? s.color : null, s.nombre, fmt(d.valores[s.clave] ?? 0)]),
                      ...(series.length > 1 ? [[null, 'Total', fmt(total)]] : []),
                    ]} />,
                    `${d.titulo ?? d.etiqueta}: ${series.map((s) => `${s.nombre} ${d.valores[s.clave] ?? 0}`).join(', ')}`,
                  )}
                    className="flex h-full w-full max-w-[44px] cursor-default flex-col-reverse items-center justify-start rounded-sm px-[20%] outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900">
                    <div className="flex w-full max-w-[24px] flex-col-reverse gap-[2px]">
                      {visibles.map((s, k) => (
                        <div key={s.clave}
                          className={k === visibles.length - 1 ? 'rounded-t-[4px]' : ''}
                          style={{ height: Math.max(2, ((d.valores[s.clave] ?? 0) / max) * alto - 2), backgroundColor: s.color }} />
                      ))}
                    </div>
                    {etiquetarUltima && i === ultimo && total > 0 && (
                      <span className="mb-1 text-[11px] font-semibold tabular-nums text-slate-700">{fmt(total)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {/* Eje X */}
      <div className="ml-9 mt-1.5 flex">
        {datos.map((d, i) => (
          <span key={d.etiqueta}
            className={`flex-1 truncate text-center text-[10px] text-slate-500 ${datos.length > 8 && i % 2 && i !== ultimo ? 'max-sm:invisible' : ''}`}>
            {d.etiqueta}
          </span>
        ))}
      </div>
      {capa}
    </div>
  )
}

// ---------------- Barras horizontales (apiladas o agrupadas) ----------------
export function BarrasHorizontales({ filas, series, modo = 'apilado', sufijo = '', onClic }) {
  const { caja, props, capa } = useTooltip()
  const total = (f) => series.reduce((s, x) => s + (f.valores[x.clave] ?? 0), 0)
  const max = modo === 'apilado'
    ? Math.max(1, ...filas.map(total))
    : Math.max(1, ...filas.flatMap((f) => series.map((s) => f.valores[s.clave] ?? 0)))

  return (
    <div ref={caja} className="relative space-y-2.5">
      {filas.map((f) => {
        const contenido = (
          <LineasTooltip titulo={f.etiqueta} filas={series.map((s) => [series.length > 1 ? s.color : null, s.nombre,
            f.valores[s.clave] == null ? 'sin datos' : `${fmt(f.valores[s.clave])}${sufijo}`])} />
        )
        const etiquetaAria = `${f.etiqueta}: ${series.map((s) => `${s.nombre} ${f.valores[s.clave] ?? 'sin datos'}${sufijo}`).join(', ')}`
        const Contenedor = onClic ? 'button' : 'div'
        return (
          <Contenedor key={f.clave ?? f.etiqueta} type={onClic ? 'button' : undefined} onClick={onClic ? () => onClic(f) : undefined}
            {...props(contenido, etiquetaAria)}
            className={`grid w-full grid-cols-[minmax(0,8.5rem)_1fr] items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-slate-900 sm:grid-cols-[minmax(0,10rem)_1fr] ${onClic ? 'hover:bg-slate-50' : ''}`}>
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-700">
              {f.punto && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: f.punto }} />}
              <span className="truncate">{f.etiqueta}</span>
            </span>
            {modo === 'apilado' ? (
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex h-4 gap-[2px]" style={{ width: `${(total(f) / max) * 85}%` }}>
                  {series.filter((s) => (f.valores[s.clave] ?? 0) > 0).map((s, k, arr) => (
                    <span key={s.clave} className={k === arr.length - 1 ? 'rounded-r-[4px]' : ''}
                      style={{ flexGrow: f.valores[s.clave], flexBasis: 0, backgroundColor: s.color, minWidth: 3 }} />
                  ))}
                </span>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-700">{fmt(total(f))}</span>
              </span>
            ) : (
              <span className="flex min-w-0 flex-col gap-[3px]">
                {series.map((s) => {
                  const v = f.valores[s.clave]
                  return (
                    <span key={s.clave} className="flex items-center gap-2">
                      {v != null && v > 0 && (
                        <span className="h-2.5 rounded-r-[4px]" style={{ width: `${(v / max) * 80}%`, backgroundColor: s.color, minWidth: 3 }} />
                      )}
                      <span className="shrink-0 text-[10px] tabular-nums text-slate-500">{v == null ? '—' : `${fmt(v)}${sufijo}`}</span>
                    </span>
                  )
                })}
              </span>
            )}
          </Contenedor>
        )
      })}
      {capa}
    </div>
  )
}

// ---------------- Barra segmentada (un todo dividido en partes) ----------------
export function BarraSegmentada({ partes }) {
  const { caja, props, capa } = useTooltip()
  const total = partes.reduce((s, p) => s + p.valor, 0)
  if (!total) return <p className="text-xs text-slate-500">Sin datos.</p>
  return (
    <div ref={caja} className="relative">
      <div className="flex h-7 gap-[2px]">
        {partes.filter((p) => p.valor > 0).map((p) => {
          const pct = Math.round((p.valor / total) * 100)
          return (
            <div key={p.nombre} {...props(<LineasTooltip titulo={p.nombre} filas={[[null, 'Denuncias', `${fmt(p.valor)} (${pct}%)`]]} />, `${p.nombre}: ${p.valor} (${pct}%)`)}
              className="flex items-center rounded-[4px] px-2 text-xs font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              style={{ flexGrow: p.valor, flexBasis: 0, backgroundColor: p.color }}>
              {pct >= 12 && `${pct}%`}
            </div>
          )
        })}
      </div>
      {capa}
    </div>
  )
}
