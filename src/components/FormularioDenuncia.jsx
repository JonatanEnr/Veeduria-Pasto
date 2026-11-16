import { useEffect, useState } from 'react'
import { SECRETARIAS } from '../constants/secretarias'
import { obtenerDireccion } from '../services/geocodificacion'
import { comprimirImagen } from '../utils/imagen'
import { esLinkYoutubeValido } from '../utils/youtube'

const VACIO = {
  titulo: '',
  descripcion: '',
  secretaria: '',
  direccion: '',
  barrio: '',
  foto: null,
  youtube: '',
  estado: 'pendiente',
}

const campo =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'

export default function FormularioDenuncia({ punto, esAdmin, onGuardar, onCancelar }) {
  const [datos, setDatos] = useState(VACIO)
  const [buscandoDireccion, setBuscandoDireccion] = useState(true)
  const [procesandoFoto, setProcesandoFoto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errores, setErrores] = useState({})

  // Al hacer clic en una calle, se busca su nombre real en OpenStreetMap
  useEffect(() => {
    let activo = true
    setBuscandoDireccion(true)
    obtenerDireccion(punto.lat, punto.lng).then(({ direccion, barrio }) => {
      if (!activo) return
      setDatos((d) => ({ ...d, direccion: d.direccion || direccion, barrio: d.barrio || barrio }))
      setBuscandoDireccion(false)
    })
    return () => { activo = false }
  }, [punto])

  const cambiar = (e) => setDatos((d) => ({ ...d, [e.target.name]: e.target.value }))

  const cambiarFoto = async (e) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setProcesandoFoto(true)
    try {
      const foto = await comprimirImagen(archivo)
      setDatos((d) => ({ ...d, foto }))
      setErrores((er) => ({ ...er, foto: undefined }))
    } catch (err) {
      setErrores((er) => ({ ...er, foto: err.message }))
    } finally {
      setProcesandoFoto(false)
    }
  }

  const validar = () => {
    const er = {}
    if (!datos.titulo.trim()) er.titulo = 'Escribe un título corto'
    if (!datos.secretaria) er.secretaria = 'Selecciona la entidad responsable'
    if (!esLinkYoutubeValido(datos.youtube)) er.youtube = 'El enlace no parece ser de YouTube'
    setErrores(er)
    return Object.keys(er).length === 0
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (guardando || !validar()) return
    setGuardando(true)
    try {
      await onGuardar({
        ...datos,
        titulo: datos.titulo.trim(),
        descripcion: datos.descripcion.trim(),
        direccion: datos.direccion.trim(),
        barrio: datos.barrio.trim(),
        youtube: datos.youtube.trim(),
        estado: esAdmin ? datos.estado : 'pendiente',
        lat: punto.lat,
        lng: punto.lng,
      })
    } catch (err) {
      setErrores({ general: err.message })
      setGuardando(false)
    }
  }

  const secretariaActual = SECRETARIAS.find((s) => s.id === datos.secretaria)

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={enviar}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Nueva denuncia</h2>
            <p className="text-xs text-slate-500">
              {punto.lat.toFixed(5)}, {punto.lng.toFixed(5)}
            </p>
          </div>
          <button type="button" onClick={onCancelar} className="text-2xl leading-none text-slate-400 hover:text-slate-700">
            ×
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Calle / dirección</span>
              <input name="direccion" value={datos.direccion} onChange={cambiar}
                placeholder={buscandoDireccion ? 'Buscando calle…' : 'Ej: Calle 18 # 25-30'} className={campo} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Barrio / sector</span>
              <input name="barrio" value={datos.barrio} onChange={cambiar}
                placeholder={buscandoDireccion ? 'Buscando…' : 'Ej: Las Cuadras'} className={campo} />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Título *</span>
            <input name="titulo" value={datos.titulo} onChange={cambiar} maxLength={100}
              placeholder="Ej: Hueco profundo frente al colegio" className={campo} />
            {errores.titulo && <span className="text-xs text-red-600">{errores.titulo}</span>}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Descripción</span>
            <textarea name="descripcion" value={datos.descripcion} onChange={cambiar} rows={3}
              placeholder="¿Qué pasa, desde cuándo, a quién afecta?" className={campo} />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Secretaría / entidad responsable *</span>
            <select name="secretaria" value={datos.secretaria} onChange={cambiar} className={campo}>
              <option value="">— Seleccionar —</option>
              {SECRETARIAS.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
            {secretariaActual?.ejemplos && (
              <span className="text-xs text-slate-500">Atiende: {secretariaActual.ejemplos}</span>
            )}
            {errores.secretaria && <span className="block text-xs text-red-600">{errores.secretaria}</span>}
          </label>

          <div>
            <span className="mb-1 block text-xs font-semibold text-slate-600">Foto de evidencia</span>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 hover:border-blue-400 hover:bg-blue-50">
              <input type="file" accept="image/*" capture="environment" onChange={cambiarFoto} className="hidden" />
              {procesandoFoto ? 'Procesando foto…' : datos.foto ? '📷 Cambiar foto' : '📷 Subir o tomar foto'}
            </label>
            {datos.foto && (
              <div className="relative mt-2">
                <img src={datos.foto} alt="Vista previa" className="max-h-48 w-full rounded-lg object-cover" />
                <button type="button" onClick={() => setDatos((d) => ({ ...d, foto: null }))}
                  className="absolute right-2 top-2 rounded-full bg-black/60 px-2 text-white">×</button>
              </div>
            )}
            {errores.foto && <span className="text-xs text-red-600">{errores.foto}</span>}
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Link del video en YouTube</span>
            <input name="youtube" value={datos.youtube} onChange={cambiar} type="url"
              placeholder="https://youtu.be/…" className={campo} />
            {errores.youtube && <span className="text-xs text-red-600">{errores.youtube}</span>}
          </label>

          {esAdmin && <fieldset>
            <span className="mb-1 block text-xs font-semibold text-slate-600">Estado</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: 'pendiente', t: 'Pendiente', on: 'border-red-600 bg-red-50 text-red-700', dot: 'bg-red-600' },
                { v: 'solucionado', t: 'Solucionado', on: 'border-green-600 bg-green-50 text-green-700', dot: 'bg-green-600' },
              ].map((o) => (
                <button key={o.v} type="button" onClick={() => setDatos((d) => ({ ...d, estado: o.v }))}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 py-2 text-sm font-semibold ${
                    datos.estado === o.v ? o.on : 'border-slate-200 text-slate-500'
                  }`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${o.dot}`} /> {o.t}
                </button>
              ))}
            </div>
          </fieldset>}

          {errores.general && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errores.general}</p>
          )}
        </div>

        <footer className="sticky bottom-0 flex gap-2 border-t bg-white px-5 py-3">
          <button type="button" onClick={onCancelar}
            className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={procesandoFoto || guardando}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Registrar denuncia'}
          </button>
        </footer>
      </form>
    </div>
  )
}
