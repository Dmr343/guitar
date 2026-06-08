// ─────────────────────────────────────────────────────────────
// Backing Track — app (glue de UI)
//
// Crea el motor, arma un proyecto por defecto y cablea la UI:
// transporte, progresión (constructor de acordes reutilizando el
// ProgressionModel del Atlas), indicador de acorde, gestión de
// pistas y panel de edición de presets. La persistencia y el modo
// arreglo llegan en issues posteriores (#60, #62).
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const BT = W.BackingTrack;
  const theory = W.GuitarShared && W.GuitarShared.theory;
  const ProgressionModel = W.ProgressionModel;

  const I18N = W.I18N || { t: k => k };
  const t = k => I18N.t(k);

  const el = id => document.getElementById(id);
  const btnPlay = el('btn-play');
  const ctlTempo = el('ctl-tempo');
  const valTempo = el('val-tempo');
  const ctlVolume = el('ctl-volume');
  const valVolume = el('val-volume');
  const ctlLoop = el('ctl-loop');
  const statusEl = el('status');
  const chordStrip = el('chord-strip');
  const chordEditor = el('chord-editor');
  const progSelect = el('prog-select');
  const tonalidadSelect = el('tonalidad-select');
  const btnTonalidadReset = el('btn-tonalidad-reset');
  const newRoot = el('new-root');
  const newQuality = el('new-quality');
  const btnAddChord = el('btn-add-chord');
  const btnClearProg = el('btn-clear-prog');
  const tracksEl = el('tracks');
  const addTipo = el('add-tipo');
  const btnAdd = el('btn-add');
  const presetEditorEl = el('preset-editor');
  const projName = el('proj-name');
  const btnSaveProj = el('btn-save-proj');
  const projSelect = el('proj-select');
  const btnLoadProj = el('btn-load-proj');
  const btnDelProj = el('btn-del-proj');
  const btnExport = el('btn-export');
  const btnImport = el('btn-import');
  const importFile = el('import-file');
  const modePractica = el('mode-practica');
  const modeArreglo = el('mode-arreglo');
  const arrangePanel = el('arrange-panel');
  const subdivSelect = el('subdiv-select');
  const beatMeter = el('beat-meter');
  const diagVoices = el('diag-voices');
  const nowChord = el('now-chord');
  const nextChord = el('next-chord');
  const configEl = el('config');
  const configToggle = el('config-toggle');

  // Etiqueta visible de un tipo de pista. La clave (bajo/acordes/…) es
  // dato interno; el texto mostrado se traduce.
  function tipoLabel(tipo) {
    return t('tipo_' + tipo);
  }
  const PATTERN_TIPO = {
    bajo: 'bass', acordes: 'chord', lead: 'chord',
    bateria: 'drums', percusion: 'perc',
  };
  // Cuántas subdivisiones entran por compás de 4/4.
  const SUBDIV_COUNT = {
    redonda: 1, blanca: 2, negra: 4, corchea: 8, tresillo: 12, semicorchea: 16,
  };
  const MELODIC_TIPOS = ['bajo', 'acordes', 'pad', 'lead'];
  // Tipos polifónicos: comparten todos los presets entre sí (un sitar,
  // un pad o un lead se pueden usar en cualquier pista melódica).
  const POLY_TIPOS = ['acordes', 'lead', 'pad'];
  // Cualidades de acorde. `v` es dato interno; la etiqueta visible se
  // resuelve por clave de traducción (qual_<v>) en qualityLabel().
  const QUALITIES = [
    { v: 'major' }, { v: 'minor' }, { v: 'dom7' },
    { v: 'maj7' }, { v: 'min7' }, { v: 'm7b5' },
  ];
  // Glifos del cifrado jazz (Real Book). Solo display: los datos
  // internos siguen siendo 'maj7', 'm7b5', etc.
  const QUALITY_GLYPH = {
    major: '', minor: 'm', dom7: '7', maj7: '△', min7: 'm7',
    m7b5: 'ø', dim: '°',
  };
  const ROOTS = (theory && theory.CHROMATIC) ||
    ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const OSC_TYPES = ['sine', 'triangle', 'sawtooth', 'square',
    'fatsawtooth', 'fattriangle', 'fatsquare', 'pulse'];
  const FILTER_TYPES = ['lowpass', 'highpass', 'bandpass'];
  // Efectos. `tipo` es dato interno; la etiqueta se traduce (fx_<tipo>).
  const EFFECTS = [
    { tipo: 'reverb' }, { tipo: 'distortion' }, { tipo: 'chorus' },
  ];

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'status' + (cls ? ' ' + cls : '');
  }

  const engine = BT.createEngine();
  const storage = BT.createStorage();

  // ─── Estado de progresión de fábrica activa ───
  // Cuando el usuario carga una progresión del catálogo, registramos su id
  // y la tonalidad activa (la nativa por defecto). Esto permite que el
  // selector de tonalidad sepa contra qué progresión re-realizar al cambiar,
  // y que el storage persista la tonalidad elegida (no la nativa).
  // Si el usuario edita acordes manualmente (progSelect.value = ''), se
  // pone factoryProgState.id = null y la sesión deja de ser transponible.
  const factoryProgState = { id: null, tonalidad: null };

  function loadFactoryProgression(id, tonalidad) {
    const prog = BT.factoryProgressions.byId(id);
    if (!prog) return false;
    const T = BT.transpose;
    const dest = (prog.transponible === false)
      ? null                                          // root fijo: tonalidad no aplica
      : (tonalidad || prog.tonalidad);
    factoryProgState.id = id;
    factoryProgState.tonalidad = dest;
    const chords = T.realizeProgression(prog, dest || prog.tonalidad);
    model.loadProgression(chords);
    engine.setTempo(prog.tempo || engine.getTempo());
    syncTonalidadControls();
    return true;
  }

  // unbindFromCatalog — el usuario editó la progresión manualmente
  // (add/clear/personalizar). Pierde el link con el catálogo y la
  // sesión deja de ser transponible automáticamente.
  function unbindFromCatalog() {
    factoryProgState.id = null;
    factoryProgState.tonalidad = null;
    progSelect.value = '';
    syncTonalidadControls();
  }

  // ─── Selector de tonalidad ───
  const TONALIDADES = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

  function initTonalidadSelect() {
    tonalidadSelect.innerHTML = '';
    TONALIDADES.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = fmtNote(t);   // muestra C♯, E♭, etc.
      tonalidadSelect.appendChild(opt);
    });
  }

  // syncTonalidadControls — refleja el estado actual en el selector y el ↻:
  // - Sin progresión de fábrica cargada → ambos disabled.
  // - Progresión transponible:false (ej. ii–V–I en 12 tonalidades) →
  //   disabled, tooltip explicativo.
  // - Cualquier otra → selector habilitado, ↻ habilitado solo si la
  //   tonalidad activa difiere de la nativa.
  function syncTonalidadControls() {
    const id = factoryProgState.id;
    if (!id) {
      tonalidadSelect.disabled = true;
      tonalidadSelect.title = t('key_title_load');
      btnTonalidadReset.disabled = true;
      return;
    }
    const prog = BT.factoryProgressions.byId(id);
    if (!prog) {
      tonalidadSelect.disabled = true;
      btnTonalidadReset.disabled = true;
      return;
    }
    if (prog.transponible === false) {
      tonalidadSelect.disabled = true;
      tonalidadSelect.title = t('key_title_all12');
      btnTonalidadReset.disabled = true;
      return;
    }
    tonalidadSelect.disabled = false;
    tonalidadSelect.value = factoryProgState.tonalidad || prog.tonalidad;
    tonalidadSelect.title = t('key_title_transpose');
    btnTonalidadReset.disabled = (factoryProgState.tonalidad === prog.tonalidad);
  }

  // setActiveTonalidad — transponer in-place: re-realiza la progresión activa
  // contra la nueva tonalidad, preservando activeIdx y loopRange. Mientras
  // suena, el cambio entra en el próximo límite de compás (vía el coalescer
  // pendingRebuild del engine — gratis). La UI de chips se actualiza al
  // instante porque el model.onChange dispara renderChords sincrónico.
  //
  // Why no usamos loadFactoryProgression: éste resetea activeIdx=0 y limpia
  // la loop range; al transponer queremos quedarnos sobre el mismo grado,
  // solo con raíces nuevas. Usamos model.batch para que las 3 mutaciones
  // (loadProgression + setActiveChord + setLoopRange) disparen un solo
  // onChange.
  function setActiveTonalidad(t) {
    if (!factoryProgState.id) return;
    const prog = BT.factoryProgressions.byId(factoryProgState.id);
    if (!prog || prog.transponible === false) return;
    const dest = t || prog.tonalidad;
    factoryProgState.tonalidad = dest;
    const chords = BT.transpose.realizeProgression(prog, dest);
    const savedIdx = model.activeIdx;
    const savedLoop = model.loopRange;
    model.batch(m => {
      m.loadProgression(chords);
      if (savedIdx > 0 && savedIdx < chords.length) m.setActiveChord(savedIdx);
      if (savedLoop) m.setLoopRange(savedLoop[0], savedLoop[1]);
    });
    syncTonalidadControls();
  }

  // ─── Modelo de progresión (reutilizado del Atlas) ───
  const model = new ProgressionModel({
    onChange: function () {
      // El acorde con foco es el punto de reinicio al editar en vivo.
      engine.setFocusChord(model.activeIdx);
      engine.loadProgression(model.progression);
      const lr = model.loopRange;
      engine.setLoopRange(lr ? lr[0] : null, lr ? lr[1] : null);
      renderChords();
      renderEditor();
      renderHeroChords(engine.getActiveChordIndex());
    },
  });

  // ─── Helpers de <select> ───
  function fillSelect(sel, items, valueKey, labelFn) {
    sel.innerHTML = '';
    items.forEach(it => {
      const opt = document.createElement('option');
      opt.value = valueKey ? it[valueKey] : it;
      opt.textContent = labelFn ? labelFn(it) : (valueKey ? it[valueKey] : it);
      sel.appendChild(opt);
    });
  }
  function mkBtn(cls, text, onClick) {
    const b = document.createElement('button');
    b.className = cls;
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }
  // Crea un campo de formulario (select/input) con un name único —
  // los elementos sin id/name disparan un aviso de autofill del navegador.
  let _fldCount = 0;
  function fld(tag) {
    const e = document.createElement(tag);
    e.name = 'bt-' + tag + '-' + (++_fldCount);
    return e;
  }

  // Dropdown de preset de una pista, agrupado por origen: presets
  // sintetizados, presets con samples (requieren internet) y los del
  // usuario. Incluye "(editado)" si la pista tiene copia de trabajo.
  function makePresetSelect(track) {
    const sel = fld('select');
    sel.className = 'track-preset';
    const selId = track.customPreset ? '__custom' : track.presetId;

    function addOption(parent, id, nombre) {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = nombre;
      if (id === selId) o.selected = true;
      parent.appendChild(o);
    }
    function addGroup(label, items) {
      if (!items.length) return;
      const g = document.createElement('optgroup');
      g.label = label;
      items.forEach(p => addOption(g, p.id, p.nombre));
      sel.appendChild(g);
    }

    if (track.customPreset) addOption(sel, '__custom', t('preset_edited'));
    // Las pistas melódicas comparten el pool completo de presets;
    // bajo y batería/percusión usan solo los de su tipo.
    const pool = (POLY_TIPOS.indexOf(track.tipo) >= 0) ? POLY_TIPOS : [track.tipo];
    let fac = [], usr = [];
    pool.forEach(t => {
      fac = fac.concat(BT.factoryPresets.byTipo(t));
      usr = usr.concat(BT.userLibrary.byTipo(t));
    });
    const online = p => (p.motor === 'sampler' || p.motor === 'webaudiofont');
    addGroup(t('preset_grp_synth'), fac.filter(p => !online(p)));
    addGroup(t('preset_grp_real'), fac.filter(online));
    addGroup(t('preset_grp_mine'), usr);
    return sel;
  }

  // Etiqueta visible de cada categoría del desplegable. La clave
  // (estudio/…) es dato interno; el texto se traduce (cat_<clave>).
  function categoriaLabel(cat) {
    return t('cat_' + cat);
  }
  // Orden de aparición de los optgroups.
  const CATEGORIA_ORDER = ['estudio', 'improvisacion', 'bailable', 'experimental'];

  function initProgSelect() {
    progSelect.innerHTML = '';
    const custom = document.createElement('option');
    custom.value = '';
    custom.textContent = t('prog_custom');
    progSelect.appendChild(custom);
    // Agrupa por categoría preservando el orden interno del array.
    const groups = {};
    BT.factoryProgressions.PROGRESSIONS.forEach(p => {
      const cat = p.categoria || 'otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    const ordered = CATEGORIA_ORDER
      .filter(c => groups[c])
      .concat(Object.keys(groups).filter(c => CATEGORIA_ORDER.indexOf(c) < 0));
    ordered.forEach(cat => {
      const og = document.createElement('optgroup');
      og.label = (CATEGORIA_ORDER.indexOf(cat) >= 0) ? categoriaLabel(cat) : cat;
      groups[cat].forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nombre;
        og.appendChild(opt);
      });
      progSelect.appendChild(og);
    });
  }

  // ─── Proyecto por defecto ───
  function setupDefaultTracks() {
    engine.addTrack({ tipo: 'bajo' });
    engine.addTrack({ tipo: 'acordes' });
    engine.addTrack({ tipo: 'bateria' });
  }
  function loadDefaultProject() {
    loadFactoryProgression('blues12A');
    progSelect.value = 'blues12A';
    setupDefaultTracks();
  }

  // ─── Glifos musicales (solo display) ───
  // Nota con símbolos reales: C# → C♯, Bb → B♭.
  function fmtNote(name) {
    return String(name).replace(/#/g, '♯').replace(/([A-G])b/g, '$1♭');
  }
  // Etiqueta de una cualidad en el desplegable: glifo + nombre.
  function qualityLabel(q) {
    const g = QUALITY_GLYPH[q.v] || '';
    const label = t('qual_' + q.v);
    return g ? g + '  ' + label : label;
  }

  // ─── Tira de acordes ───
  // Cifrado jazz: raíz con glifos + sufijo de cualidad (C△, Cø, C°…).
  function chordLabel(c) {
    return fmtNote(c.root) + (QUALITY_GLYPH[c.quality] || '');
  }
  // Shift+clic en un acorde marca / extiende / limpia el rango de loop
  // (mismo comportamiento que el Intervalic Atlas).
  function handleLoopClick(i) {
    const lr = model.loopRange;
    if (!lr) model.setLoopRange(i, i);
    else if (lr[0] === lr[1] && lr[0] !== i) model.setLoopRange(lr[0], i);
    else model.setLoopRange(null);
  }

  let dragChordSrc = null;   // índice del acorde que se está arrastrando

  function renderChords() {
    const prog = model.progression;
    const lr = model.loopRange;
    const lo = lr ? Math.min(lr[0], lr[1]) : -1;
    const hi = lr ? Math.max(lr[0], lr[1]) : -1;
    chordStrip.innerHTML = '';
    prog.forEach((c, i) => {
      const chip = document.createElement('div');
      chip.className = 'chord-chip' +
        (i === model.activeIdx ? ' selected' : '') +
        (lr && i >= lo && i <= hi ? ' in-loop' : '');
      chip.dataset.idx = String(i);
      chip.draggable = true;
      const name = document.createElement('span');
      name.textContent = chordLabel(c);
      const bars = document.createElement('span');
      bars.className = 'chip-bars';
      bars.textContent = '●'.repeat(c.bars);
      chip.appendChild(name);
      chip.appendChild(bars);
      // Botón de borrar visible al hover sobre el chip.
      const del = document.createElement('span');
      del.className = 'chip-del';
      del.textContent = '×';
      del.title = t('chip_remove_title');
      del.addEventListener('click', (e) => {
        e.stopPropagation();         // no seleccionar al borrar
        model.removeChordAt(i);
        unbindFromCatalog();         // edición manual: pierde link con el catálogo
      });
      del.addEventListener('mousedown', (e) => e.stopPropagation()); // no iniciar drag
      chip.appendChild(del);
      chip.title = t('chip_title');
      chip.addEventListener('click', (e) => {
        if (e.shiftKey) handleLoopClick(i);
        else {
          model.setActiveChord(i);
          engine.jumpToChord(i);   // si está sonando, salta al instante
        }
      });
      // Reordenar por arrastre → model.moveChord(origen, destino).
      chip.addEventListener('dragstart', (e) => {
        dragChordSrc = i;
        chip.classList.add('dragging');
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
      });
      chip.addEventListener('dragend', () => {
        chip.classList.remove('dragging');
        Array.prototype.forEach.call(chordStrip.children,
          ch => ch.classList.remove('drag-over'));
        dragChordSrc = null;
      });
      chip.addEventListener('dragover', (e) => {
        if (dragChordSrc === null) return;
        e.preventDefault();
        chip.classList.add('drag-over');
      });
      chip.addEventListener('dragleave', () => chip.classList.remove('drag-over'));
      chip.addEventListener('drop', (e) => {
        e.preventDefault();
        chip.classList.remove('drag-over');
        if (dragChordSrc !== null && dragChordSrc !== i) {
          model.moveChord(dragChordSrc, i);
          unbindFromCatalog();
        }
      });
      chordStrip.appendChild(chip);
    });
  }
  // Indicador del acorde sonando (callback de engine.onChordChange) +
  // actualización del acorde actual/siguiente del panel de toque.
  //
  // Mientras suena, la "selección" (acorde activo del editor) sigue al
  // acorde que está sonando — el chip seleccionado siempre coincide con
  // el chip activo. Eso unifica el feedback visual y hace que el editor
  // de abajo muestre el acorde que escuchás ahora.
  function highlightChord(idx) {
    Array.prototype.forEach.call(chordStrip.children, chip => {
      chip.classList.toggle('active', Number(chip.dataset.idx) === idx);
    });
    renderHeroChords(idx);
    if (idx >= 0 && engine.isPlaying() && idx !== model.activeIdx) {
      model.setActiveChord(idx);
    }
  }
  // Acorde grande "actual" + "siguiente" del panel de toque.
  function renderHeroChords(idx) {
    const prog = model.progression;
    if (!prog.length) {
      nowChord.textContent = '—';
      nextChord.textContent = '—';
      return;
    }
    const cur = (idx != null && idx >= 0) ? idx : (model.activeIdx || 0);
    nowChord.textContent = chordLabel(prog[cur % prog.length]);
    nextChord.textContent = chordLabel(prog[(cur + 1) % prog.length]);
  }

  // ─── Indicador de compás (metrónomo) ───
  // Agrupa los puntos en los 4 pulsos del compás de 4/4: cada grupo
  // tiene las subdivisiones de ese pulso.
  function buildBeatMeter(count) {
    beatMeter.innerHTML = '';
    const groups = (count >= 4 && count % 4 === 0) ? 4 : 1;
    const perGroup = count / groups;
    for (let g = 0; g < groups; g++) {
      const grp = document.createElement('div');
      grp.className = 'beat-group';
      for (let j = 0; j < perGroup; j++) {
        const globalIdx = g * perGroup + j;
        const isBeat = (groups === 1) || (j === 0);
        const dot = document.createElement('div');
        dot.className = 'beat-dot' +
          (globalIdx === 0 ? ' downbeat' : '') +
          (isBeat ? '' : ' sub');
        dot.textContent = isBeat
          ? String(groups === 1 ? globalIdx + 1 : g + 1) : '';
        grp.appendChild(dot);
      }
      beatMeter.appendChild(grp);
    }
  }
  // Recibe el 'tick' del motor (o null al detenerse): enciende el punto
  // de la subdivisión actual.
  function updateBarIndicator(tick) {
    let dots = beatMeter.querySelectorAll('.beat-dot');
    if (!tick) {
      dots.forEach(d => d.classList.remove('on'));
      return;
    }
    if (dots.length !== tick.count) {
      buildBeatMeter(tick.count);
      dots = beatMeter.querySelectorAll('.beat-dot');
    }
    dots.forEach((d, i) => d.classList.toggle('on', i === tick.index));
  }

  // ─── Editor del acorde activo ───
  function renderEditor() {
    const chord = model.getActive();
    if (!chord) { chordEditor.hidden = true; chordEditor.innerHTML = ''; return; }
    // Durante el playback la selección sigue al acorde que suena, lo que
    // dispara onChange → renderEditor en cada compás. Si el usuario tiene un
    // <select> del editor abierto/enfocado, no reconstruir: el innerHTML=''
    // destruiría el control a mitad de uso (cierra el dropdown, pierde el foco
    // y descarta el cambio en curso). Se reconstruye al soltar el control.
    const ae = document.activeElement;
    if (ae && ae.tagName === 'SELECT' && chordEditor.contains(ae)) return;
    chordEditor.hidden = false;
    chordEditor.innerHTML = '';
    const idx = model.activeIdx;

    const lbl = document.createElement('span');
    lbl.className = 'editor-label';
    lbl.textContent = t('editor_chord') + ' ' + (idx + 1) + ':';
    chordEditor.appendChild(lbl);

    // Helper: cualquier edición desde este editor (root, quality, compases,
    // ✕) es manual y desvincula del catálogo.
    function editFromEditor(fn) {
      fn();
      unbindFromCatalog();
    }

    const rootSel = fld('select');
    fillSelect(rootSel, ROOTS, null, fmtNote);
    rootSel.value = chord.root;
    rootSel.addEventListener('change',
      () => editFromEditor(() => model.editChordAt(idx, { root: rootSel.value })));
    chordEditor.appendChild(rootSel);

    const qSel = fld('select');
    fillSelect(qSel, QUALITIES, 'v', qualityLabel);
    qSel.value = chord.quality;
    qSel.addEventListener('change',
      () => editFromEditor(() => model.editChordAt(idx, { quality: qSel.value })));
    chordEditor.appendChild(qSel);

    const barsLbl = document.createElement('span');
    barsLbl.className = 'editor-label';
    barsLbl.textContent = t('bars_label');
    chordEditor.appendChild(barsLbl);

    const stepper = document.createElement('div');
    stepper.className = 'bars-stepper';
    // Los ± solo desvinculan del catálogo si changeActiveBars cambió algo;
    // en el tope (1 u 8 compases) es no-op y no debe romper la transposición.
    stepper.appendChild(mkBtn('track-btn', '−',
      () => { if (model.changeActiveBars(-1)) unbindFromCatalog(); }));
    const val = document.createElement('span');
    val.className = 'value';
    val.textContent = String(chord.bars);
    stepper.appendChild(val);
    stepper.appendChild(mkBtn('track-btn', '+',
      () => { if (model.changeActiveBars(1)) unbindFromCatalog(); }));
    chordEditor.appendChild(stepper);

    // El reordenamiento de acordes se hace arrastrando los chips.
    const rm = mkBtn('track-btn danger', '✕',
      () => editFromEditor(() => model.removeChordAt(idx)));
    rm.title = t('chip_remove_title');
    chordEditor.appendChild(rm);
  }

  // ─── Gestión de pistas ───
  function makeSelect(cls, options, selectedId) {
    const sel = fld('select');
    sel.className = cls;
    options.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.nombre;
      if (o.id === selectedId) opt.selected = true;
      sel.appendChild(opt);
    });
    return sel;
  }

  let dragTrackSrc = null;   // id de la pista que se está arrastrando

  // Mueve una pista al índice destino usando engine.moveTrack (±1) en
  // bucle — así el reordenamiento por arrastre no requiere tocar engine.js.
  function moveTrackTo(id, destIdx) {
    const tracks = engine.getTracks();
    const from = tracks.findIndex(t => t.id === id);
    if (from < 0) return;
    destIdx = Math.max(0, Math.min(destIdx, tracks.length - 1));
    const dir = destIdx > from ? 1 : -1;
    let steps = Math.abs(destIdx - from);
    while (steps-- > 0) engine.moveTrack(id, dir);
  }

  function makeTrackRow(track) {
    const row = document.createElement('div');
    row.className = 'track ' + (track.enabled ? 'enabled' : 'disabled');
    row.dataset.id = track.id;

    // Asa de arrastre para reordenar. draggable se activa solo al tomar
    // el asa, para no interferir con los sliders/selects de la fila.
    const handle = document.createElement('span');
    handle.className = 'track-drag';
    handle.textContent = '⠿';
    handle.title = t('track_drag_title');
    handle.addEventListener('mousedown', () => { row.draggable = true; });
    row.addEventListener('dragstart', (e) => {
      dragTrackSrc = track.id;
      row.classList.add('dragging');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      row.draggable = false;
      row.classList.remove('dragging');
      Array.prototype.forEach.call(tracksEl.children,
        r => r.classList.remove('drag-over'));
      dragTrackSrc = null;
    });
    row.addEventListener('dragover', (e) => {
      if (dragTrackSrc === null) return;
      e.preventDefault();
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('drag-over');
      if (dragTrackSrc === null || dragTrackSrc === track.id) return;
      const dest = engine.getTracks().findIndex(t => t.id === track.id);
      if (dest >= 0) { moveTrackTo(dragTrackSrc, dest); refreshTracks(); }
    });
    row.appendChild(handle);

    const mute = document.createElement('button');
    mute.className = 'track-mute';
    mute.title = t('track_mute_title');
    mute.textContent = '♪';
    mute.addEventListener('click', () => {
      const enabled = !engine.getTracks().find(t => t.id === track.id).enabled;
      engine.updateTrack(track.id, { enabled: enabled });
      row.classList.toggle('enabled', enabled);
      row.classList.toggle('disabled', !enabled);
    });
    row.appendChild(mute);

    const tipo = document.createElement('span');
    tipo.className = 'track-tipo';
    tipo.textContent = tipoLabel(track.tipo);
    row.appendChild(tipo);

    // Preset, agrupado por origen (synth / samples / usuario).
    const presetSel = makePresetSelect(track);
    presetSel.addEventListener('change', () => {
      if (presetSel.value === '__custom') return;
      engine.updateTrack(track.id, { presetId: presetSel.value });
      if (editing && editing.trackId === track.id) closeEditor();
      refreshTracks();
    });
    row.appendChild(presetSel);

    const ptipo = PATTERN_TIPO[track.tipo];
    if (ptipo) {
      // Patrones ordenados de figura más lenta a más rápida (por
      // cantidad de golpes: menos golpes = figura más larga).
      const pats = BT.factoryPatterns.byTipo(ptipo)
        .slice().sort((a, b) => a.hits.length - b.hits.length);
      const patSel = makeSelect('track-pattern', pats, track.patternId);
      patSel.addEventListener('change',
        () => engine.updateTrack(track.id, { patternId: patSel.value }));
      row.appendChild(patSel);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'track-pattern';
      spacer.style.opacity = '0.4';
      spacer.textContent = t('track_sustained');
      row.appendChild(spacer);
    }

    const vol = fld('input');
    vol.type = 'range';
    vol.className = 'track-vol';
    vol.min = '0'; vol.max = '100'; vol.step = '1';
    vol.value = String(Math.round((track.volumen != null ? track.volumen : 0.8) * 100));
    vol.title = t('track_vol_title');
    vol.addEventListener('input',
      () => engine.updateTrack(track.id, { volumen: Number(vol.value) / 100 }));
    row.appendChild(vol);

    // Editar sonido — melódicos editan osc/env/filter; percusión/batería
    // editan vol/tune por pieza del kit. Ambos comparten efectos.
    const gear = mkBtn('track-btn', '⚙', () => openEditor(track.id));
    gear.title = t('track_edit_sound_title');
    row.appendChild(gear);

    const rm = mkBtn('track-btn danger', '✕', () => {
      engine.removeTrack(track.id);
      if (editing && editing.trackId === track.id) closeEditor();
      refreshTracks();
    });
    rm.title = t('track_remove_title');
    row.appendChild(rm);

    return row;
  }

  function renderTracks() {
    const tracks = engine.getTracks();
    tracksEl.innerHTML = '';
    if (!tracks.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = t('tracks_empty');
      tracksEl.appendChild(hint);
      return;
    }
    tracks.forEach(track => tracksEl.appendChild(makeTrackRow(track)));
  }

  // ─── Panel de edición de presets (niveles 2 y 3) ───
  let editing = null;   // { trackId, preset }

  function blankPreset(tipo) {
    // Para percusión/batería el preset blank necesita `pieces`, no
    // oscillator/envelope. Sin pieces el kit queda mudo y el editor
    // pierde la sección de Piezas del kit.
    if (tipo === 'bateria') {
      return {
        id: 'desde-cero', nombre: t('preset_new_kit'), tipo: tipo, motor: 'synth',
        config: {
          pieces: {
            kick:   { engine: 'membrane', note: 'C1',
                      options: { pitchDecay: 0.05, octaves: 4 } },
            snare:  { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.2, sustain: 0 } } },
            hat:    { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.05, sustain: 0 } } },
            cymbal: { engine: 'metal',
                      options: { envelope: { attack: 0.001, decay: 0.6, release: 0.2 } } },
          },
        },
        efectos: [],
      };
    }
    if (tipo === 'percusion') {
      return {
        id: 'desde-cero', nombre: t('preset_new_kit'), tipo: tipo, motor: 'synth',
        config: {
          pieces: {
            bongo_hi: { engine: 'membrane', note: 'A3',
                        options: { pitchDecay: 0.02, octaves: 2 } },
            bongo_lo: { engine: 'membrane', note: 'E3',
                        options: { pitchDecay: 0.02, octaves: 2 } },
            conga:    { engine: 'membrane', note: 'C3',
                        options: { pitchDecay: 0.03, octaves: 2 } },
            shaker:   { engine: 'noise', noise: 'white',
                        options: { envelope: { attack: 0.001, decay: 0.04, sustain: 0 } } },
          },
        },
        efectos: [],
      };
    }
    return {
      id: 'desde-cero', nombre: t('preset_new_sound'), tipo: tipo, motor: 'synth',
      config: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
        filter: { type: 'lowpass', Q: 1 },
        filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.3,
          baseFrequency: 200, octaves: 3 },
      },
      efectos: [],
    };
  }

  function openEditor(trackId) {
    const preset = engine.getTrackPreset(trackId);
    if (!preset) return;
    if (!preset.config) preset.config = blankPreset('acordes').config;
    editing = { trackId: trackId, preset: preset };
    renderPresetEditor();
  }
  function closeEditor() {
    editing = null;
    presetEditorEl.hidden = true;
    presetEditorEl.innerHTML = '';
  }

  // Aplica la copia de trabajo al motor (preview en vivo).
  function applyEditing() {
    if (editing) engine.applyTrackPreset(editing.trackId, editing.preset);
  }

  function peParamRow(labelText, min, max, step, value, fmt, onInput) {
    const row = document.createElement('div');
    row.className = 'pe-row';
    const lbl = document.createElement('label');
    lbl.textContent = labelText;
    const range = fld('input');
    range.type = 'range';
    range.min = String(min); range.max = String(max); range.step = String(step);
    range.value = String(value);
    const valEl = document.createElement('span');
    valEl.className = 'pe-val';
    valEl.textContent = fmt(value);
    range.addEventListener('input', () => {
      const v = Number(range.value);
      valEl.textContent = fmt(v);
      onInput(v);
      applyEditing();
    });
    row.appendChild(lbl); row.appendChild(range); row.appendChild(valEl);
    return row;
  }

  function peSelectRow(labelText, options, value, onChange) {
    const row = document.createElement('div');
    row.className = 'pe-row';
    const lbl = document.createElement('label');
    lbl.textContent = labelText;
    const sel = fld('select');
    fillSelect(sel, options);
    sel.value = value;
    sel.addEventListener('change', () => { onChange(sel.value); applyEditing(); });
    row.appendChild(lbl); row.appendChild(sel);
    return row;
  }

  function peGroupLabel(text) {
    const d = document.createElement('div');
    d.className = 'pe-group-label';
    d.textContent = text;
    return d;
  }

  function renderPresetEditor() {
    if (!editing) { closeEditor(); return; }
    const track = engine.getTracks().find(t => t.id === editing.trackId);
    if (!track) { closeEditor(); return; }
    const cfg = editing.preset.config;
    const env = cfg.envelope || (cfg.envelope = {});
    presetEditorEl.hidden = false;
    presetEditorEl.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'pe-title';
    title.textContent = t('pe_title') + ' — ' + tipoLabel(track.tipo);
    presetEditorEl.appendChild(title);
    const sub = document.createElement('div');
    sub.className = 'pe-sub';
    sub.textContent = t('pe_base') + ' ' + (editing.preset.nombre || '—') +
      '. ' + t('pe_base_note');
    presetEditorEl.appendChild(sub);

    const isPercusion = (track.tipo === 'percusion' || track.tipo === 'bateria');
    const isSampled = (editing.preset.motor === 'webaudiofont' ||
                       editing.preset.motor === 'sampler');

    // Aviso para presets basados en muestras: forma de onda y envolvente
    // no aplican (el sonido viene de una grabación, no de un oscilador).
    // Los efectos sí aplican porque van AFTER el sample.
    if (isSampled && !isPercusion) {
      const note = document.createElement('div');
      note.className = 'pe-notice';
      note.textContent = t('pe_sampled_notice');
      presetEditorEl.appendChild(note);
    }

    if (isPercusion) {
      // Editor de piezas del kit: vol y tune por lane.
      const pieces = cfg.pieces || (cfg.pieces = {});
      presetEditorEl.appendChild(peGroupLabel(t('pe_kit_pieces')));
      Object.keys(pieces).forEach(lane => {
        const piece = pieces[lane];
        if (!piece) return;
        // Asegurar defaults numéricos para evitar undefined en UI.
        if (typeof piece.vol !== 'number') piece.vol = 1;
        if (typeof piece.tune !== 'number') piece.tune = 0;

        const header = document.createElement('div');
        header.className = 'pe-piece-name';
        header.textContent = pieceLabel(lane, piece);
        presetEditorEl.appendChild(header);

        // Volumen 0..100%
        presetEditorEl.appendChild(peParamRow(t('pe_volume'), 0, 1, 0.01,
          piece.vol, v => Math.round(v * 100) + '%',
          v => { piece.vol = v; }));

        // Tune solo para engines con pitch.
        if (piece.engine === 'membrane' || piece.engine === 'sample' ||
            piece.engine === 'waf-drum') {
          presetEditorEl.appendChild(peParamRow(t('pe_tune'), -12, 12, 1,
            piece.tune,
            v => (v > 0 ? '+' : '') + Math.round(v) + ' st',
            v => { piece.tune = Math.round(v); }));
        }
      });
    } else {
      // Oscilador (solo para melódicos synth — WAF y sampler lo ignoran).
      presetEditorEl.appendChild(peGroupLabel(t('pe_oscillator')));
      presetEditorEl.appendChild(peSelectRow(t('pe_waveform'), OSC_TYPES,
        (cfg.oscillator && cfg.oscillator.type) || 'sine', v => {
          cfg.oscillator = { type: v };
        }));

      // Envolvente ADSR
      presetEditorEl.appendChild(peGroupLabel(t('pe_envelope')));
      const secs = v => v.toFixed(2) + ' s';
      presetEditorEl.appendChild(peParamRow('Attack', 0, 2, 0.01,
        env.attack != null ? env.attack : 0.01, secs, v => { env.attack = v; }));
      presetEditorEl.appendChild(peParamRow('Decay', 0, 2, 0.01,
        env.decay != null ? env.decay : 0.2, secs, v => { env.decay = v; }));
      presetEditorEl.appendChild(peParamRow('Sustain', 0, 1, 0.01,
        env.sustain != null ? env.sustain : 0.5,
        v => Math.round(v * 100) + '%', v => { env.sustain = v; }));
      presetEditorEl.appendChild(peParamRow('Release', 0, 4, 0.01,
        env.release != null ? env.release : 0.3, secs, v => { env.release = v; }));

      // Filtro (solo el bajo es MonoSynth con filtro propio)
      if (track.tipo === 'bajo') {
        const filt = cfg.filter || (cfg.filter = { type: 'lowpass', Q: 1 });
        const fenv = cfg.filterEnvelope || (cfg.filterEnvelope = {});
        presetEditorEl.appendChild(peGroupLabel(t('pe_filter')));
        presetEditorEl.appendChild(peSelectRow(t('pe_type'), FILTER_TYPES,
          filt.type || 'lowpass', v => { filt.type = v; }));
        presetEditorEl.appendChild(peParamRow(t('pe_resonance'), 0, 12, 0.1,
          filt.Q != null ? filt.Q : 1, v => v.toFixed(1), v => { filt.Q = v; }));
        presetEditorEl.appendChild(peParamRow(t('pe_base_freq'), 40, 1200, 10,
          fenv.baseFrequency != null ? fenv.baseFrequency : 200,
          v => Math.round(v) + ' Hz', v => { fenv.baseFrequency = v; }));
        presetEditorEl.appendChild(peParamRow(t('pe_octaves'), 0, 6, 0.1,
          fenv.octaves != null ? fenv.octaves : 3, v => v.toFixed(1),
          v => { fenv.octaves = v; }));
      }
    }

    // Efectos
    presetEditorEl.appendChild(peGroupLabel(t('pe_effects')));
    EFFECTS.forEach(fx => {
      const current = (editing.preset.efectos || []).find(e => e.tipo === fx.tipo);
      const row = document.createElement('div');
      row.className = 'pe-row';
      const chk = fld('input');
      chk.type = 'checkbox';
      chk.checked = !!current;
      const lbl = document.createElement('label');
      lbl.textContent = t('fx_' + fx.tipo);
      lbl.style.minWidth = '80px';
      const range = fld('input');
      range.type = 'range';
      range.min = '0'; range.max = '1'; range.step = '0.01';
      range.value = String(current ? current.cantidad : 0.3);
      range.disabled = !current;
      const valEl = document.createElement('span');
      valEl.className = 'pe-val';
      valEl.textContent = Math.round(Number(range.value) * 100) + '%';

      function rebuildEffects() {
        const list = [];
        Array.prototype.forEach.call(presetEditorEl.querySelectorAll('.pe-fx'), fxRow => {
          if (fxRow.dataset.on === '1') {
            list.push({ tipo: fxRow.dataset.tipo, cantidad: Number(fxRow.dataset.amt) });
          }
        });
        editing.preset.efectos = list;
        applyEditing();
      }
      row.className = 'pe-row pe-fx';
      row.dataset.tipo = fx.tipo;
      row.dataset.on = current ? '1' : '0';
      row.dataset.amt = String(current ? current.cantidad : 0.3);

      chk.addEventListener('change', () => {
        row.dataset.on = chk.checked ? '1' : '0';
        range.disabled = !chk.checked;
        rebuildEffects();
      });
      range.addEventListener('input', () => {
        row.dataset.amt = range.value;
        valEl.textContent = Math.round(Number(range.value) * 100) + '%';
        rebuildEffects();
      });

      row.appendChild(chk);
      row.appendChild(lbl);
      row.appendChild(range);
      row.appendChild(valEl);
      presetEditorEl.appendChild(row);
    });

    // Acciones: diseñar desde cero / guardar / cerrar
    const actions = document.createElement('div');
    actions.className = 'pe-actions';

    // Restablecer — vuelve al preset de fábrica original (descarta
    // todas las ediciones de esta sesión). Es lo que el usuario suele
    // querer cuando piensa "resetear".
    const restore = mkBtn('btn btn-secondary', t('pe_restore'), () => {
      const factory = BT.factoryPresets.byId(track.presetId);
      if (!factory) return;
      editing.preset = BT.factoryPresets.clone(factory);
      applyEditing();
      renderPresetEditor();
    });
    restore.title = t('pe_restore_title');
    actions.appendChild(restore);

    // Desde cero — crea un preset vacío genérico (synth simple para
    // melódicos, kit básico para percusión). No restaura el original.
    const scratch = mkBtn('btn btn-secondary', t('pe_scratch'), () => {
      editing.preset = blankPreset(track.tipo);
      applyEditing();
      renderPresetEditor();
    });
    scratch.title = t('pe_scratch_title');
    actions.appendChild(scratch);

    const nameInput = fld('input');
    nameInput.type = 'text';
    nameInput.placeholder = t('pe_name_ph');
    nameInput.value = '';
    actions.appendChild(nameInput);

    const save = mkBtn('btn btn-primary', t('pe_save_as_new'), () => {
      const nombre = nameInput.value.trim() || t('pe_default_name');
      const toSave = JSON.parse(JSON.stringify(editing.preset));
      toSave.nombre = nombre;
      toSave.tipo = track.tipo;
      const newId = BT.userLibrary.add(toSave);
      // La pista pasa a referenciar el preset guardado (deja de ser "editado").
      engine.updateTrack(editing.trackId, { presetId: newId });
      closeEditor();
      refreshTracks();
    });
    actions.appendChild(save);

    actions.appendChild(mkBtn('btn btn-secondary', t('pe_close'), closeEditor));
    presetEditorEl.appendChild(actions);
  }

  // ─── Modo arreglo ───
  // Lanes del kit / secuenciador. Las claves (main/kick/…) son dato
  // interno; la etiqueta visible se traduce (lane_<clave>).
  const LANE_KEYS = ['main', 'kick', 'snare', 'hat', 'cymbal',
    'bongo_hi', 'bongo_lo', 'conga', 'shaker'];
  function laneLabel(lane) {
    return (LANE_KEYS.indexOf(lane) >= 0) ? t('lane_' + lane) : lane;
  }

  // Instrumentos del GM drum kit por midi note. La nota MIDI es dato;
  // la etiqueta visible se traduce (waf_<nota>). Permite que el editor
  // de kit muestre "Claves" en vez de "Shaker" para un waf-drum dado.
  const WAF_DRUM_NOTES = [
    35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,
    59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81];
  function pieceLabel(lane, piece) {
    if (piece && piece.engine === 'waf-drum' &&
        WAF_DRUM_NOTES.indexOf(piece.note) >= 0) {
      return t('waf_' + piece.note);
    }
    return laneLabel(lane);
  }
  // Opciones de voicing / inversión / octava. El `id` es dato interno;
  // el `nombre` visible se resuelve por traducción al construir el select.
  function voicingOpts() {
    return [
      { id: 'close', nombre: t('voicing_close') },
      { id: 'open', nombre: t('voicing_open') },
    ];
  }
  function inversionOpts() {
    return [
      { id: '0', nombre: t('inversion_root') }, { id: '1', nombre: t('inversion_1') },
      { id: '2', nombre: t('inversion_2') }, { id: '3', nombre: t('inversion_3') },
    ];
  }
  // Etiqueta "Oct. N" para los selectores de octava.
  function octaveOpts(nums) {
    return nums.map(n => ({ id: String(n), nombre: t('octave_abbr') + ' ' + n }));
  }
  // Contorno de octavas (por acorde). 'off' = octava fija (como siempre).
  function contourOpts() {
    return [
      { id: 'off',    nombre: t('contour_off') },
      { id: 'asc',    nombre: t('contour_asc') },
      { id: 'desc',   nombre: t('contour_desc') },
      { id: 'updown', nombre: t('contour_updown') },
    ];
  }
  function cycleOpts() {
    return [
      { id: '0', nombre: t('invert_never') },
      { id: '1', nombre: '1' }, { id: '2', nombre: '2' }, { id: '4', nombre: '4' },
    ];
  }
  // Select compacto con etiqueta arriba (para los controles de contorno).
  function miniSelect(labelKey, options, value, onChange) {
    const wrap = document.createElement('label');
    wrap.className = 'ctl-mini';
    const span = document.createElement('span');
    span.textContent = t(labelKey);
    wrap.appendChild(span);
    wrap.appendChild(makeArrangeSelect(options, value, onChange));
    return wrap;
  }
  // Controles de contorno para una pista de acordes/lead/pad.
  function contourControls(track) {
    const c = track.contour || {};
    const active = c.mode === 'auto';
    const out = [];
    function patch(p) {
      // Defaults en oct 3-5: zona donde los acordes suenan parejos (oct 1-2
      // se perciben muy flojos por las curvas de igual sonoridad).
      const base = Object.assign(
        { mode: 'auto', shape: 'asc', floor: 3, ceil: 5, axis: 4, cycle: 0 },
        track.contour || {});
      engine.updateTrack(track.id, { contour: Object.assign(base, p) });
      renderArrange();
    }
    out.push(miniSelect('contour_label', contourOpts(), active ? (c.shape || 'asc') : 'off',
      function (v) {
        if (v === 'off') { engine.updateTrack(track.id, { contour: { mode: 'off' } }); renderArrange(); }
        else patch({ mode: 'auto', shape: v });
      }));
    if (active) {
      const O = octaveOpts([2, 3, 4, 5, 6]);   // oct 1 fuera: sub-grave inútil para acordes
      out.push(miniSelect('floor_label', O, String(c.floor != null ? c.floor : 3), v => patch({ floor: Number(v) })));
      out.push(miniSelect('ceil_label',  O, String(c.ceil  != null ? c.ceil  : 5), v => patch({ ceil:  Number(v) })));
      out.push(miniSelect('axis_label',  O, String(c.axis  != null ? c.axis  : 4), v => patch({ axis:  Number(v) })));
      out.push(miniSelect('invert_label', cycleOpts(), String(c.cycle != null ? c.cycle : 0), v => patch({ cycle: Number(v) })));
    }
    return out;
  }
  let hideIndicator = false;

  function cycleCell(pattern, lane, step) {
    const SG = BT.stepGrid;
    const hit = SG.hitAt(pattern, lane, step);
    if (!hit) return SG.setVelocity(pattern, lane, step, 0.4);
    if (hit.velocity < 0.55) return SG.setVelocity(pattern, lane, step, 0.7);
    if (hit.velocity < 0.85) return SG.setVelocity(pattern, lane, step, 1.0);
    return SG.toggle(pattern, lane, step);   // 1.0 → apagado
  }
  function cellClass(hit) {
    if (!hit) return '';
    if (hit.velocity < 0.55) return 'v1';
    if (hit.velocity < 0.85) return 'v2';
    return 'v3';
  }

  function makeStepGrid(track) {
    const SG = BT.stepGrid;
    const pattern = engine.getTrackPattern(track.id);
    const wrap = document.createElement('div');
    if (!pattern) {
      const note = document.createElement('div');
      note.className = 'empty-hint';
      note.textContent = t('seq_sustained');
      wrap.appendChild(note);
      return wrap;
    }
    pattern.lanes.forEach(lane => {
      const laneRow = document.createElement('div');
      laneRow.className = 'seq-lane';
      const label = document.createElement('span');
      label.className = 'seq-lane-label';
      label.textContent = laneLabel(lane);
      laneRow.appendChild(label);
      const cells = document.createElement('div');
      cells.className = 'seq-cells';
      for (let s = 0; s < pattern.steps; s++) {
        const hit = SG.hitAt(pattern, lane, s);
        const cell = document.createElement('button');
        cell.className = 'seq-cell ' + cellClass(hit) +
          (s % 4 === 0 ? ' beat' : '');
        cell.addEventListener('click', function () {
          const fresh = engine.getTrackPattern(track.id);
          engine.setTrackPattern(track.id, cycleCell(fresh, lane, s));
          renderArrange();
        });
        cells.appendChild(cell);
      }
      laneRow.appendChild(cells);
      wrap.appendChild(laneRow);
    });
    return wrap;
  }

  function makeArrangeTrack(track) {
    const block = document.createElement('div');
    block.className = 'arrange-track';

    const head = document.createElement('div');
    head.className = 'arrange-track-head';
    const name = document.createElement('span');
    name.className = 'track-tipo';
    name.textContent = tipoLabel(track.tipo);
    head.appendChild(name);

    // Variante A / B del patrón.
    if (PATTERN_TIPO[track.tipo]) {
      const vt = document.createElement('div');
      vt.className = 'variant-toggle';
      ['A', 'B'].forEach(v => {
        const b = document.createElement('button');
        b.className = 'variant-btn' +
          ((track.variant || 'A') === v ? ' active' : '');
        b.textContent = v;
        b.addEventListener('click', function () {
          engine.setTrackVariant(track.id, v);
          renderArrange();
        });
        vt.appendChild(b);
      });
      head.appendChild(vt);
    }

    // Voicings (acordes / lead / pad) u octava (bajo).
    if (track.tipo === 'bajo') {
      head.appendChild(makeArrangeSelect(
        octaveOpts([1, 2, 3]),
        String(track.octave != null ? track.octave : 2),
        v => engine.updateTrack(track.id, { octave: Number(v) })));
    } else if (['acordes', 'lead', 'pad'].indexOf(track.tipo) >= 0) {
      head.appendChild(makeArrangeSelect(voicingOpts(),
        track.voicing || 'close',
        v => engine.updateTrack(track.id, { voicing: v })));
      head.appendChild(makeArrangeSelect(inversionOpts(),
        String(track.inversion || 0),
        v => engine.updateTrack(track.id, { inversion: Number(v) })));
      head.appendChild(makeArrangeSelect(
        octaveOpts([2, 3, 4]),
        String(track.octave != null ? track.octave : 3),
        v => engine.updateTrack(track.id, { octave: Number(v) })));
      contourControls(track).forEach(elx => head.appendChild(elx));
    }

    block.appendChild(head);
    block.appendChild(makeStepGrid(track));
    return block;
  }

  function makeArrangeSelect(options, value, onChange) {
    const sel = fld('select');
    options.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.nombre;
      if (o.id === value) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }

  function renderArrange() {
    const isArreglo = engine.getMode() === 'arreglo';
    modePractica.classList.toggle('active', !isArreglo);
    modeArreglo.classList.toggle('active', isArreglo);
    arrangePanel.hidden = !isArreglo;
    chordStrip.classList.toggle('hidden-indicator', isArreglo && hideIndicator);
    if (!isArreglo) return;

    arrangePanel.innerHTML = '';

    // Groove de estilo — aplica patrones + tempo a todas las pistas.
    const grLabel0 = document.createElement('div');
    grLabel0.className = 'section-label';
    grLabel0.textContent = t('arr_style_groove');
    arrangePanel.appendChild(grLabel0);
    const grRow = document.createElement('div');
    grRow.className = 'control-row';
    const grCap = document.createElement('label');
    grCap.textContent = t('arr_apply');
    const grSel = fld('select');
    const grPlaceholder = document.createElement('option');
    grPlaceholder.value = '';
    grPlaceholder.textContent = t('arr_choose_groove');
    grSel.appendChild(grPlaceholder);
    (BT.factoryGrooves ? BT.factoryGrooves.GROOVES : []).forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.nombre;
      grSel.appendChild(opt);
    });
    grSel.addEventListener('change', function () {
      if (grSel.value) applyGroove(grSel.value);
      // Es una acción, no un estado: vuelve al placeholder.
      grSel.value = '';
    });
    grRow.appendChild(grCap);
    grRow.appendChild(grSel);
    arrangePanel.appendChild(grRow);

    // Humanización (intensidad global).
    const humLabel = document.createElement('div');
    humLabel.className = 'section-label';
    humLabel.textContent = t('arr_humanize');
    arrangePanel.appendChild(humLabel);
    const humRow = document.createElement('div');
    humRow.className = 'control-row';
    const humCap = document.createElement('label');
    humCap.textContent = t('arr_intensity');
    const humSlider = fld('input');
    humSlider.type = 'range';
    humSlider.min = '0'; humSlider.max = '100'; humSlider.step = '1';
    humSlider.value = String(Math.round(engine.getHumanize() * 100));
    const humVal = document.createElement('span');
    humVal.className = 'value';
    humVal.textContent = humSlider.value + '%';
    humSlider.addEventListener('input', function () {
      engine.setHumanize(Number(humSlider.value) / 100);
      humVal.textContent = humSlider.value + '%';
    });
    humRow.appendChild(humCap);
    humRow.appendChild(humSlider);
    humRow.appendChild(humVal);
    arrangePanel.appendChild(humRow);

    // Ocultar indicador de acorde (entrenamiento de oído).
    const hideRow = document.createElement('div');
    hideRow.className = 'control-row';
    const hideCap = document.createElement('label');
    hideCap.textContent = t('arr_hide_chord');
    const hideChk = fld('input');
    hideChk.type = 'checkbox';
    hideChk.checked = hideIndicator;
    hideChk.addEventListener('change', function () {
      hideIndicator = hideChk.checked;
      chordStrip.classList.toggle('hidden-indicator', hideIndicator);
    });
    hideRow.appendChild(hideCap);
    hideRow.appendChild(hideChk);
    const sp = document.createElement('span');
    sp.style.flex = '1';
    hideRow.appendChild(sp);
    arrangePanel.appendChild(hideRow);

    // Grooves y voicings por pista.
    const grLabel = document.createElement('div');
    grLabel.className = 'section-label';
    grLabel.textContent = t('arr_groove_voicings');
    arrangePanel.appendChild(grLabel);
    const tracks = engine.getTracks();
    if (!tracks.length) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = t('arr_add_tracks_hint');
      arrangePanel.appendChild(hint);
    } else {
      tracks.forEach(t => arrangePanel.appendChild(makeArrangeTrack(t)));
    }
  }

  function refreshTracks() {
    renderTracks();
    renderArrange();
  }

  // Aplica un groove de estilo: pone el patrón que le corresponde a
  // cada pista y el tempo sugerido, de un solo paso.
  function applyGroove(grooveId) {
    const groove = BT.factoryGrooves && BT.factoryGrooves.byId(grooveId);
    if (!groove) return;
    engine.getTracks().forEach(track => {
      const pt = PATTERN_TIPO[track.tipo];
      const pid = pt && groove.patterns[pt];
      if (pid) engine.updateTrack(track.id, { patternId: pid });
    });
    if (groove.tempo) engine.setTempo(groove.tempo);
    syncControls();
    refreshTracks();
  }

  // ─── Proyectos y persistencia ───
  //
  // takeSnapshot — extiende engine.snapshot() con el estado de la
  // progresión de fábrica activa (id + tonalidad) si lo hay. Permite
  // restaurar la sesión preservando los grados como fuente de verdad:
  // si el catálogo cambia, las progresiones se re-realizan correctamente.
  function takeSnapshot() {
    const s = engine.snapshot();
    if (factoryProgState.id) {
      s.factoryProg = {
        id: factoryProgState.id,
        tonalidad: factoryProgState.tonalidad,
      };
    }
    return s;
  }

  function restoreSnapshot(snap) {
    if (!snap) return;
    if (editing) closeEditor();
    engine.restore(snap);
    // Si el snapshot trae factoryProg (formato nuevo), re-realiza la
    // progresión desde el catálogo. Esto mantiene los grados como fuente
    // de verdad — si el catálogo se editó, la próxima carga aplica los
    // cambios. Si el id ya no existe en el catálogo, cae al fallback.
    let loaded = false;
    if (snap.factoryProg && snap.factoryProg.id &&
        BT.factoryProgressions.byId(snap.factoryProg.id)) {
      loaded = loadFactoryProgression(snap.factoryProg.id, snap.factoryProg.tonalidad);
      if (loaded) {
        progSelect.value = snap.factoryProg.id;
        // loadFactoryProgression aplica el tempo NATIVO del catálogo, pisando
        // el tempo guardado que engine.restore() ya había restaurado. Lo
        // reponemos para no perder el BPM customizado al reabrir el proyecto.
        if (Number.isFinite(snap.tempo)) engine.setTempo(snap.tempo);
      }
    }
    if (!loaded) {
      // Formato viejo o progresión personalizada: cargar acordes inline.
      model.loadProgression(snap.progression || []);
      unbindFromCatalog();
    }
    // loadProgression resetea el loop; reponemos el rango guardado.
    if (Array.isArray(snap.loopRange)) {
      model.setLoopRange(snap.loopRange[0], snap.loopRange[1]);
    }
    syncControls();
    refreshTracks();
  }

  function refreshProjects() {
    const list = storage.listProjects();
    projSelect.innerHTML = '';
    if (!list.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = t('proj_none');
      projSelect.appendChild(opt);
      return;
    }
    list.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nombre;
      projSelect.appendChild(opt);
    });
  }

  function downloadJSON(filename, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ─── Sincronizar controles de transporte ───
  function syncControls() {
    ctlTempo.value = String(engine.getTempo());
    valTempo.textContent = engine.getTempo() + ' BPM';
    const vol = Math.round(engine.getMasterVolume() * 100);
    ctlVolume.value = String(vol);
    valVolume.textContent = vol + '%';
    ctlLoop.checked = engine.getLoop();
  }

  // ─── Transporte: botón único Play / Detener ───
  function setConfigCollapsed(collapsed) {
    configEl.classList.toggle('collapsed', collapsed);
    configToggle.setAttribute('aria-expanded', String(!collapsed));
  }
  // Refleja el estado de reproducción en la UI (lo dispara onTransport).
  function modeLabel(mode) {
    return (mode === 'arreglo') ? t('mode_arrange') : t('mode_practice');
  }
  function setPlayUI(playing) {
    btnPlay.textContent = playing ? t('btn_stop') : t('btn_play');
    btnPlay.classList.toggle('is-playing', playing);
    document.body.classList.toggle('playing', playing);   // agranda el panel
    setConfigCollapsed(playing);   // la configuración se pliega al tocar
    if (playing) setStatus(t('status_playing') + ' — ' + modeLabel(engine.getMode()), 'playing');
    else setStatus(t('status_stopped'));
  }

  // Alterna reproducción / parada. Disparado por el botón y por la
  // tecla P (ambos cuentan como gesto de usuario → Tone.start() puede
  // reanudar el AudioContext).
  async function togglePlay() {
    if (engine.isPlaying()) { engine.stop(); return; }
    try {
      await engine.play();
    } catch (err) {
      setStatus(t('status_audio_error') + ' ' + err.message, 'error');
    }
  }

  btnPlay.addEventListener('click', togglePlay);

  configToggle.addEventListener('click', function () {
    setConfigCollapsed(!configEl.classList.contains('collapsed'));
  });

  ctlTempo.addEventListener('input', function () {
    engine.setTempo(Number(ctlTempo.value));
    valTempo.textContent = engine.getTempo() + ' BPM';
  });

  ctlVolume.addEventListener('input', function () {
    const v = Number(ctlVolume.value);
    engine.setMasterVolume(v / 100);
    valVolume.textContent = v + '%';
  });

  ctlLoop.addEventListener('change', () => engine.setLoop(ctlLoop.checked));

  subdivSelect.addEventListener('change', function () {
    engine.setSubdivision(subdivSelect.value);
    buildBeatMeter(SUBDIV_COUNT[subdivSelect.value] || 4);
  });

  // Teclado: P alterna play/pausa, navegar acordes con ←→, ajustar
  // compases con ↑↓, Esc detiene.
  function navChord(dir) {
    const n = model.progression.length;
    if (!n) return;
    model.setActiveChord((model.activeIdx + dir + n) % n);
  }
  document.addEventListener('keydown', function (e) {
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    switch (e.key) {
      case 'p': case 'P': togglePlay(); e.preventDefault(); break;
      case 'Escape': if (engine.isPlaying()) engine.stop(); break;
      case 'ArrowLeft':  navChord(-1); e.preventDefault(); break;
      case 'ArrowRight': navChord(1);  e.preventDefault(); break;
      case 'ArrowUp':    if (model.changeActiveBars(1))  unbindFromCatalog(); e.preventDefault(); break;
      case 'ArrowDown':  if (model.changeActiveBars(-1)) unbindFromCatalog(); e.preventDefault(); break;
      case 'Delete':
      case 'Backspace': {
        // Borra el acorde seleccionado. Re-selecciona el anterior (o el
        // primero) para no perder el foco del editor.
        const n = model.progression.length;
        const idx = model.activeIdx;
        if (n > 0 && idx >= 0 && idx < n) {
          model.removeChordAt(idx);
          unbindFromCatalog();
          const after = model.progression.length;
          if (after > 0) model.setActiveChord(Math.min(idx, after - 1));
          e.preventDefault();
        }
        break;
      }
    }
  });

  progSelect.addEventListener('change', function () {
    const id = progSelect.value;
    if (!id) {
      // "(personalizada)" — desvincula del catálogo.
      unbindFromCatalog();
      syncControls();
      return;
    }
    if (loadFactoryProgression(id)) syncControls();
  });

  tonalidadSelect.addEventListener('change', function () {
    setActiveTonalidad(tonalidadSelect.value);
  });
  btnTonalidadReset.addEventListener('click', function () {
    if (!factoryProgState.id) return;
    const prog = BT.factoryProgressions.byId(factoryProgState.id);
    if (prog) setActiveTonalidad(prog.tonalidad);
  });

  btnAddChord.addEventListener('click', function () {
    model.addChord({ root: newRoot.value, quality: newQuality.value, bars: 1 });
    model.setActiveChord(model.progression.length - 1);
    unbindFromCatalog();
  });
  btnClearProg.addEventListener('click', function () {
    model.clear();
    unbindFromCatalog();
  });

  btnAdd.addEventListener('click', function () {
    engine.addTrack({ tipo: addTipo.value });
    refreshTracks();
  });

  // Toggle de modo práctica / arreglo.
  modePractica.addEventListener('click', function () {
    engine.setMode('practica');
    renderArrange();
  });
  modeArreglo.addEventListener('click', function () {
    engine.setMode('arreglo');
    renderArrange();
  });

  // Proyectos
  btnSaveProj.addEventListener('click', function () {
    const nombre = projName.value.trim() || t('proj_default_name');
    storage.saveProject(nombre, takeSnapshot());
    refreshProjects();
    projSelect.value = '';
    setStatus(t('status_proj_saved_a') + ' "' + nombre + '" ' + t('status_proj_saved_b'));
  });
  btnLoadProj.addEventListener('click', function () {
    const id = projSelect.value;
    if (!id) return;
    const snap = storage.loadProject(id);
    if (snap) { restoreSnapshot(snap); setStatus(t('status_proj_loaded')); }
  });
  btnDelProj.addEventListener('click', function () {
    const id = projSelect.value;
    if (!id) return;
    storage.deleteProject(id);
    refreshProjects();
  });

  // Exportar / importar
  btnExport.addEventListener('click', function () {
    downloadJSON('backing-track-respaldo.json', storage.exportAll());
  });
  btnImport.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', function () {
    const file = importFile.files && importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      const ok = storage.importAll(String(reader.result));
      if (ok) {
        refreshProjects();
        refreshTracks();
        setStatus(t('status_imported'));
      } else {
        setStatus(t('status_invalid_json'), 'error');
      }
    };
    reader.readAsText(file);
    importFile.value = '';
  });

  engine.onChordChange(highlightChord);
  engine.onTick(updateBarIndicator);
  // Diagnóstico: muestra cuántas voces suenan y el máximo de la
  // sesión. Si el máximo trepa sin parar loop tras loop, hay
  // acumulación; si se estabiliza, está sano.
  let voiceMax = 0;
  engine.onTick(function (tick) {
    if (!tick) { diagVoices.textContent = t('diag_voices') + ' —'; voiceMax = 0; return; }
    const n = engine.getActiveVoices();
    if (n > voiceMax) voiceMax = n;
    diagVoices.textContent = t('diag_voices') + ' ' + n + ' · ' + t('diag_max') + ' ' + voiceMax;
  });
  // Autoguardado de la sesión: debounced, para no escribir en
  // localStorage en cada tick de un slider (eso traba el audio).
  let saveTimer = null;
  engine.onStateChange(function () {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      storage.saveSession(takeSnapshot());
    }, 400);
  });
  engine.onTransport(function (ev) {
    if (ev === 'play') setPlayUI(true);
    else if (ev === 'stop') setPlayUI(false);
  });
  // Si cambia la librería del usuario, refrescar dropdowns y persistir.
  BT.userLibrary.onChange(function () {
    refreshTracks();
    storage.saveLibrary();
  });

  // ─── Arranque ───
  // El diagnóstico de voces solo se muestra en modo debug (?debug).
  if (/[?&]debug\b/.test(location.search)) diagVoices.hidden = false;
  initProgSelect();
  initTonalidadSelect();
  fillSelect(newRoot, ROOTS, null, fmtNote);
  fillSelect(newQuality, QUALITIES, 'v', qualityLabel);

  storage.loadLibrary();              // librería de presets del usuario
  const handoff = BT.integration && BT.integration.readHandoff();
  const session = storage.loadSession();
  if (handoff) {
    // Progresión enviada desde el Intervalic Atlas: pistas por
    // defecto + la progresión recibida.
    setupDefaultTracks();
    model.loadProgression(handoff);
    unbindFromCatalog();
  } else if (session && Array.isArray(session.tracks) && session.tracks.length) {
    restoreSnapshot(session);         // reabrir donde se dejó
  } else {
    loadDefaultProject();
  }
  refreshProjects();
  renderChords();
  renderEditor();
  renderHeroChords();
  refreshTracks();
  syncControls();
  subdivSelect.value = engine.getSubdivision();
  buildBeatMeter(SUBDIV_COUNT[engine.getSubdivision()] || 4);
  setStatus(handoff ? t('status_handoff') : t('status_stopped'));

  // Re-render dinámico al cambiar de idioma: las partes generadas por JS
  // (acordes, editor, pistas, modo arreglo, controles de tonalidad y el
  // botón Play) se reconstruyen para aplicar el nuevo idioma. Los textos
  // estáticos del HTML los refresca el propio motor i18n.
  W.addEventListener('i18n:changed', function () {
    initProgSelect();
    progSelect.value = factoryProgState.id || '';
    fillSelect(newQuality, QUALITIES, 'v', qualityLabel);
    syncTonalidadControls();
    renderChords();
    renderEditor();
    renderHeroChords(engine.getActiveChordIndex());
    refreshTracks();
    refreshProjects();
    setPlayUI(engine.isPlaying());
  });
})(typeof window !== 'undefined' ? window : globalThis);
