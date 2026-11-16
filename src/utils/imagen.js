// Redimensiona y comprime la foto de evidencia a JPEG para que
// ocupe poco espacio (las fotos de celular pesan 3-8 MB).
export function comprimirImagen(archivo, maxLado = 1280, calidad = 0.75) {
  return new Promise((resolve, reject) => {
    if (!archivo.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen'))
      return
    }

    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer la imagen'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Imagen inválida'))
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * escala)
        canvas.height = Math.round(img.height * escala)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', calidad))
      }
      img.src = lector.result
    }
    lector.readAsDataURL(archivo)
  })
}
