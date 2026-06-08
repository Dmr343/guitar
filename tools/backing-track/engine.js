// ─────────────────────────────────────────────────────────────
// Backing Track — motor (engine)
//
// Orquesta Tone.Transport, el scheduling real y la lista dinámica
// de pistas. Es el "código fijo" de la arquitectura motor/datos: no
// conoce sonidos concretos — recibe presets y patrones (datos) y los
// resuelve vía instruments.js, scheduler.js y voicing.js.
//
// Los eventos se agendan en tiempo MUSICAL (compás:pulso:semicorchea),
// de modo que cambiar el BPM del Transport reescala todo sin
// reprogramar nada.
//
// createEngine() devuelve un objeto con la API pública del motor.
// IIFE + namespace global (file:// safe).
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  function Tone() {
    const t = W.Tone;
    if (!t) throw new Error('Tone.js no está cargado (vendor/Tone.js)');
    return t;
  }
  function BT() { return W.BackingTrack || {}; }

  const STEPS_PER_BAR = 16;
  const DEFAULT_TEMPO = 100;

  // Subdivisiones del metrónomo (indicador de compás). interval es la
  // notación de Tone para el Tone.Loop; count es cuántas entran por
  // compás de 4/4.
  const SUBDIVISIONS = {
    redonda:     { interval: '1n', count: 1 },
    blanca:      { interval: '2n', count: 2 },
    negra:       { interval: '4n', count: 4 },
    corchea:     { interval: '8n', count: 8 },
    tresillo:    { interval: '8t', count: 12 },
    semicorchea: { interval: '16n', count: 16 },
  };

  // step (semicorcheas absolutas) → "compás:pulso:semicorchea" de Tone.
  function stepToBBS(step) {
    const bar = Math.floor(step / STEPS_PER_BAR);
    const rest = step % STEPS_PER_BAR;
    return bar + ':' + Math.floor(rest / 4) + ':' + (rest % 4);
  }

  // Rol de pista → tipo de patrón que le corresponde.
  const PATTERN_TIPO = {
    bajo: 'bass', acordes: 'chord', lead: 'chord',
    bateria: 'drums', percusion: 'perc',
  };

  function createEngine() {
    const transport = Tone().getTransport();
    // El grafo de audio se crea recién en el primer Play (tras el
    // gesto del usuario / Tone.start), para no tocar el AudioContext
    // antes de tiempo — eso disparaba warnings al cargar la página.
    let masterGain = null;
    let sharedReverb = null;
    let masterVol = 0.85;

    // Crea el grafo de audio una sola vez. masterGain → destino, y un
    // único bus de reverb compartido (un convolver) al que cada pista
    // le envía una porción de su señal — mucho más liviano que un
    // reverb por instrumento.
    function ensureAudioGraph() {
      if (masterGain) return;
      const T = Tone();
      // Limiter antes de la salida — evita clipping digital duro cuando
      // varios instrumentos suenan con reverb/chorus encima. -1dB ceiling
      // es transparente para audio normal y solo actúa en picos.
      const limiter = new T.Limiter(-1);
      masterGain = new T.Gain(masterVol);
      masterGain.chain(limiter, T.getDestination());
      // decay 5s + preDelay 30ms → cola con "espacio" pero no exagerada.
      // Antes con 8s + send ×2.5 la suma dry+wet superaba 1.0 y saturaba
      // el output → calidad audible degradada. Estos valores se quedan
      // en rango sano con el limiter como red de seguridad.
      sharedReverb = new T.Reverb({ decay: 5, preDelay: 0.03, wet: 1 });
      try { if (typeof sharedReverb.generate === 'function') sharedReverb.generate(); } catch (e) {}
      sharedReverb.connect(masterGain);
    }

    // Nivel de envío al reverb. El slider 0–1 se mapea directo a 0–1 en
    // el send. La diferencia entre min/max es clara gracias a la cola
    // larga (decay 5s) — no hace falta sobrepasar la unidad.
    function reverbAmountOf(preset) {
      const fx = (preset && preset.efectos) || [];
      const r = fx.filter(function (e) { return e && e.tipo === 'reverb'; })[0];
      return (r && Number.isFinite(r.cantidad)) ? r.cantidad : 0;
    }

    // ─── Estado (datos) ───
    let progression = [];          // [{root,quality,bars}]
    let tempo = DEFAULT_TEMPO;
    let tracks = [];               // pistas (config, ver addTrack)
    let loopEnabled = true;
    let mode = 'practica';
    let humanizeAmount = 0;        // 0..1 — intensidad de humanización
    let loopRangeIdx = null;       // [a,b] índices de acorde, o null (loop completo)
    let focusChordIndex = -1;      // acorde con foco (-1 = sin foco → arranca en el inicio del loop); punto de reinicio al editar en vivo
    let subdivision = 'negra';     // subdivisión del indicador de compás
    let trackCounter = 0;
    let tickCounter = -1;          // cuenta de subdivisiones del indicador

    // ─── Runtime (audio) ───
    const runtime = {};            // trackId → { instrument, gain, presetId }
    let notePart = null;
    let chordPart = null;
    let tickLoop = null;           // Tone.Loop por pulso para el indicador
    let barRebuildId = null;       // scheduleRepeat por compás para aplicar pendientes
    let playing = false;
    let activeChordIndex = -1;
    let loopStartBBS = '0:0:0';    // posición de inicio del loop (tiempo musical)
    let pendingRebuild = false;    // hay una edición esperando el próximo límite de compás

    // ─── Listeners ───
    const listeners = { chord: [], state: [], transport: [], tick: [] };
    function emit(kind, payload) {
      listeners[kind].forEach(fn => { try { fn(payload); } catch (e) {} });
    }

    // ─── Resolución de datos de fábrica ───
    function resolvePreset(id) {
      const fp = BT().factoryPresets;
      return (fp && fp.byId(id)) || null;
    }
    function resolvePattern(id) {
      const fp = BT().factoryPatterns;
      return (fp && fp.byId(id)) || null;
    }

    // ─── Instrumentos ───
    // El preset efectivo de una pista: su copia de trabajo editada
    // (customPreset) si existe, o el preset de fábrica por id.
    function effectivePreset(track) {
      return track.customPreset || resolvePreset(track.presetId);
    }

    // Ganancia efectiva de una pista: 0 si está muteada, su volumen si no.
    function trackGainValue(track) {
      if (track.enabled === false) return 0;
      return Number.isFinite(track.volumen) ? track.volumen : 0.8;
    }

    function buildInstrument(track) {
      const preset = effectivePreset(track);
      if (!preset) return null;
      const instrument = BT().instruments.createInstrument(preset);
      const gain = new (Tone().Gain)(trackGainValue(track));
      instrument.output.connect(gain);
      gain.connect(masterGain);
      // Envío al bus de reverb compartido, con el nivel del preset.
      const reverbSend = new (Tone().Gain)(reverbAmountOf(preset));
      gain.connect(reverbSend);
      reverbSend.connect(sharedReverb);
      // rt.preset es un SNAPSHOT — guarda una copia profunda del preset,
      // NO la referencia. Sin esto, mutaciones a editing.preset (que es
      // la misma referencia que track.customPreset) propagaban a
      // rt.preset y los checks fxSame/piecesSame veían "nada cambió"
      // — los sliders del editor no aplicaban hasta Ctrl+R.
      const sig = JSON.stringify(preset);
      return {
        instrument: instrument, gain: gain, reverbSend: reverbSend,
        preset: JSON.parse(sig), sig: sig,
      };
    }

    function disposeRuntime(id) {
      const rt = runtime[id];
      if (!rt) return;
      try { rt.instrument.dispose(); } catch (e) {}
      try { rt.gain.dispose(); } catch (e) {}
      try { rt.reverbSend.dispose(); } catch (e) {}
      delete runtime[id];
    }

    // (Re)construye los instrumentos de todas las pistas. Reusa el
    // instrumento si el preset no cambió; lo reconstruye si cambió.
    function ensureInstruments() {
      Object.keys(runtime).forEach(id => {
        if (!tracks.find(t => t.id === id)) disposeRuntime(id);
      });
      tracks.forEach(track => {
        const rt = runtime[track.id];
        const preset = effectivePreset(track);
        if (rt && preset && rt.sig === JSON.stringify(preset)) {
          rt.gain.gain.value = trackGainValue(track);
          return;
        }
        if (rt) disposeRuntime(track.id);
        const built = buildInstrument(track);
        if (built) runtime[track.id] = built;
      });
    }

    // applyTrackPreset — instala una copia de trabajo del preset en la
    // pista. Actualiza in-place si puede: config de síntesis, cantidades
    // de efectos y nivel de reverb se cambian sin reconstruir el
    // instrumento. Solo reconstruye si cambió el motor o el conjunto de
    // efectos (agregar/quitar un tipo).
    //
    // Why: en motores sampler/WAF, reconstruir tras cada mover-slider
    // dejaba al instrumento mudo durante la (re)carga asíncrona de
    // samples/soundfont, sobre todo si se encadenaban movimientos.
    // Comparación de la "estructura" de las piezas de un drumkit. Si
    // engines/note/file/url/variable/options son iguales en cada lane,
    // los voices ya construidos pueden reusarse y solo hay que actualizar
    // vol/tune via setConfig — sin reconstruir el kit.
    function piecesStructureSame(a, b) {
      if (!a || !b) return false;
      const aKeys = Object.keys(a).sort();
      const bKeys = Object.keys(b).sort();
      if (aKeys.length !== bKeys.length) return false;
      if (aKeys.some((k, i) => k !== bKeys[i])) return false;
      return aKeys.every(k => {
        const pa = a[k] || {}, pb = b[k] || {};
        return pa.engine === pb.engine &&
               pa.note === pb.note &&
               pa.noise === pb.noise &&
               pa.file === pb.file &&
               pa.baseUrl === pb.baseUrl &&
               pa.url === pb.url &&
               pa.variable === pb.variable &&
               JSON.stringify(pa.options || {}) === JSON.stringify(pb.options || {});
      });
    }

    function applyTrackPreset(id, preset) {
      const track = tracks.find(t => t.id === id);
      if (!track || !preset) return;
      track.customPreset = preset;
      const rt = runtime[id];
      if (!rt) { emit('state'); return; }

      const motorSame = rt.preset.motor === preset.motor;
      const oldFx = rt.preset.efectos || [];
      const newFx = preset.efectos || [];
      const fxSame = JSON.stringify(oldFx) === JSON.stringify(newFx);
      // Mismo conjunto de tipos en el mismo orden → solo cambian cantidades.
      const sameTipos = oldFx.length === newFx.length &&
        oldFx.every((e, i) => e.tipo === newFx[i].tipo);
      const amountOnly = sameTipos && !fxSame;

      // Para drumkits: solo se puede actualizar in-place si la estructura
      // de las piezas no cambió (engine/note/url/etc.). vol/tune sí
      // pueden cambiar — eso es lo que el editor de kit hace en vivo.
      const isDrumkit = rt.instrument.kind === 'drumkit';
      const piecesSame = !isDrumkit || piecesStructureSame(
        (rt.preset.config || {}).pieces || {},
        (preset.config || {}).pieces || {});

      if (motorSame && piecesSame && (fxSame || amountOnly)) {
        // setConfig de melódico actualiza osc/env/filter; el de drumkit
        // actualiza vol/tune por pieza. Ambos son no-ops si no aplica.
        if (rt.instrument.setConfig) {
          rt.instrument.setConfig(preset.config);
        }
        if (amountOnly) {
          rt.reverbSend.gain.value = reverbAmountOf(preset);
          newFx.forEach(spec => {
            if (spec.tipo === 'reverb') return;
            if (rt.instrument.setEffectAmount) {
              rt.instrument.setEffectAmount(spec.tipo, Number(spec.cantidad));
            }
          });
        }
        // Deep-clone — ver buildInstrument para el por qué. Sin clone,
        // las siguientes mutaciones a editing.preset propagan a rt.preset
        // y los checks fxSame/piecesSame ven "no cambió nada".
        const sig = JSON.stringify(preset);
        rt.preset = JSON.parse(sig);
        rt.sig = sig;
      } else {
        disposeRuntime(id);
        const built = buildInstrument(track);
        if (built) {
          runtime[id] = built;
          // Pad sostenido: el rebuild corta la nota sostenida y no se
          // dispararía una nueva hasta el próximo acorde (puede ser
          // varios compases después). Re-disparamos el acorde actual
          // sobre el nuevo instrumento para que el cambio se escuche al
          // instante.
          refireCurrentPadIfNeeded(track, built);
        }
      }
      emit('state');
    }

    // Re-dispara la nota sostenida del acorde actual sobre un instrumento
    // recién reconstruido. Calcula la duración restante del acorde para
    // que termine exacto cuando el scheduler dispare el próximo evento.
    function refireCurrentPadIfNeeded(track, rt) {
      if (!playing || activeChordIndex < 0 || !track || track.tipo !== 'pad') return;
      if (!rt || !rt.instrument || !rt.instrument.triggerNote) return;
      const chord = progression[activeChordIndex];
      if (!chord) return;
      const v = BT().voicing;
      if (!v || !v.resolveChord) return;
      // Compás de inicio del acorde activo (para contorno y tiempo restante).
      const secsPerBar = (60 / tempo) * 4;
      let chordStartBar = 0;
      for (let i = 0; i < activeChordIndex; i++) {
        chordStartBar += (progression[i] && progression[i].bars > 0
                          ? progression[i].bars : 1);
      }
      const sched = BT().scheduler;
      const oct = (sched && sched.contourOctave)
        ? sched.contourOctave(track, 'pad', activeChordIndex, progression.length, chordStartBar)
        : (Number.isFinite(track.octave) ? track.octave : 3);
      const notes = v.resolveChord(chord, {
        octave: oct,
        voicing: track.voicing || 'close',
        inversion: track.inversion || 0,
      });
      if (!notes || !notes.length) return;
      const chordBars = (chord.bars > 0) ? chord.bars : 1;
      const chordEndSec = (chordStartBar + chordBars) * secsPerBar;
      const T = Tone();
      const positionSec = T.getTransport().seconds;
      const remaining = Math.max(0.1, chordEndSec - positionSec);
      try { rt.instrument.triggerNote(notes, remaining, T.now(), 0.7); }
      catch (e) {}
    }

    // getTrackPreset — copia del preset efectivo de una pista, como
    // punto de partida para editarlo.
    function getTrackPreset(id) {
      const track = tracks.find(t => t.id === id);
      if (!track) return null;
      const p = effectivePreset(track);
      return p ? JSON.parse(JSON.stringify(p)) : null;
    }

    // ─── Patrones ───
    // El patrón efectivo de una pista: la variante editada activa
    // (track.patterns[track.variant]) si existe, o el patrón de
    // fábrica por id.
    function effectivePattern(track) {
      if (track.patterns && track.variant && track.patterns[track.variant]) {
        return track.patterns[track.variant];
      }
      return resolvePattern(track.patternId);
    }

    function getTrackPattern(id) {
      const track = tracks.find(t => t.id === id);
      if (!track) return null;
      const p = effectivePattern(track);
      return p ? JSON.parse(JSON.stringify(p)) : null;
    }

    // setTrackPattern — guarda una variante editada del patrón en la
    // pista (variante A o B según track.variant). Idempotente: si el
    // patrón guardado es idéntico al nuevo, no dispara rebuild.
    function setTrackPattern(id, pattern) {
      const track = tracks.find(t => t.id === id);
      if (!track || !pattern) return;
      if (!track.patterns) track.patterns = { A: null, B: null };
      const v = track.variant || 'A';
      if (JSON.stringify(track.patterns[v]) === JSON.stringify(pattern)) return;
      track.patterns[v] = pattern;
      refreshIfPlaying();
      emit('state');
    }

    function setTrackVariant(id, variant) {
      const track = tracks.find(t => t.id === id);
      if (!track) return;
      const next = (variant === 'B') ? 'B' : 'A';
      if (track.variant === next) return;
      track.variant = next;
      refreshIfPlaying();
      emit('state');
    }

    function disposeParts() {
      if (notePart) { try { notePart.dispose(); } catch (e) {} notePart = null; }
      if (chordPart) { try { chordPart.dispose(); } catch (e) {} chordPart = null; }
      // tickLoop NO se disposea aquí — vive durante toda la sesión de
      // reproducción para mantener el metrónomo en sync. Solo se libera
      // en stop() y se recrea en setSubdivision() cuando cambia el intervalo.
    }

    function disposeTickLoop() {
      if (tickLoop) { try { tickLoop.dispose(); } catch (e) {} tickLoop = null; }
    }

    // ensureTickLoop — crea (o re-crea tras cambio de subdivisión) el loop
    // del indicador de compás. Es INDEPENDIENTE del rebuild del scheduling:
    // sigue corriendo a través de cambios de instrumento/groove/tonalidad
    // para que el metrónomo no se desincronice con la posición real del
    // transporte.
    //
    // Why: antes este loop se recreaba dentro de rebuildSchedule junto
    // con notePart/chordPart, y tickCounter se reseteaba a -1. Al hacer
    // cualquier cambio mid-loop, el counter empezaba a contar desde 0 a
    // partir del próximo tick — el metrónomo mostraba "pulso 1" en un
    // momento que no era pulso 1 real del compás.
    function ensureTickLoop() {
      const T = Tone();
      const sub = SUBDIVISIONS[subdivision] || SUBDIVISIONS.negra;
      disposeTickLoop();
      tickLoop = new T.Loop(function (time) {
        tickCounter++;
        const idx = ((tickCounter % sub.count) + sub.count) % sub.count;
        T.getDraw().schedule(function () {
          emit('tick', { index: idx, count: sub.count });
        }, time);
      }, sub.interval);
      tickLoop.start(0);
    }

    // silenceAll — corta las notas que estén sonando en todos los
    // instrumentos. Evita que notas largas (pad, bajo sostenido) sigan
    // sonando tras un Stop o se apilen al reconstruir el scheduling.
    function silenceAll() {
      Object.keys(runtime).forEach(function (id) {
        const rt = runtime[id];
        if (rt && rt.instrument && rt.instrument.silence) rt.instrument.silence();
      });
    }

    function dispatchEvent(time, ev) {
      const rt = runtime[ev.trackId];
      if (!rt) return;
      if (ev.type === 'hit') {
        rt.instrument.triggerHit(ev.lane, time, ev.velocity);
      } else {
        // Duración en segundos (la calcula el scheduler) — sin texto
        // musical: evita ambigüedad de parseo en synth y WebAudioFont.
        rt.instrument.triggerNote(ev.notes, ev.duration, time, ev.velocity);
      }
    }

    // Construye los Tone.Part a partir del scheduler. Devuelve el
    // largo del loop en compases.
    function rebuildSchedule() {
      disposeParts();
      silenceAll();          // corta notas colgadas antes de reprogramar
      const T = Tone();

      // Cada pista usa su patrón efectivo (variante editada o de
      // fábrica), registrado bajo una clave sintética propia.
      const patterns = {};
      const schedTracks = tracks.map(t => {
        const pat = effectivePattern(t);
        // enabled:true siempre — el mute se hace por ganancia (instantáneo),
        // no quitando la pista del scheduling.
        if (!pat) return Object.assign({}, t, { enabled: true });
        const pid = '__p_' + t.id;
        patterns[pid] = pat;
        return Object.assign({}, t, { patternId: pid, enabled: true });
      });

      const result = BT().scheduler.schedule({
        progression: progression,
        tempo: tempo,
        tracks: schedTracks,
        patterns: patterns,
      });

      // Humanización: micro-offsets de timing/velocity sobre los
      // eventos. Con humanización activa se agenda en segundos
      // (tiempo absoluto); sin ella, en tiempo musical (el BPM
      // reescala solo).
      let events = result.events;
      const humanized = humanizeAmount > 0 && BT().humanize;
      if (humanized) {
        events = BT().humanize.apply(events,
          { amount: humanizeAmount, seed: 1 });
      }
      const noteEvents = events.map(ev => ({
        time: humanized ? ev.time : stepToBBS(ev.step), ev: ev,
      }));
      notePart = new T.Part(function (time, value) {
        dispatchEvent(time, value.ev);
      }, noteEvents);
      notePart.start(0);

      // Part del indicador de acorde, sincronizado con el audio.
      const chordEvents = result.chords.map(c => ({
        time: stepToBBS(c.startStep), idx: c.index,
      }));
      chordPart = new T.Part(function (time, value) {
        T.getDraw().schedule(function () {
          activeChordIndex = value.idx;
          emit('chord', value.idx);
        }, time);
      }, chordEvents);
      chordPart.start(0);

      // Ventana de loop: rango de acordes [a,b] o el loop completo.
      const totalBars = result.loopSteps / STEPS_PER_BAR;
      let startStep = 0, endStep = result.loopSteps;
      if (loopRangeIdx && result.chords.length) {
        const n = result.chords.length;
        const a = Math.max(0, Math.min(loopRangeIdx[0], n - 1));
        const b = Math.max(0, Math.min(loopRangeIdx[1], n - 1));
        const lo = Math.min(a, b), hi = Math.max(a, b);
        startStep = result.chords[lo].startStep;
        endStep = result.chords[hi].startStep + result.chords[hi].lengthSteps;
      }
      loopStartBBS = stepToBBS(startStep);
      transport.loop = loopEnabled;
      transport.loopStart = loopStartBBS;
      transport.loopEnd = stepToBBS(endStep);
      return totalBars;
    }

    function applyTransport() {
      transport.bpm.value = tempo;
    }

    // Edición en vivo: en vez de reprogramar al instante (lo que cortaría
    // el audio a mitad de compás), se marca un pedido pendiente; la
    // reprogramación entra limpia en el próximo límite de compás. El flag
    // booleano hace el coalescing: varios cambios dentro del mismo compás
    // → una sola reconstrucción al inicio del siguiente.
    function refreshIfPlaying() {
      if (playing) pendingRebuild = true;
    }

    // Se dispara al inicio de cada compás (via scheduleRepeat '1m'): si
    // hay una edición pendiente, reconstruye instrumentos y scheduling.
    // Mucho más responsivo que esperar al final del loop entero.
    function onBarBoundary() {
      if (!pendingRebuild) return;
      pendingRebuild = false;
      ensureInstruments();
      rebuildSchedule();
    }

    // ─── API: progresión / tempo ───
    function loadProgression(chords) {
      const newProg = Array.isArray(chords)
        ? chords.map(c => ({ root: c.root, quality: c.quality, bars: c.bars }))
        : [];
      // Idempotente: si los acordes no cambiaron, no reprogramar. Esto evita
      // un rebuild espurio cuando el modelo dispara onChange solo porque
      // cambió activeIdx (p. ej. al clickear un chip). Sin este check, un
      // simple "seleccionar acorde" mientras suena provocaba un dispose +
      // recreate del notePart al límite del compás siguiente — y el acorde
      // justo en ese borde se perdía en la transición.
      if (JSON.stringify(progression) === JSON.stringify(newProg)) return;
      progression = newProg;
      activeChordIndex = -1;
      refreshIfPlaying();
      emit('state');
    }
    function getProgression() {
      return progression.map(c => ({ root: c.root, quality: c.quality, bars: c.bars }));
    }

    function setTempo(bpm) {
      bpm = Math.round(Number(bpm));
      if (!Number.isFinite(bpm)) return;
      const next = Math.max(40, Math.min(240, bpm));
      if (next === tempo) return;     // idempotente
      tempo = next;
      applyTransport();           // cambio en vivo, sin reprogramar
      // Con humanización los eventos van en segundos: hay que
      // reprogramarlos al cambiar el tempo (cuantizado al loop).
      if (playing && humanizeAmount > 0) refreshIfPlaying();
      emit('state');
    }
    function getTempo() { return tempo; }

    function setHumanize(amount) {
      amount = Number(amount);
      const next = Number.isFinite(amount)
        ? Math.max(0, Math.min(1, amount)) : 0;
      if (next === humanizeAmount) return;     // idempotente
      humanizeAmount = next;
      refreshIfPlaying();
      emit('state');
    }
    function getHumanize() { return humanizeAmount; }

    // ─── API: pistas ───
    function patternTipoFor(tipo) { return PATTERN_TIPO[tipo] || null; }

    function defaultsForTipo(tipo) {
      const fp = BT().factoryPresets, fpat = BT().factoryPatterns;
      const presets = fp ? fp.byTipo(tipo) : [];
      const ptipo = patternTipoFor(tipo);
      const pats = (fpat && ptipo) ? fpat.byTipo(ptipo) : [];
      return {
        presetId: presets[0] ? presets[0].id : null,
        patternId: pats[0] ? pats[0].id : null,
      };
    }

    function addTrack(cfg) {
      cfg = cfg || {};
      const tipo = cfg.tipo || 'bajo';
      const def = defaultsForTipo(tipo);
      const track = {
        id: 't' + (++trackCounter),
        tipo: tipo,
        presetId: cfg.presetId || def.presetId,
        patternId: cfg.patternId || def.patternId,
        enabled: cfg.enabled !== false,
        volumen: Number.isFinite(cfg.volumen) ? cfg.volumen : 0.8,
        voicing: cfg.voicing || 'close',
        inversion: Number.isFinite(cfg.inversion) ? cfg.inversion : 0,
        octave: Number.isFinite(cfg.octave)
          ? cfg.octave : (tipo === 'bajo' ? 2 : 3),
      };
      tracks.push(track);
      refreshIfPlaying();
      emit('state');
      return track.id;
    }

    function removeTrack(id) {
      const before = tracks.length;
      tracks = tracks.filter(t => t.id !== id);
      if (tracks.length === before) return;   // id inexistente, nada que hacer
      disposeRuntime(id);
      refreshIfPlaying();
      emit('state');
    }

    // updateTrack — aplica un patch parcial sobre la pista. Idempotente
    // por campo: si el valor nuevo coincide con el actual, no se aplica
    // la lógica de invalidación (preset/pattern wipe), no se marca instant
    // ni structural, y al final si nada cambió no se dispara refresh ni
    // se emite 'state'. Esto evita rebuilds espurios cuando la UI re-aplica
    // un valor existente (p. ej. selects que disparan 'change' sin que el
    // usuario haya cambiado nada).
    function updateTrack(id, patch) {
      const track = tracks.find(t => t.id === id);
      if (!track || !patch) return;
      let instantChanged = false;
      let structuralChanged = false;
      Object.keys(patch).forEach(k => {
        if (track[k] === patch[k]) return;
        // Side effects solo en cambios reales.
        // Elegir un preset de fábrica distinto descarta la copia editada.
        if (k === 'presetId') delete track.customPreset;
        // Elegir otro patrón descarta las variantes editadas.
        if (k === 'patternId') { delete track.patterns; track.variant = 'A'; }
        track[k] = patch[k];
        if (k === 'volumen' || k === 'enabled') instantChanged = true;
        else structuralChanged = true;
      });
      if (!instantChanged && !structuralChanged) return;
      // Volumen y mute → instantáneos sobre la ganancia de la pista,
      // sin reprogramar (reconstruir en cada tick del slider traba el audio).
      const rt = runtime[id];
      if (rt && instantChanged) {
        rt.gain.gain.value = trackGainValue(track);
      }
      // Patrón, preset, voicing, etc. → cambian el scheduling: se
      // reprograman cuantizados al próximo límite de compás.
      if (structuralChanged) refreshIfPlaying();
      emit('state');
    }

    function moveTrack(id, dir) {
      const i = tracks.findIndex(t => t.id === id);
      const j = i + (dir < 0 ? -1 : 1);
      if (i < 0 || j < 0 || j >= tracks.length) return;
      const tmp = tracks[i]; tracks[i] = tracks[j]; tracks[j] = tmp;
      emit('state');
    }

    function getTracks() {
      return tracks.map(t => Object.assign({}, t));
    }

    // ─── API: transporte ───
    function setMasterVolume(v) {
      masterVol = Math.max(0, Math.min(1, Number(v) || 0));
      if (masterGain) masterGain.gain.value = masterVol;
      emit('state');
    }
    function getMasterVolume() { return masterVol; }

    function setLoop(on) {
      loopEnabled = !!on;
      transport.loop = loopEnabled;
      emit('state');
    }
    function getLoop() { return loopEnabled; }

    // setLoopRange — acota el loop a un rango de acordes [a,b].
    // setLoopRange(null) vuelve al loop completo.
    //
    // Idempotente: si el rango no cambia, no dispara refreshIfPlaying. Esto
    // evita rebuilds espurios cuando el callback de model.onChange en app.js
    // llama setLoopRange en cada cambio del modelo (incluso cuando solo
    // cambió el activeChord — p. ej. al seguir el playback). Sin este check,
    // cada cambio de acorde durante la reproducción marcaba pendingRebuild
    // y al próximo bar boundary el rebuild se comía el primer evento (silenciaba
    // el bajo y otros instrumentos en el beat 1 del nuevo acorde).
    function setLoopRange(a, b) {
      const next = (a == null) ? null : [a, (b == null ? a : b)];
      const same = (loopRangeIdx === null && next === null) ||
                   (loopRangeIdx !== null && next !== null &&
                    loopRangeIdx[0] === next[0] && loopRangeIdx[1] === next[1]);
      if (same) return;
      loopRangeIdx = next;
      refreshIfPlaying();
      emit('state');
    }
    function getLoopRange() {
      return loopRangeIdx ? loopRangeIdx.slice() : null;
    }

    // setSubdivision — subdivisión del indicador de compás
    // ('redonda' | 'blanca' | 'negra' | 'corchea' | 'tresillo' | 'semicorchea').
    function setSubdivision(id) {
      if (!SUBDIVISIONS[id] || subdivision === id) return;
      subdivision = id;
      // Cambia el intervalo del metrónomo: hay que recrearlo. El counter
      // arranca de cero para el nuevo grano (no tiene sentido continuar
      // un counter de negras como si fuera de corcheas).
      if (playing) {
        tickCounter = -1;
        ensureTickLoop();
      }
      emit('state');
    }
    function getSubdivision() { return subdivision; }

    // setFocusChord — índice del acorde con foco. Lo usa play() como
    // punto de arranque si está parado. No mueve el transporte por sí
    // solo: para saltar en vivo, usar jumpToChord.
    function setFocusChord(idx) {
      idx = Math.round(Number(idx));
      focusChordIndex = Number.isFinite(idx) && idx >= 0 ? idx : -1;
    }

    // Step de inicio de un acorde dentro de la progresión.
    function chordStartStep(idx) {
      let step = 0;
      for (let i = 0; i < idx; i++) {
        step += (progression[i] && progression[i].bars > 0 ? progression[i].bars : 1)
              * STEPS_PER_BAR;
      }
      return step;
    }

    // jumpToChord — salto explícito a un acorde de la progresión. Si está
    // reproduciendo, mueve el transporte al instante y silencia notas
    // sostenidas. Si está parado, queda como punto de arranque para Play.
    //
    // Why: la "selección" de acorde no servía para nada en reproducción
    // — solo abría el editor. Ahora un clic en el chip salta de verdad.
    function jumpToChord(idx) {
      if (!progression.length) return;
      if (!Number.isFinite(idx) || idx < 0 || idx >= progression.length) return;
      focusChordIndex = idx;
      if (!playing) return;
      silenceAll();                             // corta pad/bajo sostenido
      transport.position = stepToBBS(chordStartStep(idx));
      activeChordIndex = idx;
      emit('chord', idx);
    }

    // Posición BBS desde la que arranca play(): el acorde con foco si
    // está dentro de la progresión (incluido el índice 0), o el inicio del
    // loop si no hay foco. Si hay un loop activo en un rango y el acorde con
    // foco cae FUERA del rango, arranca en el inicio del loop — si no, la
    // primera pasada tocaría acordes de afuera antes de envolver al rango.
    function startBBSForPlay() {
      if (focusChordIndex >= 0 && focusChordIndex < progression.length) {
        if (loopEnabled && loopRangeIdx) {
          const lo = Math.min(loopRangeIdx[0], loopRangeIdx[1]);
          const hi = Math.max(loopRangeIdx[0], loopRangeIdx[1]);
          if (focusChordIndex < lo || focusChordIndex > hi) return loopStartBBS;
        }
        return stepToBBS(chordStartStep(focusChordIndex));
      }
      return loopStartBBS;
    }

    function setMode(m) {
      mode = (m === 'arreglo') ? 'arreglo' : 'practica';
      emit('state');
    }
    function getMode() { return mode; }

    async function play() {
      if (playing) return;
      await Tone().start();
      ensureAudioGraph();
      ensureInstruments();
      rebuildSchedule();
      applyTransport();
      transport.position = startBBSForPlay();   // acorde con foco o inicio del loop
      tickCounter = -1;                          // el indicador arranca en el pulso 1
      ensureTickLoop();                          // metrónomo independiente del rebuild
      // Coalescer de ediciones por compás: consume pendingRebuild al
      // inicio de cada compás (en vez de esperar al final del loop entero).
      // Se dispara un pelín DESPUÉS del downbeat (offset '64n'), no exacto en
      // el borde: si reconstruimos justo en el borde, disposeParts() + Part
      // nuevo .start(0) dropea el evento que cae en ese instante (= beat 1 de
      // un cambio de acorde se queda mudo). Difiriéndolo, el downbeat lo toca
      // el schedule viejo y el nuevo entra para el resto del compás.
      // NOTA: este timing conviene verificarlo con audio real en el navegador.
      barRebuildId = transport.scheduleRepeat(function () {
        onBarBoundary();
      }, '1m', '64n');
      transport.start();
      playing = true;
      emit('transport', 'play');
    }

    function stop() {
      if (!playing) return;
      transport.stop();
      transport.position = loopStartBBS;
      disposeParts();
      disposeTickLoop();
      if (barRebuildId !== null) {
        try { transport.clear(barRebuildId); } catch (e) {}
        barRebuildId = null;
      }
      silenceAll();          // corta las notas que sigan sonando
      pendingRebuild = false;
      playing = false;
      activeChordIndex = -1;
      // El foco se reseteó al acorde que sonaba durante el playback (vía
      // onChange → setFocusChord). Sin esto, Stop + Play retomaba a mitad de
      // progresión en vez de reiniciar desde el inicio del loop.
      focusChordIndex = -1;
      emit('chord', -1);
      emit('tick', null);    // limpia el indicador de compás
      emit('transport', 'stop');
    }

    function isPlaying() { return playing; }
    function getActiveChordIndex() { return activeChordIndex; }

    // getActiveVoices — diagnóstico: total de voces sonando ahora mismo
    // en todos los instrumentos. Si crece sin parar, hay acumulación.
    function getActiveVoices() {
      let n = 0;
      Object.keys(runtime).forEach(function (id) {
        const rt = runtime[id];
        if (rt && rt.instrument && rt.instrument.voiceCount) {
          n += rt.instrument.voiceCount() || 0;
        }
      });
      return n;
    }

    // ─── Persistencia (usada por storage.js, #60) ───
    function snapshot() {
      return {
        progression: getProgression(),
        tempo: tempo,
        loopEnabled: loopEnabled,
        mode: mode,
        humanize: humanizeAmount,
        loopRange: getLoopRange(),
        subdivision: subdivision,
        tracks: getTracks(),
      };
    }
    function restore(state) {
      if (!state) return;
      const wasPlaying = playing;
      if (wasPlaying) stop();
      progression = Array.isArray(state.progression)
        ? state.progression.map(c => ({ root: c.root, quality: c.quality, bars: c.bars }))
        : [];
      tempo = Number.isFinite(state.tempo) ? state.tempo : DEFAULT_TEMPO;
      loopEnabled = state.loopEnabled !== false;
      mode = state.mode === 'arreglo' ? 'arreglo' : 'practica';
      humanizeAmount = Number.isFinite(state.humanize) ? state.humanize : 0;
      loopRangeIdx = Array.isArray(state.loopRange) ? state.loopRange.slice() : null;
      subdivision = SUBDIVISIONS[state.subdivision] ? state.subdivision : 'negra';
      Object.keys(runtime).forEach(disposeRuntime);
      tracks = Array.isArray(state.tracks)
        ? state.tracks.map(t => Object.assign({}, t)) : [];
      tracks.forEach(t => {
        const n = parseInt(String(t.id).replace(/\D/g, ''), 10);
        if (Number.isFinite(n) && n > trackCounter) trackCounter = n;
      });
      emit('state');
    }

    function dispose() {
      stop();
      Object.keys(runtime).forEach(disposeRuntime);
      try { sharedReverb.dispose(); } catch (e) {}
      try { masterGain.dispose(); } catch (e) {}
    }

    function on(kind, fn) {
      if (listeners[kind] && typeof fn === 'function') listeners[kind].push(fn);
    }

    return {
      loadProgression, getProgression,
      setTempo, getTempo,
      addTrack, removeTrack, updateTrack, moveTrack, getTracks,
      applyTrackPreset, getTrackPreset,
      getTrackPattern, setTrackPattern, setTrackVariant,
      setHumanize, getHumanize,
      setMasterVolume, getMasterVolume,
      setLoop, getLoop,
      setLoopRange, getLoopRange,
      setSubdivision, getSubdivision,
      setFocusChord, jumpToChord,
      setMode, getMode,
      play, stop, isPlaying, getActiveChordIndex, getActiveVoices,
      snapshot, restore, dispose,
      onChordChange: function (fn) { on('chord', fn); },
      onStateChange: function (fn) { on('state', fn); },
      onTransport: function (fn) { on('transport', fn); },
      onTick: function (fn) { on('tick', fn); },
    };
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.createEngine = createEngine;
})(typeof window !== 'undefined' ? window : globalThis);
