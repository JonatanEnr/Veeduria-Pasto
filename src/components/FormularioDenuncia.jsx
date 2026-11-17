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

const CONTACTO_VACIO = { nombre: '', celular: '', cargo: '', autoriza: false }

const CARGOS = [
  'Ciudadano / vecino',
  'Presidente de JAC',
  'Miembro de JAC',
  'Edil (JAL)',
  'Líder comunitario',
  'Veedor ciudadano',
  'Comerciante del sector',
  'Docente / directivo',
  'Estudiante',
]

// Celular colombiano: 10 dígitos empezando por 3 (acepta +57, espacios, guiones)
export const normalizarCelular = (t) => {
  let n = t.replace(/\D/g, '')
  if (n.length === 12 && n.startsWith('57')) n = n.slice(2)
  return n
}
const celularValido = (t) => /^3\d{9}$/.test(normalizarCelular(t))

const campo =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'

export default function FormularioDenuncia({ punto, esAdmin, onGuardar, onCancelar }) {
  const [datos, setDatos] = useState(VACIO)
  const [contacto, setContacto] = useState(CONTACTO_VACIO)
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
  const cambiarContacto = (e) => {
    const { name, value, type, checked } = e.target
    setContacto((c) => ({ ...c, [name]: type === 'checkbox' ? checked : value }))
  }

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

    // El ciudadano debe identificarse; el veedor puede omitirlo
    const llenoAlgo = contacto.nombre.trim() || contacto.celular.trim() || contacto.cargo.trim()
    if (!esAdmin || llenoAlgo) {
      if (contacto.nombre.trim().length < 3) er.nombre = 'Escribe tu nombre completo'
      if (!celularValido(contacto.celular)) er.celular = 'Celular de 10 dígitos, ej: 3001234567'
      if (contacto.cargo.trim().length < 2) er.cargo = 'Indica tu cargo o rol'
      if (!contacto.autoriza) er.autoriza = 'Debes autorizar el tratamiento de datos para enviar'
    }
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
        contacto: contacto.nombre.trim()
          ? {
              nombre: contacto.nombre.trim(),
              celular: normalizarCelular(contacto.celular),
              cargo: contacto.cargo.trim(),
              autoriza: contacto.autoriza,
            }
          : null,
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

          <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <legend className="px-1 text-xs font-bold text-slate-700">
              Tus datos {esAdmin ? '(opcional para el veedor)' : '*'}
            </legend>
            <p className="-mt-1 text-[11px] text-slate-500">
              🔒 No se publican. Solo los ve el veedor para verificar y hacer seguimiento.
            </p>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Nombre completo</span>
              <input name="nombre" value={contacto.nombre} onChange={cambiarContacto} maxLength={80}
                autoComplete="name" placeholder="Ej: María Fernanda Rosero" className={campo} />
              {errores.nombre && <span className="text-xs text-red-600">{errores.nombre}</span>}
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Celular</span>
                <input name="celular" value={contacto.celular} onChange={cambiarContacto} type="tel"
                  inputMode="numeric" autoComplete="tel" maxLength={16} placeholder="300 123 4567" className={campo} />
                {errores.celular && <span className="text-xs text-red-600">{errores.celular}</span>}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Cargo o rol</span>
                <input name="cargo" value={contacto.cargo} onChange={cambiarContacto} list="cargos"
                  maxLength={60} placeholder="Ej: Presidente de JAC" className={campo} />
                <datalist id="cargos">
                  {CARGOS.map((c) => <option key={c} value={c} />)}
                </datalist>
                {errores.cargo && <span className="text-xs text-red-600">{errores.cargo}</span>}
              </label>
            </div>
            <label className="flex items-start gap-2 text-[11px] leading-snug text-slate-600">
              <input type="checkbox" name="autoriza" checked={contacto.autoriza} onChange={cambiarContacto}
                className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Autorizo a la Veeduría Ciudadana de Pasto a tratar mis datos personales (nombre, celular y
                cargo) conforme a la Ley 1581 de 2012, únicamente para verificar esta denuncia y contactarme
                sobre su seguimiento. Mis datos no serán publicados ni compartidos.
              </span>
            </label>
            {errores.autoriza && <span className="text-xs text-red-600">{errores.autoriza}</span>}
          </fieldset>

          {!esAdmin && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
              ℹ Tu denuncia será revisada por el veedor antes de aparecer en el mapa.
            </p>
          )}

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
            {guardando ? 'Enviando…' : esAdmin ? 'Registrar denuncia' : 'Enviar para revisión'}
          </button>
        </footer>
      </form>
    </div>
  )
}
