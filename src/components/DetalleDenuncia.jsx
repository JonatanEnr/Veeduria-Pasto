import { useState } from 'react'
import { obtenerSecretaria, ESTADOS } from '../constants/secretarias'
import { obtenerIdYoutube, miniaturaYoutube, urlYoutube } from '../utils/youtube'

const formatoFecha = (iso) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

export default function DetalleDenuncia({ denuncia, esAdmin, onAlternarEstado, onEliminar }) {
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const ejecutar = async (accion) => {
    setOcupado(true)
    try { await accion(denuncia.id) } finally { setOcupado(false) }
  }
  const secretaria = obtenerSecretaria(denuncia.secretaria)
  const estado = ESTADOS[denuncia.estado] ?? ESTADOS.pendiente
  const idVideo = obtenerIdYoutube(denuncia.youtube)
  const solucionado = denuncia.estado === 'solucionado'

  return (
    <div className="space-y-2 text-sm">
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
          📍 {[denuncia.direccion, denuncia.barrio].filter(Boolean).join(' · ')}
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

      {esAdmin && <div className="flex gap-2 pt-1">
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
            className="rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
            title="Eliminar denuncia"
          >
            🗑
          </button>
        )}
      </div>}
    </div>
  )
}
