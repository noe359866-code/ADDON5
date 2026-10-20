# ADDON5 HLS

Addon independiente de Stremio con catálogo de películas y series y reproducción exclusiva de listas HLS autorizadas. El servidor está preparado para Render y Node.js 22 o superior.

## Funciones

- Protocolo Stremio: manifest, catálogo, metadatos y streams.
- Catálogos de películas y series con búsqueda y paginación.
- Solo acepta fuentes HTTPS cuya ruta termine en `.m3u8` y cuyo hostname esté permitido en `HLS_ALLOWED_HOSTS`.
- Las direcciones HLS se cifran en tokens autenticados AES-256-GCM. Stremio recibe URLs del propio servicio y el proxy reescribe playlists, variantes, segmentos, claves y mapas HLS.
- No devuelve campos de proveedor, encabezados upstream, enlaces de iframe ni torrents.
- Validación de redirecciones, lista de hosts permitidos, restricciones contra IP privadas y límites de tamaño de playlists.
- No requiere dependencias de ejecución externas.

## Ejecutar localmente

Requiere Node.js 22 o superior.

```bash
cp .env.example .env
```

Configura las variables en el entorno antes de iniciar. Genera una clave estable con `openssl rand -hex 32` y ponla en `STREAM_TOKEN_SECRET`.

```bash
npm test
npm start
```

Prueba `http://localhost:10000/health` y abre `http://localhost:10000/manifest.json`. Para añadir el addon a Stremio, utiliza la URL pública de Render terminada en `/manifest.json`.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto HTTP. Render define esta variable automáticamente. |
| `PUBLIC_BASE_URL` | URL HTTPS pública opcional del servicio. En Render puede omitirse y se utiliza `RENDER_EXTERNAL_URL`. |
| `STREAM_TOKEN_SECRET` | Secreto estable de al menos 32 caracteres para cifrar y autenticar los enlaces HLS. No lo compartas ni lo incluyas en Git. |
| `HLS_ALLOWED_HOSTS` | Lista separada por comas de los dominios autorizados, incluyendo los dominios CDN usados por playlists, segmentos, claves y redirecciones. Admite `*.example.org` para subdominios. |
| `CATALOG_JSON` | Arreglo JSON con metadatos del catálogo. |
| `STREAMS_JSON` | Arreglo JSON de enlaces HLS autorizados por ID de Stremio. |

`CATALOG_JSON` admite elementos con `id`, `type` (`movie` o `series`), `name` y campos opcionales como `poster`, `background`, `description`, `releaseInfo`, `year`, `genres`, `imdbRating` y `videos`. Cada vídeo de serie puede incluir `id`, `title`, `season` y `episode`.

Ejemplo de estructura de metadatos:

```json
[
  {
    "id": "tt1234567",
    "type": "movie",
    "name": "Título autorizado",
    "poster": "https://images.example.org/poster.jpg",
    "releaseInfo": "2025",
    "genres": ["Drama"]
  }
]
```

`STREAMS_JSON` admite elementos con `id`, `type`, `url`, `quality`, `language` y `headers` opcionales. En películas, `id` debe coincidir con el ID de la película. En series, debe coincidir con el ID del episodio que Stremio envía a `/stream/series/{videoID}.json`. Las calidades permitidas son `4K`, `2160p`, `1080p`, `720p`, `480p`, `SD` y `Auto`; los idiomas visibles son `Español`, `Español latino`, `Inglés`, `Português`, `Original` y `Desconocido`.

Ejemplo estructural; reemplaza el hostname, ID, metadatos y enlaces por contenido autorizado de tu servicio:

```json
[
  {
    "id": "tt1234567",
    "type": "movie",
    "url": "https://media.example.org/master.m3u8",
    "quality": "1080p",
    "language": "Español latino",
    "headers": {
      "Referer": "https://media.example.org/"
    }
  }
]
```

Los dominios que sirven las playlists secundarias, segmentos, claves y mapas también deben estar incluidos en `HLS_ALLOWED_HOSTS`. No se aceptan URLs HTTP, hosts que no estén permitidos ni direcciones IP privadas. Los headers configurados se usan únicamente en peticiones upstream y no se envían a Stremio.

## Despliegue en Render

1. En Render crea un Blueprint y conecta `noe359866-code/ADDON5` para que Render lea `render.yaml`. Si prefieres crear un Web Service manual, usa `npm install` como Build Command, `npm start` como Start Command y `/health` como Health Check Path.
2. Configura `STREAM_TOKEN_SECRET`, `HLS_ALLOWED_HOSTS`, `CATALOG_JSON` y `STREAMS_JSON` cuando Render los solicite.
3. Genera un secreto fuerte con `openssl rand -hex 32`. Guárdalo únicamente en las variables de entorno de Render.
4. Cuando el servicio esté desplegado, verifica `/health` y `/manifest.json`.
5. Instala la URL `https://TU-SERVICIO.onrender.com/manifest.json` en Stremio.

El servicio no incluye catálogo precargado ni fuentes de demostración. Hasta que configures `CATALOG_JSON` y `STREAMS_JSON`, el catálogo y la lista de streams estarán vacíos.
