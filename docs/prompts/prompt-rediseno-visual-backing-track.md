# Prompt para Claude Code — Rediseño visual del módulo Backing Track

> Pegá este documento a Claude Code dentro del repositorio `Dmr343/guitar`.
> Es un rediseño **visual y de jerarquía de UI**, no de funcionalidad.
> Trabajá en una rama nueva: `git checkout -b rediseno-ui`.

---

## 0. Contexto

El módulo vive en `tools/backing-track/`. Funciona y suena bien, pero la UI es
una sola página larga y vertical donde todo tiene el mismo peso visual. Hay que
mejorar **jerarquía, densidad y estética** sin romper nada.

Los tres archivos del rediseño son:

- `tools/backing-track/index.html` — estructura (138 líneas)
- `tools/backing-track/styles.css` — estética (622 líneas)
- `tools/backing-track/app.js` — genera DOM dinámico (1134 líneas)

Antes de tocar nada, leé los tres completos. El resto de módulos
(`engine.js`, `presets.js`, `voicing.js`, etc.) **no se tocan** salvo lo que se
indique explícitamente en la sección 6.

---

## 1. Restricciones duras

1. **Sin build tooling.** El módulo es HTML + CSS + JS plano con scripts
   vendorizados. No agregar npm, bundlers, frameworks ni dependencias nuevas.
2. **No romper la carga de scripts.** El orden de `<script>` al final de
   `index.html` (Tone.js, WebAudioFont, `shared/theory.js`,
   `intervallic/progression-model.js`, y los módulos del backing track) es un
   grafo de dependencias — mantenelo intacto.
3. **No tocar la integración con el Atlas** ni los módulos compartidos.
4. **Mantener todos los `id` que `app.js` consulta** (ver sección 2). El
   rediseño es de marcado y estilo; la lógica solo cambia donde se indica.
5. **Conservar la paleta y la identidad visual del repo** (ver sección 7). No
   convertirlo a otra estética: mejorar la que ya tiene.

---

## 2. Contrato con app.js — IDs que NO se pueden renombrar

`app.js` obtiene estos elementos por `id` con `getElementById`. Podés moverlos
de lugar, reagruparlos y reestilizarlos, pero **el `id` debe seguir existiendo**:

```
btn-play, ctl-tempo, val-tempo, ctl-volume, val-volume, ctl-loop,
status, diag-voices, chord-strip, chord-editor, prog-select, new-root,
new-quality, btn-add-chord, btn-clear-prog, tracks, add-tipo, btn-add,
preset-editor, arrange-panel, proj-name, btn-save-proj, proj-select,
btn-load-proj, btn-del-proj, btn-export, btn-import, import-file,
mode-practica, mode-arreglo, subdiv-select, beat-meter
```

Las clases que `app.js` genera o alterna por JS también deben seguir
existiendo con el mismo nombre (podés cambiar **cómo se ven**, no su nombre):
`chord-chip`, `selected`, `active`, `in-loop`, `chip-bars`, `track`,
`enabled`, `disabled`, `track-mute`, `track-tipo`, `track-preset`,
`track-pattern`, `track-vol`, `track-btn`, `beat-dot`, `beat-group`, `on`,
`downbeat`, `sub`, `playing`, `error`, `empty-hint`, `status`.

**Excepción autorizada:** la fusión de Play/Stop (sección 5.2) y el
drag-and-drop (sección 6) sí requieren editar lógica de `app.js`. Esos cambios
están permitidos y acotados; todo lo demás de `app.js` se mantiene.

---

## 3. Hallazgos del código actual — corregir de paso

1. **Regla CSS `.beat-dot` duplicada.** Está definida dos veces en
   `styles.css`: una vez alrededor de la línea 488 (con tamaño, texto centrado,
   variantes `.sub` / `.downbeat`) y otra vez al final, alrededor de la línea
   611 (que la pisa con otro `width/height` y rompe el centrado del número).
   Consolidar en una sola definición coherente.
2. **`html { zoom: 1.4; }`** (línea ~24). Es un hack no estándar y es la razón
   por la que la página se ve gigante y hay que alejar el zoom del navegador
   para que entre. Reemplazar por un dimensionado correcto: tipografía y
   espaciados con valores reales, layout que entre en pantalla sin `zoom`.
3. **Todo dentro de una sola columna** `.panel` de `max-width: 720px`, apilado
   verticalmente con el mismo peso. Esto es lo central a rediseñar.

---

## 4. Objetivos del rediseño

La herramienta tiene **dos estados de uso** que la UI hoy no distingue:

- **Configurar** un track: progresión, pistas, presets, proyecto.
- **Tocar**: solo importa qué acorde suena, cuál sigue, y dónde va el pulso.

El rediseño separa esas dos zonas y le da todo el peso visual a la de toque.

---

## 5. Especificación por zonas

### 5.1 Panel de toque (zona héroe)

