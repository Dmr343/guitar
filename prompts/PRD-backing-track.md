# PRD — Módulo de Backing Tracks

## Problem Statement

Como guitarrista que practica improvisación, necesito un acompañamiento sobre el
cual tocar siguiendo los cambios de acorde. Hoy el repositorio tiene el
*Intervalic Atlas*, que me deja construir y visualizar progresiones, pero no me
da un acompañamiento real (bajo, acordes, batería, percusión, pads) para
improvisar encima.

Además, no quiero quedar atado a una única paleta de sonidos: quiero poder
elegir, editar, crear y guardar mis propios sonidos, combinarlos distinto en
cada sesión, y reencontrar mis cambios la próxima vez que abra la herramienta.
También quiero un espacio para aprender producción/arreglo: modificar groove,
densidad, dinámica y voicings y escuchar cómo cada decisión cambia el resultado.

## Solution

Un **módulo de backing tracks** autónomo dentro del repo (`tools/backing-track/`),
construido sobre **Tone.js**, que genera un acompañamiento estático en loop con
tempo fijo sobre una progresión de acordes. El módulo:

- Funciona de forma **autónoma**: tiene su propio `index.html`, abrible
  directamente (`file://`, sin servidor, sin internet). Trae progresiones de
  fábrica y un constructor de acordes propio.
- Reutiliza el **constructor de acordes del Intervalic Atlas** (mismo modelo de
  datos y mismo comportamiento) para ingresar/editar progresiones.
- Puede **recibir una progresión del Atlas** vía un botón "Enviar a backing
  track", con acoplamiento mínimo (handoff por `localStorage`).
- Maneja una **lista dinámica de pistas de instrumento** (bajo, acordes,
  batería, percusión, pad, lead): el usuario agrega, quita, silencia y reordena.
- Tiene un sistema de **presets en tres niveles**: elegir de una librería de
  fábrica, editar con controles y guardar como preset nuevo, o diseñar desde
  cero. Los presets de fábrica son inmutables; la edición trabaja sobre una
  copia.
- Persiste entre sesiones en `localStorage` (librería de presets del usuario +
  proyectos) y permite **exportar/importar** como JSON.
- Tiene **dos modos**: *práctica* (acompañamiento estático con indicador visual
  del acorde actual) y *arreglo* (editar groove, densidad, dinámica,
  humanización y voicings en vivo). Ambos completos en la v1.

La decisión arquitectónica rectora es la **separación motor / datos**: el motor
(Tone.Transport, scheduling, loop, modos) es código fijo que no conoce sonidos
concretos; los instrumentos, presets y patrones son objetos de datos.

## User Stories

### Acceso y andamiaje
1. Como guitarrista, quiero abrir `tools/backing-track/index.html` directamente
   desde el sistema de archivos, para usar el módulo sin servidor ni internet.
2. Como guitarrista, quiero encontrar una tarjeta del módulo en la página índice
   de herramientas (`tools/index.html`), para descubrir y acceder al módulo.
3. Como guitarrista, quiero que el módulo cargue Tone.js y los samples desde
   archivos vendorizados localmente, para que funcione 100% offline.
4. Como usuario del Atlas, quiero que el Atlas y el resto del repo sigan
   funcionando exactamente igual que antes, para no perder nada de lo que ya uso.

### Progresión de acordes
5. Como guitarrista, quiero que el módulo abra con una progresión de fábrica
   cargada, para empezar a tocar sin configurar nada.
6. Como guitarrista, quiero elegir entre varias progresiones de fábrica por
   estilo (blues, modal, pop, jazz...), para practicar distintos contextos.
7. Como guitarrista, quiero construir una progresión manualmente con un
   constructor acorde-por-acorde idéntico al del Atlas (root + calidad +
   compases), para no aprender una interfaz nueva.
8. Como guitarrista, quiero editar la progresión (agregar, quitar, reordenar
   acordes, cambiar duración en compases), para ajustar el acompañamiento.
