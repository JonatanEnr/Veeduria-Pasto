export default function Encabezado({
  onExportar, onAlternarPanel, panelAbierto, modoNube, authDisponible, sesion, esAdmin, onIngresar, onSalir,
}) {
  const boton = 'rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold hover:bg-white/30'

  return (
    <header className="z-[500] flex items-center gap-2 bg-gradient-to-r from-green-700 to-yellow-500 px-4 py-2.5 text-white shadow sm:gap-3">
      <span className="text-2xl">📍</span>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-bold leading-tight sm:text-lg">Mapa de Denuncias · Pasto</h1>
        <p className="truncate text-xs text-white/85">
          Veeduría ciudadana · San Juan de Pasto, Nariño
          <span className="ml-2 rounded bg-black/20 px-1.5 py-px text-[10px]">
            {modoNube ? '☁ En la nube' : '💾 Modo local'}
          </span>
        </p>
      </div>

      {esAdmin && (
        <button type="button" onClick={onExportar} className={`hidden sm:block ${boton}`}>
          Exportar JSON
        </button>
      )}

      {authDisponible && (
        sesion ? (
          <button type="button" onClick={onSalir} className={boton} title={sesion.user?.email}>
            {esAdmin ? 'Veedor · Salir' : 'Salir'}
          </button>
        ) : (
          <button type="button" onClick={onIngresar} className={boton}>Ingresar</button>
        )
      )}

      <button type="button" onClick={onAlternarPanel} className={`md:hidden ${boton}`}>
        {panelAbierto ? 'Mapa' : 'Lista'}
      </button>
    </header>
  )
}
