import Icono from './Iconos'
import { Insignia, ContadorDias } from './DetalleDenuncia'
import { SECRETARIAS, obtenerSecretaria, ESTADOS, MODERACION } from '../constants/secretarias'
import { haceCuanto } from '../utils/fechas'
import { MOSTRAR_POLITICA } from '../constants/organizacion'

const PESTANAS = [
  { id: 'mapa', etiqueta: 'Publicadas' },
  { id: 'revision', etiqueta: 'Por revisar' },
  { id: 'rechazada', etiqueta: 'Rechazadas' },
]

export function Resumen({ publicadas }) {
  const total = publicadas.length
  const solucionadas = publicadas.filter((d) => d.estado === 'solucionado').length
  const pendientes = total - solucionadas
  const pct = total ? Math.round((solucionadas / total) * 100) : 0

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2">
        <Cifra valor={total} etiqueta="Denuncias" />
        <Cifra valor={pendientes} etiqueta="Pendientes" punto="bg-red-600" />
        <Cifra valor={solucionadas} etiqueta="Solucionadas" punto="bg-emerald-600" />
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[11px] font-medium text-slate-500">
          <span>Tasa de solución</span>
          <span className="text-slate-900">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-red-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}

function Cifra({ valor, etiqueta, punto }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-xl font-bold tabular-nums tracking-tight text-slate-900">{valor}</p>
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        {punto && <span className={`h-1.5 w-1.5 rounded-full ${punto}`} />}
        {etiqueta}
      </p>
    </div>
  )
}

