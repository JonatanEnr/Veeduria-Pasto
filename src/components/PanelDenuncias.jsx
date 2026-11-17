import { SECRETARIAS, obtenerSecretaria, ESTADOS } from '../constants/secretarias'

export default function PanelDenuncias({ denuncias, filtros, onFiltros, onSeleccionar }) {
  const total = denuncias.length
  const pendientes = denuncias.filter((d) => d.estado === 'pendiente').length
  const solucionadas = total - pendientes

  return (
    <aside className="flex h-full flex-col bg-white">
      <div className="grid grid-cols-3 gap-2 border-b p-3 text-center">
        <Contador valor={total} etiqueta="Total" clase="text-slate-800" />
        <Contador valor={pendientes} etiqueta="Pendientes" clase="text-red-600" />
        <Contador valor={solucionadas} etiqueta="Solucionadas" clase="text-green-600" />
      </div>

      <div className="space-y-2 border-b p-3">
        <input
          type="search"
          value={filtros.texto}
          onChange={(e) => onFiltros({ ...filtros, texto: e.target.value })}
          placeholder="Buscar por título, calle o barrio…"
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
            No hay denuncias para mostrar.
            <br />
            <span className="text-xs">Haz clic sobre una calle del mapa para registrar una.</span>
          </li>
        )}
        {denuncias.map((d) => {
          const s = obtenerSecretaria(d.secretaria)
          const e = ESTADOS[d.estado] ?? ESTADOS.pendiente
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onSeleccionar(d)}
                className="flex w-full gap-3 p-3 text-left hover:bg-slate-50"
              >
                <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${e.clase}`} title={e.etiqueta} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{d.titulo}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[...new Set([d.direccion, d.barrio].filter(Boolean))].join(' · ') || 'Sin dirección'}
                  </p>
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
