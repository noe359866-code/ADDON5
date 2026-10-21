# Subtítulos Plus

Addon **exclusivamente de subtítulos** para películas, series y anime en Stremio.
El servicio principal publica `resources: ["subtitles"]`, sin catálogos ni streams.
El anime se recibe como película o serie con IDs IMDb, Kitsu, MAL o AniDB.

## Iniciar

Requiere Node.js 22 o superior.

```bash
npm install
npm start
```

La instalación en la raíz prepara las dependencias de `subtitles-addon/`.
El servidor usa `PORT` o, en local, `7000`. Instala en Stremio la URL pública
`https://TU-SERVICIO.onrender.com/manifest.json`.

## Render

El Blueprint `render.yaml` despliega únicamente `addon5-subtitles`.
Si tu servicio existente usa la raíz del repositorio, configura:

- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Health Check Path:** `/health`

También puedes desplegar con Root Directory `subtitles-addon`, Build Command
`npm ci --omit=dev` y Start Command `npm start`.
Define `SUBTITLE_TOKEN_SECRET` con un secreto estable de al menos 32 caracteres.
En Render se detecta automáticamente la URL pública con `RENDER_EXTERNAL_URL`;
en otros alojamientos configura `PUBLIC_BASE_URL`.

## Si no aparecen subtítulos

1. Comprueba `/manifest.json`: debe llamarse **Subtítulos Plus** y declarar
   `resources: ["subtitles"]` y el identificador `org.addon5.subtitles`.
2. Instala el manifest del servicio de subtítulos en Stremio.
3. Inicia un video con otro addon de reproducción y abre el **selector de
   subtítulos del reproductor**. Este addon no ofrece películas para reproducir
   ni muestra fuentes de video al tocar una portada.
4. Abre `/health` para comprobar que el servicio está despierto. En Render Free
   el primer arranque puede tardar y Stremio puede abandonar esa petición;
   vuelve a abrir el video cuando el servicio responda.
5. Consulta `/selftest?id=tt0111161&type=movie` (o tu ID real) para ver resultados
   por proveedor. No hay garantía de subtítulos para todos los títulos: pueden
   faltar en las fuentes o estar bloqueadas. Las claves `SUBDL_API_KEY` y
   `SUBSOURCE_API_KEY` habilitan APIs de respaldo.

Más detalles de proveedores, idiomas y diagnóstico en
[`subtitles-addon/README.md`](subtitles-addon/README.md).

## Configuración de idiomas por persona

Abre `https://TU-SERVICIO.onrender.com/configure` (también disponible en la
página de inicio). Marca entre 1 y 8 idiomas y activa **Mostrar solo los idiomas
elegidos** si quieres ocultar el resto. Si lo dejas desactivado, los idiomas
seleccionados tendrán prioridad. Para cambiar la prioridad, desmarca y vuelve a
marcar un idioma: se añade al final de la lista.

Pulsa **Instalar en Stremio** o copia el enlace generado. La selección queda en
esa URL de instalación, no en las preferencias globales del servidor. Si ya
instalaste otra configuración, desinstala esa instalación antes de añadir la
nueva. El botón de configuración de Stremio abre la selección existente.

Las búsquedas y la caché se separan por idiomas y modo de filtrado. Los códigos
regionales de español se agrupan como español; no se garantiza distinguir
español latino de España. Elegir un idioma no garantiza resultados: depende de
los subtítulos disponibles en cada proveedor.
