# Gnula Streams — addon de Stremio

Addon **solo de streams** para películas y series. No trae catálogos ni
metadatos: cuando abres una película o un episodio en Stremio, este addon busca
la ficha **en Gnula y en su hermano GnulaHD**, abre sus reproductores y
devuelve las fuentes de video listas para reproducir.

```
                                  ┌── Gnula    (www2.gnula.one · pestañas)
Stremio → /stream/{type}/{id}.json┤                                          → video
                                  └── GnulaHD  (ww3.gnulahd.nu · API gnrd)
```

| Fuente | Plantilla | Búsqueda | Reproductores |
| --- | --- | --- | --- |
| **Gnula** | WordPress de pestañas | `/?s=` | `<div id="tabN">` con iframe y el idioma en «opción N» |
| **GnulaHD** | WordPress propio (tema `gnrd-*`) | `/?s=` | `_gnrdPid` + `_gnrdTok` → `/wp-json/gnrd/v1/player` (base64 + XOR) |
| **Sitio de series** | botones `js-server` | `/?s=` (Cloudflare lo bloquea) | `<button class="js-server" data-src="…">` agrupados por `data-lang` |

Las dos webs se consultan **en paralelo**: si una está caída o no tiene el
título, la otra sigue respondiendo. Cada stream indica de dónde viene
(`Gnula · Latino`, `GnulaHD · Castellano`).

### Cómo se leen las webs (comprobado en octubre de 2026)

- **Gnula (películas)** — la ficha trae `<div id="tab1">…` y un iframe por
  pestaña; el idioma está en el texto `opción 1, Latino, HD`. El buscador sí
  encuentra los títulos **en español** (`?s=Interestelar`), pero devuelve el
  listado del tema si se le pasa el título inglés. Los servidores que anuncia
  hoy son `uqload.com`, `viewsb.com` y `jawcloud.co`: en la auditoría de
  octubre de 2026 **solo uqload sigue vivo**, y contesta una página de 38
  bytes a cualquier cliente que no sea un navegador de verdad (`viewsb.com` no
  resuelve y `jawcloud.co` da 404). Por eso esta fuente a veces no aporta
  ningún stream y GnulaHD es la que sostiene la respuesta.
- **Gnula (series)** — la plantilla cambió: ya no hay iframes. Cada idioma es
  un `<div class="servers" data-lang="lat|cas|sub">` lleno de
  `<button class="server js-server" data-src="…">`. El buscador del sitio
  contesta **403 con un desafío de Cloudflare**, así que se va directo a
  `/serie/<slug>/` y de ahí a la URL del episodio.
- **GnulaHD** — su buscador `/?s=` **se cuelga** (más de 60 s medidos), así que
  no se usa: primero se prueba el slug directo `/ver/<título>/` (1-2 s, y
  acierta casi siempre porque el slug es el título en español) y, si falla, la
  API REST de WordPress `/wp-json/wp/v2/search?search=…` (~12 s). La ficha
  declara `_gnrdPid` y `_gnrdTok` y llama a
  `/wp-json/gnrd/v1/player?id=…&t=…`. La respuesta es `{p:"<base64>"}`
  cifrada con XOR contra una clave de 4 bytes que está en la propia página,
  dentro de `gnrdUnpack` (`k=[103,78,55,100]` = `"gN7d"`). Se descifra en
  memoria, sin ejecutar nada del sitio.
- **vidara** (`vidaraa.cc` / `vidara.to`) no se rastrea: el propio GnulaHD lo
  convierte en HLS con `/panel/vidara-resolve.php?pl=1&code=…&host=…&t=…`.
  Ese `t` es **distinto en cada ficha**, por eso se lee de la página en el
  momento y no se guarda en la configuración.
- Los enlaces de **descarga** que publica la ficha (`dl`, `.zip`, 1fichier,
  megaup, katfile, nitro…) no son streams: se ignoran aunque acaben en `.mp4`.
- Los reproductores caídos devuelven a veces un **vídeo de demostración**
  (Big Buck Bunny, `test-videos.co.uk`, `sample-videos.com`): también se
  descartan, porque no son la película.

Resumen de lo comprobado contra las webs en octubre de 2026:

