// Los 19 corregimientos del municipio de Pasto.
//   17 tradicionales + Anganoy (n.º 18) + Los Casanares (n.º 19, aprobado por el Concejo
//   el 17-jul-2026, formalizado en oct-2026, funciona desde el 1-ene-2027; se separó de Catambuco).
//   «El Rosario» NO es corregimiento: es una vereda de Jamondino.
//
// OpenStreetMap no tiene los LÍMITES de los corregimientos. Cada denuncia rural se asigna
// al corregimiento con el punto de referencia más cercano: su cabecera (lat/lng, donde se
// dibuja la etiqueta) y, si se conocen, algunas de sus veredas (`referencias`).
// Si consigues los límites oficiales del POT (shapefile/GeoJSON), se pueden reemplazar.
//
// Coordenadas: OpenStreetMap / Nominatim. `aproximado: true` = cabecera no confirmada en el mapa.
export const CORREGIMIENTOS = [
  { id: 'anganoy', nombre: 'Anganoy', lat: 1.2139, lng: -77.3029 },
  { id: 'buesaquillo', nombre: 'Buesaquillo', lat: 1.2091, lng: -77.2416 },
  { id: 'cabrera', nombre: 'Cabrera', lat: 1.2151, lng: -77.2146 },
  { id: 'catambuco', nombre: 'Catambuco', lat: 1.1664, lng: -77.2993, referencias: [[1.1652, -77.2884]] }, // Botanilla
  { id: 'el-encano', nombre: 'El Encano', lat: 1.1627, lng: -77.1563, referencias: [[1.1409, -77.1538], [1.1176, -77.1727], [1.0918, -77.1676]] }, // El Puerto, Motilón, El Romerillo
  { id: 'el-socorro', nombre: 'El Socorro', lat: 1.1827, lng: -77.148, aproximado: true, referencias: [[1.1611, -77.1463]] }, // vereda San Gabriel
  { id: 'genoy', nombre: 'Genoy', lat: 1.2691, lng: -77.3358, referencias: [[1.2601, -77.3314]] }, // Charguayaco
  { id: 'gualmatan', nombre: 'Gualmatán', lat: 1.1718, lng: -77.318 },
  { id: 'jamondino', nombre: 'Jamondino', lat: 1.1837, lng: -77.2606, referencias: [[1.1814, -77.2713]] }, // El Rosario (vereda)
  { id: 'jongovito', nombre: 'Jongovito', lat: 1.1878, lng: -77.2949 },
  { id: 'la-caldera', nombre: 'La Caldera', lat: 1.3319, lng: -77.3327, aproximado: true },
  { id: 'la-laguna', nombre: 'La Laguna', lat: 1.2042, lng: -77.2096 },
  { id: 'los-casanares', nombre: 'Los Casanares', lat: 1.1105, lng: -77.2576, referencias: [[1.1347, -77.2615], [1.1409, -77.264]] }, // cabecera Bellavista; vereda El Campanero
  { id: 'mapachico', nombre: 'Mapachico', lat: 1.2377, lng: -77.3181, referencias: [[1.2415, -77.3207], [1.2525, -77.3234]] }, // Aticance, Villa María
  { id: 'mocondino', nombre: 'Mocondino', lat: 1.1939, lng: -77.2496, referencias: [[1.1938, -77.2405]] }, // Dolores
  { id: 'morasurco', nombre: 'Morasurco', lat: 1.2664, lng: -77.2769, referencias: [[1.2366, -77.2768]] }, // cabecera Daza; Tescual
  { id: 'obonuco', nombre: 'Obonuco', lat: 1.1904, lng: -77.3065 },
  { id: 'san-fernando', nombre: 'San Fernando', lat: 1.2024, lng: -77.2251 },
  { id: 'santa-barbara', nombre: 'Santa Bárbara', lat: 1.0730, lng: -77.2820, aproximado: true, referencias: [[1.1006, -77.2729], [1.0454, -77.2911]] }, // veredas Jurado y Cerotal
]

// Todos los puntos de referencia de un corregimiento (cabecera + veredas)
export const puntosDe = (c) => [[c.lat, c.lng], ...(c.referencias ?? [])]