9. Como usuario del Atlas, quiero un botón "Enviar a backing track" en el Atlas,
   para mandar la progresión que armé al módulo con un clic.
10. Como guitarrista, quiero que la progresión enviada desde el Atlas se cargue
    automáticamente al abrir el módulo, para continuar sin pasos manuales.

### Reproducción — modo práctica
11. Como guitarrista, quiero un botón Play que inicie el audio tras mi gesto,
    para que el navegador permita reproducir sonido.
12. Como guitarrista, quiero Play/Stop del acompañamiento, para controlar la
    práctica.
13. Como guitarrista, quiero que el acompañamiento se repita en loop con tempo
    fijo, para tener un metrónomo armónico estable sobre el cual improvisar.
14. Como guitarrista, quiero ajustar el tempo (BPM), para practicar a distintas
    velocidades.
15. Como guitarrista, quiero un indicador visual que resalte el acorde que está
    sonando, sincronizado con el motor, para aprender la progresión.
16. Como guitarrista, quiero un control de volumen general, para equilibrar el
    nivel con mi guitarra.
17. Como guitarrista, quiero activar/desactivar el loop, para detener al final
    de la progresión si lo necesito.

### Pistas de instrumento
18. Como guitarrista, quiero agregar una pista de instrumento eligiendo tipo
    (bajo, acordes, batería, percusión, pad, lead) y preset, para armar mi
    acompañamiento.
19. Como guitarrista, quiero quitar una pista, para simplificar el
    acompañamiento.
20. Como guitarrista, quiero silenciar/activar una pista, para escuchar
    combinaciones.
21. Como guitarrista, quiero reordenar las pistas, para organizar mi mezcla.
22. Como guitarrista, quiero un control de volumen por pista, para balancear el
    acompañamiento.
23. Como guitarrista, quiero que el bajo toque la fundamental del acorde, para
    tener un ancla auditiva del cambio.
24. Como guitarrista, quiero que la pista de acordes toque el acorde completo,
    para escuchar la armonía.
25. Como guitarrista, quiero una pista de batería con kit completo
    (bombo/caja/hats/platillos) gobernada por un patrón multi-lane, para tener
    base rítmica.
26. Como guitarrista, quiero pistas de percusión separadas (bongós, congas,
    shakers), para enriquecer el groove.

### Presets — nivel 1: elegir
27. Como guitarrista, quiero un dropdown de presets por pista, para cambiar el
    sonido rápido.
28. Como guitarrista, quiero varios presets de fábrica por tipo de instrumento
    (p. ej. bajo redondo / punchy / subgrave), para tener variedad sin diseñar
    nada.

### Presets — nivel 2: editar
29. Como productor aprendiz, quiero un panel de edición con sliders y selectores
    (forma de onda, ADSR, filtro frecuencia/Q, niveles de efectos), para
    modificar un preset en tiempo real.
30. Como productor aprendiz, quiero escuchar los cambios del preset en vivo
    mientras muevo los controles, para entender qué hace cada parámetro.
31. Como productor aprendiz, quiero que editar un preset afecte solo a esa pista
    (copia de trabajo) y no a otras pistas ni a los presets de fábrica, para
    evitar cambios sorpresa.
32. Como productor aprendiz, quiero guardar el resultado editado como un preset
    nuevo con nombre propio, para reutilizarlo después.

### Presets — nivel 3: diseñar desde cero
33. Como productor aprendiz, quiero partir de un preset vacío y construir un
    sonido íntegramente moviendo parámetros, para crear sonidos propios.

### Efectos
34. Como productor aprendiz, quiero encadenar efectos (reverb, distorsión,
    chorus) por preset, para dar carácter al sonido.

### Persistencia
35. Como guitarrista, quiero que mis presets creados/editados se guarden en una
    librería del usuario que persiste entre sesiones, para reencontrarlos.
36. Como guitarrista, quiero guardar un proyecto/sesión (progresión, tempo,
    modo, lista de pistas con preset/patrón/volumen/estado), para retomar más
    tarde.
37. Como guitarrista, quiero nombrar, cargar y borrar proyectos, para gestionar
    varias sesiones.
