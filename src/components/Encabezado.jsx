import Icono from './Iconos'

export function Logo({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0f172a" />
      <path d="M16 6a7 7 0 0 0-7 7c0 5.3 7 13 7 13s7-7.7 7-13a7 7 0 0 0-7-7Z" fill="#10b981" />
      <circle cx="16" cy="13" r="2.6" fill="#facc15" />
    </svg>
  )
}

export default function Encabezado({
  onExportar, modoNube, authDisponible, sesion, esAdmin, onIngresar, onSalir,
}) {
  const botonFantasma =
    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'

  return (
    <header
      className="z-[600] flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:px-4"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Logo />
      <div className="min-w-0 flex-1 leading-tight">
        <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900 sm:text-base">
          Veeduría Ciudadana Pasto
        </h1>
        <p className="truncate text-xs text-slate-500">Mapa de denuncias · San Juan de Pasto</p>
      </div>

      <span
        className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset lg:inline-flex ${
          modoNube ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-amber-50 text-amber-800 ring-amber-600/20'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${modoNube ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {modoNube ? 'En línea' : 'Modo local'}
      </span>

      {esAdmin && (
        <button type="button" onClick={onExportar} className={`hidden sm:inline-flex ${botonFantasma}`} title="Exportar todas las denuncias (JSON)">
          <Icono nombre="descargar" />
          <span className="hidden md:inline">Exportar</span>
        </button>
      )}

      {authDisponible && (
        sesion ? (
          <div className="flex items-center gap-1">
            <span className="hidden items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white sm:inline-flex">
              <Icono nombre="escudo" className="h-3.5 w-3.5" />
              {esAdmin ? 'Veedor' : 'Sesión'}
            </span>
            <button type="button" onClick={onSalir} className={botonFantasma} title={`Cerrar sesión (${sesion.user?.email ?? ''})`}>
              <Icono nombre="salir" />
              <span className="sr-only">Cerrar sesión</span>
            </button>
          </div>
        ) : (
          <button type="button" onClick={onIngresar} className={botonFantasma} title="Ingreso para veedores">
            <Icono nombre="entrar" />
            <span className="hidden sm:inline">Veedores</span>
          </button>
        )
      )}
    </header>
  )
}
