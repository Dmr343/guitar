// help.js — botón de Ayuda (?) + modal compartido por todas las herramientas.
// IIFE, file:// safe. Sin ES modules, sin dependencias (usa I18N si está).
//
// Uso en cada página (antes de cerrar el body):
//   <script>window.HELP_KEY = 'intervallic';</script>
//   <script src="help.js"></script>        (o ../help.js en subcarpetas)
// El botón se inyecta solo y se ubica a la izquierda del toggle de idioma.
(function (W) {
  'use strict';
  var D = W.document;

  // ─────────────────────────── Contenido ───────────────────────────
  // Por herramienta: intro (1 línea), do[] (qué podés hacer), keys[][] (atajos).
  var C = {
    diapason: {
      title: { es: 'Diapasón', en: 'Fretboard' },
      intro: {
        es: 'Aprendé dónde está cada una de las 12 notas en todo el mástil.',
        en: 'Learn where each of the 12 notes lives across the whole fretboard.',
      },
      do: {
        es: [
          'Tocá una nota y se iluminan <b>todas</b> sus posiciones en el diapasón.',
          'Activá el <b>modo ejercicio</b> con metrónomo para medir qué tan rápido las ubicás.',
          'Ajustá la afinación y el rango de trastes.',
        ],
        en: [
          'Click a note and <b>all</b> its positions light up on the board.',
          'Turn on <b>exercise mode</b> with a metronome to measure how fast you find them.',
          'Adjust tuning and fret range.',
        ],
      },
      keys: null,
    },

    escalas: {
      title: { es: 'Escalas', en: 'Scales' },
      intro: {
        es: 'Visualizá patrones de escalas en el mástil y conectá sus posiciones.',
        en: 'Visualize scale patterns on the neck and connect their positions.',
      },
      do: {
        es: [
          'Elegí una escala y vela dibujada sobre todo el diapasón.',
          'Conectá las posiciones (CAGED) para moverte por todo el mástil.',
          'Probá lo que sabés con el <b>modo quiz</b>.',
        ],
        en: [
          'Pick a scale and see it drawn across the whole board.',
          'Connect the positions (CAGED) to move all over the neck.',
          'Test yourself with <b>quiz mode</b>.',
        ],
      },
      keys: null,
    },

    acordes: {
      title: { es: 'CAGED — 5 Formas', en: 'CAGED — 5 Shapes' },
      intro: {
        es: 'El sistema CAGED en 4 modos para dominar los acordes por todo el mástil.',
        en: 'The CAGED system in 4 modes to master chords across the whole neck.',
      },
      do: {
        es: [
          '<b>Forma:</b> una forma movible con cejilla; deslizala por semitonos.',
          '<b>Mapa:</b> las 5 formas de un mismo acorde a la vez.',
          '<b>Zona:</b> zona de improvisación con los chord tones por función.',
          '<b>Progresión:</b> cambios de acordes con metrónomo.',
        ],
        en: [
          '<b>Shape:</b> one movable barre shape; slide it by semitones.',
          '<b>Map:</b> all 5 shapes of the same chord at once.',
          '<b>Zone:</b> an improv zone with chord tones by function.',
          '<b>Progression:</b> chord changes with a metronome.',
        ],
      },
      keys: {
        es: [
          ['1 2 3 4', 'Cambiar de modo'],
          ['C A G E D', 'Seleccionar / togglear forma'],
          ['← →', 'Mover forma · acorde anterior/siguiente'],
          ['Espacio', 'Play / pausa (Progresión)'],
          ['M', 'Metrónomo auto / manual'],
          ['Shift+↑ ↓', 'BPM +5 / −5'],
          ['Esc', 'Detener metrónomo'],
        ],
        en: [
          ['1 2 3 4', 'Switch mode'],
          ['C A G E D', 'Select / toggle shape'],
          ['← →', 'Move shape · prev/next chord'],
          ['Space', 'Play / pause (Progression)'],
          ['M', 'Metronome auto / manual'],
          ['Shift+↑ ↓', 'BPM +5 / −5'],
          ['Esc', 'Stop metronome'],
        ],
      },
    },

    intervallic: {
      title: { es: 'Interval Atlas', en: 'Interval Atlas' },
      intro: {
        es: 'Mirá los intervalos del mástil sobre una progresión, para improvisar con contexto armónico.',
        en: 'See the neck intervals over a chord progression, to improvise with harmonic context.',
      },
      do: {
        es: [
          'Armá una progresión (<b>Libre</b> o <b>Diatónico</b>) y mirá los intervalos de cada acorde.',
          'Activá capas: chord tones, próximo acorde, todas las 12 notas, nombres de nota.',
          'Click en la <b>leyenda</b> para mostrar/ocultar grados.',
          'En <b>Escalas</b>, elegí una y se ilumina sobre el mástil con su fórmula.',
          'Filtrá trastes/cuerdas, ajustá BPM y reproducí con metrónomo. Guardá presets y favoritos.',
        ],
        en: [
          'Build a progression (<b>Free</b> or <b>Diatonic</b>) and see each chord\'s intervals.',
          'Toggle layers: chord tones, next chord, all 12 notes, note names.',
          'Click the <b>legend</b> to show/hide degrees.',
          'In <b>Scales</b>, pick one and it lights up on the neck with its formula.',
          'Filter frets/strings, set BPM and play with a metronome. Save presets and favorites.',
        ],
      },
      keys: {
        es: [
          ['Espacio', 'Play / pausa'],
          ['← →', 'Acorde anterior / siguiente'],
          ['↑ ↓', 'Más / menos compases del acorde'],
          ['1–9', 'Seleccionar acorde'],
          ['T', 'Tap tempo'],
          ['Ctrl+C / V', 'Copiar / pegar acorde'],
          ['Supr', 'Borrar acorde activo'],
          ['Esc', 'Cerrar · pausar · limpiar'],
        ],
        en: [
          ['Space', 'Play / pause'],
          ['← →', 'Previous / next chord'],
          ['↑ ↓', 'More / fewer bars of the chord'],
          ['1–9', 'Select chord'],
          ['T', 'Tap tempo'],
          ['Ctrl+C / V', 'Copy / paste chord'],
          ['Del', 'Delete active chord'],
          ['Esc', 'Close · pause · clear'],
        ],
      },
    },

    improvisar: {
      title: { es: 'Improvisar', en: 'Improvise' },
      intro: {
        es: 'Visualizá los acordes diatónicos de tu escala y sus notas para improvisar sin perderte.',
        en: 'Visualize your scale\'s diatonic chords and their notes to improvise without getting lost.',
      },
      do: {
        es: [
          'Elegí tonalidad y escala, y vé los acordes diatónicos sobre el mástil.',
          'Armá progresiones y superponé las <b>nubes de notas</b> de cada acorde.',
          'Mostrá tríadas (3 o 2 cuerdas), 7mas diatónicas y acordes suspendidos.',
          'Filtrá por posición para enfocarte en una zona.',
        ],
        en: [
          'Pick key and scale, and see the diatonic chords on the neck.',
          'Build progressions and overlay each chord\'s <b>note clouds</b>.',
          'Show triads (3 or 2 strings), diatonic 7ths and suspended chords.',
          'Filter by position to focus on one zone.',
        ],
      },
      keys: {
        es: [
          ['3 / 2', 'Tríadas 3 / 2 cuerdas'],
          ['7', '7mas diatónicas'],
          ['S / D', 'Sus2 / Sus4'],
          ['← →', 'Posición anterior / siguiente'],
          ['Esc', 'Resetear posición a "Todas"'],
        ],
        en: [
          ['3 / 2', 'Triads 3 / 2 strings'],
          ['7', 'Diatonic 7ths'],
          ['S / D', 'Sus2 / Sus4'],
          ['← →', 'Previous / next position'],
          ['Esc', 'Reset position to "All"'],
        ],
      },
    },

    backing: {
      title: { es: 'Backing Track', en: 'Backing Track' },
      intro: {
        es: 'Generá un acompañamiento en loop (bajo, acordes, batería, pads) para improvisar encima.',
        en: 'Generate a looping accompaniment (bass, chords, drums, pads) to improvise over.',
      },
      do: {
        es: [
          'Elegí una progresión (o un preset) y un tempo.',
          'Agregá pistas: bajo, acordes, lead, pad, batería/percusión.',
          'Editá cada pista: instrumento, patrón rítmico, voicing, octava, volumen.',
          'Guardá tus propios sonidos y progresiones. Dale Play y tocá encima.',
        ],
        en: [
          'Pick a progression (or a preset) and a tempo.',
          'Add tracks: bass, chords, lead, pad, drums/percussion.',
          'Edit each track: instrument, rhythm pattern, voicing, octave, volume.',
          'Save your own sounds and progressions. Hit Play and jam over it.',
        ],
      },
      keys: {
        es: [
          ['P', 'Play / pausa'],
          ['← →', 'Acorde anterior / siguiente'],
          ['↑ ↓', 'Más / menos compases del acorde'],
          ['Supr', 'Borrar acorde'],
          ['Esc', 'Detener'],
        ],
        en: [
          ['P', 'Play / pause'],
          ['← →', 'Previous / next chord'],
          ['↑ ↓', 'More / fewer bars of the chord'],
          ['Del', 'Delete chord'],
          ['Esc', 'Stop'],
        ],
      },
    },
  };

  var LABELS = {
    es: { do: 'Qué podés hacer', keys: 'Atajos de teclado', close: 'Cerrar', help: 'Ayuda', hint: 'Click afuera o Esc para cerrar' },
    en: { do: 'What you can do', keys: 'Keyboard shortcuts', close: 'Close', help: 'Help', hint: 'Click outside or Esc to close' },
  };

  // ─────────────────────────── Motor ───────────────────────────
  var KEY = null, btn = null, modal = null, styled = false;

  function lang() {
    var l = (W.I18N && W.I18N.getLang) ? W.I18N.getLang() : 'es';
    return (l === 'en') ? 'en' : 'es';
  }
  function L() { return LABELS[lang()]; }

  function injectStyle() {
    if (styled) return; styled = true;
    var css =
      '.help-btn{position:absolute;z-index:90;width:34px;height:34px;top:14px;right:62px;' +
      'display:flex;align-items:center;justify-content:center;font-family:var(--font-mono),monospace;' +
      'font-size:16px;font-weight:700;color:var(--text,#ece3cf);background:var(--surface2,rgba(20,20,20,.92));' +
      'border:1px solid var(--border2,#34343d);border-radius:8px;cursor:pointer;' +
      'transition:border-color .2s,color .2s,transform .15s;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);}' +
      '.help-btn:hover{border-color:var(--gold,#e0b24a);color:var(--gold,#e0b24a);transform:translateY(-1px);}' +
      '.help-btn:focus-visible{outline:2px solid var(--gold,#e0b24a);outline-offset:2px;}' +
      '.help-modal{position:fixed;inset:0;z-index:1100;display:none;align-items:flex-start;justify-content:center;' +
      'padding:6vh 16px 16px;background:rgba(0,0,0,.72);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);overflow-y:auto;}' +
      '.help-modal.open{display:flex;}' +
      '.help-card{width:100%;max-width:560px;background:linear-gradient(180deg,var(--surface2,#161616),var(--surface,#0f0f0f));' +
      'border:1px solid var(--border2,#34343d);border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.6);' +
      'padding:22px 24px 24px;color:var(--text,#ece3cf);font-family:var(--font),"Trebuchet MS",sans-serif;}' +
      '.help-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;}' +
      '.help-title{font-family:var(--font-display),var(--font),sans-serif;font-size:20px;font-weight:700;color:var(--accent,#e0b24a);}' +
      '.help-x{background:none;border:none;color:var(--text-dim,#888);font-size:22px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:6px;}' +
      '.help-x:hover{color:var(--text,#fff);background:rgba(255,255,255,.07);}' +
      '.help-intro{color:var(--text-mid,#bdb29a);font-size:14px;line-height:1.55;margin-bottom:16px;}' +
      '.help-h{font-family:var(--font-mono),monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;' +
      'color:var(--text-dim,#888);margin:16px 0 8px;}' +
      '.help-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px;}' +
      '.help-list li{position:relative;padding-left:18px;font-size:13.5px;line-height:1.5;color:var(--text-mid,#cdc3ad);}' +
      '.help-list li:before{content:"";position:absolute;left:2px;top:8px;width:6px;height:6px;border-radius:50%;background:var(--accent,#e0b24a);opacity:.8;}' +
      '.help-list b{color:var(--text,#ece3cf);font-weight:700;}' +
      '.help-keys{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;align-items:center;}' +
      '.help-keys kbd{justify-self:start;font-family:var(--font-mono),monospace;font-size:11px;color:var(--text,#ece3cf);' +
      'background:var(--surface3,#1d1d1d);border:1px solid var(--border,#2a2a2a);border-bottom-width:2px;border-radius:5px;padding:2px 7px;white-space:nowrap;}' +
      '.help-keys span{font-size:13px;color:var(--text-mid,#bdb29a);}' +
      '.help-hint{margin-top:18px;font-size:11px;color:var(--text-dim,#777);text-align:center;}' +
      '@media(max-width:760px){.help-btn{top:10px;right:56px;width:32px;height:32px;}.help-card{padding:18px;}}';
    var s = D.createElement('style');
    s.setAttribute('data-help-style', '');
    s.appendChild(D.createTextNode(css));
    (D.head || D.documentElement).appendChild(s);
  }

  // Alinea el botón con el centro del link "← Herramientas" (igual que el toggle
  // de idioma). offsetTop en px de CSS → agnóstico al zoom.
  function align() {
    if (!btn) return;
    var back = D.querySelector('.back, a.back, .back-link');
    if (!back || !back.offsetParent) { btn.style.top = ''; return; }
    var y = 0, el = back;
    while (el) { y += el.offsetTop; el = el.offsetParent; }
    btn.style.top = Math.round(y + back.offsetHeight / 2 - btn.offsetHeight / 2) + 'px';
  }

  function esc(s) { return String(s); } // contenido es de confianza (literal del módulo)

  function render() {
    if (!modal || !KEY || !C[KEY]) return;
    var lg = lang(), data = C[KEY], lb = L();
    var html = '<div class="help-card" role="dialog" aria-modal="true" aria-labelledby="help-title">'
      + '<div class="help-head"><div class="help-title" id="help-title">' + esc(data.title[lg]) + '</div>'
      + '<button class="help-x" type="button" aria-label="' + lb.close + '">×</button></div>'
      + '<p class="help-intro">' + data.intro[lg] + '</p>'
      + '<div class="help-h">' + lb.do + '</div>'
      + '<ul class="help-list">' + data.do[lg].map(function (d) { return '<li>' + d + '</li>'; }).join('') + '</ul>';
    if (data.keys && data.keys[lg]) {
      html += '<div class="help-h">' + lb.keys + '</div><div class="help-keys">'
        + data.keys[lg].map(function (k) { return '<kbd>' + esc(k[0]) + '</kbd><span>' + esc(k[1]) + '</span>'; }).join('')
        + '</div>';
    }
    html += '<div class="help-hint">' + lb.hint + '</div></div>';
    modal.innerHTML = html;
    modal.querySelector('.help-x').addEventListener('click', close);
  }

  // Foco al botón × (único foco dentro del modal). preventScroll evita que el
  // navegador scrollee la página para "traer a la vista" el elemento enfocado.
  function focusModal() {
    var x = modal && modal.querySelector('.help-x');
    if (x) try { x.focus({ preventScroll: true }); } catch (e) { x.focus(); }
  }

  var prevFocus = null;
  function open() {
    if (!modal || isOpen()) return;
    prevFocus = D.activeElement;                 // para devolver el foco al cerrar
    render();
    // NO scrolleamos ni tocamos overflow: el modal es position:fixed y cubre el
    // viewport tal cual, conservando la posición de scroll del usuario.
    modal.classList.add('open');
    focusModal();
  }
  function close() {
    if (!modal || !isOpen()) return;
    modal.classList.remove('open');
    var back = (prevFocus && prevFocus.focus) ? prevFocus : btn;
    if (back) try { back.focus({ preventScroll: true }); } catch (e) { back.focus(); }
  }
  function isOpen() { return modal && modal.classList.contains('open'); }

  function injectButton() {
    if (btn) return;
    injectStyle();
    btn = D.createElement('button');
    btn.id = 'help-toggle';
    btn.type = 'button';
    btn.className = 'help-btn';
    btn.textContent = '?';
    btn.setAttribute('aria-label', L().help);
    btn.addEventListener('click', open);
    (D.body || D.documentElement).appendChild(btn);

    modal = D.createElement('div');
    modal.className = 'help-modal';
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    (D.body || D.documentElement).appendChild(modal);

    // Con el modal abierto, capturamos el teclado: Esc cierra, Tab atrapa el
    // foco, y cualquier otra tecla NO llega al handler de la herramienta detrás
    // (si no, Space/P/flechas/Supr disparaban play, navegaban o borraban acordes).
    D.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      // stopImmediatePropagation: frena también cualquier otro listener en
      // fase de captura, no solo los de la herramienta en burbuja.
      if (e.key === 'Escape') { close(); e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (e.key === 'Tab') { focusModal(); e.preventDefault(); e.stopImmediatePropagation(); return; }
      e.stopImmediatePropagation();
    }, true);

    align();
  }

  function init(key) {
    if (key) KEY = key;
    if (!KEY) KEY = W.HELP_KEY || null;
    if (!KEY || !C[KEY]) return;     // herramienta sin ayuda → no inyecta nada
    injectButton();
  }

  W.Help = { init: init, open: open, close: close };

  // Auto-init: cada página setea window.HELP_KEY antes de cargar este script.
  function boot() { init(); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot);
  else boot();
  W.addEventListener('load', align);
  W.addEventListener('resize', align);
  W.addEventListener('i18n:changed', function () {
    if (btn) btn.setAttribute('aria-label', L().help);
    align();                                  // re-alinear con la flecha (igual que i18n.js)
    if (isOpen()) { render(); focusModal(); } // re-render destruye el ×; recuperar foco
  });
})(window);
