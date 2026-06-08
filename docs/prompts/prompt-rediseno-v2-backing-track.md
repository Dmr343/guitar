# Prompt para Claude Code — Backing Track, rediseño v2

> Segunda tanda de ajustes sobre el módulo `tools/backing-track/`, ya
> rediseñado en la v1. Pegá este documento a Claude Code.
> Rama nueva: `git checkout -b rediseno-v2`.

---

## 0. Contexto

El rediseño v1 ya está aplicado: panel de toque con acorde grande, botón único
Play/Detener, configuración colapsable, drag-and-drop. Funciona y se ve bien.

Quedan dos cosas:

- **Parte A — Reflujo y espacio.** Al colapsar la configuración queda media
  pantalla vacía: el panel de toque sigue anclado a su columna izquierda en vez
  de aprovechar el lugar libre.
- **Parte B — Edición de pistas en vivo (feature nueva).** Poder cambiar el
  patrón de una pista (ritmo de batería, figura del bajo), su preset o su
  volumen **mientras el loop suena**, sin detener la reproducción.

Antes de tocar nada, **inspeccioná el estado actual** de `index.html`,
`styles.css`, `app.js`, y para la Parte B también `engine.js` y `scheduler.js`.

---

## 1. Restricciones

1. Sin build tooling ni dependencias nuevas. Debe seguir funcionando con
   `file://`, sin internet.
2. Mantener el contrato con `app.js`: los `id` y las clases que el JS consulta
   o alterna no se renombran (sí se pueden reestilizar y reubicar).
3. La Parte B sí requiere tocar `engine.js` / `scheduler.js` — está autorizado
   y acotado a lo que se describe en B3.
4. Commits chicos; verificar en el navegador después de cada paso.

---

## 2. Parte A — Reflujo y aprovechamiento del espacio

### A1. Reflujo de columnas al colapsar la configuración

Hoy: en pantalla ancha hay dos columnas (panel de toque | configuración).
Cuando la configuración se colapsa, su columna queda vacía pero sigue ocupando
la mitad del ancho.

Objetivo: el layout debe **reflujar**, no rellenar. Cuando la configuración
está colapsada (lo que ocurre al reproducir), el panel de toque pasa a un
layout de **una sola columna centrada**, con un ancho cómodo de lectura (no los
1200px completos; algo como 720-860px centrado). Cuando la configuración se
expande, vuelve el layout de dos columnas. Resolver con CSS (cambiar
`grid-template-columns` / `max-width` según una clase de estado en un contenedor
padre que `app.js` ya alterna al reproducir/colapsar).

### A2. Panel de toque protagonista en modo reproducción

Mientras suena, el panel de toque tiene toda la pantalla disponible — usala,
tanto a lo ancho como a lo alto:

- El acorde actual puede ser bastante más grande.
- La tira de progresión / chips, más alta y legible.
- El pulso (1-2-3-4), más prominente.

Esto puede hacerse con una clase de estado "reproduciendo" en el panel que
escale estos elementos. En modo configuración vuelven a su tamaño normal.

### A3. Header compacto

El bloque "Práctica de improvisación / Backing Track" ocupa demasiado techo y
no aporta nada mientras se toca. Compactarlo en general, y reducirlo aún más
(o atenuarlo) cuando se entra en modo reproducción.

### A4. Barra "Configuración" colapsada con vida

Colapsada, hoy es una franja larga y vacía con un triangulito gris perdido a la
derecha. Mejorarla:

- Agregar un subtítulo que diga qué contiene, p. ej. "Configuración ·
  progresión, pistas, proyecto".
- El chevron debe ser claro y **toda la barra** debe ser clickeable para
  expandir/colapsar, no solo el triángulo.

### A5. Selector de subdivisión junto al pulso

El `<select id="subdiv-select">` ("Negra") flota arriba a la derecha, separado
del pulso que controla. Moverlo para que quede **pegado a los puntos 1-2-3-4**
del metrónomo — es su control directo.

### A6. Diagnóstico de voces fuera de la vista principal

`#diag-voices` ("Voces activas: 8 · máx 8") es un dato técnico de desarrollo.
Sacarlo de la vista principal: ocultarlo detrás de un modo debug (p. ej. un
toggle, o visible solo con un parámetro de URL `?debug`). No eliminar el
elemento ni la lógica — solo que no se muestre en uso normal.

### A7. Estado integrado al transporte

`#status` ("Sonando — modo práctica" / "Detenido") es texto suelto abajo.
Integrarlo al área de transporte, junto al botón Play/Detener — como texto
breve o un indicador de color. Mantener el `id`.

---

## 3. Parte B — Edición de pistas en vivo

### B1. Concepto

