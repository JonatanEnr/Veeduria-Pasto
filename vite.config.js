import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, open: true },
  build: {
    rollupOptions: {
      output: {
        // Librerías en archivos aparte: el navegador las guarda en caché entre versiones.
        // leaflet-global va con el mapa para que `window.L` exista antes de los plugins.
        manualChunks(id) {
          if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) return 'supabase'
          if (/[\\/]node_modules[\\/](leaflet|leaflet\.markercluster|leaflet\.heat|react-leaflet|@react-leaflet)[\\/]/.test(id) ||
              /leaflet-global\.js$/.test(id)) return 'mapa'
        },
      },
    },
  },
})
