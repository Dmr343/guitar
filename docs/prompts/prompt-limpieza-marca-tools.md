# Prompt para Claude Code — Quitar el marco de "método/guía" y las referencias a Maru en `tools/`

> Pegá este documento a Claude Code dentro del repositorio `Dmr343/guitar`.
> Es un cambio de **contenido y marca**, no de funcionalidad.
> Trabajá en una rama nueva: `git checkout -b limpieza-marca`.

---

## 0. Contexto

El proyecto empezó como una guía de aprendizaje basada en el método de una
instructora (Maru Martinez), con fases y seguimiento de progreso. Con el tiempo
se volvió una colección de herramientas independientes. Hay que **quitar todo
el marco de "método/guía/fases" y toda referencia a Maru** en las páginas bajo
`tools/`, dejando una colección de herramientas neutra.

La landing `tools/index.html` **ya fue rediseñada** y es la referencia de la
marca nueva (nombre del proyecto, tono, estilo). **No la modifiques**; usala
como modelo de cómo deben quedar las demás páginas.

---

## 1. Alcance

Todas las páginas bajo `tools/` **excepto** `tools/index.html`:

- `tools/guia.html` (ver sección 4 — caso especial)
- `tools/diapason.html`
- `tools/escalas.html`
- `tools/acordes.html`
- `tools/improvisar.html`
- `tools/intervallic.html`
- `tools/oido.html`
- `tools/backing-track/` (todas sus páginas/archivos)

Primero **auditá cada archivo** (HTML, CSS embebido y JS embebido) antes de
editar. Listá lo que vas a cambiar por archivo y luego aplicá.

---

## 2. Qué quitar / reemplazar

1. **Nombre y atribución a Maru.** Cualquier aparición de "Maru", "Maru
   Martinez", "Método Maru Martinez", "basado en el método de…", y los enlaces
   a su canal de YouTube (`youtube.com/@marumartinezguitar` o similar).
   Eliminar el texto y el enlace. Si un footer queda vacío, dejarlo con texto
   neutro (p. ej. la línea de afinación) o quitarlo.

2. **Nombre del proyecto.** En `<title>`, encabezados y cualquier texto visible
   que diga "Guitarra con Maru" → reemplazar por el nombre neutro de la landing:
   **"Herramientas de Guitarra"**. (Si el usuario prefiere otro nombre, que lo
   indique antes; por defecto usá ese.)

3. **Marco de fases.** Etiquetas tipo "Fase 0 — Ignición", "Fase 2", "Fase 4 ·
   …", "tu ruta de aprendizaje", indicadores de fase, y el lenguaje de
   currículo/método. Quitarlos o reemplazarlos por texto neutro que describa la
   herramienta por lo que hace, no por su lugar en una ruta.

4. **Etiquetas de encabezado tipo "Método …".** Los *eyebrows* de cabecera que
   referencien el método. Si querés conservar un eyebrow, usá uno neutro
   coherente con la landing (p. ej. el tipo de herramienta).

5. **`html { zoom: 1.4; }`.** Esta regla no estándar aparece en varias páginas
   y obliga a alejar el zoom del navegador. La landing rediseñada ya la
   eliminó; quitala también de cada página de `tools/` y ajustá tipografías y
   espaciados a valores reales, para que al navegar entre páginas la escala no
   salte.

---

## 3. Progreso en localStorage — tratar con cuidado

Las herramientas escriben claves de progreso en `localStorage` (del tipo
`maru_progress_*`) que la **landing vieja** leía para una barra de progreso
global. La landing nueva ya **no** lee nada de eso.

Reglas:

- **No rompas datos guardados del usuario.** No renombres las claves de
  `localStorage` aunque contengan la palabra "maru": no son visibles para el
  usuario y renombrarlas borraría el progreso ya guardado. Dejalas como están.
- **Conservá las funciones de progreso que sirven por sí solas** dentro de cada
  herramienta (p. ej. el puntaje de un quiz, checklists internas). Eso es útil
  independientemente del marco de "guía".
- **Quitá solo la UI de progreso que solo tenía sentido como parte de la guía**
  (barras de "avance del método", indicadores de fase). Si dudás si una pieza
  de progreso es útil sola o solo servía a la guía, **no la borres: marcala** y
  dejá que el usuario decida.

---

## 4. Caso especial: `tools/guia.html`

La landing rediseñada **ya no enlaza** `guia.html` — esa tarjeta se quitó
porque era la guía del método. Por lo tanto `guia.html` quedó como archivo
huérfano.

**No la borres ni la rediseñes por tu cuenta.** Es una decisión del usuario:
- Si decide eliminarla, se borra el archivo.
- Si decide conservarla (reconvertida en otra cosa, sin marco de método), se
  trata aparte.

Dejá `guia.html` sin tocar y reportá su estado al final para que el usuario
decida.

---

## 5. Restricciones

1. **Sin cambios de funcionalidad.** Esto es limpieza de marca y contenido:
   HTML, textos, CSS. La lógica de cada herramienta no se toca (salvo quitar la
   UI de progreso de guía, sección 3).
2. **Sin build tooling ni dependencias nuevas.**
3. **No tocar `tools/index.html`** (ya está hecha) ni los módulos compartidos
   salvo para quitar referencias a Maru si las hubiera.
4. **Coherencia visual.** Encabezados, footers y `<title>` deben quedar
   alineados con la marca neutra de la landing nueva. El back-link
   "← Herramientas" se mantiene.
5. Commits chicos por archivo; verificá cada página en el navegador
   (`file://`, sin internet) después de editarla.

---

## 6. Relación con el rediseño visual del Backing Track

Hay otro prompt aparte para el **rediseño visual** del módulo
`tools/backing-track/`. Esta tarea (quitar Maru/fases) es distinta y más chica.

Para evitar conflictos: **hacé primero esta limpieza de marca** en
`backing-track/` (es solo texto: el `<title>` "Backing Track — Guitarra con
Maru" y cualquier mención), commiteala, y recién después se aplica el rediseño
visual sobre esa base.

---

## 7. Criterios de aceptación

- [ ] Ninguna página bajo `tools/` menciona a Maru ni enlaza su canal.
- [ ] No quedan etiquetas de "Fase X" ni lenguaje de ruta/método/currículo.
- [ ] Los `<title>` y encabezados usan el nombre neutro del proyecto.
- [ ] Se eliminó `html { zoom: 1.4; }` de todas las páginas y el dimensionado
      se ve correcto sin alejar el zoom del navegador.
- [ ] No se renombraron las claves de `localStorage` (datos del usuario
      intactos).
- [ ] Las funciones de progreso útiles por sí solas siguen funcionando; solo se
      quitó la UI de progreso propia de la guía.
- [ ] `tools/guia.html` quedó sin tocar y su estado fue reportado al usuario.
- [ ] Ninguna herramienta cambió de funcionalidad.
- [ ] No se modificó `tools/index.html`.
