import { useCallback, useEffect, useMemo, useState } from 'react'
import Encabezado from './components/Encabezado'
import MapaPasto from './components/MapaPasto'
import PanelDenuncias from './components/PanelDenuncias'
import DetalleDenuncia from './components/DetalleDenuncia'
import FormularioDenuncia from './components/FormularioDenuncia'
import ModalIngreso from './components/ModalIngreso'
import Icono from './components/Iconos'
import { useDenuncias } from './hooks/useDenuncias'
import { useSesion } from './hooks/useSesion'
import { exportarJSON, modoNube } from './services/almacenamiento'
import { errorConfiguracion } from './services/supabase'
import { LIMITES_PASTO } from './constants/mapa'

const normalizar = (t = '') => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Pestañas del veedor → qué denuncias muestra cada una
const EN_VISTA = {
  mapa: (d) => d.moderacion === 'aprobada',
  revision: (d) => d.moderacion === 'revision',
  rechazada: (d) => d.moderacion === 'rechazada',
}

const dentroDePasto = (lat, lng) => {
  const [[s, o], [n, e]] = LIMITES_PASTO
  return lat >= s && lat <= n && lng >= o && lng <= e
}

function useEsMovil() {
  const consulta = '(max-width: 767px)'
  const [movil, setMovil] = useState(() => window.matchMedia(consulta).matches)
  useEffect(() => {
    const mq = window.matchMedia(consulta)
    const cambio = (e) => setMovil(e.matches)
    mq.addEventListener('change', cambio)
    return () => mq.removeEventListener('change', cambio)
  }, [])
  return movil
}

