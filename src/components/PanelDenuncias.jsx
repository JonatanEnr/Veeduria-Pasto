import { SECRETARIAS, obtenerSecretaria, ESTADOS } from '../constants/secretarias'

const PESTANAS = [
  { id: 'mapa', etiqueta: 'Publicadas' },
  { id: 'revision', etiqueta: 'Por revisar' },
  { id: 'rechazada', etiqueta: 'Rechazadas' },
]

export default function PanelDenuncias({
  denuncias, publicadas, conteos, esAdmin, vista, onVista, filtros, onFiltros, onSeleccionar,
}) {
  const total = publicadas.length
  const pendientes = publicadas.filter((d) => d.estado === 'pendiente').length
  const solucionadas = total - pendientes

  return (
    <aside className="flex h-full flex-col bg-white">
      <div className="grid grid-cols-3 gap-2 border-b p-3 text-center">
        <Contador valor={total} etiqueta="En el mapa" clase="text-slate-800" />
        <Contador valor={pendientes} etiqueta="Pendientes" clase="text-red-600" />
        <Contador valor={solucionadas} etiqueta="Solucionadas" clase="text-green-600" />
      </div>

      {esAdmin && (
        <div className="flex border-b text-xs font-semibold">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onVista(p.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 ${
                vista === p.id ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {p.etiqueta}
              {conteos[p.id] > 0 && (
                <span className={`rounded-full px-1.5 text-[10px] ${
                  p.id === 'revision' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {conteos[p.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2 border-b p-3">
        <input
          type="search"
          value={filtros.texto}
          onChange={(e) => onFiltros({ ...filtros, texto: e.target.value })}
          placeholder={esAdmin ? 'Buscar por título, barrio o denunciante…' : 'Buscar por título, calle o barrio…'}
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <select
            value={filtros.estado}
            onChange={(e) => onFiltros({ ...filtros, estado: e.target.value })}
            className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">🔴 Pendientes</option>
            <option value="solucionado">🟢 Solucionadas</option>
          </select>
          <select
            value={filtros.secretaria}
            onChange={(e) => onFiltros({ ...filtros, secretaria: e.target.value })}
            className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Todas las entidades</option>
            {SECRETARIAS.map((s) => (
              <option key={s.id} value={s.id}>{s.corto}</option>
            ))}
          </select>
        </div>
      </div>

      <ul className="flex-1 divide-y overflow-y-auto">
        {denuncias.length === 0 && (
          <li className="p-6 text-center text-sm text-slate-500">
            {vista === 'revision' ? '🎉 No hay denuncias por revisar.' : 'No hay denuncias para mostrar.'}
            {vista === 'mapa' && (
              <>
                <br />
                <span className="text-xs">Haz clic sobre una calle del mapa para registrar una.</span>
              </>
            )}
          </li>
        )}
        {denuncias.map((d) => {
          const s = obtenerSecretaria(d.secretaria)
          const e = ESTADOS[d.estado] ?? ESTADOS.pendiente
          const punto = d.moderacion === 'revision' ? 'bg-amber-500'
            : d.moderacion === 'rechazada' ? 'bg-slate-400' : e.clase
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onSeleccionar(d)}
                className="flex w-full gap-3 p-3 text-left hover:bg-slate-50"
              >
                <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${punto}`} title={e.etiqueta} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{d.titulo}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[...new Set([d.direccion, d.barrio].filter(Boolean))].join(' · ') || 'Sin dirección'}
                  </p>
                  {esAdmin && d.contacto && (
                    <p className="truncate text-xs text-slate-600">👤 {d.contacto.nombre} · {d.contacto.cargo}</p>
                  )}
                  <span className="mt-1 inline-block rounded px-1.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: s.color }}>
                    {s.corto}
                  </span>
                </div>
                {d.foto && <img src={d.foto} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />}
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

function Contador({ valor, etiqueta, clase }) {
  return (
    <div>
      <p className={`text-xl font-bold ${clase}`}>{valor}</p>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{etiqueta}</p>
    </div>
  )
}
