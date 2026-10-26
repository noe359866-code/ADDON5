# Gnula Streams — addon de Stremio

Addon **solo de streams** para películas y series. No trae catálogos ni
metadatos: cuando abres una película o un episodio en Stremio, este addon busca
la ficha en [Gnula](https://www2.gnula.one), abre sus reproductores y devuelve
las fuentes de video listas para reproducir.

```
Stremio  →  /stream/movie/tt0816692.json  →  Gnula (ficha + reproductores)  →  video
```

## Qué hace

1. **IMDb → título.** Stremio solo manda el ID (`tt0111161`,
   `tt0944947:1:2`); el nombre y el año se resuelven con Cinemeta.
2. **Búsqueda en Gnula.** Se busca por título, se puntúan los resultados por
   parecido y año, y se descarta lo que no coincide (nunca se devuelve «otra
   película» por error). Las series van al sitio hermano de Gnula, con la
   temporada y el episodio exactos.
3. **Lectura de la ficha.** Cada pestaña de la ficha (`#tab1`, `#tab2`…) tiene
   un reproductor. Se extraen todos y se agrupan por idioma: **Latino**,
   **Castellano** y **Subtitulado**.
4. **Resolución del video.** Se abre cada reproductor (Voe, Filemoon,
   StreamWish, VidHide, Streamtape, Doodstream, Mixdrop, agregadores de
   Cuevana…) y se saca la URL real (`.m3u8` / `.mp4`), desempaquetando el
   JavaScript del reproductor cuando hace falta. Todo en paralelo y con un
   presupuesto de tiempo: si un servidor está caído, se usa el siguiente.
5. **Proxy propio.** Muchos CDN devuelven 403 si no llega su `Referer`. El
   addon sirve el video por `/proxy` y reescribe las listas HLS para que
   también los segmentos viajen con las cabeceras correctas. En modo `auto`
   (por defecto) solo se usa cuando el enlace lo necesita.

## Instalar

Requiere **Node.js 22 o superior**. No tiene dependencias.

```bash
npm install     # solo valida el lockfile
npm start       # PORT o 7000 por defecto
```

Abre `http://localhost:7000/` y pulsa **Instalar en Stremio**, o copia en
Stremio el manifest `https://TU-SERVICIO/manifest.json`.

### Render

El archivo `render.yaml` ya define el servicio:

| Ajuste | Valor |
| --- | --- |
| Runtime | Node |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

No hace falta configurar nada más: la URL pública se deduce del `Host` de cada
petición (y de `RENDER_EXTERNAL_URL`/`X-Forwarded-Proto` cuando existen).

## Rutas

| Ruta | Para qué |
| --- | --- |
| `/manifest.json` | manifest de Stremio (`resources: ["stream"]`) |
| `/stream/{movie\|series}/{id}.json` | lista de streams |
| `/proxy?u=…&r=…` | proxy de video y listas HLS |
| `/` | página de instalación |
| `/health` | estado del servicio |
| `/selftest?id=tt0816692&type=movie` | diagnóstico paso a paso |

`/selftest` es la herramienta para cuando «no aparecen streams»: dice qué
título se resolvió, qué ficha de Gnula se eligió, cuántos reproductores había,
cuáles entregaron video y cuáles fallaron.

## Configuración

Todo es opcional; los valores por defecto están en `.env.example`.

| Variable | Defecto | Qué hace |
| --- | --- | --- |
| `PORT` | `7000` | puerto del servidor |
| `PUBLIC_BASE_URL` | — | fuerza el dominio de los enlaces `/proxy` |
| `GNULA_BASE_URL` | `https://www2.gnula.one` | catálogo de Gnula (si rota el dominio) |
| `SERIES_BASE_URL` | `https://ver.verteleseriesonline.com` | sitio de series |
| `STREAM_PROXY` | `auto` | `auto` / `always` / `never` |
| `HANDLER_DEADLINE_MS` | `15000` | presupuesto total de una petición |
| `FETCH_TIMEOUT_MS` | `7000` | timeout de cada petición HTTP |
| `MAX_RESOLVE_PER_REQUEST` | `6` | reproductores que se abren por petición |
| `RESOLVE_CONCURRENCY` | `3` | aperturas simultáneas |
| `CACHE_TTL_SECONDS` | `900` | caché de la ficha (lista de reproductores) |
| `MEDIA_CACHE_TTL_SECONDS` | `240` | caché de la URL de video resuelta |
| `DEBUG` | `false` | logs de scraping |
| `ADDON_NAME` | `Gnula Streams` | nombre visible en Stremio |

## Cómo está montado

```
index.js                 arranque (listen 0.0.0.0)
src/server.js            rutas HTTP, CORS, /health, /selftest
src/manifest.js          manifest de Stremio
src/addon.js             petición → título → ficha → streams
src/cinemeta.js          IMDb → título/año
src/gnula.js             búsqueda, fichas, pestañas, idiomas
src/players/index.js     extractores por reproductor + encadenado
src/players/shared.js    buscar la URL de video en el HTML/JS
src/players/packer.js    desempaquetado del JS "packed" (Dean Edwards)
src/streams.js           objetos `stream` y modo de proxy
src/proxy.js             /proxy y reescritura de listas HLS
src/landing.js           página de instalación
test/                    pruebas con fixtures (sin salir a internet)
```

### Pruebas

```bash
npm test
```

46 pruebas con `node:test` y HTML de ejemplo que imita el marcado real de
Gnula, de los reproductores y de las listas HLS. Ninguna prueba sale a
internet: `test/helpers/stub-fetch.js` sustituye `fetch` por fixtures.

## Si no aparecen streams

1. Abre `/health` para confirmar que el servicio está despierto. En Render
   Free el primer arranque tarda y Stremio puede abandonar esa petición.
2. Abre `/selftest?id=TU_ID&type=movie` (o `type=series`). El campo
   `trace.resolved` muestra, reproductor por reproductor, si entregó video.
3. `trace.errors` vacío + `trace.page` presente significa que Gnula sí tiene la
   ficha, pero los reproductores bloquean el servidor (Cloudflare, captcha) o
   cambiaron su HTML. En ese caso el addon devuelve entradas
   «abrir reproductor en el navegador» para que la película siga siendo
   accesible.
4. Los dominios de Gnula y de los reproductores cambian a menudo: si la
   búsqueda deja de responder, ajusta `GNULA_BASE_URL` / `SERIES_BASE_URL`.

## Límites y responsabilidad

- El addon **no aloja ni distribuye video**: solo lee enlaces que esos sitios
  ya publican y los pone en el reproductor de Stremio.
- El scraping depende de webs de terceros: si cambian su HTML o bloquean las
  IPs de un servidor (Render, por ejemplo), algunas fuentes dejarán de
  responder. `/selftest` ayuda a ver cuál.
- Usa el addon solo con contenido que tengas derecho a ver en tu país.
