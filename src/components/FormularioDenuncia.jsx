import { useEffect, useMemo, useState } from 'react'
import Icono from './Iconos'
import Captcha from './Captcha'
import { SECRETARIAS, obtenerSecretaria } from '../constants/secretarias'
import { CAPTCHA_SITE_KEY } from '../services/almacenamiento'
import { distanciaMetros } from '../utils/geo'
import { diasDenuncia, textoDias } from '../utils/fechas'
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
const normalizarCelular = (t) => {
  let n = t.replace(/\D/g, '')
  if (n.length === 12 && n.startsWith('57')) n = n.slice(2)
  return n
}
const celularValido = (t) => /^3\d{9}$/.test(normalizarCelular(t))

const campo =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10'
const campoError = 'border-red-400 focus:border-red-500 focus:ring-red-500/10'

function Seccion({ numero, titulo, descripcion, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
          {numero}
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{titulo}</h3>
          {descripcion && <p className="text-xs text-slate-500">{descripcion}</p>}
        </div>
      </div>
      <div className="space-y-3 sm:pl-7">{children}</div>
    </section>
  )
}

function Campo({ etiqueta, error, ayuda, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">{etiqueta}</span>
      {children}
      {error ? (
        <span className="mt-1 flex items-center gap-1 text-xs text-red-600"><Icono nombre="alerta" className="h-3.5 w-3.5" />{error}</span>
      ) : ayuda ? (
        <span className="mt-1 block text-xs text-slate-500">{ayuda}</span>
      ) : null}
    </label>
  )
}

const RADIO_DUPLICADOS = 60 // metros