export default function App() {
  const esMovil = useEsMovil()
  const { sesion, esAdmin, ingresar, salir, authDisponible } = useSesion()
  const {
    denuncias, cargando, error, limpiarError, recargar, agregar, alternarEstado, moderar, eliminar,
  } = useDenuncias(esAdmin)

  const [puntoNuevo, setPuntoNuevo] = useState(null)
  const [seleccionadaId, setSeleccionadaId] = useState(null)
  const [objetivo, setObjetivo] = useState(null)
  const [hojaAbierta, setHojaAbierta] = useState(false) // panel inferior en celular
  const [mostrarIngreso, setMostrarIngreso] = useState(false)
  const [vista, setVista] = useState('mapa')
  const [aviso, setAviso] = useState(null) // { tipo: 'exito' | 'info', texto }
  const [ubicando, setUbicando] = useState(false)
  const [filtros, setFiltros] = useState({ texto: '', estado: '', secretaria: '' })

  useEffect(() => { if (!esAdmin) setVista('mapa') }, [esAdmin])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 8000)
    return () => clearTimeout(t)
  }, [aviso])

  // ---------------- Datos derivados ----------------
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
  // En el mapa: lo publicado + lo que espera revisión (solo lo recibe el veedor);
  // lo rechazado solo aparece cuando el veedor está en esa pestaña.
  const enMapa = useMemo(
    () => filtradas.filter((d) => d.moderacion !== 'rechazada' || vista === 'rechazada'),
    [filtradas, vista],
  )
  const seleccionada = denuncias.find((d) => d.id === seleccionadaId) ?? null

  // ---------------- Acciones ----------------
  const volarA = useCallback((lat, lng, zoom = 17) => {
    // En celular el panel inferior tapa ~60% del mapa: subimos el punto.
    setObjetivo({ lat, lng, zoom, desplazarY: esMovil ? 0.3 : 0, t: Date.now() })
  }, [esMovil])

  const seleccionar = useCallback((d) => {
    setSeleccionadaId(d.id)
    setHojaAbierta(true)
    volarA(d.lat, d.lng)
  }, [volarA])

  const cerrarDetalle = () => setSeleccionadaId(null)

  const clicEnMapa = (punto) => {
    if (esMovil && hojaAbierta) { // primer toque: cerrar el panel
      setHojaAbierta(false)
      setSeleccionadaId(null)
      return
    }
    setSeleccionadaId(null)
    setPuntoNuevo(punto)
  }

  const denunciarEnMiUbicacion = () => {
    if (!navigator.geolocation) {
      setAviso({ tipo: 'info', texto: 'Tu navegador no permite ubicarte. Toca el lugar en el mapa.' })
      return
    }
    setUbicando(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUbicando(false)
        const { latitude: lat, longitude: lng } = coords
        if (!dentroDePasto(lat, lng)) {
          setAviso({ tipo: 'info', texto: 'Parece que no estás en Pasto. Toca en el mapa el lugar del problema.' })
          return
        }
        setHojaAbierta(false)
        setSeleccionadaId(null)
        setObjetivo({ lat, lng, zoom: 18, t: Date.now() })
        setPuntoNuevo({ lat, lng })
      },
      () => {
        setUbicando(false)
        setAviso({ tipo: 'info', texto: 'No pudimos obtener tu ubicación. Toca en el mapa el lugar del problema.' })
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  }

  const guardar = async (datos) => {
    const nueva = await agregar(datos) // si falla, el formulario muestra el error
    setPuntoNuevo(null)
    if (nueva) {
      seleccionar(nueva)
      setAviso({ tipo: 'exito', texto: 'Denuncia publicada en el mapa.' })
    } else {
      setAviso({ tipo: 'exito', texto: '¡Gracias! Recibimos tu denuncia. Aparecerá en el mapa cuando el veedor la revise.' })
    }
  }

  const eliminarYcerrar = async (id) => {
    await eliminar(id)
    setSeleccionadaId(null)
  }

  const verPorRevisar = () => {
    setVista('revision')
    setSeleccionadaId(null)
    setHojaAbierta(true)
  }

  // ---------------- Contenido del panel (lista o detalle) ----------------
  const contenidoPanel = seleccionada ? (
    <DetalleDenuncia
      denuncia={seleccionada}
      esAdmin={esAdmin}
      onVolver={cerrarDetalle}
      onAlternarEstado={alternarEstado}
      onModerar={moderar}
      onEliminar={eliminarYcerrar}
    />
  ) : (
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
      cargando={cargando}
    />
  )

  const pendientes = publicadas.filter((d) => d.estado === 'pendiente').length

  return (
    <div className="flex h-[100dvh] flex-col">
      <Encabezado
        onExportar={() => exportarJSON(denuncias)}
        modoNube={modoNube}
        authDisponible={authDisponible}
        sesion={sesion}
        esAdmin={esAdmin}
        onIngresar={() => setMostrarIngreso(true)}
        onSalir={salir}
      />

      {errorConfiguracion && (
        <div className="flex items-start gap-2 bg-amber-50 px-4 py-2 text-xs text-amber-900 ring-1 ring-inset ring-amber-200">
          <Icono nombre="alerta" className="mt-px h-4 w-4 shrink-0" />
          <span><strong>Configuración de Supabase incorrecta.</strong> {errorConfiguracion} La app funciona en modo local: las denuncias NO se guardan en la nube.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 px-4 py-2 text-xs text-red-800 ring-1 ring-inset ring-red-200">
          <Icono nombre="alerta" className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={recargar} className="font-semibold underline">Reintentar</button>
          <button type="button" onClick={limpiarError} aria-label="Cerrar"><Icono nombre="x" /></button>
        </div>
      )}

      <main className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Panel lateral — computador */}
        <aside className="hidden w-[380px] shrink-0 flex-col border-r border-slate-200 bg-white md:flex lg:w-[420px]">
          {contenidoPanel}
        </aside>

        {/* Mapa */}
        <section className="relative min-h-0 flex-1">
          <MapaPasto
            denuncias={enMapa}
            puntoNuevo={puntoNuevo}
            seleccionadaId={seleccionadaId}
            objetivo={objetivo}
            senalTamano={esMovil}
            onClickMapa={clicEnMapa}
            onSeleccionar={seleccionar}
          />

          {/* Indicaciones y controles flotantes */}
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[400] flex justify-center px-14">
            {cargando ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                Cargando denuncias…
              </span>
            ) : !puntoNuevo && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 px-3.5 py-1.5 text-xs font-medium text-white shadow-lg">
                <Icono nombre="mas" className="h-3.5 w-3.5" />
                <span className="sm:hidden">Toca el mapa para denunciar</span>
                <span className="hidden sm:inline">Haz clic en una calle para registrar una denuncia</span>
              </span>
            )}
          </div>

          {esAdmin && conteos.revision > 0 && !cargando && (
            <button type="button" onClick={verPorRevisar}
              className="absolute left-3 top-14 z-[400] inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg hover:bg-amber-600 sm:top-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              {conteos.revision} por revisar
            </button>
          )}

          <button type="button" onClick={denunciarEnMiUbicacion} disabled={ubicando}
            title="Denunciar en mi ubicación actual" aria-label="Denunciar en mi ubicación actual"
            className="absolute right-[10px] top-[100px] z-[400] flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-white text-slate-900 shadow-[0_4px_14px_rgb(15_23_42/0.15)] hover:bg-slate-50 disabled:opacity-60">
            {ubicando
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
              : <Icono nombre="ubicar" className="h-5 w-5" />}
          </button>

          <div className="absolute bottom-6 left-3 z-[400] hidden rounded-xl bg-white/95 px-3 py-2.5 text-xs shadow-lg ring-1 ring-slate-200 backdrop-blur md:block">
            <p className="mb-1.5 font-semibold text-slate-900">Convenciones</p>
            <div className="space-y-1 text-slate-600">
              <p className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Pendiente</p>
              <p className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Solucionado</p>
              {esAdmin && <p className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Por revisar</p>}
            </div>
          </div>
        </section>

        {/* Barra inferior — celular */}
        <div className="z-[450] shrink-0 border-t border-slate-200 bg-white px-3 pt-2 md:hidden"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setSeleccionadaId(null); setHojaAbierta(true) }}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-slate-50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Icono nombre="lista" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{publicadas.length} denuncias</span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-600" /> {pendientes} pendientes
                </span>
              </span>
            </button>
            <button type="button" onClick={denunciarEnMiUbicacion} disabled={ubicando}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              <Icono nombre="ubicar" />
              {ubicando ? 'Ubicando…' : 'Denunciar aquí'}
            </button>
          </div>
        </div>

        {/* Panel deslizable — celular */}
        {esMovil && hojaAbierta && (
          <>
            <div className="absolute inset-0 z-[460] bg-slate-900/20" onClick={() => { setHojaAbierta(false); setSeleccionadaId(null) }} />
            <div className={`animar-subir absolute inset-x-0 bottom-0 z-[470] flex flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-8px_30px_rgb(15_23_42/0.2)] ${
              seleccionada ? 'h-[62%]' : 'h-[88%]'
            }`}>
              <div className="relative flex shrink-0 items-center justify-center py-2">
                <span className="h-1.5 w-10 rounded-full bg-slate-300" />
                <button type="button" onClick={() => { setHojaAbierta(false); setSeleccionadaId(null) }} aria-label="Cerrar panel"
                  className="absolute right-2 top-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <Icono nombre="x" className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1">{contenidoPanel}</div>
            </div>
          </>
        )}
      </main>

      {aviso && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[1200] flex justify-center px-4 md:bottom-8">
          <div role="status" className={`animar-subir pointer-events-auto flex max-w-md items-start gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-2xl ${
            aviso.tipo === 'exito' ? 'bg-emerald-700' : 'bg-slate-900'
          }`}>
            <Icono nombre={aviso.tipo === 'exito' ? 'check' : 'info'} className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{aviso.texto}</span>
            <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar" className="opacity-80 hover:opacity-100">
              <Icono nombre="x" />
            </button>
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