Crear, arriba del todo, un bloque destacado que reúna lo que se mira **mientras
se toca la guitarra**, legible de un vistazo y desde cierta distancia:

- **Acorde actual**, tipografía grande (el elemento más prominente de toda la
  página). Es lo que hoy solo se ve como un chip con borde fino.
- **Acorde siguiente**, más chico, al lado, claramente subordinado. Anticipar
  el cambio es la mitad del ejercicio.
- **Metrónomo visual** (`#beat-meter`) integrado en este bloque, junto al
  acorde — hoy está suelto y chico.
- **Estado** (`#status`) y **tempo** integrados aquí, no flotando sueltos.
- **Tira de progresión** como indicador de posición: los `.chord-chip` se
  encienden en secuencia (la clase `active` ya la alterna `highlightChord`).

Para el acorde actual/siguiente: o agregás dos contenedores nuevos en este
bloque y que `app.js` los actualice desde el callback `engine.onChordChange`
(que ya existe, ver línea ~1072), o derivás el "siguiente" de `model`. Si
agregás elementos nuevos, ponéles `id` propios y cableálos en `app.js` de forma
acotada.

### 5.2 Botón único Play / Pausa

Hoy son dos botones (`#btn-play` y `#btn-stop`) que se habilitan/deshabilitan
mutuamente. Fusionarlos en **un solo control**:

- Eliminar `#btn-stop` de `index.html`.
- `#btn-play` pasa a ser un toggle: si está detenido, reproduce; si está
  sonando, detiene. Cambiá su etiqueta/ícono según el estado.
- En `app.js`: unificar los handlers de `btnPlay`/`btnStop` (líneas ~939-955)
  en uno solo, y ajustar el handler de `engine.onTransport` (línea ~1094) y
  cualquier referencia a `btnStop` para que operen sobre el botón único.
- Mantener el `id` `btn-play`.

### 5.3 Configuración colapsable

Toda la zona de configuración (Compás, Progresión, Pistas, Proyecto) va dentro
de un contenedor colapsable, visualmente separado del panel de toque:

- Un encabezado "Configuración" con un control de plegado (chevron o similar).
- **Al darle Play, la configuración se colapsa automáticamente**; al detener,
  se vuelve a expandir. El usuario también puede plegarla/expandirla a mano.
- Implementar el colapso con CSS (transición de `max-height`/`opacity`); el
  toggle automático se dispara desde los callbacks de transporte en `app.js`.
- **Importante:** no usar `display:none` para el panel de modo arreglo ni
  romper su lógica — el colapso es del contenedor de configuración como un
  todo, y `#arrange-panel` sigue funcionando como hoy dentro de él.

### 5.4 Progresión y editor de acordes

- La tira `#chord-strip` se mantiene, reestilizada.
- En `#chord-editor` (lo genera `renderEditor`, líneas ~288-336): **eliminar
  los botones de navegación `◀` y `▶`** — reordenar acordes pasa a hacerse por
  drag-and-drop (sección 6). El selector de raíz, el de calidad, el stepper de
  compases y el botón de eliminar (`✕`) se mantienen, reestilizados y más
  legibles.

### 5.5 Pistas

Cada fila `.track` la genera `makeTrackRow` (líneas ~352-431). Rediseñarla:

- **Reemplazar los botones `▲` y `▼`** (subir/bajar, líneas ~416-421) por un
  **drag handle** para reordenar arrastrando (sección 6). Como el módulo usa
  glifos de texto y no una librería de íconos, usá un glifo de asa coherente
  (p. ej. `⠿` / `⣿`) o un asa dibujada con CSS.
- Mantener los demás controles de la fila (`track-mute`, `track-tipo`,
  `track-preset`, `track-pattern`, `track-vol`, el engranaje `⚙` de editar
  sonido, y el `✕` de quitar), pero con **íconos legibles** y mayor área de
  click — hoy son de 22px y muy apretados. Tooltips claros en cada uno.

### 5.6 Jerarquía de botones

Hoy casi todo es `.btn.secondary`, gris e indistinto. Establecer tres niveles
visuales, dentro de la paleta del repo:

- **Primario** (acción principal de su zona): Play, Guardar proyecto.
- **Secundario** (acciones normales): `+ Acorde`, `+ Agregar instrumento`,
  Cargar, Exportar, Importar.
- **Destructivo** (atenuado / tono de alerta): `Limpiar` progresión, `Borrar`
  proyecto, el `✕` de quitar pista/acorde.

### 5.7 Proyecto

La sección Proyecto tiene cinco botones de texto anchos (Guardar, Cargar,
Borrar, Exportar JSON, Importar JSON). Compactar visualmente:

- `Guardar` como botón primario junto al input de nombre.
- `Cargar` junto al `<select>` de proyectos.
- `Exportar` / `Importar` / `Borrar` como botones de ícono compactos con
  tooltip, no como botones de texto anchos. `Borrar` en estilo destructivo.