38. Como guitarrista, quiero que al reabrir la app todo quede como lo dejé, para
    no reconfigurar nada.
39. Como guitarrista, quiero exportar mi librería de presets y mis proyectos
    como JSON, para respaldarlos.
40. Como guitarrista, quiero importar un JSON de librería/proyectos, para
    restaurar o portar mi configuración.

### Modo arreglo
41. Como productor aprendiz, quiero alternar entre modo práctica y modo arreglo,
    para cambiar de objetivo de trabajo.
42. Como productor aprendiz, quiero editar el patrón rítmico de cada pista en un
    step sequencer (grilla de 16 pasos por compás, con velocity por paso), para
    crear grooves propios.
43. Como productor aprendiz, quiero elegir variantes de patrón (A/B, con/sin
    fill) por pista, para introducir variación.
44. Como productor aprendiz, quiero controlar la densidad activando/silenciando
    pistas dentro del modo arreglo, para escuchar arreglos más o menos cargados.
45. Como productor aprendiz, quiero ajustar la dinámica (variación de velocity
    por nota), para que el acompañamiento no suene plano.
46. Como productor aprendiz, quiero activar humanización (micro-desplazamientos
    de timing y volumen) con intensidad regulable, para un resultado menos
    mecánico.
47. Como productor aprendiz, quiero elegir el voicing de los acordes
    (inversiones 1ª/2ª/3ª, cerrado vs abierto/drop-2, octava del bajo), para
    cambiar el color armónico.
48. Como productor aprendiz, quiero ocultar el indicador visual del acorde en
    modo arreglo, para entrenar el oído.
49. Como productor aprendiz, quiero escuchar en vivo el efecto de cada cambio de
    arreglo, para aprender produciendo.

### Robustez
50. Como guitarrista, quiero que al quitar una pista o cargar otro proyecto los
    nodos de audio se liberen correctamente, para que no se acumulen
    instrumentos huérfanos ni se degrade el rendimiento.
51. Como guitarrista, quiero un fallback claro si falla la carga de un sample,
    para que la app no quede en un estado roto.

## Implementation Decisions

### Restricciones y entorno
- El módulo vive en `tools/backing-track/`, **completamente separado**. No se
  modifica ni se rompe el Intervalic Atlas ni ninguna otra parte del repo, salvo
  dos toques mínimos y aislados (ver "Integración").
- **Sin ES modules**: patrón IIFE + namespace global, igual que el resto del
  repo, para funcionar en `file://`. El guard `tools/shared/check-no-modules.sh`
  debe seguir pasando.
- **Tone.js vendorizado** localmente (carpeta `vendor/` dentro del módulo),
  cargado con `<script>` normal como global `Tone`. No CDN.
- **Samples vendorizados** localmente: subset de piano (Salamander, ~una nota
  cada 3), un kit de batería acústica y samples de percusión (bongós, congas,
  shakers). El módulo soporta tanto síntesis como samples según el preset.
- Solo compás **4/4** en la v1. Los patrones se expresan sobre grilla de
  semicorcheas (16 pasos por compás).

### Arquitectura motor / datos
- **Motor** (código fijo): reloj `Tone.Transport`, scheduling con `Tone.Part` /
  `Tone.Loop` / `Tone.Sequence`, loop, manejo de modos, lista dinámica de
  pistas. El motor no conoce sonidos concretos; recibe presets/patrones (datos)
  y construye instrumentos a partir de ellos.
- **Datos**: presets (objetos de configuración serializables), patrones
  (grillas de pasos), progresiones de fábrica. Agregar un sonido nuevo = agregar
  una entrada de datos, sin tocar el motor.

### Módulos a construir
- **Voicing resolver** (módulo profundo, lógica pura): dado `(root, quality,
  voicing, inversión, octava base)` devuelve un array de pitches con octava
  concreta. Cubre que el modelo del Atlas no almacena octavas. Voicings
  acotados: fundamental, inversiones 1ª/2ª/3ª, cerrado vs abierto (drop-2),
  octava del bajo.