export default function FormularioDenuncia({
  punto, esAdmin, publicadas = [], onGuardar, onCancelar, onVerExistente, onLegal,
}) {
  const [datos, setDatos] = useState(VACIO)
  const [tokenCaptcha, setTokenCaptcha] = useState(null)
  const usaCaptcha = Boolean(CAPTCHA_SITE_KEY) && !esAdmin

  // Denuncias pendientes muy cerca: probablemente el mismo problema
  const cercanas = useMemo(() => publicadas
    .filter((d) => d.estado === 'pendiente')
    .map((d) => ({ d, m: distanciaMetros(punto, d) }))
    .filter(({ m }) => m <= RADIO_DUPLICADOS)
    .sort((a, b) => a.m - b.m)
    .slice(0, 3), [publicadas, punto])
  const [modo, setModo] = useState(esAdmin ? 'anonima' : 'datos') // 'datos' | 'anonima'
  const [contacto, setContacto] = useState(CONTACTO_VACIO)
  const [buscandoDireccion, setBuscandoDireccion] = useState(true)
  const [procesandoFoto, setProcesandoFoto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errores, setErrores] = useState({})

  // Al tocar una calle, se busca su nombre real en OpenStreetMap
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

  // Cerrar con Escape
  useEffect(() => {
    const alPresionar = (e) => { if (e.key === 'Escape' && !guardando) onCancelar() }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [guardando, onCancelar])

  const cambiar = (e) => setDatos((d) => ({ ...d, [e.target.name]: e.target.value }))
  const cambiarContacto = (e) => {
    const { name, value, type, checked } = e.target
    setContacto((c) => ({ ...c, [name]: type === 'checkbox' ? checked : value }))
  }

  const cambiarFoto = async (e) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
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
    if (modo === 'datos') {
      if (contacto.nombre.trim().length < 3) er.nombre = 'Escribe tu nombre completo'
      if (!celularValido(contacto.celular)) er.celular = '10 dígitos, ej: 300 123 4567'
      if (contacto.cargo.trim().length < 2) er.cargo = 'Indica tu cargo o rol'
      if (!contacto.autoriza) er.autoriza = 'Debes autorizar el tratamiento de datos'
    }
    if (usaCaptcha && !tokenCaptcha) er.captcha = 'Completa la verificación «No soy un robot»'
    setErrores(er)
    return Object.keys(er).length === 0
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (guardando) return
    if (!validar()) {
      requestAnimationFrame(() => document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      return
    }
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
        contacto: modo === 'datos'
          ? {
              nombre: contacto.nombre.trim(),
              celular: normalizarCelular(contacto.celular),
              cargo: contacto.cargo.trim(),
              autoriza: contacto.autoriza,
            }
          : null,
      }, tokenCaptcha)
    } catch (err) {
      setErrores({ general: err.message })
      setGuardando(false)
    }
  }

  const err = (k) => (errores[k] ? { 'data-error': 'true' } : {})

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4">
      <form
        onSubmit={enviar}
        noValidate
        className="animar-subir flex h-[100dvh] w-full flex-col bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Nueva denuncia</h2>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
              <Icono nombre="pin" className="h-3.5 w-3.5 shrink-0" />
              {buscandoDireccion ? 'Buscando la dirección…' : datos.direccion || `${punto.lat.toFixed(5)}, ${punto.lng.toFixed(5)}`}
            </p>
          </div>
          <button type="button" onClick={onCancelar} aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Icono nombre="x" className="h-5 w-5" />
          </button>
        </header>

        <div className="desplazable flex-1 space-y-7 overflow-y-auto px-4 py-5 sm:px-6">
          <Seccion numero="1" titulo="Ubicación" descripcion="La detectamos del mapa; corrígela si hace falta.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Calle o dirección">
                <input name="direccion" value={datos.direccion} onChange={cambiar} maxLength={200}
                  placeholder={buscandoDireccion ? 'Buscando…' : 'Ej: Calle 18 # 25-30'} className={campo} />
              </Campo>
              <Campo etiqueta="Barrio o sector">
                <input name="barrio" value={datos.barrio} onChange={cambiar} maxLength={120}
                  placeholder={buscandoDireccion ? 'Buscando…' : 'Ej: Las Cuadras'} className={campo} />
              </Campo>
            </div>
          </Seccion>

          {cercanas.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
                <Icono nombre="info" /> ¿Es alguno de estos? Ya fueron reportados muy cerca
              </p>
              <p className="mb-2 text-xs text-amber-800">
                Si es el mismo problema, apóyalo con «Yo también lo veo»: una denuncia con muchos vecinos pesa más.
              </p>
              <ul className="space-y-1.5">
                {cercanas.map(({ d, m }) => (
                  <li key={d.id}>
                    <button type="button" onClick={() => onVerExistente(d)}
                      className="flex w-full items-center gap-2.5 rounded-lg bg-white p-2 text-left ring-1 ring-amber-200 hover:ring-amber-400">
                      {d.foto
                        ? <img src={d.foto} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                        : <span className="h-10 w-10 shrink-0 rounded-md bg-slate-100" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">{d.titulo}</span>
                        <span className="block truncate text-xs text-slate-500">
                          a {Math.round(m)} m · {obtenerSecretaria(d.secretaria).corto} · {textoDias(diasDenuncia(d))} sin solución
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-slate-700">Ver ›</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Seccion numero="2" titulo="¿Qué está pasando?">
            <div {...err('titulo')}>
              <Campo etiqueta="Título" error={errores.titulo}>
                <input name="titulo" value={datos.titulo} onChange={cambiar} maxLength={100}
                  placeholder="Ej: Hueco profundo frente al colegio" className={`${campo} ${errores.titulo ? campoError : ''}`} />
              </Campo>
            </div>
            <Campo etiqueta="Descripción" ayuda={`${datos.descripcion.length}/2000 · ¿Desde cuándo? ¿A quién afecta?`}>
              <textarea name="descripcion" value={datos.descripcion} onChange={cambiar} rows={3} maxLength={2000}
                placeholder="Describe el problema con el mayor detalle posible" className={`${campo} resize-y`} />
            </Campo>
            <div {...err('secretaria')}>
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">Entidad responsable</span>
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2" role="radiogroup">
                {SECRETARIAS.map((s) => {
                  const activa = datos.secretaria === s.id
                  return (
                    <button key={s.id} type="button" role="radio" aria-checked={activa}
                      onClick={() => { setDatos((d) => ({ ...d, secretaria: s.id })); setErrores((e) => ({ ...e, secretaria: undefined })) }}
                      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition ${
                        activa ? 'border-slate-900 bg-slate-900/[0.03] ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-300'
                      }`}>
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900">{s.corto}</span>
                        {s.ejemplos && <span className="block truncate text-[11px] text-slate-500">{s.ejemplos}</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
              {errores.secretaria && (
                <span className="mt-1 flex items-center gap-1 text-xs text-red-600"><Icono nombre="alerta" className="h-3.5 w-3.5" />{errores.secretaria}</span>
              )}
            </div>
          </Seccion>

          <Seccion numero="3" titulo="Evidencia" descripcion="Opcional, pero ayuda mucho a verificar la denuncia.">
            {datos.foto ? (
              <div className="relative overflow-hidden rounded-xl ring-1 ring-slate-200">
                <img src={datos.foto} alt="Vista previa de la evidencia" className="max-h-64 w-full object-cover" />
                <div className="absolute right-2 top-2 flex gap-1.5">
                  <label className="cursor-pointer rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow hover:bg-white">
                    Cambiar
                    <input type="file" accept="image/*" onChange={cambiarFoto} className="sr-only" />
                  </label>
                  <button type="button" onClick={() => setDatos((d) => ({ ...d, foto: null }))} aria-label="Quitar foto"
                    className="rounded-lg bg-white/95 p-1.5 text-slate-800 shadow hover:bg-white">
                    <Icono nombre="x" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center transition hover:border-slate-400 hover:bg-slate-50">
                <input type="file" accept="image/*" capture="environment" onChange={cambiarFoto} className="sr-only" />
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Icono nombre="camara" className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-slate-800">{procesandoFoto ? 'Procesando foto…' : 'Tomar o subir una foto'}</span>
                <span className="text-xs text-slate-500">JPG o PNG · se optimiza automáticamente</span>
              </label>
            )}
            {errores.foto && <span className="text-xs text-red-600">{errores.foto}</span>}

            <div {...err('youtube')}>
              <Campo etiqueta="Video en YouTube" error={errores.youtube}>
                <div className="relative">
                  <Icono nombre="video" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input name="youtube" value={datos.youtube} onChange={cambiar} type="url" inputMode="url"
                    placeholder="https://youtu.be/…" className={`${campo} pl-9 ${errores.youtube ? campoError : ''}`} />
                </div>
              </Campo>
            </div>
          </Seccion>

          <Seccion numero="4" titulo="Identificación" descripcion="Tú decides si dejas tus datos.">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm font-semibold" role="radiogroup">
              {[
                { id: 'datos', etiqueta: 'Con mis datos', icono: 'usuario' },
                { id: 'anonima', etiqueta: 'Anónima', icono: 'oculto' },
              ].map((o) => (
                <button key={o.id} type="button" role="radio" aria-checked={modo === o.id} onClick={() => setModo(o.id)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 transition ${
                    modo === o.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}>
                  <Icono nombre={o.icono} /> {o.etiqueta}
                </button>
              ))}
            </div>

            {modo === 'datos' ? (
              <div className="space-y-3">
                <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  <Icono nombre="candado" className="mt-px h-3.5 w-3.5 shrink-0" />
                  Tus datos <strong className="font-semibold">no se publican</strong>. Solo los ve el veedor para verificar
                  la denuncia y contarte cómo avanza.
                </p>
                <div {...err('nombre')}>
                  <Campo etiqueta="Nombre completo" error={errores.nombre}>
                    <input name="nombre" value={contacto.nombre} onChange={cambiarContacto} maxLength={80} autoComplete="name"
                      placeholder="Ej: María Fernanda Rosero" className={`${campo} ${errores.nombre ? campoError : ''}`} />
                  </Campo>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div {...err('celular')}>
                    <Campo etiqueta="Celular" error={errores.celular}>
                      <input name="celular" value={contacto.celular} onChange={cambiarContacto} type="tel" inputMode="numeric"
                        autoComplete="tel" maxLength={16} placeholder="300 123 4567" className={`${campo} ${errores.celular ? campoError : ''}`} />
                    </Campo>
                  </div>
                  <div {...err('cargo')}>
                    <Campo etiqueta="Cargo o rol" error={errores.cargo}>
                      <input name="cargo" value={contacto.cargo} onChange={cambiarContacto} list="cargos" maxLength={60}
                        placeholder="Ej: Presidente de JAC" className={`${campo} ${errores.cargo ? campoError : ''}`} />
                      <datalist id="cargos">{CARGOS.map((c) => <option key={c} value={c} />)}</datalist>
                    </Campo>
                  </div>
                </div>
                <label {...err('autoriza')} className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs leading-relaxed text-slate-600 ${
                  errores.autoriza ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}>
                  <input type="checkbox" name="autoriza" checked={contacto.autoriza} onChange={cambiarContacto}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-slate-900" />
                  <span>
                    Autorizo a la Veeduría Ciudadana de Pasto a tratar mis datos personales (nombre, celular y cargo)
                    conforme a la <strong className="font-semibold text-slate-800">Ley 1581 de 2012</strong>, únicamente para
                    verificar esta denuncia y contactarme sobre su seguimiento. No serán publicados ni compartidos.{' '}
                    <button type="button" onClick={() => onLegal('privacidad')} className="font-semibold text-slate-900 underline">
                      Leer la política
                    </button>
                  </span>
                </label>
              </div>
            ) : (
              <p className="flex items-start gap-2 rounded-lg bg-slate-100 px-3 py-2.5 text-xs leading-relaxed text-slate-700">
                <Icono nombre="info" className="mt-px h-3.5 w-3.5 shrink-0" />
                Se enviará sin ningún dato tuyo. Ten en cuenta que el veedor no podrá contactarte para pedir más
                detalles, así que describe el problema lo mejor posible.
              </p>
            )}
          </Seccion>

          {esAdmin && (
            <Seccion numero="5" titulo="Estado inicial" descripcion="Como veedor, tu denuncia se publica de inmediato.">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: 'pendiente', t: 'Pendiente', on: 'border-red-600 bg-red-50 text-red-700 ring-1 ring-red-600', dot: 'bg-red-600' },
                  { v: 'solucionado', t: 'Solucionado', on: 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600', dot: 'bg-emerald-600' },
                ].map((o) => (
                  <button key={o.v} type="button" onClick={() => setDatos((d) => ({ ...d, estado: o.v }))}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold ${
                      datos.estado === o.v ? o.on : 'border-slate-200 text-slate-500'
                    }`}>
                    <span className={`h-2 w-2 rounded-full ${o.dot}`} /> {o.t}
                  </button>
                ))}
              </div>
            </Seccion>
          )}

          {usaCaptcha && (
            <div {...err('captcha')}>
              <Captcha siteKey={CAPTCHA_SITE_KEY} onToken={(t) => { setTokenCaptcha(t); if (t) setErrores((e) => ({ ...e, captcha: undefined })) }} />
              {errores.captcha && <span className="text-xs text-red-600">{errores.captcha}</span>}
            </div>
          )}

          {errores.general && (
            <p data-error="true" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <Icono nombre="alerta" className="mt-0.5 shrink-0" /> {errores.general}
            </p>
          )}
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          {!esAdmin && (
            <p className="mb-2.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Icono nombre="escudo" className="h-3.5 w-3.5 shrink-0" />
              El veedor revisará tu denuncia antes de publicarla en el mapa.
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onCancelar}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={procesandoFoto || guardando}
              className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {guardando ? 'Enviando…' : esAdmin ? 'Publicar denuncia' : 'Enviar denuncia'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
