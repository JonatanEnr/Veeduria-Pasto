import { useState } from 'react'
import { obtenerSecretaria, ESTADOS } from '../constants/secretarias'
import { obtenerIdYoutube, miniaturaYoutube, urlYoutube } from '../utils/youtube'

const formatoFecha = (iso) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

const formatoCelular = (c) => `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6)}`

const MODERACION = {
  revision: { texto: '⏳ En revisión: no es visible al público', clase: 'bg-amber-100 text-amber-900' },
  rechazada: { texto: '⛔ Rechazada: no es visible al público', clase: 'bg-slate-200 text-slate-700' },
}

export default function DetalleDenuncia({ denuncia, esAdmin, onAlternarEstado, onModerar, onEliminar }) {
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const ejecutar = async (accion, ...args) => {
    setOcupado(true)
    try { await accion(denuncia.id, ...args) } finally { setOcupado(false) }
  }
  const secretaria = obtenerSecretaria(denuncia.secretaria)
  const estado = ESTADOS[denuncia.estado] ?? ESTADOS.pendiente
  const idVideo = obtenerIdYoutube(denuncia.youtube)
  const solucionado = denuncia.estado === 'solucionado'
  const moderacion = esAdmin ? MODERACION[denuncia.moderacion] : null
  const c = esAdmin ? denuncia.contacto : null

  return (
    <div className="space-y-2 text-sm">
      {moderacion && (
        <p className={`!m-0 rounded px-2 py-1 text-[11px] font-semibold ${moderacion.clase}`}>{moderacion.texto}</p>
      )}

      <div className="flex items-center gap-2">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${estado.clase}`} />
        <span className={`font-semibold ${estado.texto}`}>{estado.etiqueta}</span>
        <span
          className="ml-auto rounded px-1.5 py-0.5 text-[11px] font-medium text-white"
          style={{ backgroundColor: secretaria.color }}
        >
          {secretaria.corto}
        </span>
      </div>

      <h3 className="text-base font-bold leading-tight text-slate-900">{denuncia.titulo}</h3>

      {(denuncia.direccion || denuncia.barrio) && (
        <p className="!m-0 text-xs text-slate-500">
          📍 {[...new Set([denuncia.direccion, denuncia.barrio].filter(Boolean))].join(' · ')}
        </p>
      )}

      {denuncia.descripcion && <p className="!m-0 text-slate-700">{denuncia.descripcion}</p>}

      {denuncia.foto && (
        <a href={denuncia.foto} target="_blank" rel="noreferrer">
          <img src={denuncia.foto} alt="Evidencia" className="max-h-40 w-full rounded object-cover" />
        </a>
      )}

      {idVideo && (
        <a
          href={urlYoutube(idVideo)}
          target="_blank"
          rel="noreferrer"
          className="relative block overflow-hidden rounded"
        >
          <img src={miniaturaYoutube(idVideo)} alt="Video en YouTube" className="w-full" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-3xl text-white">
            ▶
          </span>
        </a>
      )}

      <p className="!m-0 text-[11px] text-slate-400">
        Registrada: {formatoFecha(denuncia.fechaCreacion)}
        {solucionado && denuncia.fechaSolucion && <> · Solucionada: {formatoFecha(denuncia.fechaSolucion)}</>}
      </p>

      {esAdmin && (
        <div className="rounded border border-slate-200 bg-slate-50 p-2 text-xs">
          <p className="!m-0 mb-1 font-semibold text-slate-600">🔒 Denunciante (privado)</p>
          {c ? (
            <>
              <p className="!m-0 font-semibold text-slate-900">{c.nombre}</p>
              <p className="!m-0 text-slate-600">{c.cargo}</p>
              <p className="!m-0 mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-slate-800">{formatoCelular(c.celular)}</span>
                <a href={`https://wa.me/57${c.celular}`} target="_blank" rel="noreferrer"
                  className="rounded bg-green-600 px-1.5 py-0.5 font-semibold !text-white">WhatsApp</a>
                <a href={`tel:+57${c.celular}`} className="rounded bg-slate-700 px-1.5 py-0.5 font-semibold !text-white">
                  Llamar
                </a>
              </p>
            </>
          ) : (
            <p className="!m-0 text-slate-500">Sin datos de contacto.</p>
          )}
        </div>
      )}

      {esAdmin && denuncia.moderacion !== 'aprobada' && (
        <div className="flex gap-2">
          <button type="button" disabled={ocupado} onClick={() => ejecutar(onModerar, 'aprobada')}
            className="flex-1 rounded bg-blue-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            ✓ Aprobar y publicar
          </button>
          {denuncia.moderacion === 'revision' && (
            <button type="button" disabled={ocupado} onClick={() => ejecutar(onModerar, 'rechazada')}
              className="flex-1 rounded border border-slate-400 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
              ✕ Rechazar
            </button>
          )}
        </div>
      )}

      {esAdmin && <div className="flex gap-2 pt-1">
        {denuncia.moderacion === 'aprobada' && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => ejecutar(onAlternarEstado)}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50 ${
              solucionado ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {solucionado ? 'Marcar Pendiente' : 'Marcar Solucionado'}
          </button>
        )}
        {denuncia.moderacion === 'aprobada' && (
          <button type="button" disabled={ocupado} onClick={() => ejecutar(onModerar, 'revision')}
            title="Ocultar del mapa público (vuelve a revisión)"
            className="rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50">
            Ocultar
          </button>
        )}
        {confirmarBorrado ? (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => ejecutar(onEliminar)}
            className="rounded bg-slate-800 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            ¿Seguro? Eliminar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmarBorrado(true)}
            className="ml-auto rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
            title="Eliminar denuncia"
          >
            🗑
          </button>
        )}
      </div>}
    </div>
  )
}
