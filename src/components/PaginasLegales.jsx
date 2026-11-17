import { useEffect } from 'react'
import Icono from './Iconos'
import { ORGANIZACION as O, MOSTRAR_POLITICA, pendiente } from '../constants/organizacion'

function Politica() {
  return (
    <>
      <p className="text-xs text-slate-500">Última actualización: {O.politicaActualizada}</p>

      <h3>1. Responsable del tratamiento</h3>
      <p>
        <strong>{pendiente(O.responsable)}</strong>{O.documento ? `, identificado con ${O.documento}` : ''}, en nombre de
        la {O.nombre}, con domicilio en {O.ciudad}. Correo de contacto: <strong>{pendiente(O.correo)}</strong>.
      </p>

      <h3>2. Datos que recogemos</h3>
      <p>
        Cuando una persona decide registrar una denuncia <em>con sus datos</em>, recogemos su <strong>nombre, número de
        celular y cargo o rol</strong>. Las denuncias también pueden enviarse de forma <strong>anónima</strong>, sin
        ningún dato personal. Además se guarda la ubicación del problema, la descripción, la foto y el enlace al video que
        la persona aporte voluntariamente.
      </p>

      <h3>3. Finalidad</h3>
      <ul>
        <li>Verificar la veracidad de la denuncia antes de publicarla.</li>
        <li>Contactar a la persona para ampliar información o informarle sobre el avance de su denuncia.</li>
        <li>Hacer seguimiento ciudadano ante las entidades públicas responsables.</li>
      </ul>
      <p>
        Los datos personales <strong>no se publican, no se venden y no se comparten</strong> con terceros, salvo requerimiento
        de autoridad competente. Solo los conocen los veedores autorizados.
      </p>

      <h3>4. Qué sí es público</h3>
      <p>
        Una vez aprobada, la denuncia (título, descripción, ubicación, entidad responsable, foto y video) se muestra en el
        mapa. Evita incluir en esos campos datos personales tuyos o de terceros, rostros o placas de vehículos.
      </p>

      <h3>5. Tus derechos</h3>
      <p>
        Conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013, puedes <strong>conocer, actualizar, rectificar y solicitar
        la supresión</strong> de tus datos, revocar la autorización y presentar quejas ante la Superintendencia de Industria y
        Comercio. Para ejercerlos escribe a <strong>{pendiente(O.correo)}</strong> indicando tu nombre y la denuncia
        relacionada. Responderemos en los plazos de ley (10 días hábiles para consultas y 15 para reclamos).
      </p>

      <h3>6. Seguridad y conservación</h3>
      <p>
        Los datos se almacenan cifrados en tránsito, en una base de datos con control de acceso, separada de la información
        pública. Se conservan mientras la denuncia esté activa y hasta por dos años después de solucionada, salvo que
        solicites antes su supresión.
      </p>
    </>
  )
}

function Criterios() {
  return (
    <>
      <p>
        Todas las denuncias del público pasan por <strong>revisión</strong> antes de aparecer en el mapa. Esto evita
        información falsa o dañina, no censurar críticas. Se publican las denuncias que cumplen estos criterios:
      </p>
      <h3>Se aprueban</h3>
      <ul>
        <li>Problemas de interés colectivo en el municipio de Pasto: vías, servicios públicos, espacio público, ambiente, seguridad, riesgo, etc.</li>
        <li>Descritas de forma respetuosa, aunque sean críticas con la administración.</li>
        <li>Con ubicación razonable en el mapa.</li>
      </ul>
      <h3>Se rechazan</h3>
      <ul>
        <li>Insultos, amenazas, discriminación o lenguaje ofensivo.</li>
        <li>Datos personales de terceros (nombres, teléfonos, rostros identificables o placas) en la parte pública.</li>
        <li>Conflictos privados entre particulares sin interés público.</li>
        <li>Publicidad, propaganda política o contenido sin relación.</li>
        <li>Denuncias duplicadas: en ese caso te invitamos a apoyar la existente con «Yo también lo veo».</li>
        <li>Ubicaciones fuera de Pasto o claramente falsas.</li>
      </ul>
      <h3>Cambios de estado</h3>
      <p>
        Una denuncia se marca como <strong>solucionada</strong> cuando el veedor verifica la solución, preferiblemente con
        una foto del «después». Si el problema reaparece, se reabre.
      </p>
    </>
  )
}

const PAGINAS = {
  ...(MOSTRAR_POLITICA ? { privacidad: { titulo: 'Política de tratamiento de datos', Contenido: Politica } } : {}),
  criterios: { titulo: 'Criterios de moderación', Contenido: Criterios },
}

export const paginaLegalDisponible = (p) => p in PAGINAS

export default function PaginasLegales({ pagina, onCambiar, onCerrar }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])

  const { titulo, Contenido } = PAGINAS[pagina] ?? PAGINAS.criterios
  const variasPaginas = Object.keys(PAGINAS).length > 1

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onCerrar}>
      <div onClick={(e) => e.stopPropagation()}
        className="animar-subir flex h-[100dvh] w-full flex-col bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl">
        <header className="shrink-0 border-b border-slate-200 px-4 pt-3 sm:px-6 sm:pt-4" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <div className="flex items-start gap-3">
            <h2 className="flex-1 text-lg font-bold tracking-tight text-slate-900">{titulo}</h2>
            <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <Icono nombre="x" className="h-5 w-5" />
            </button>
          </div>
          {!variasPaginas && <div className="h-3" />}
          {variasPaginas && <nav className="mt-2 flex gap-4 text-sm font-semibold">
            {Object.entries(PAGINAS).map(([id, p]) => (
              <button key={id} type="button" onClick={() => onCambiar(id)}
                className={`border-b-2 pb-2 ${pagina === id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                {id === 'privacidad' ? 'Datos personales' : 'Moderación'}
              </button>
            ))}
          </nav>}
        </header>
        <div className="desplazable flex-1 overflow-y-auto px-4 py-5 text-sm leading-relaxed text-slate-700 sm:px-6
          [&_h3]:mb-1.5 [&_h3]:mt-5 [&_h3]:font-bold [&_h3]:text-slate-900 [&_li]:mb-1 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5">
          <Contenido />
        </div>
      </div>
    </div>
  )
}