- **Step-grid / pattern model** (módulo profundo, lógica pura): representación y
  manipulación de patrones como grilla de pasos (16 pasos/compás), hits
  `{ paso, velocity }` (y lane para batería); operaciones de toggle, resize y
  consulta de hits.
- **Event scheduler** (módulo profundo, lógica pura): dado `(progresión, tempo,
  lista de pistas, patrones, voicings)` produce una **lista de eventos
  temporizados** (qué nota/golpe, en qué pista, en qué tiempo, con qué
  velocity). Separa el cálculo de *qué suena cuándo* del audio real. El motor
  consume esta lista para alimentar `Tone.Part`/`Tone.Loop`.
- **Humanize** (módulo profundo, lógica pura): aplica micro-offsets de timing y
  velocity a una lista de eventos, con intensidad parametrizable y semilla
  determinista para poder testear.
- **Storage** (módulo profundo, testeable con adapter en memoria): persistencia
  en `localStorage` de la librería de presets del usuario y de los proyectos;
  export/import JSON; migraciones versionadas. Inspirado en el patrón
  `Persistence` + `LocalStorageAdapter` del Atlas.
- **Integration translator** (lógica pura): traduce una progresión en el formato
  nativo del Atlas (`{ root, quality, bars }`) al formato que consume el motor.
- **Instruments factory** (módulo shallow, produce nodos Tone.js): construye un
  instrumento Tone.js + cadena de efectos a partir de un preset (`synth` o
  `sampler`). La señal fluye instrumento → efectos → salida con `.chain()`.
  Soporta al menos reverb, distorsión y chorus.
- **Engine** (módulo shallow, audio): orquesta Transport, scheduling real, loop,
  modos y la lista dinámica de pistas; usa el event scheduler y la instruments
  factory. Libera nodos con `.dispose()` al quitar pistas o cargar proyectos.
- **UI** (módulo shallow, DOM): controles de transporte, gestión de pistas,
  dropdowns de presets, panel de edición de presets, step sequencer del modo
  arreglo, indicador visual del acorde.
- **Datos de fábrica**: librería de presets (varios por tipo de instrumento),
  librería de patrones/grooves, progresiones de fábrica por estilo.

### Modelo de datos
- **Progresión / acorde**: se reutiliza el modelo del Atlas — acorde
  `{ root, quality, bars }`, calidades `major | minor | dom7 | maj7 | min7`. El
  cálculo de notas se apoya en `tools/shared/theory.js` (`buildChord`).
- **Pista de instrumento**: objeto con al menos `id`, `tipo`
  (`bajo | acordes | bateria | percusion | pad | lead`), `presetId`, `enabled`,
  `volumen`, `patternId`.
- **Preset**: objeto serializable con `id`, `nombre`, `tipo`, `motor`
  (`synth | sampler`), `config` (oscilador, envolvente ADSR, filtro,
  filterEnvelope) y `efectos` (lista). Los presets de fábrica son inmutables; la
  edición opera sobre una copia de trabajo y "guardar como nuevo" agrega un
  preset a la librería del usuario.
- **Proyecto**: progresión, tempo, modo activo y lista de pistas (con
  referencias a presets/patrones por `id`, volumen y estado). Guarda *qué
  presets usa*, no los sonidos en sí.

### Integración con el Intervalic Atlas
- Handoff por `localStorage`: el Atlas escribe la progresión en una clave
  acordada; el módulo la lee al abrir y limpia la clave.
- Dos toques mínimos y aislados a archivos existentes, sin alterar el
  comportamiento actual:
  1. Botón "Enviar a backing track" en el Atlas.
  2. Tarjeta del módulo en `tools/index.html`.
- El constructor de acordes del módulo reutiliza el modelo y comportamiento del
  Atlas (`progression-model.js` + `shared/theory.js`); el Atlas no importa
  lógica del módulo.

### Notas técnicas
- El audio arranca solo tras gesto del usuario: el botón Play hace
  `await Tone.start()` antes de iniciar el Transport.
