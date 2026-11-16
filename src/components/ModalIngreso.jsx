import { useState } from 'react'

export default function ModalIngreso({ onIngresar, onCerrar }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      await onIngresar(email.trim(), password)
      onCerrar()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const campo = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={enviar} className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Ingreso de veedor</h2>
          <button type="button" onClick={onCerrar} className="text-2xl leading-none text-slate-400 hover:text-slate-700">×</button>
        </div>
        <p className="text-xs text-slate-500">Solo los veedores pueden cambiar el estado o eliminar denuncias.</p>
        <input type="email" required autoComplete="email" placeholder="Correo"
          value={email} onChange={(e) => setEmail(e.target.value)} className={campo} />
        <input type="password" required autoComplete="current-password" placeholder="Contraseña"
          value={password} onChange={(e) => setPassword(e.target.value)} className={campo} />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button type="submit" disabled={enviando}
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
