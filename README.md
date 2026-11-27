# 🦆 HitzBidaia · Viaje de Palabras

[![CI](https://github.com/noe359866-code/ADDON5/actions/workflows/ci.yml/badge.svg)](https://github.com/noe359866-code/ADDON5/actions/workflows/ci.yml)

Una app **progresiva y divertida para aprender a leer en euskera, castellano e inglés**, pensada para niños y niñas que empiezan a leer (y para cualquier persona que quiera practicar). No hay cuentas, ni anuncios, ni servidor: todo funciona en el navegador y el progreso se guarda en `localStorage`.

> *Laburpena euskaraz: euskaraz eta gaztelaniaz irakurtzen ikasteko app progresiboa eta jolasgarria, ikusizko eta entzunezko ibilbideekin.*

---

## ✨ Qué incluye

### 6 mundos progresivos + 2 modos abiertos
Cada mundo se desbloquea al conseguir al menos **1 estrella** en el anterior:

| # | Mundo | Se practica |
|---|-------|-------------|
| 1 | 🔤 Letras que suenan / Soinua duten letrak | Correspondencia letra–sonido, letras especiales (`tx`, `tz`, `ch`, `ñ`, `rr`, `ll`) |
| 2 | 🧩 El taller de sílabas / Silaben tailerra | Segmentación, conteo y construcción de sílabas |
| 3 | 🍎 Primeras palabras / Lehen hitzak | Lectura y escritura de vocabulario real |
| 4 | 🎵 Rimas y sonidos / Errimak eta soinuak | Rimas, pares mínimos y discriminación auditiva |
| 5 | 💬 Frases que cobran vida / Bizirik dauden esaldiak | Completar, ordenar y escuchar frases |
| 6 | 📖 El bosque de los cuentos / Ipuinen basoa | Cuentos breves con comprensión lectora |

Y en el **🎠 Patio de juegos**, dos modos siempre abiertos (sin desbloqueo):

| # | Modo | Se practica |
|---|------|-------------|
| 7 | 🔢 Números y colores / Zenbakiak eta koloreak | Contar objetos, numeral ↔ palabra, sucesiones, colores con muestras de color y objetos reales |
| 8 | 🕹️ ¡Pato Ventura dice! / Pato Venturak dio! | Instrucciones de uno y dos pasos, movimiento, burbujas, palmas, respiración, «toca algo que te guste» e imitación |

### Rutas de aprendizaje adaptadas
- 👁️ **Visual**: dibujos, sílabas de colores, letras ocultas, piezas para construir palabras y frases.
- 🎧 **Auditiva**: la voz de Pato Ventura lee cada pregunta, ejercicios de escucha, rimas, pares mínimos y dictado.
- 🌈 **Mixta**: alterna imagen y sonido pregunta a pregunta.

La ruta se elige al empezar y **se puede cambiar en cualquier momento** desde el mapa o Ajustes: el generador de ejercicios pondera las actividades según la ruta activa.

### Adaptación además de la ruta
- **Dificultad viva**: 3 aciertos seguidos → más opciones y distractores más parecidos; 2 fallos seguidos → baja la dificultad.
- **Idiomas de aprendizaje**: castellano, euskera o inglés; `¡Los dos!` alterna castellano y euskera. Cada pregunta muestra su idioma. La interfaz está disponible en castellano y euskera, no en inglés.
- **Interfaz bilingüe**: todos los textos de la app en español o en euskera.
- **Pistas** de Pato Ventura (con repetición lenta del audio), sin castigo más allá de algo menos de XP.
- **Voz**: Web Speech API (`eu-ES` / `es-ES`). Si el navegador no tiene voz en euskera, se usa la voz en español y se avisa con un cartelito.
- **Efectos de sonido** sintetizados con Web Audio API (sin archivos de audio).

### ♿ Perfiles de apoyo (accesibilidad cognitiva y de lectura)
En el **tercer paso del inicio** y en **Ajustes → Apoyos de aprendizaje** se pueden activar varios perfiles a la vez. No son una etiqueta para el alumno: son **interruptores que cambian la mecánica**. Se pueden quitar en cualquier momento y se guardan con el progreso.

| Perfil | Qué cambia en la app |
|---|---|
| 🧠 Discapacidad cognitiva | 4 preguntas por sesión, **2 opciones**, dificultad mínima, vocabulario concreto, pictogramas, voz siempre, feedback sin fallo |
| 📖 Dificultades de comprensión | Lectura fácil: instrucciones cortas, cuentos reducidos a **una frase**, actividades concretas en lugar de rimas/frases abstractas |
| 💬 Dificultades comunicativas | Pictogramas en todas las opciones, rutina visual «primero → después», la voz **dice la respuesta elegida** (apoyo tipo SAAC) |
| 🔠 Dislexia | **Atkinson Hyperlegible** (fuente hiperlegible), más espaciado entre letras y palabras, interlineado alto, fondo crema, sílabas coloreadas, voz siempre |
| ⚡ Hiperactividad / TDAH | Sesiones de 4 actividades, **pausa de movimiento cada 3**, botones grandes, refuerzo inmediato |
| 🧩 TEA / Autismo | Rutina predecible y literal, **sin confeti ni animaciones**, colores atenuados, voz siempre, sin reglas con truco ni sorpresas |
| 🌈 Síndrome de Down | Más imagen, repetición, 2 opciones, botones grandes, sesiones cortas y refuerzo positivo |
| 🎨 Daltonismo | Paleta de alto contraste **Okabe–Ito** (azul sólido `#0072B2` frente a naranja discontinuo `#D55E00`), **patrones + símbolos geométricos** en todas las muestras de color, sílabas con distintos estilos de borde, sin adivinanzas por tono puro ni círculos de color sin contexto |

Detalles de diseño deliberados:
- **Nunca se comunica información solo con color** (WCAG 1.4.1): todas las opciones y fichas de letras muestran iconos `✓` / `✕` y bordes sólidos frente a discontinuos incluso sin activar el perfil de daltonismo.
- **Los mundos normales no tienen límite de tiempo y las vidas son ilimitadas por defecto**. Se pueden activar vidas limitadas en Ajustes; si se agotan, siempre se puede seguir gratis con vidas ilimitadas. El modo contrarreloj es opcional. Los fallos y las pistas pueden afectar a los puntos de la sesión.
- **Los juegos imperativos no tienen respuesta incorrecta**: participar ya suma, y se puede repetir o saltar sin consecuencias.
- Se evitó el «Simón dice» clásico (la regla de *no hacerlo si no dice "Simón dice"* excluye a quien tiene dificultades de comprensión): **siempre se hace lo que dice Pato Ventura**.
- Instrucciones de un paso, literales, con pictograma + texto + voz (comunicación total); opcionalmente dos pasos con apoyo visual numerado.
- Modo **«Menos estímulos»** independiente en Ajustes, además de `prefers-reduced-motion` del sistema.

> ⚠️ Esto es una herramienta educativa de apoyo basada en pautas generales de diseño universal (lectura fácil, pictogramas, rutinas visuales, pausas de movimiento). **No es un producto sanitario, ni diagnostica, ni sustituye** a la valoración de profesionales (logopedia, pedagogía terapéutica, etc.).

### Diversión y accesibilidad general
Mascota animada en SVG, confeti, estrellas, XP, nivel lector, racha diaria, 10 insignias, práctica libre, atajos de teclado (`1`–`4` y `Enter`), modo «letras grandes», interfaz bilingüe es/eu, soporte de `prefers-reduced-motion` y diseño responsive móvil/escritorio.

**Estructura estilo Duolingo:** mapa de unidades con ruta serpentina y coronas por nodo, guías de unidad, ligas semanales con rivales simulados (sin otros niños conectados), gemas, corazones (ilimitados por defecto), misiones diarias, tienda de aspectos para Pato Ventura, niveles «legendario» y contrarreloj opcional, y cofres en el camino. Todo el progreso vive en el navegador.

**Microinteracciones de estilo Duolingo:** botones con profundidad 3D y hundimiento al pulsar, entrada escalonada de tarjetas/opciones, transición entre preguntas, barra de progreso con brillo, mapa con burbujas flotantes, **Pato Ventura** con reacciones de ánimo y bocadillo en cada pregunta (y ¡cuac! interactivo al tocarlo), `+XP` flotante, píldoras de racha, estrellas que aparecen una a una, contador de XP animado, insignias escalonadas y celebración al subir de nivel. Todo usa `transform`/`opacity` para no bloquear el renderizado; los efectos nuevos de sonido (`combo` y `levelup`) se omiten en modo calmo. El modo **«Menos estímulos»** y `prefers-reduced-motion` desactivan animaciones, flotantes y confeti.

**Orden y profesionalismo:** tokens de diseño (`--surface`, `--border-soft`, radios y sombras), barra superior estable, onboarding con paso numérico y progreso explícito, secciones del panel numeradas y agrupadas en tarjetas neutras, mapa de mundos alineado como *timeline*, selector de ruta/idioma con jerarquía tipográfica, tarjetas de resultados y ajustes con bordes coherentes, e insignias en cuadrícula. Los componentes `SectionHead`, `StepProgress` y el helper `staggerStyle` centralizan la estructura visual y evitan estilos repetidos.

### 🧸 Minijuegos y música relajante
En el mapa, **Juega con Pato Ventura** abre un rincón opcional donde se puede tocar al pato, hacerle cosquillas, darle un abrazo o invitarlo a bailar. Responde con gestos y mensajes en castellano o euskera. Respeta el sonido desactivado y el modo tranquilo, y reduce el movimiento cuando lo pide el sistema. No usa el micrófono ni graba o repite lo que dice el niño.

Además de las instrucciones de «¡Pato Ventura dice!», el modo 8 incluye **minijuegos sin fallo** pensados para niños: explotar burbujas, contar palmadas, respirar con Pato Ventura, tocar un pictograma elegido libremente e imitar un gesto. Todos mantienen voz, pictograma, «Otra vez» y «Siguiente»; participar siempre suma.

La **música relajante** se genera con Web Audio en el navegador (acordes suaves, sin voces, sin archivos externos ni servicios de terceros). Se controla con el botón 🎵 de la cabecera y desde Ajustes, se guarda en `localStorage` y **no se inicia automáticamente**: los navegadores bloquean el autoplay, así que arranca con el gesto del usuario o en la primera interacción si ya estaba activada. Es independiente de los efectos y la voz; en modo calmo permanece apagada salvo que se encienda explícitamente.

En **Ajustes → Desbloquear todos los mundos (demo)** se pueden explorar los 6 mundos sin completarlos. La clasificación muestra rivales simulados, no otros niños conectados.

### Voz local opcional en euskera: Maider

En **Ajustes → Audio y entorno** se puede activar Maider. La primera vez se descargan el modelo (~63 MB) desde Hugging Face y los componentes de síntesis (~33 MB) desde la propia app; puede tardar y requiere conexión, espacio y un dispositivo compatible. La síntesis se ejecuta en el dispositivo, sin enviar los textos al proveedor. Los archivos descargados pueden permanecer en la caché del navegador, pero el navegador puede borrarlos y no se garantiza su disponibilidad sin conexión. La velocidad varía según el dispositivo. Si falla, se muestra un aviso y se utiliza la voz del navegador; castellano e inglés siguen usando las voces del navegador. La preferencia es local a este dispositivo.

La voz [Maider](https://huggingface.co/rhasspy/piper-voices/tree/main/eu/eu_ES/maider/medium) utiliza datos de [itzune/maider-dataset](https://huggingface.co/datasets/itzune/maider-dataset), Creative Commons Attribution 4.0. Motor: [phoonnx.js](https://github.com/TigreGotico/phoonnx.js) (Apache-2.0), [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) (MIT) y [eSpeak NG](https://github.com/ianmarmour/espeak-ng.js) (GPL-3.0-or-later); revisa las obligaciones de licencia antes de redistribuir la app. La descarga desde Hugging Face expone la dirección IP al proveedor del modelo.

### Familias y docentes: progreso y privacidad
En Ajustes hay un resumen del progreso y opciones para exportarlo e importarlo como archivo JSON. Importar **sustituye** el progreso actual tras una confirmación; guarda primero una copia si deseas conservarlo. El archivo puede contener el nombre y los ejercicios pendientes: guárdalo en un lugar seguro y compártelo solo con personas de confianza. El almacenamiento del navegador puede perderse al borrar sus datos o cambiar de dispositivo.

El modo infantil simplifica la interfaz, pero **no es un control parental ni impide cambiar ajustes**. La lectura con micrófono es opcional: el reconocimiento de voz depende del navegador y puede enviar audio a un proveedor externo. Consulta su política de privacidad y solicita supervisión adulta antes de usarlo. La disponibilidad de voces y reconocimiento depende del navegador y del dispositivo.

---

## 📱 Instalar y usar sin conexión

HitzBidaia es una aplicación web progresiva (PWA): en Android y ordenadores compatibles se puede usar «Instalar» cuando el navegador lo ofrezca; en iPhone/iPad, desde Safari usa **Compartir → Añadir a pantalla de inicio**. La opción depende del navegador y requiere HTTPS (o localhost). No es una aplicación publicada en tiendas.

Abre la versión publicada con conexión y espera a que termine de cargar antes de desconectarte: el navegador guarda los recursos esenciales y las actividades integradas pueden funcionar sin red. El guardado sin conexión depende del espacio y de que el navegador no borre sus datos. La voz del navegador y el reconocimiento de voz pueden depender del dispositivo o de Internet; Maider requiere una descarga inicial independiente y su disponibilidad sin conexión depende de su caché. Las actualizaciones se activan cuando se cierran las pestañas que usan la versión anterior.

El progreso permanece en el almacenamiento local del navegador y puede ser independiente entre navegadores, dispositivos o la app instalada (especialmente en iOS). Antes de cambiar o borrar datos, exporta una copia desde Ajustes. Para comprobar la PWA en local usa `npm run build` seguido de `npm run preview`; el modo `npm run dev` no registra el service worker.

---

## 🚀 Ejecutar

```bash
npm install
npm run dev        # http://localhost:5173
```

Otros comandos:

```bash
npm test               # pruebas de idiomas, voz, progreso, PWA y lógica de sesión
npm run build          # tsc --noEmit + build de producción en dist/
npm run preview        # sirve dist/
npm run typecheck      # solo comprobación de tipos
npm run check:content  # valida 114.300 ejercicios (8 modos × 3 rutas × ES/EU/EN/ES+EU × bajo/medio/alto × 5 etapas × 5 fases de lectura)
```

Requiere Node.js 18+.

---

## ☁️ Desplegar en Render

La app es una SPA 100 % estática: `npm run build` genera `dist/` y no necesita servidor, base de datos ni variables secretas. El plan **Static Site gratuito** sirve desde CDN con HTTPS incluido (necesario para que funcione la síntesis de voz del navegador).

### Opción A · Blueprint (recomendada)
El archivo [`render.yaml`](./render.yaml) ya define todo:

1. Los cambios ya están en `main` (la rama de trabajo se fusionó mediante PR).
2. En [Render Dashboard](https://dashboard.render.com) → **New → Blueprint**.
3. Conecta el repositorio `noe359866-code/ADDON5` y selecciona la rama **`main`**.
4. Revisa los recursos y pulsa **Apply**. Render creará el sitio `hitzbidaia.onrender.com`.

> 💡 `render.yaml` fija `branch: main`. Si quieres desplegar desde otra rama, cambia ese valor antes de crear el Blueprint.

### Opción B · Manual
**New → Static Site** → conecta repo y rama, y rellena:

| Campo | Valor |
|---|---|
| Build Command | `npm ci --include=dev && npm run build` |
| Publish Directory | `dist` |
| Node version | `22` (variable `NODE_VERSION`) |
| Rewrite rule | `/*` → `/index.html` |

`--include=dev` es clave: Vite y TypeScript están en `devDependencies` y Render construye con `NODE_ENV=production`.

### Notas
- No hay secretos, ni `.env`, ni backend: el progreso de cada jugador se guarda en su propio navegador (`localStorage`).
- La voz (`eu-ES` / `es-ES`) depende de las voces instaladas en el dispositivo; si falta la voz en euskera la app usa la española y lo avisa.
- El sitio estático gratuito no se "duerme": se sirve desde la CDN de Render.

---

## 🗂️ Estructura

```
index.html
src/
  main.tsx            arranque React + fuentes
  App.tsx             estado global, pantallas y persistencia
  session.ts          applySessionResult(): progreso tras una sesión (puro, probado)
  screens/            pantallas de la app, una por archivo
    index.ts          barrel de exportación (`./screens`)
    shared.tsx        Segmented, DuoWordmark, RouteIcon, syncMusic
    Onboarding.tsx    primer arranque (ruta, idioma, apoyos)
    LearnPathView.tsx mapa serpentino de unidades con nodos y cofres
    Home.tsx          mapa principal de tres columnas + pestañas
    Settings.tsx      ajustes y apoyos de aprendizaje
    ResultScreen.tsx  celebración y resumen al terminar
  DuoViews.tsx        vistas Duolingo: letras, cuentos, tienda, ligas, misiones, perfil
  duoData.ts          unidades, nodos, ligas, logros, cuentos, aspectos, guías
  GameScreen.tsx      bucle de juego, feedback, pistas, adaptación y teclado
  adaptations.ts      perfiles de apoyo y transformación de cada ejercicio
  exercises.ts        generadores por mundo (1-8), selección por ruta y apoyos
  data.ts             banco bilingüe de ~55 palabras, números, colores, rimas, frases, cuentos, instrucciones e insignias
  icons.tsx           iconografía SVG propia
  i18n.ts             todos los textos de interfaz en es/eu
  progress.ts         progreso en localStorage, estrellas, racha, insignias
  sound.ts            síntesis de voz (SpeechSynthesis) y efectos (Web Audio)
  music.ts            música ambiental relajante generada con Web Audio
  components.tsx      mascota SVG, confeti, estrellas, barras, contadores, flotantes, encabezados, progreso y modal
  PatoPlay.tsx        minijuego táctil con Pato Ventura
  InstallApp.tsx      instalación PWA
  pwa.ts              registro del service worker
  maider.ts           voz local de euskera (Maider): worker, caché y estado
  maider.worker.ts    síntesis ONNX + eSpeak NG fuera del hilo principal
  types.ts
  styles.css
scripts/
  check-exercises.mjs validación del banco generado (~114 mil combinaciones)
  pwa.mjs             generación del service worker en el build
tests/                pruebas de idiomas, sesión, progreso, PWA y voz
.github/workflows/     CI: typecheck + tests + check:content + build
```

### Cómo se genera un ejercicio
`pickExercise()` recibe `{ levelId, lang, ui, route, difficulty, slot, state, adaptations }`, elige una fábrica del mundo según la modalidad preferida por la ruta (con un 16 % de la otra ruta para variar), filtra las actividades abstractas si hay lectura fácil, inserta pausas de movimiento y evita repetir contenido dentro de la sesión. Después `applyAdaptations()` recorta opciones, añade pictogramas, acorta textos y activa la voz. Las fábricas devuelven cinco tipos: `choice`, `tap`, `build`, `story` y `action` (juego imperativo sin fallo). Las tarjetas `action` pueden llevar además un `game` con burbujas, conteo, respiración, búsqueda libre o imitación; `applyAdaptations()` reduce también los pictogramas de esos minijuegos cuando el perfil pide menos opciones.

### Sobre el contenido
El banco de palabras usa formas de diccionario (`katu`, `sagar`, `etxe`…) para mantener las sílabas claras en ambos idiomas. Las rimas en euskera son asonantes, como suele hacerse en material infantil. Los cuentos son originales y breves, con una pregunta de comprensión cada uno.

---

## 🙌 Créditos

by **Iñigo**

---

## 📄 Licencia

HitzBidaia es software libre: **GNU General Public License v3.0 o posterior** (GPL-3.0-or-later). El texto completo está en [`LICENSE`](./LICENSE).

La razón es deliberada: la app **redistribuye eSpeak NG compilado a WebAssembly** (`espeak-ng.wasm`, GPL-3.0-or-later) como parte del paquete estático, así que el proyecto en su conjunto debe ofrecerse bajo una licencia compatible. El resto de componentes mantienen sus licencias:

| Componente | Licencia |
|---|---|
| eSpeak NG (fonemizador de Maider) | GPL-3.0-or-later |
| [phoonnx.js](https://github.com/TigreGotico/phoonnx.js) (motor de voz) | Apache-2.0 |
| ONNX Runtime Web | MIT |
| Voz «Maider» (descarga puntual del usuario, no se redistribuye) | CC-BY 4.0 |
| Datos de voz [itzune/maider-dataset](https://huggingface.co/datasets/itzune/maider-dataset) | CC-BY 4.0 |
| Fuentes Atkinson Hyperlegible y Nunito | SIL OFL 1.1 |
| Código del propio proyecto | GPL-3.0-or-later |

Si en el futuro se quisiera publicar bajo una licencia permisiva (MIT/Apache-2.0) o propietaria, habría que **eliminar o sustituir eSpeak NG** por un fonemizador compatible. Esto no es asesoría legal; ante una distribución comercial, consulta con un profesional.

---

## 🔒 Privacidad

Sin backend, sin analítica, sin cuentas. Solo `localStorage` (`hitzbidaia.progress.v1`). **Ajustes → Borrar progreso** reinicia todo.

Hecho con React + TypeScript + Vite. 💜
