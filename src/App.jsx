import { useMemo, useState } from 'react'
import Encabezado from './components/Encabezado'
import MapaPasto from './components/MapaPasto'
import PanelDenuncias from './components/PanelDenuncias'
import FormularioDenuncia from './components/FormularioDenuncia'
import ModalIngreso from './components/ModalIngreso'
import { useDenuncias } from './hooks/useDenuncias'
import { useSesion } from './hooks/useSesion'
import { exportarJSON, modoNube } from './services/almacenamiento'
import { errorConfiguracion } from './services/supabase'

const normalizar = (t = '') => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function App() {
  const {
    denuncias, cargando, error, limpiarError, recargar, agregar, alternarEstado, eliminar,
  } = useDenuncias()
  const { sesion, esAdmin, ingresar, salir, authDisponible } = useSesion()
  const [puntoNuevo, setPuntoNuevo] = useState(null)
  const [seleccionada, setSeleccionada] = useState(null)
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [mostrarIngreso, setMostrarIngreso] = useState(false)
  const [filtros, setFiltros] = useState({ texto: '', estado: '', secretaria: '' })

  const filtradas = useMemo(() => {
    const q = normalizar(filtros.texto)
    return denuncias.filter(
      (d) =>
        (!filtros.estado || d.estado === filtros.estado) &&
        (!filtros.secretaria || d.secretaria === filtros.secretaria) &&
        (!q || normalizar(`${d.titulo} ${d.direccion} ${d.barrio} ${d.descripcion}`).includes(q)),
    )
  }, [denuncias, filtros])

  const guardar = async (datos) => {
    const nueva = await agregar(datos) // si falla, el formulario muestra el error
    setPuntoNuevo(null)
    setSeleccionada(nueva)
  }

  const seleccionar = (d) => {
    setSeleccionada({ ...d }) // nuevo objeto para re-disparar el vuelo aunque sea la misma
    setPanelAbierto(false)
  }

  return (
    <div className="flex h-full flex-col">
      <Encabezado
        onExportar={() => exportarJSON(denuncias)}
        onAlternarPanel={() => setPanelAbierto((v) => !v)}
        panelAbierto={panelAbierto}
        modoNube={modoNube}
        authDisponible={authDisponible}
        sesion={sesion}
        esAdmin={esAdmin}
        onIngresar={() => setMostrarIngreso(true)}
        onSalir={salir}
      />

      {errorConfiguracion && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">
          ⚠ <strong>Configuración de Supabase incorrecta.</strong> {errorConfiguracion} La app está
          funcionando en modo local: las denuncias NO se guardan en la nube.
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center gap-3 bg-red-100 px-4 py-1.5 text-xs text-red-800">
          <span>⚠ {error}</span>
          <button type="button" onClick={recargar} className="font-semibold underline">Reintentar</button>
          <button type="button" onClick={limpiarError} className="font-semibold">×</button>
        </div>
      )}

      <main className="relative flex min-h-0 flex-1">
        <section className="relative flex-1">
          <MapaPasto
            denuncias={filtradas}
            puntoNuevo={puntoNuevo}
            seleccionada={seleccionada}
            esAdmin={esAdmin}
            onClickMapa={setPuntoNuevo}
            onAlternarEstado={alternarEstado}
            onEliminar={eliminar}
          />
          {cargando && (
            <div className="absolute left-1/2 top-4 z-[400] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-semibold shadow">
              Cargando denuncias…
            </div>
          )}
          {!puntoNuevo && (
            <div className="pointer-events-none absolute bottom-6 left-1/2 z-[400] -translate-x-1/2 rounded-full bg-slate-900/80 px-4 py-2 text-xs text-white shadow-lg">
              Haz clic sobre una calle para registrar una denuncia
            </div>
          )}
          <div className="absolute bottom-6 left-3 z-[400] space-y-1 rounded-lg bg-white/95 px-3 py-2 text-xs shadow">
            <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-600" /> Pendiente</p>
            <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-600" /> Solucionado</p>
          </div>
        </section>

        <div
          className={`absolute inset-0 z-[450] w-full border-l md:static md:z-auto md:block md:w-96 ${
            panelAbierto ? 'block' : 'hidden'
          }`}
        >
          <PanelDenuncias
            denuncias={filtradas}
            filtros={filtros}
            onFiltros={setFiltros}
            onSeleccionar={seleccionar}
          />
        </div>
      </main>

      {puntoNuevo && (
        <FormularioDenuncia
          key={`${puntoNuevo.lat},${puntoNuevo.lng}`}
          punto={puntoNuevo}
          esAdmin={esAdmin}
          onGuardar={guardar}
          onCancelar={() => setPuntoNuevo(null)}
        />
      )}

      {mostrarIngreso && (
        <ModalIngreso onIngresar={ingresar} onCerrar={() => setMostrarIngreso(false)} />
      )}
    </div>
  )
}
