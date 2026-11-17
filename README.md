# Mapa de Denuncias · Veeduría San Juan de Pasto

Aplicación web para registrar y hacer seguimiento a denuncias ciudadanas sobre el mapa real de Pasto (OpenStreetMap), centrado en `1.2136, -77.2811`.

## Stack
- **Vite 6** + **React 18**
- **Tailwind CSS 4** (plugin `@tailwindcss/vite`)
- **Leaflet 1.9** + **react-leaflet 4** con teselas de OpenStreetMap
- Geocodificación inversa con **Nominatim** (nombre real de la calle y barrio al hacer clic)

## Uso
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera /dist para publicar
```

## Funcionalidades
- Clic sobre cualquier calle → formulario con dirección y barrio autocompletados.
- Asignación de secretaría/entidad responsable (Infraestructura, Empopasto, Tránsito, Gestión Ambiental, EMAS, etc.).
- Foto de evidencia (se comprime automáticamente a ~1280 px) y link de YouTube (con miniatura).
- Estado **Pendiente (rojo)** / **Solucionado (verde)**, cambiable desde el popup del marcador.
- Panel lateral con contadores, búsqueda y filtros por estado y entidad.
- Exportación de todas las denuncias a JSON.
- Sincronización con **Obsidian**: una nota por denuncia (ver abajo).

## Obsidian

```bash
npm run obsidian     # o doble clic en "Sincronizar Obsidian.cmd"
```

Trae las denuncias de Supabase a la bóveda (por defecto `../Mapa Denuncias Pasto/Denuncia`; se cambia con `OBSIDIAN_CARPETA_DENUNCIAS` en `.env.local`):

- Una nota `.md` por denuncia con propiedades filtrables: `estado`, `secretaria`, `barrio`, `fecha`, `location`, `tags` (`#pendiente`, `#solucionado`, `#secretaria/empopasto`…).
- La foto se descarga a `Denuncia/adjuntos/` y el video de YouTube queda incrustado.
- Todo lo que escribas debajo de `## Mis notas` se conserva en cada sincronización.
- Si una denuncia se elimina del mapa, su nota no se borra: queda con `en_mapa: false`.
- `Denuncias.base` (Obsidian 1.9+): tablas de Pendientes / Solucionadas / Todas. Se crea una sola vez; puedes personalizarla.

Es de una sola vía (mapa → Obsidian): cambiar el estado en la nota no cambia el mapa.

## Estructura
```
src/
├── App.jsx                     # Orquesta mapa, panel y formulario
├── main.jsx
├── index.css                   # Tailwind + estilos de Leaflet/marcadores
├── constants/
│   ├── mapa.js                 # Centro, zoom, límites y capa OSM
│   └── secretarias.js          # Entidades responsables y estados
├── components/
│   ├── Encabezado.jsx
│   ├── MapaPasto.jsx           # MapContainer, clics y marcadores
│   ├── DetalleDenuncia.jsx     # Contenido del popup
│   ├── FormularioDenuncia.jsx  # Registro de denuncia
│   └── PanelDenuncias.jsx      # Lista, contadores y filtros
├── hooks/useDenuncias.js       # Estado + CRUD
├── services/
│   ├── almacenamiento.js       # Persistencia (localStorage por ahora)
│   └── geocodificacion.js      # Nominatim
└── utils/
    ├── imagen.js               # Compresión de fotos
    └── youtube.js              # Parseo de enlaces de YouTube
```

## Base de datos en la nube (Supabase, plan gratuito)

Sin variables de entorno la app funciona en **modo local** (localStorage). Con ellas, guarda todo en Supabase.

**Permisos**
| Acción | Público | Veedor (con sesión) |
|---|---|---|
| Ver denuncias y fotos | ✅ | ✅ |
| Registrar denuncia (entra como *Pendiente*) | ✅ | ✅ |
| Cambiar estado / eliminar | ❌ | ✅ |

La base de datos aplica estas reglas (RLS en `supabase/esquema.sql`), no solo la interfaz.

**Pasos**
1. Crea un proyecto en https://supabase.com (región sugerida: *East US* o *São Paulo*).
2. **SQL Editor → New query**: pega el contenido de `supabase/esquema.sql` → **Run**.
3. **Authentication → Users → Add user → Create new user**: tu correo y contraseña (marca *Auto Confirm User*).
4. En el SQL Editor, vuélvete administrador:
   ```sql
   insert into public.administradores (user_id)
   select id from auth.users where email = 'TU_CORREO@ejemplo.com';
   ```
5. *(Recomendado)* **Authentication → Sign In / Providers → Email**: desactiva *Allow new users to sign up*.
6. **Project Settings → API** (o el botón *Connect*): copia *Project URL* y la clave *anon / publishable* en `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   ⚠ Nunca uses la clave `service_role` / `secret` en este proyecto.
7. Reinicia `npm run dev`. El encabezado mostrará **☁ En la nube**.

> El plan gratuito pausa el proyecto tras ~7 días **sin actividad**; se reactiva desde el panel de Supabase.

## Publicar gratis

El código debe estar en un repositorio de GitHub (el `.env.local` **no** se sube; está en `.gitignore`).

**Vercel**: *Add New → Project* → importa el repositorio → *Framework: Vite* (autodetectado) → en *Environment Variables* agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` → *Deploy*.

**Netlify**: *Add new site → Import an existing project* → elige el repositorio (usa `netlify.toml`) → *Site configuration → Environment variables* → agrega las dos variables → *Deploy*.

Tras publicar, agrega la URL del sitio en Supabase → **Authentication → URL Configuration → Site URL**.

Si cambias una variable de entorno en Vercel/Netlify, hay que **volver a desplegar** (Vite las incrusta al compilar).
