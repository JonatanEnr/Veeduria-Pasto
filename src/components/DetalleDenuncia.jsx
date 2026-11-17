import { useEffect, useState } from 'react'
import Icono from './Iconos'
import { obtenerSecretaria, ESTADOS, MODERACION } from '../constants/secretarias'
import { obtenerIdYoutube, miniaturaYoutube, urlYoutube } from '../utils/youtube'
import { fechaLarga, haceCuanto } from '../utils/fechas'

const formatoCelular = (c) => `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6)}`

export function Insignia({ clase, punto, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${clase}`}>
      {punto && <span className={`h-1.5 w-1.5 rounded-full ${punto}`} />}
      {children}
    </span>
  )
}

export default function DetalleDenuncia({
  denuncia, esAdmin, onVolver, onAlternarEstado, onModerar, onEliminar,
}) {
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => setConfirmarBorrado(false), [denuncia.id])

  const ejecutar = async (accion, ...args) => {
    setOcupado(true)
    try { await accion(denuncia.id, ...args) } finally { setOcupado(false) }
  }

  const secretaria = obtenerSecretaria(denuncia.secretaria)
  const estado = ESTADOS[denuncia.estado] ?? ESTADOS.pendiente
  const moderacion = esAdmin ? MODERACION[denuncia.moderacion] : null
  const idVideo = obtenerIdYoutube(denuncia.youtube)
  const solucionado = denuncia.estado === 'solucionado'
  const ubicacion = [...new Set([denuncia.direccion, denuncia.barrio].filter(Boolean))].join(' · ')
  const c = denuncia.contacto
  const gmaps = `https://www.google.com/maps?q=${denuncia.lat},${denuncia.lng}`

  const botonSecundario =
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50'

  return (
    <article className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
        <button type="button" onClick={onVolver}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
          <Icono nombre="atras" /> Volver a la lista
        </button>
      </div>

      <div className="desplazable flex-1 overflow-y-auto">
        {denuncia.foto && (
          <a href={denuncia.foto} target="_blank" rel="noreferrer" className="block bg-slate-100">
            <img src={denuncia.foto} alt={`Evidencia: ${denuncia.titulo}`} className="aspect-video w-full object-cover" />
          </a>
        )}

        <div className="space-y-5 p-4 sm:p-5">
          <header className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {moderacion && <Insignia clase={moderacion.insignia} punto={moderacion.clase}>{moderacion.etiqueta}</Insignia>}
              <Insignia clase={estado.insignia} punto={estado.clase}>{estado.etiqueta}</Insignia>
              <Insignia clase="bg-white text-slate-700 ring-slate-200">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: secretaria.color }} />
                {secretaria.corto}
              </Insignia>
            </div>
            <h2 className="text-xl font-bold leading-snug tracking-tight text-slate-900">{denuncia.titulo}</h2>
            <div className="space-y-1 text-sm text-slate-500">
              {ubicacion && (
                <p className="flex items-start gap-1.5"><Icono nombre="pin" className="mt-0.5 h-4 w-4 shrink-0" />{ubicacion}</p>
              )}
              <p className="flex items-center gap-1.5" title={fechaLarga(denuncia.fechaCreacion)}>
                <Icono nombre="reloj" className="h-4 w-4 shrink-0" />
                Reportada {haceCuanto(denuncia.fechaCreacion)}
                {solucionado && denuncia.fechaSolucion && <> · solucionada {haceCuanto(denuncia.fechaSolucion)}</>}
              </p>
            </div>
          </header>

          {denuncia.descripcion && (
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{denuncia.descripcion}</p>
          )}

          {idVideo && (
            <a href={urlYoutube(idVideo)} target="_blank" rel="noreferrer"
              className="group relative block overflow-hidden rounded-xl ring-1 ring-slate-200">
              <img src={miniaturaYoutube(idVideo)} alt="Video de la denuncia en YouTube" className="aspect-video w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-slate-900/30 transition group-hover:bg-slate-900/40">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
                  <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </span>
              <span className="absolute bottom-2 left-2 rounded-md bg-slate-900/80 px-2 py-1 text-xs font-semibold text-white">
                Ver en YouTube
              </span>
            </a>
          )}

          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
            <div className="flex gap-3 p-3">
              <Icono nombre="edificio" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs font-medium text-slate-500">Entidad responsable</dt>
                <dd className="font-semibold text-slate-900">{secretaria.nombre}</dd>
              </div>
            </div>
            <a href={gmaps} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 hover:bg-slate-50">
              <Icono nombre="pin" className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="flex-1 font-medium text-slate-700">Abrir en Google Maps</span>
              <Icono nombre="externo" className="h-4 w-4 text-slate-400" />
            </a>
          </dl>

          {esAdmin && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                <Icono nombre="candado" className="h-3.5 w-3.5" /> Denunciante · privado
              </h3>
              {c ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                      {c.nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{c.nombre}</p>
                      <p className="truncate text-sm text-slate-500">{c.cargo}</p>
                    </div>
                  </div>
                  <p className="font-mono text-sm text-slate-700">{formatoCelular(c.celular)}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <a href={`https://wa.me/57${c.celular}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:brightness-95">
                      <Icono nombre="mensaje" /> WhatsApp
                    </a>
                    <a href={`tel:+57${c.celular}`} className={botonSecundario}>
                      <Icono nombre="telefono" /> Llamar
                    </a>
                  </div>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <Icono nombre="oculto" className="h-4 w-4 text-slate-400" />
                  Denuncia anónima: sin datos de contacto.
                </p>
              )}
            </section>
          )}
        </div>
      </div>

      {esAdmin && (
        <footer className="space-y-2 border-t border-slate-200 bg-white p-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          {denuncia.moderacion !== 'aprobada' ? (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={ocupado} onClick={() => ejecutar(onModerar, 'aprobada')}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                <Icono nombre="check" /> Aprobar y publicar
              </button>
              {denuncia.moderacion === 'revision' ? (
                <button type="button" disabled={ocupado} onClick={() => ejecutar(onModerar, 'rechazada')} className={botonSecundario}>
                  <Icono nombre="x" /> Rechazar
                </button>
              ) : (
                <button type="button" disabled={ocupado} onClick={() => ejecutar(onModerar, 'revision')} className={botonSecundario}>
                  Devolver a revisión
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button type="button" disabled={ocupado} onClick={() => ejecutar(onAlternarEstado)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                  solucionado ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}>
                {solucionado ? 'Marcar como pendiente' : <><Icono nombre="check" /> Marcar solucionado</>}
              </button>
              <button type="button" disabled={ocupado} onClick={() => ejecutar(onModerar, 'revision')}
                className={botonSecundario} title="Quitar del mapa público">
                <Icono nombre="oculto" /> <span className="hidden sm:inline">Ocultar</span>
              </button>
            </div>
          )}
          {confirmarBorrado ? (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2">
              <span className="flex-1 text-xs font-medium text-red-800">¿Eliminar definitivamente? No se puede deshacer.</span>
              <button type="button" onClick={() => setConfirmarBorrado(false)} className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white">
                Cancelar
              </button>
              <button type="button" disabled={ocupado} onClick={() => ejecutar(onEliminar)}
                className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                Eliminar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmarBorrado(true)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-700">
              <Icono nombre="basura" className="h-3.5 w-3.5" /> Eliminar denuncia
            </button>
          )}
        </footer>
      )}
    </article>
  )
}
