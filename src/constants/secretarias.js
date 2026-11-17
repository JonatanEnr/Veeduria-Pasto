// Entidades responsables a las que se puede asignar una denuncia.
// Ajusta nombres/colores según la estructura vigente de la Alcaldía.
export const SECRETARIAS = [
  { id: 'infraestructura', nombre: 'Secretaría de Infraestructura y Valorización', corto: 'Infraestructura', color: '#ea580c', ejemplos: 'Huecos, vías, andenes, puentes' },
  { id: 'empopasto', nombre: 'Empopasto (Acueducto y Alcantarillado)', corto: 'Empopasto', color: '#0284c7', ejemplos: 'Fugas, alcantarillas, tapas' },
  { id: 'transito', nombre: 'Secretaría de Tránsito y Transporte', corto: 'Tránsito', color: '#ca8a04', ejemplos: 'Semáforos, señalización, parqueo' },
  { id: 'ambiental', nombre: 'Secretaría de Gestión Ambiental', corto: 'Gestión Ambiental', color: '#16a34a', ejemplos: 'Árboles, quebradas, ruido' },
  { id: 'emas', nombre: 'EMAS Pasto (Aseo)', corto: 'EMAS', color: '#65a30d', ejemplos: 'Basuras, escombros, puntos críticos' },
  { id: 'alumbrado', nombre: 'Alumbrado Público (SEPAL)', corto: 'Alumbrado', color: '#eab308', ejemplos: 'Luminarias dañadas' },
  { id: 'espacio_publico', nombre: 'Dirección de Espacio Público', corto: 'Espacio Público', color: '#9333ea', ejemplos: 'Invasión de andenes, ventas' },
  { id: 'gobierno', nombre: 'Secretaría de Gobierno', corto: 'Gobierno', color: '#475569', ejemplos: 'Convivencia, seguridad' },
  { id: 'riesgo', nombre: 'Gestión del Riesgo de Desastres', corto: 'Gestión del Riesgo', color: '#dc2626', ejemplos: 'Deslizamientos, inundaciones' },
  { id: 'planeacion', nombre: 'Secretaría de Planeación', corto: 'Planeación', color: '#0d9488', ejemplos: 'Construcciones ilegales, POT' },
  { id: 'otra', nombre: 'Otra entidad', corto: 'Otra', color: '#64748b', ejemplos: '' },
]

export const obtenerSecretaria = (id) =>
  SECRETARIAS.find((s) => s.id === id) ?? SECRETARIAS[SECRETARIAS.length - 1]

export const ESTADOS = {
  pendiente: {
    etiqueta: 'Pendiente', clase: 'bg-red-600', texto: 'text-red-700', fondo: 'bg-red-50',
    insignia: 'bg-red-50 text-red-700 ring-red-600/20',
  },
  solucionado: {
    etiqueta: 'Solucionado', clase: 'bg-emerald-600', texto: 'text-emerald-700', fondo: 'bg-emerald-50',
    insignia: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
}

export const MODERACION = {
  revision: { etiqueta: 'Por revisar', clase: 'bg-amber-500', insignia: 'bg-amber-50 text-amber-800 ring-amber-600/30' },
  rechazada: { etiqueta: 'Rechazada', clase: 'bg-slate-400', insignia: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
}
