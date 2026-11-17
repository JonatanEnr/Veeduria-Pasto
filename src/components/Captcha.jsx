import { useEffect, useRef } from 'react'

// Cloudflare Turnstile ("no soy un robot", casi siempre invisible).
// Solo se muestra si VITE_TURNSTILE_SITE_KEY está configurada.
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let cargaScript = null

function cargarTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!cargaScript) {
    cargaScript = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SCRIPT
      s.async = true
      s.onload = () => resolve(window.turnstile)
      s.onerror = () => { cargaScript = null; reject(new Error('No se pudo cargar el captcha')) }
      document.head.appendChild(s)
    })
  }
  return cargaScript
}

export default function Captcha({ siteKey, onToken }) {
  const caja = useRef(null)
  const alToken = useRef(onToken)
  alToken.current = onToken

  useEffect(() => {
    let id = null
    let activo = true
    cargarTurnstile()
      .then((ts) => {
        if (!activo || !caja.current) return
        id = ts.render(caja.current, {
          sitekey: siteKey,
          language: 'es',
          theme: 'light',
          callback: (t) => alToken.current(t),
          'expired-callback': () => alToken.current(null),
          'error-callback': () => alToken.current(null),
        })
      })
      .catch(() => alToken.current(null))
    return () => {
      activo = false
      if (id != null && window.turnstile) window.turnstile.remove(id)
    }
  }, [siteKey])

  return <div ref={caja} className="min-h-[65px]" />
}