| Qué | Gnula (`www2.gnula.one`) | GnulaHD (`ww3.gnulahd.nu`) |
| --- | --- | --- |
| Buscador | `/?s=<título>`; **solo acierta con el título en español** (`Interestelar`), con el inglés devuelve el listado del tema | `/?s=` **se cuelga con mayúsculas**; en minúsculas responde y acierta |
| Atajo | — | slug directo `/ver/<slug>/` (1-2 s) y REST de WordPress si el slug falla |
| Ficha | pestañas `#tabN`, un iframe (a veces `data-lazy-src`) por pestaña | `h1.gnrd-fi-title`, filas `.qf-l`/`.qf-v`, episodios `a.gnrd-epc` |
| Reproductor | iframes de `uqload.com`, `viewsb.com`, `jawcloud.co` | `_gnrdPid`/`_gnrdTok` → `/wp-json/gnrd/v1/player` (base64 + XOR) |
| Servidores vivos | **solo uqload**, y **solo si NO se manda `Referer`** (con él contesta 38 bytes) | **vidara** (HLS en una petición) y **cuevana** (HLS); voe/byse/savefiles responden 403/404 |
| Series | `?s=` da **403 de Cloudflare** → se va directo a `/serie/<slug>/` y de ahí al capítulo | el capítulo trae `data-id`/`data-t`: se pide la API sin abrir su página |

## Qué hace

0. **Cero catálogo y cero relleno.** El manifest declara
   `resources: ["stream"]` y `catalogs: []`: no hay filas en Descubrir, ni
   fichas, ni metadatos. Y de cada reproductor **solo se entrega lo que
   Stremio puede reproducir**: HLS (`.m3u8`) y MP4 (`.mp4`/`.m4v`). Todo lo
   demás —páginas de reproductor, `.mpd`, `.zip`, enlaces de descarga— se
   descarta, y si un título no deja ningún enlace válido la respuesta es
   `{ streams: [] }`.
1. **ID → nombre (el resolvedor).** Stremio solo manda el ID
   (`tt0944947:2:1`, `tmdb:1399:1:3`). Como Gnula y GnulaHD son webs en
   español que buscan **por nombre**, el ID se traduce a una lista de títulos
   ordenada para el sitio:

   | Fuente | Qué aporta | Clave |
   | --- | --- | --- |
   | **Wikidata + Wikipedia** | artículo exacto desde el ID de IMDb y de su ficha el título **latino** («Interestelar») | no |
   | **TMDB** `/find` | el título en español según TMDB | `TMDB_API_KEY` (opcional) |
   | **Cinemeta** | nombre, título original y año | no |
   | **IMDb** (sugerencias) | respaldo si Cinemeta no responde | no |

   Wikidata se consulta con `haswbstatement:P345=<imdb>` —así se llega al
   artículo correcto y no a un homónimo: buscar «Loki» a secas devuelve el
   dios nórdico— y de la ficha de Wikipedia se leen todas las variantes por
   país (`Cadena perpetua` / `Sueños de libertad` / `Sueño de fuga`). Cinemeta
   y TMDB se piden **a la vez**; Wikimedia solo si hay ID de IMDb. Todo se
   cachea 24 h. Sin clave de TMDB el addon sigue dando el título en español
   gracias a Wikipedia; con clave, además se pueden instalar IDs `tmdb:…` (el
   manifest anuncia `idPrefixes: ["tt", "tmdb"]` solo en ese caso). Si ninguna
   fuente nombra el ID, el addon responde vacío en vez de buscar a ciegas.
2. **Búsqueda en las dos webs.** Se prueban como máximo dos consultas por web:
   los títulos completos (español y original) y, si no hay resultados, variantes
   (`Spider-Man: No Way Home` → `Spider-Man`, `The Batman` → `Batman`, títulos
   largos recortados). Los resultados se puntúan por parecido —bigramas, así
   «Interestelar» gana a «La ciencia de Interstellar»— y por año, y se descarta
   lo que no coincide: nunca se devuelve «otra película» por error. Las series
   se buscan con temporada y episodio exactos.
3. **Lectura de la ficha.** En Gnula, cada pestaña (`#tab1`, `#tab2`…) lleva un
   reproductor y el idioma sale de «opción N, Latino, HD». En GnulaHD, los
   reproductores vienen del JSON cifrado de su API, que ya trae la etiqueta de
   idioma. Se agrupan todos en **Latino**, **Castellano** y **Subtitulado**.
4. **Resolución del video.** Se abre cada reproductor (Voe, Filemoon,
   StreamWish, VidHide, Streamtape, Doodstream, Mixdrop, agregadores de
   Cuevana…) y se saca la URL real (`.m3u8` / `.mp4`), desempaquetando el
   JavaScript del reproductor cuando hace falta. Todo en paralelo y con un
   presupuesto de tiempo: si un servidor está caído, se usa el siguiente.
5. **Proxy propio.** Muchos CDN devuelven 403 si no llega su `Referer`. El
   addon sirve el video por `/proxy` y reescribe las listas HLS para que
   también los segmentos viajen con las cabeceras correctas. En modo `auto`
   (por defecto) solo se usa cuando el enlace lo necesita.

## Solo lo que Stremio reproduce