Practicar con un backing track incluye ajustar el groove mientras loopea:
cambiar el patrón de batería a uno más denso, cambiar la figura del bajo,
subir el volumen de una pista. Hoy la configuración se colapsa al reproducir,
así que esos controles quedan inaccesibles mientras suena. Hay que arreglar
eso — sin perder la limpieza visual del modo reproducción.

### B2. UI — la sección Pistas como "mixer en vivo"

La solución es **no colapsar la sección Pistas** junto con el resto de la
configuración. El colapso de "Configuración" sigue ocultando Progresión,
Proyecto, "+ Agregar instrumento", el editor de presets y el panel de arreglo —
pero la sección **Pistas permanece accesible**, en una variante compacta de
"mixer en vivo", visualmente integrada al panel de toque.

- **Modo configuración (detenido):** las filas `.track` se muestran completas
  (drag handle, preset, patrón, volumen, editar sonido, quitar).
- **Modo reproducción:** las mismas pistas se muestran en variante compacta —
  solo los controles que tiene sentido tocar en vivo: **mute, nombre, selector
  de patrón, volumen**. El drag handle, el botón de editar sonido y el de
  quitar se ocultan en esta variante.

Es la misma sección con dos densidades, no un componente nuevo. Cambiar la
figura del bajo = cambiar el `<select>` de patrón de la pista de bajo; cambiar
el ritmo de percusión = el selector de patrón de la pista de batería.

Esto además llena el espacio que hoy queda vacío al reproducir: el mixer en
vivo ocupa esa zona.

### B3. Motor — aplicar cambios sin cortar el audio

`engine.updateTrack(id, {...})` ya existe. Hay que asegurar que sus cambios se
apliquen **mientras el Transport está corriendo**, sin glitches ni notas
colgadas. Primero inspeccioná `engine.js` / `scheduler.js` para ver cómo se
construyen las partes (`Tone.Part`) y el loop; después implementá:

- **Volumen** (`volumen`): aplicar **al instante**, escribiendo en el nodo de
  ganancia de la pista. Sin reconstrucción, sin glitch.
- **Mute / activar** (`enabled`): al instante (silenciar/activar la ganancia de
  la pista).
- **Patrón** (`patternId`) y **preset** (`presetId`): requieren reconstruir la
  parte programada (y, para preset, el instrumento) de esa pista. Para que no
  haya cortes, **cuantizar el cambio al próximo límite de loop** (o de compás):
  programar la reconstrucción con `Tone.Transport.scheduleOnce` en el siguiente
  límite. Al reconstruir un instrumento por cambio de preset, liberar
  limpiamente las voces que estén sonando para no dejar notas colgadas.
- **Coalescing:** si el usuario hace varios cambios sobre la misma pista antes
  de que llegue el límite, que se aplique solo el estado final (no encolar
  varias reconstrucciones).
- Reconstruir **solo la pista afectada**, no todo el scheduler.

Resultado esperado: con el loop sonando, cambiás el patrón de batería y en el
siguiente ciclo (o compás) entra el patrón nuevo, fluido; subís un volumen y se
oye en el acto.

---

## 4. Orden de trabajo sugerido

1. A1 — reflujo de columnas al colapsar (el cambio de mayor impacto visual).
2. A3, A4 — header compacto y barra de configuración colapsada con vida.
3. A2 — agrandar el panel de toque en modo reproducción.
4. A5, A6, A7 — subdivisión junto al pulso, ocultar diagnóstico, estado integrado.
5. B2 — sección Pistas que no colapsa, con variante compacta de mixer en vivo.
6. B3 — aplicar cambios de pista en vivo en el motor (volumen/mute instantáneo;
   patrón/preset cuantizado al límite de loop).

---

## 5. Criterios de aceptación

- [ ] Al colapsar la configuración, el panel de toque reflujye a una columna
      centrada — no queda media pantalla vacía.
- [ ] En modo reproducción el acorde, el pulso y la tira de progresión se ven
      más grandes; en modo configuración vuelven a su tamaño normal.
- [ ] El header es más compacto y cede protagonismo al reproducir.
- [ ] La barra "Configuración" colapsada muestra qué contiene y es clickeable
      en toda su extensión.
- [ ] El selector de subdivisión está junto a los puntos del pulso.
- [ ] El diagnóstico de voces no se ve en uso normal (sí en modo debug).
- [ ] El estado de transporte está integrado junto al botón Play/Detener.
- [ ] La sección Pistas permanece accesible mientras suena, en variante
      compacta (mute, nombre, patrón, volumen).
- [ ] Con el loop sonando: cambiar el patrón de una pista lo aplica en el
      siguiente límite de loop/compás, sin cortes ni notas colgadas.
- [ ] Con el loop sonando: cambiar el volumen o el mute de una pista se aplica
      al instante.
- [ ] Varios cambios rápidos sobre una pista no encolan reconstrucciones; se
      aplica el estado final.
- [ ] Sigue funcionando con `file://` y sin dependencias nuevas.