- Mantener todos los `id` (sección 2) y el `<input type="file" id="import-file">`.

---

## 6. Drag-and-drop — detalle técnico

Dos reordenamientos por arrastre: acordes de la progresión y pistas.

### 6.1 Acordes (`#chord-strip`)

- Los `.chord-chip` los genera `renderChords` (líneas ~215-241), cada uno con
  `dataset.idx`. Hacerlos arrastrables (HTML5 Drag and Drop: `draggable`,
  `dragstart`, `dragover`, `drop`).
- En el `drop`, calcular índice origen y destino y llamar a
  **`model.moveChord(srcIdx, destIdx)`** — esa API **ya existe** en
  `intervallic/progression-model.js` y acepta origen y destino arbitrarios;
  dispara el `onChange` del modelo, que ya re-renderiza la tira y el editor.
- El clic simple sobre un chip debe seguir funcionando (seleccionar acorde;
  Shift+clic marca loop). HTML5 DnD distingue arrastre de clic de forma
  natural; verificá que no se rompa esa interacción.

### 6.2 Pistas (`#tracks`)

- Las filas `.track` tienen `dataset.id`. Hacerlas arrastrables desde el drag
  handle nuevo (sección 5.5).
- `engine.moveTrack(id, dir)` **solo mueve ±1 posición**, no a un índice
  arbitrario. Para soltar una pista en cualquier posición, **llamá
  `engine.moveTrack` en bucle** hasta que la pista alcance el índice destino.
  Así no hace falta tocar `engine.js`. (Alternativa, solo si lo ves más limpio:
  agregar un `moveTrackTo(id, index)` a `engine.js` y exponerlo — pero el
  bucle es preferible para no tocar `engine.js`, que está en revisión.)
- Tras el reordenamiento, llamar a `refreshTracks()` para repintar.

---

## 7. Estética — mantener la identidad del repo

El módulo ya tiene su paleta, definida en `:root` de `styles.css`: fondo
oscuro, texto cálido (`--text` arena), acento dorado (`--gold`) y coral
(`--accent`) propio del backing track. **Conservar esa paleta y la tipografía
del repo.** El objetivo no es cambiar el lenguaje visual sino ordenarlo:

- Mejorar **jerarquía** (tamaños, peso, contraste) para que lo importante
  resalte y lo secundario ceda protagonismo.
- Mejorar **densidad y ritmo vertical** (espaciados consistentes, agrupar lo
  relacionado, separar lo distinto).
- En pantallas anchas, evaluar un layout de **dos columnas** (panel de toque a
  un lado, configuración al otro) usando CSS responsivo; en pantallas angostas
  cae a una columna. Esto es opcional pero deseable.
- Mantener accesibilidad: foco visible, contraste suficiente, áreas de click
  cómodas, tooltips en los controles de ícono.

---

## 8. Orden de trabajo sugerido

1. Corregir los hallazgos de la sección 3 (`.beat-dot` duplicado, quitar
   `zoom: 1.4`) y verificar que la página sigue funcionando.
2. Reestructurar `index.html`: panel de toque arriba, contenedor de
   configuración colapsable abajo. Conservar todos los `id`.
3. Fusionar Play/Stop (5.2).
4. Reescribir `styles.css` para la nueva jerarquía, dentro de la paleta.
5. Panel de toque: acorde actual/siguiente + metrónomo + estado (5.1).
6. Colapso automático de configuración al reproducir (5.3).
7. Drag-and-drop de acordes y de pistas (6); quitar `◀▶` y `▲▼`.
8. Jerarquía de botones y compactado de la sección Proyecto (5.6, 5.7).
9. Layout de dos columnas responsivo (7), si el tiempo lo permite.

Hacé commits chicos por paso y verificá la herramienta en el navegador después
de cada uno (`file://` debe seguir funcionando, sin internet).

---

## 9. Criterios de aceptación

- [ ] La herramienta carga y suena exactamente como antes (lógica intacta).
- [ ] Funciona abriendo `index.html` con `file://`, sin servidor ni internet.
- [ ] Todos los `id` de la sección 2 siguen existiendo.
- [ ] Play y Stop son un único botón toggle.
- [ ] La configuración se colapsa al reproducir y se expande al detener.
- [ ] El acorde actual se ve grande; el siguiente, subordinado al lado.
- [ ] Los acordes de la progresión se reordenan arrastrando (`model.moveChord`).
- [ ] Las pistas se reordenan arrastrando desde un drag handle.
- [ ] Los botones `◀▶` del editor de acordes y `▲▼` de las pistas fueron
      eliminados.
- [ ] Los botones tienen jerarquía clara (primario / secundario / destructivo).
- [ ] Se eliminó `zoom: 1.4` y la regla `.beat-dot` duplicada.
- [ ] Se conserva la paleta y la identidad visual del repo.
- [ ] No se agregaron dependencias ni build tooling.