export default function PanelDenuncias({
  denuncias, publicadas, conteos, esAdmin, vista, onVista, filtros, onFiltros, onSeleccionar, cargando,
  onEstadisticas, onLegal,
}) {
  const filtrosActivos = filtros.texto || filtros.estado || filtros.secretaria || filtros.comuna
  const select =
    'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-4 border-b border-slate-200 bg-slate-50/60 p-4">
        <Resumen publicadas={publicadas} />
        <button type="button" onClick={onEstadisticas}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:border-slate-300 hover:shadow-sm">
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 3v18h18M7 16v-3M12 16V8M17 16v-6" />
            </svg>
            Ranking de entidades y comunas
          </span>
          <span className="text-slate-400">›</span>
        </button>

        {esAdmin && (
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-200/70 p-1 text-xs font-semibold">
            {PESTANAS.map((p) => (
              <button key={p.id} type="button" onClick={() => onVista(p.id)}
                className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 transition ${
                  vista === p.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}>
                {p.etiqueta}
                {conteos[p.id] > 0 && (
                  <span className={`min-w-[1.25rem] rounded-full px-1.5 text-[10px] leading-4 ${
                    p.id === 'revision' ? 'bg-amber-500 text-white' : 'bg-slate-300/80 text-slate-700'
                  }`}>
                    {conteos[p.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="relative">
            <Icono nombre="buscar" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" value={filtros.texto}
              onChange={(e) => onFiltros({ ...filtros, texto: e.target.value })}
              placeholder={esAdmin ? 'Buscar título, barrio o denunciante' : 'Buscar por título, calle o barrio'}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={filtros.estado} onChange={(e) => onFiltros({ ...filtros, estado: e.target.value })} className={select} aria-label="Filtrar por estado">
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="solucionado">Solucionadas</option>
            </select>
            <select value={filtros.secretaria} onChange={(e) => onFiltros({ ...filtros, secretaria: e.target.value })} className={select} aria-label="Filtrar por entidad">
              <option value="">Todas las entidades</option>
              {SECRETARIAS.map((s) => <option key={s.id} value={s.id}>{s.corto}</option>)}
            </select>
            <select value={filtros.comuna} onChange={(e) => onFiltros({ ...filtros, comuna: e.target.value })} className={select} aria-label="Filtrar por comuna">
              <option value="">Todas las comunas</option>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1)}>Comuna {i + 1}</option>)}
              <option value="0">Rural / otras</option>
            </select>
            <select value={filtros.orden} onChange={(e) => onFiltros({ ...filtros, orden: e.target.value })} className={select} aria-label="Ordenar">
              <option value="recientes">Más recientes</option>
              <option value="antiguas">Más días sin solución</option>
              <option value="apoyos">Más confirmadas</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-1 pt-3 text-xs font-medium text-slate-500">
        <span>{denuncias.length} {denuncias.length === 1 ? 'resultado' : 'resultados'}</span>
        {filtrosActivos && (
          <button type="button" onClick={() => onFiltros({ ...filtros, texto: '', estado: '', secretaria: '', comuna: '' })}
            className="font-semibold text-slate-700 hover:text-slate-900">
            Limpiar filtros
          </button>
        )}
      </div>

      <ul className="desplazable flex-1 space-y-2 overflow-y-auto px-3 pb-4 pt-1">
        {cargando && denuncias.length === 0 && [0, 1, 2].map((i) => (
          <li key={i} className="h-[84px] animate-pulse rounded-xl bg-slate-100" />
        ))}

        {!cargando && denuncias.length === 0 && (
          <li className="flex flex-col items-center px-6 py-10 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Icono nombre={vista === 'revision' ? 'check' : 'pin'} className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold text-slate-700">
              {vista === 'revision' ? 'Todo al día' : filtrosActivos ? 'Sin resultados' : 'Aún no hay denuncias'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {vista === 'revision'
                ? 'No hay denuncias esperando revisión.'
                : filtrosActivos ? 'Prueba con otros filtros.' : 'Toca una calle en el mapa para registrar la primera.'}
            </p>
          </li>
        )}

        {denuncias.map((d) => {
          const s = obtenerSecretaria(d.secretaria)
          const e = ESTADOS[d.estado] ?? ESTADOS.pendiente
          const m = esAdmin ? MODERACION[d.moderacion] : null
          const ubicacion = [...new Set([d.direccion, d.barrio].filter(Boolean))].join(' · ')
          return (
            <li key={d.id}>
              <button type="button" onClick={() => onSeleccionar(d)}
                className="flex w-full gap-3 rounded-xl border border-slate-200 bg-white p-2.5 text-left transition hover:border-slate-300 hover:shadow-sm">
                {d.foto ? (
                  <img src={d.foto} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    <Icono nombre="pin" className="h-6 w-6" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900">{d.titulo}</p>
                    <span className="shrink-0 text-[11px] text-slate-400">{haceCuanto(d.fechaCreacion)}</span>
                  </div>
                  <p className="line-clamp-1 text-xs text-slate-500">{ubicacion || 'Sin dirección'}</p>
                  {esAdmin && (
                    <p className="line-clamp-1 text-xs text-slate-500">
                      {d.contacto ? `${d.contacto.nombre} · ${d.contacto.cargo}` : 'Anónima'}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {m
                      ? <Insignia clase={m.insignia} punto={m.clase}>{m.etiqueta}</Insignia>
                      : <Insignia clase={e.insignia} punto={e.clase}>{e.etiqueta}</Insignia>}
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.corto}
                    </span>
                  </div>
                  {d.moderacion === 'aprobada' && (
                    <div className="mt-1 flex items-center gap-2">
                      <ContadorDias denuncia={d} compacto />
                      {d.apoyos > 0 && <span className="text-[11px] text-slate-500">· {d.apoyos} confirman</span>}
                    </div>
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
        {MOSTRAR_POLITICA && (
          <>
            <button type="button" onClick={() => onLegal('privacidad')} className="hover:text-slate-900 hover:underline">Política de datos</button>
            <span aria-hidden="true">·</span>
          </>
        )}
        <button type="button" onClick={() => onLegal('criterios')} className="hover:text-slate-900 hover:underline">Criterios de moderación</button>
        <span aria-hidden="true">·</span>
        <span>Mapa © OpenStreetMap</span>
      </footer>
    </div>
  )
}
