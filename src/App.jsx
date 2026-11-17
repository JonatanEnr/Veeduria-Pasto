import { useEffect, useMemo, useState } from 'react'
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

// Pestañas del veedor → qué denuncias muestra cada una
const EN_VISTA = {
  mapa: (d) => d.moderacion === 'aprobada',
  revision: (d) => d.moderacion === 'revision',
  rechazada: (d) => d.moderacion === 'rechazada',
}

export default function App() {
  const { sesion, esAdmin, ingresar, salir, authDisponible } = useSesion()
  const {
    denuncias, cargando, error, limpiarError, recargar, agregar, alternarEstado, moderar, eliminar,
  } = useDenuncias(esAdmin)
  const [puntoNuevo, setPuntoNuevo] = useState(null)
  const [seleccionada, setSeleccionada] = useState(null)
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [mostrarIngreso, setMostrarIngreso] = useState(false)
  const [vista, setVista] = useState('mapa')
  const [aviso, setAviso] = useState(null)
  const [filtros, setFiltros] = useState({ texto: '', estado: '', secretaria: '' })

  useEffect(() => { if (!esAdmin) setVista('mapa') }, [esAdmin])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 9000)
    return () => clearTimeout(t)
  }, [aviso])

  const filtradas = useMemo(() => {
    const q = normalizar(filtros.texto)
    return denuncias.filter(
      (d) =>
        (!filtros.estado || d.estado === filtros.estado) &&
        (!filtros.secretaria || d.secretaria === filtros.secretaria) &&
        (!q || normalizar(
          `${d.titulo} ${d.direccion} ${d.barrio} ${d.descripcion} ${d.contacto?.nombre ?? ''} ${d.contacto?.cargo ?? ''}`,
        ).includes(q)),
    )
  }, [denuncias, filtros])

  const publicadas = useMemo(() => denuncias.filter(EN_VISTA.mapa), [denuncias])
  const conteos = useMemo(() => ({
    mapa: publicadas.length,
    revision: denuncias.filter(EN_VISTA.revision).length,
    rechazada: denuncias.filter(EN_VISTA.rechazada).length,
  }), [denuncias, publicadas])

  const enPanel = useMemo(() => filtradas.filter(EN_VISTA[vista]), [filtradas, vista])
  // En el mapa: lo publicado + lo que espera revisión (solo lo ve el veedor);
  // lo rechazado solo aparece cuando el veedor está en esa pestaña.
  const enMapa = useMemo(
    () => filtradas.filter((d) => d.moderacion !== 'rechazada' || vista === 'rechazada'),
    [filtradas, vista],
  )

  const guardar = async (datos) => {
    const nueva = await agregar(datos) // si falla, el formulario muestra el error
    setPuntoNuevo(null)
    if (nueva) {
      setSeleccionada(nueva)
    } else {
      setAviso('✅ ¡Gracias! Tu denuncia fue enviada. Aparecerá en el mapa cuando el veedor la revise.')
    }
  }

  const seleccionar = (d) => {
    setSeleccionada({ ...d }) // nuevo objeto para re-disparar el vuelo aunque sea la misma
    setPanelAbierto(false)
  }

  const verPorRevisar = () => {
    setVista('revision')
    setPanelAbierto(true)
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
            denuncias={enMapa}
            puntoNuevo={puntoNuevo}
            seleccionada={seleccionada}
            esAdmin={esAdmin}
            onClickMapa={setPuntoNuevo}
            onAlternarEstado={alternarEstado}
            onModerar={moderar}
            onEliminar={eliminar}
          />
          {cargando && (
            <div className="absolute left-1/2 top-4 z-[400] -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-semibold shadow">
              Cargando denuncias…
            </div>
          )}
          {esAdmin && conteos.revision > 0 && !cargando && (
            <button
              type="button"
              onClick={verPorRevisar}
              className="absolute right-3 top-3 z-[400] rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-amber-600"
            >
              ⏳ {conteos.revision} por revisar
            </button>
          )}
          {!puntoNuevo && (
            <div className="pointer-events-none absolute bottom-6 left-1/2 z-[400] -translate-x-1/2 rounded-full bg-slate-900/80 px-4 py-2 text-xs text-white shadow-lg">
              Haz clic sobre una calle para registrar una denuncia
            </div>
          )}
          <div className="absolute bottom-6 left-3 z-[400] space-y-1 rounded-lg bg-white/95 px-3 py-2 text-xs shadow">
            <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-600" /> Pendiente</p>
            <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-600" /> Solucionado</p>
            {esAdmin && (
              <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-500" /> Por revisar</p>
            )}
          </div>
        </section>

        <div
          className={`absolute inset-0 z-[450] w-full border-l md:static md:z-auto md:block md:w-96 ${
            panelAbierto ? 'block' : 'hidden'
          }`}
        >
          <PanelDenuncias
            denuncias={enPanel}
            publicadas={publicadas}
            conteos={conteos}
            esAdmin={esAdmin}
            vista={vista}
            onVista={setVista}
            filtros={filtros}
            onFiltros={setFiltros}
            onSeleccionar={seleccionar}
          />
        </div>
      </main>

      {aviso && (
        <div className="fixed inset-x-0 bottom-20 z-[1200] flex justify-center px-4">
          <div className="flex max-w-md items-start gap-3 rounded-xl bg-green-700 px-4 py-3 text-sm text-white shadow-2xl">
            <span>{aviso}</span>
            <button type="button" onClick={() => setAviso(null)} className="text-lg leading-none">×</button>
          </div>
        </div>
      )}

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