| Enlace encontrado | ¿Se entrega? | Por qué |
| --- | --- | --- |
| `.m3u8` (HLS) | **sí** | nativo en web, móvil, escritorio y TV |
| `.mp4` / `.m4v` | **sí** | nativo en todas las plataformas |
| CDN sin extensión (`/get_video?id=…`) | **sí**, si su `Content-Type` es video | se comprueba con un `HEAD` (o un `Range` de 1 byte), sin descargar |
| `.mkv` | no por defecto | solo escritorio/TV → `STREMIO_FORMATS=hls,mp4,mkv` |
| `.mpd` (DASH) | no por defecto | la mayoría de clientes no lo abre → `STREMIO_FORMATS=…,dash` |
| página del reproductor, `.zip`, `.ts`, `.html` | **nunca** | Stremio no los abre |

El addon no devuelve entradas «abrir en el navegador» ni enlaces de descarga:
si un título no deja ningún enlace reproducible, la respuesta es
`{"streams": []}`. El título de cada stream muestra el formato
(`Voe · HLS · HD`) para que se vea de un vistazo.

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
| `SERIES_BASE_URL` | `https://ver.verteleseriesonline.com` | sitio de series de Gnula |
| `WIKIPEDIA_TITLES` | `true` | título latino vía Wikidata + Wikipedia (sin clave) |
| `WIKIPEDIA_BASE_URL` | `https://es.wikipedia.org` | Wikipedia que se consulta |
| `WIKIDATA_BASE_URL` | `https://www.wikidata.org` | Wikidata (IMDb → artículo) |
| `TMDB_API_KEY` | — | opcional: título en español y IDs `tmdb:…` |
| `TMDB_LANGUAGE` | `es-MX` | idioma en que se piden los títulos a TMDB |
| `STREMIO_FORMATS` | `hls,mp4` | formatos que se entregan (`mkv`, `dash` son opt-in) |
| `GNULAHD_BASE_URL` | `https://ww3.gnulahd.nu` | hermano GnulaHD |
| `STREAM_PROXY` | `auto` | `auto` / `always` / `never` |
| `HANDLER_DEADLINE_MS` | `20000` | presupuesto total de una petición |
| `FETCH_TIMEOUT_MS` | `12000` | timeout de cada petición HTTP (las webs tardan) |
| `MAX_RESOLVE_PER_REQUEST` | `12` | reproductores que se abren por petición |
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
src/titles.js            ID → títulos con los que buscar (TMDB/Cinemeta/IMDb)
src/formats.js           qué puede reproducir Stremio (HLS/MP4) y sondeo HEAD
src/sources.js           las dos webs: Gnula y GnulaHD
src/gnula.js             búsqueda, fichas, pestañas, idiomas
src/gnulahd.js           /ver/<slug>/, API gnrd cifrada, resolvedor de vidara, episodios
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

82 pruebas con `node:test` y HTML de ejemplo que imita el marcado real de las
dos webs, de los reproductores y de las listas HLS (incluido el payload
cifrado de GnulaHD). Ninguna prueba sale a internet:
`test/helpers/stub-fetch.js` sustituye `fetch` por fixtures.

## Si no aparecen streams

1. Abre `/health` para confirmar que el servicio está despierto. En Render
   Free el primer arranque tarda y Stremio puede abandonar esa petición.
2. Abre `/selftest?id=TU_ID&type=movie` (o `type=series`). `trace.sources`
   dice qué ficha encontró cada web y cuántos reproductores tiene, y
   `trace.resolved` muestra, reproductor por reproductor, si entregó video.
3. `trace.page` presente significa que la ficha existe, pero los reproductores
   bloquean al servidor (Cloudflare, captcha) o cambiaron su HTML. Revisa
   `trace.meta.titles` (los nombres que se buscaron) y `trace.meta.sources`
   (de dónde salieron). En `trace.resolved` cada enlace trae `format`,
   `compatible` y `reason`: ahí se ve si el video se encontró pero se descartó
   por no ser reproducible (por ejemplo un `.mpd`).
4. Los dominios de Gnula, GnulaHD y de los reproductores cambian a menudo: si
   una búsqueda deja de responder, ajusta `GNULA_BASE_URL`,
   `SERIES_BASE_URL` o `GNULAHD_BASE_URL`; la otra fuente sigue funcionando.

## Límites y responsabilidad

- El addon **no aloja ni distribuye video**: solo lee enlaces que esos sitios
  ya publican y los pone en el reproductor de Stremio.
- El scraping depende de webs de terceros: si cambian su HTML o bloquean las
  IPs de un servidor (Render, por ejemplo), algunas fuentes dejarán de
  responder. `/selftest` ayuda a ver cuál; con dos webs, una caída no deja el
  addon sin streams.
- Usa el addon solo con contenido que tengas derecho a ver en tu país.
