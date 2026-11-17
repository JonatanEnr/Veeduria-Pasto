import { useEffect, useState } from 'react'
import Icono from './Iconos'
import Seguimiento from './Seguimiento'
import { obtenerSecretaria, ESTADOS, MODERACION } from '../constants/secretarias'
import { obtenerIdYoutube, miniaturaYoutube, urlYoutube } from '../utils/youtube'
import { diasDenuncia, fechaLarga, haceCuanto, textoDias } from '../utils/fechas'
import { comprimirImagen } from '../utils/imagen'

const formatoCelular = (c) => `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6)}`

export function Insignia({ clase, punto, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${clase}`}>
      {punto && <span className={`h-1.5 w-1.5 rounded-full ${punto}`} />}
      {children}
    </span>
  )
}

/** Banda "Lleva N días sin solución" / "Resuelta en N días" */
export function ContadorDias({ denuncia, compacto = false }) {
  const n = diasDenuncia(denuncia)
  const resuelta = denuncia.estado === 'solucionado'
  if (compacto) {
    return (
      <span className={`text-[11px] font-semibold tabular-nums ${resuelta ? 'text-emerald-700' : n >= 30 ? 'text-red-700' : 'text-slate-500'}`}>
        {resuelta ? `Resuelta en ${textoDias(n)}` : `${textoDias(n)} sin solución`}
      </span>
    )
  }
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${resuelta ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
      <span className="text-3xl font-extrabold tabular-nums tracking-tight">{n}</span>
      <span className="text-sm font-semibold leading-tight">
        {resuelta ? <>días tardó en<br />resolverse</> : <>{n === 1 ? 'día' : 'días'} sin<br />solución</>}
      </span>
    </div>
  )
}

export default function DetalleDenuncia({
  denuncia, esAdmin, apoyada, onVolver, onSolucionar, onReabrir, onModerar, onEliminar, onApoyar, onCompartir,
}) {
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [cerrando, setCerrando] = useState(false) // diálogo "marcar solucionado"
  const [fotoDespues, setFotoDespues] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => { setConfirmarBorrado(false); setCerrando(false); setFotoDespues(null) }, [denuncia.id])

  const ejecutar = async (accion, ...args) => {
    setOcupado(true)
    try { await accion(denuncia.id, ...args) } finally { setOcupado(false) }
  }

  const elegirFotoDespues = async (e) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (archivo) setFotoDespues(await comprimirImagen(archivo).catch(() => null))
  }

  const confirmarSolucion = async () => {
    await ejecutar(onSolucionar, fotoDespues)
    setCerrando(false)
    setFotoDespues(null)
  }

  const secretaria = obtenerSecretaria(denuncia.secretaria)
  const estado = ESTADOS[denuncia.estado] ?? ESTADOS.pendiente
  const moderacion = esAdmin ? MODERACION[denuncia.moderacion] : null
  const idVideo = obtenerIdYoutube(denuncia.youtube)
  const solucionado = denuncia.estado === 'solucionado'
  const publicada = denuncia.moderacion === 'aprobada'
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
        {publicada && (
          <button type="button" onClick={() => onCompartir(denuncia)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <Icono nombre="externo" /> Compartir
          </button>
        )}
      </div>

      <div className="desplazable flex-1 overflow-y-auto">
        {/* Fotos: antes / después */}
        {denuncia.foto && denuncia.fotoSolucion ? (
          <div className="grid grid-cols-2 gap-px bg-slate-200">
            {[['Antes', denuncia.foto, 'bg-red-600'], ['Después', denuncia.fotoSolucion, 'bg-emerald-600']].map(([t, src, color]) => (
              <a key={t} href={src} target="_blank" rel="noreferrer" className="relative block bg-slate-100">
                <img src={src} alt={`${t}: ${denuncia.titulo}`} className="aspect-[4/3] w-full object-cover" />
                <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-bold text-white ${color}`}>{t}</span>
              </a>
            ))}
          </div>
        ) : (denuncia.foto || denuncia.fotoSolucion) && (
          <a href={denuncia.foto || denuncia.fotoSolucion} target="_blank" rel="noreferrer" className="block bg-slate-100">
            <img src={denuncia.foto || denuncia.fotoSolucion} alt={`Evidencia: ${denuncia.titulo}`} className="aspect-video w-full object-cover" />
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
              {denuncia.zona && (
                <Insignia clase="bg-white text-slate-600 ring-slate-200">
                  {denuncia.zona.tipo === 'corregimiento' ? `Corr. ${denuncia.zona.nombre}` : denuncia.zona.nombre}
                </Insignia>
              )}
            </div>
            <h2 className="text-xl font-bold leading-snug tracking-tight text-slate-900">{denuncia.titulo}</h2>
            <div className="space-y-1 text-sm text-slate-500">
              {ubicacion && (
                <p className="flex items-start gap-1.5"><Icono nombre="pin" className="mt-0.5 h-4 w-4 shrink-0" />{ubicacion}</p>
              )}
              <p className="flex items-center gap-1.5" title={fechaLarga(denuncia.fechaCreacion)}>
                <Icono nombre="reloj" className="h-4 w-4 shrink-0" />
                Reportada {haceCuanto(denuncia.fechaCreacion)}
              </p>
            </div>
          </header>

          {publicada && (
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <ContadorDias denuncia={denuncia} />
              {!solucionado ? (
                <button type="button" disabled={apoyada || ocupado} onClick={() => ejecutar(onApoyar)}
                  className={`flex flex-col items-start justify-center rounded-xl border px-4 py-2 text-left transition ${
                    apoyada ? 'border-slate-200 bg-slate-50' : 'border-slate-300 hover:border-slate-900 hover:bg-slate-50'
                  }`}>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    {apoyada ? <><Icono nombre="check" /> Ya lo confirmaste</> : <><Icono nombre="usuario" /> Yo también lo veo</>}
                  </span>
                  <span className="text-xs text-slate-500">
                    {denuncia.apoyos ? `${denuncia.apoyos} ${denuncia.apoyos === 1 ? 'vecino lo confirma' : 'vecinos lo confirman'}` : 'Sé el primero en confirmarlo'}
                  </span>
                </button>
              ) : (
                <div className="flex flex-col justify-center rounded-xl border border-slate-200 px-4 py-2">
                  <span className="text-sm font-bold text-slate-900">{denuncia.apoyos || 0} confirmaciones</span>
                  <span className="text-xs text-slate-500">de vecinos mientras estuvo pendiente</span>
                </div>
              )}
            </div>
          )}

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

          {publicada && <Seguimiento denuncia={denuncia} esAdmin={esAdmin} />}

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
          {cerrando ? (
            <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-900">Marcar como solucionada</p>
              {fotoDespues ? (
                <div className="relative">
                  <img src={fotoDespues} alt="Foto del después" className="max-h-32 w-full rounded-lg object-cover" />
                  <button type="button" onClick={() => setFotoDespues(null)} aria-label="Quitar foto"
                    className="absolute right-1.5 top-1.5 rounded-md bg-white/95 p-1 shadow"><Icono nombre="x" /></button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-emerald-300 bg-white px-3 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
                  <input type="file" accept="image/*" capture="environment" onChange={elegirFotoDespues} className="sr-only" />
                  <Icono nombre="camara" /> Agregar foto del «después» (opcional)
                </label>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setCerrando(false); setFotoDespues(null) }}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white">Cancelar</button>
                <button type="button" disabled={ocupado} onClick={confirmarSolucion}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  <Icono nombre="check" /> {ocupado ? 'Guardando…' : 'Confirmar'}
                </button>
              </div>
            </div>
          ) : !publicada ? (
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
              {solucionado ? (
                <button type="button" disabled={ocupado} onClick={() => ejecutar(onReabrir)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                  Reabrir (volver a pendiente)
                </button>
              ) : (
                <button type="button" onClick={() => setCerrando(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                  <Icono nombre="check" /> Marcar solucionado
                </button>
              )}
              <button type="button" disabled={ocupado} onClick={() => ejecutar(onModerar, 'revision')}
                className={botonSecundario} title="Quitar del mapa público">
                <Icono nombre="oculto" /> <span className="hidden sm:inline">Ocultar</span>
              </button>
            </div>
          )}
          {!cerrando && (confirmarBorrado ? (
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
          ))}
        </footer>
      )}
    </article>
  )
}
