// Datos del responsable del tratamiento de datos (Ley 1581 de 2012).
// ⚠ COMPLETA "responsable" y "correo" antes de promocionar la app:
//    aparecen en la Política de tratamiento de datos.
export const ORGANIZACION = {
  nombre: 'Veeduría Ciudadana de Pasto',
  responsable: '', // Nombre de la persona o entidad responsable del tratamiento
  documento: '', // Opcional: C.C. o NIT del responsable
  correo: '', // Correo para consultas, rectificación o supresión de datos
  ciudad: 'San Juan de Pasto, Nariño, Colombia',
  politicaActualizada: '16 de noviembre de 2026',
}

export const pendiente = (valor, texto = '[pendiente de completar]') => valor?.trim() || texto