- Tempo, loop y scheduling vía la API de Transport de Tone.js.
- Acordes/bajo con `Tone.Part`; patrones de batería repetitivos con `Tone.Loop`
  o `Tone.Sequence`.
- Liberar nodos (`.dispose()`) al quitar pistas o recargar proyectos.
- Código modular, comentado, en español, coherente con el repo.

## Testing Decisions

- **Qué hace un buen test**: testea solo el *comportamiento externo* observable
  del módulo a través de su interfaz pública, no detalles de implementación. Los
  módulos profundos de lógica pura se testean sin navegador ni audio:
  entran datos, se verifica la salida. La humanización usa semilla determinista
  para ser testeable.
- **Harness**: el harness propio del repo, `GuitarShared.testRunner`
  (`describe / it / assertEq / assertArrayEq / assert`), con un nuevo archivo
  `.test.js` por módulo, ejecutado desde el runner existente.
- **Prior art**:
  - `tools/intervallic/persistence.test.js` — testea persistencia con
    `MemoryStorageAdapter` en memoria; modelo para los tests de Storage.
  - `tools/intervallic/progression-model.test.js` — testea lógica de
    progresión pura.
  - `tools/intervallic/transport-controller.test.js` — usa `FakeClock` /
    `FakeModel`; modelo para testear lógica temporal sin audio real.
  - `tools/shared/theory.test.js` — testea funciones musicales puras; modelo
    para el voicing resolver.
- **Módulos a testear** (confirmado con el desarrollador):
  - Voicing resolver — resolución de notas y octavas por calidad, inversiones y
    voicings.
  - Event scheduler — cálculo de eventos temporizados a partir de progresión +
    patrones + tempo.
  - Step-grid / pattern model — operaciones de manipulación y consulta de
    grillas.
  - Humanize — offsets de timing/velocity con semilla determinista.
  - Storage — persistencia, export/import y migraciones.
  - Integration translator — traducción de la progresión del Atlas al formato
    del motor.
- **No se testean automáticamente**: Engine (audio real con Tone.js),
  Instruments factory (produce nodos Tone.js) y UI (DOM). Se verifican
  manualmente en navegador.

## Out of Scope

- No modificar ni "mejorar" el Intervalic Atlas más allá de los dos toques
  mínimos de integración descritos.
- No agregar backend ni base de datos: todo es cliente + `localStorage`.
- No grabación de audio ni exportación a WAV/MP3 (mejora futura).
- Compases distintos de 4/4 (3/4, 6/8, etc.) — la arquitectura debe permitir
  agregarlos después, pero no se implementan en la v1.
- Secciones de canción (intro/A/B con automatización por compás): el loop es
  uniforme. La densidad se maneja con activar/silenciar pistas y variantes A/B
  de patrón.
- Voicings ricos (drop-3, shell voicings, tensiones 9/11/13, voicings de jazz):
  la v1 solo cubre el conjunto acotado.
- Carga de Tone.js o samples por CDN: todo vendorizado para uso offline.

## Further Notes

- Orden de construcción sugerido (entregar incrementalmente, verificando en cada
  paso que el resto del repo sigue intacto): andamiaje + vendorizado de
  Tone.js/samples → datos de fábrica (presets, patrones, progresiones) →
  módulos puros (voicing, step-grid, scheduler, humanize) → instruments factory
  → engine + modo práctica funcional → UI (transporte, pistas, indicador) →
  storage + export/import → panel de edición de presets → integration → modo
  arreglo (step sequencer, densidad, dinámica, humanización, voicings).
- El modo práctica debe quedar completo y funcional antes de empezar el modo
  arreglo, aunque ambos entran en la v1.
- Coherencia visual: reutilizar la paleta y tipografía del repo (variables CSS
  `--bg`, `--surface`, `--text`, `--gold`, fuente Trebuchet MS, estética oscura
  con acento dorado).
- Restricción de memoria del proyecto: las herramientas HTML deben funcionar con
  `file://` — sin build step, sin ES modules.
