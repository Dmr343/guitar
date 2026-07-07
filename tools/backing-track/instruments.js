// ─────────────────────────────────────────────────────────────
// Backing Track — instruments factory
//
// Construye un instrumento Tone.js + su cadena de efectos a partir
// de un objeto preset (solo datos). El motor (engine.js) no conoce
// sonidos concretos: le pasa presets a esta fábrica y recibe
// instrumentos con una interfaz uniforme.
//
// Señal: instrumento → [efectos] → salida.  Soporta dos motores
// ('synth' y 'sampler') y los tipos del PRD. Libera todos los nodos
// con dispose(). IIFE + namespace global (file:// safe).
//
// createInstrument(preset) devuelve:
//   {
//     kind: 'melodic' | 'drumkit',
//     output,                                  // nodo a conectar
//     triggerNote(notes, duration, time, vel),  // melódico
//     triggerHit(lane, time, vel),              // batería/percusión
//     dispose()
//   }
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  function Tone() {
    const t = W.Tone;
    if (!t) throw new Error('Tone.js no está cargado (vendor/Tone.js)');
    return t;
  }

  const DRUM_TIPOS = ['bateria', 'percusion'];
  const MONO_TIPOS = ['bajo'];

  // Kit de batería por defecto, usado cuando el preset no define piezas.
  // Cada lane se mapea a un motor de síntesis y sus parámetros.
  const DEFAULT_KIT = {
    kick:   { engine: 'membrane', note: 'C1',
              options: { pitchDecay: 0.05, octaves: 4 } },
    snare:  { engine: 'noise', noise: 'white',
              options: { envelope: { attack: 0.001, decay: 0.2, sustain: 0 } } },
    hat:    { engine: 'noise', noise: 'white',
              options: { envelope: { attack: 0.001, decay: 0.05, sustain: 0 } } },
    cymbal: { engine: 'metal',
              options: { envelope: { attack: 0.001, decay: 0.6, release: 0.2 } } },
  };

  // ─── Construcción de efectos ───

  function buildEffect(spec) {
    const T = Tone();
    const amt = Number.isFinite(spec.cantidad) ? spec.cantidad : 0.3;
    switch (spec.tipo) {
      case 'reverb':
        // El reverb ya no se construye por instrumento: el motor lo
        // maneja como un bus compartido (un solo convolver + envíos).
        return null;
      case 'distortion':
        return new T.Distortion({ distortion: amt, wet: 1 });
      case 'chorus':
        // wet: 1 explícito (Tone.Effect defaultea 0.5 → la mitad de
        // fuerza). feedback leve (0.2) y frequency 2 Hz dan un chorus
        // perceptible pero limpio. Antes con feedback 0.5 y freq 4 Hz
        // el efecto resonaba feo en sostenidos largos.
        return new T.Chorus({
          frequency: spec.frequency || 2,
          delayTime: spec.delayTime || 3.5,
          depth: amt,
          feedback: 0.2,
          wet: 1,
        }).start();
      default:
        return null;
    }
  }

  function buildEffectChain(efectos) {
    if (!Array.isArray(efectos)) return [];
    return efectos.map(buildEffect).filter(Boolean);
  }

  // Como buildEffectChain pero conserva el `tipo` de cada efecto, para
  // poder actualizar su cantidad en vivo sin reconstruirlo.
  function buildLabeledEffectChain(efectos) {
    if (!Array.isArray(efectos)) return [];
    return efectos.map(function (spec) {
      const node = buildEffect(spec);
      return node ? { tipo: spec.tipo, node: node } : null;
    }).filter(Boolean);
  }

  // Actualiza la cantidad de un efecto in-place. Devuelve true si lo
  // pudo aplicar. El reverb es bus compartido — se maneja fuera.
  function setEffectAmountOn(entry, amount) {
    const v = Number.isFinite(amount) ? amount : 0.3;
    try {
      if (entry.tipo === 'distortion') {
        entry.node.distortion = v;
        return true;
      }
      if (entry.tipo === 'chorus') {
        // Chorus.depth controla la profundidad; wet queda fijo en 1.
        entry.node.depth = v;
        return true;
      }
    } catch (e) {}
    return false;
  }

  // ─── Construcción de instrumentos melódicos ───

  function buildMelodicSynth(preset) {
    const T = Tone();
    const config = preset.config || {};
    if (MONO_TIPOS.indexOf(preset.tipo) >= 0) {
      // Bajo: monofónico, con filtro y envolvente de filtro.
      return new T.MonoSynth({
        oscillator: config.oscillator || { type: 'sawtooth' },
        envelope: config.envelope ||
          { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.3 },
        filter: config.filter || { type: 'lowpass', Q: 1 },
        filterEnvelope: config.filterEnvelope ||
          { attack: 0.02, decay: 0.3, sustain: 0.3,
            baseFrequency: 200, octaves: 3 },
      });
    }
    // Acordes / pad / lead: polifónico. maxPolyphony acotado: un
    // acorde/pad real necesita ~8-12 voces, no 32 — esto evita que
    // la RAM trepe asignando voces de más loop tras loop.
    const poly = new T.PolySynth(T.Synth);
    // Acotado (la mitad del default 32): suficiente para acordes/pads
    // con solapamiento de release, sin que la RAM trepe sin control.
    poly.maxPolyphony = 24;
    const opts = {};
    if (config.oscillator) opts.oscillator = config.oscillator;
    if (config.envelope) opts.envelope = config.envelope;
    if (Object.keys(opts).length) poly.set(opts);
    return poly;
  }

  function buildSampler(preset, onFallback) {
    const T = Tone();
    const config = preset.config || {};
    if (!config.urls || !Object.keys(config.urls).length) {
      // Sin samples definidos: no se puede usar el sampler.
      if (onFallback) onFallback('preset de sampler sin urls');
      return buildMelodicSynth(preset);
    }
    try {
      return new T.Sampler({
        urls: config.urls,
        baseUrl: config.baseUrl || '',
        release: config.release || 1,
        onerror: function (err) {
          console.warn('[backing-track] error al cargar samples de "' +
            (preset.id || preset.nombre || '?') + '": ' +
            (err && err.message ? err.message : err));
        },
      });
    } catch (err) {
      // Fallback claro: si el sampler no se puede crear, usar síntesis.
      if (onFallback) onFallback(err && err.message ? err.message : String(err));
      return buildMelodicSynth(preset);
    }
  }

  function createMelodic(preset) {
    const T = Tone();
    const isMono = MONO_TIPOS.indexOf(preset.tipo) >= 0;
    const instrument = (preset.motor === 'sampler')
      ? buildSampler(preset)
      : buildMelodicSynth(preset);

    const inputBus = new T.Gain();
    const outputGain = new T.Gain();
    instrument.connect(inputBus);
    const effects = buildLabeledEffectChain(preset.efectos);
    const effectNodes = effects.map(e => e.node);
    inputBus.chain.apply(inputBus, effectNodes.concat([outputGain]));

    const isSampler = (preset.motor === 'sampler');

    return {
      kind: 'melodic',
      output: outputGain,
      // whenReady — promesa que resuelve cuando el instrumento puede
      // sonar. La síntesis es inmediata; el sampler espera sus buffers
      // (Tone.loaded() cubre todos los Samplers del contexto). La usa
      // el render offline para no disparar sobre un instrumento mudo.
      whenReady: function () {
        return (isSampler && typeof T.loaded === 'function')
          ? T.loaded() : Promise.resolve();
      },
      triggerNote: function (notes, duration, time, velocity) {
        if (!notes || !notes.length) return;
        // El bajo es monofónico: toca solo la nota más grave.
        const payload = isMono ? notes[0] : notes;
        instrument.triggerAttackRelease(payload, duration, time, velocity);
      },
      triggerHit: function () { /* no aplica a instrumentos melódicos */ },
      voiceCount: function () {
        return (typeof instrument.activeVoices === 'number')
          ? instrument.activeVoices : 0;
      },
      // silence — corta las notas que estén sonando (release inmediato).
      // Evita que las notas largas (p. ej. del pad) sigan sonando tras
      // un Stop o se apilen al reconstruir el scheduling.
      silence: function () {
        try {
          if (typeof instrument.releaseAll === 'function') instrument.releaseAll();
          else if (typeof instrument.triggerRelease === 'function') instrument.triggerRelease();
        } catch (e) {}
      },
      // setConfig — actualiza en vivo los parámetros de síntesis sin
      // reconstruir el instrumento (oscilador, envolvente, filtro).
      setConfig: function (config) {
        if (!config || isSampler) return;
        const opts = {};
        if (config.oscillator) opts.oscillator = config.oscillator;
        if (config.envelope) opts.envelope = config.envelope;
        if (isMono && config.filter) opts.filter = config.filter;
        if (isMono && config.filterEnvelope) opts.filterEnvelope = config.filterEnvelope;
        try { instrument.set(opts); } catch (e) {}
      },
      // setEffectAmount — actualiza la cantidad de un efecto in-place.
      // Evita disponer y reconstruir todo el instrumento al mover sliders
      // (que en sampler/WAF dejaba al instrumento mudo mientras recargaba).
      setEffectAmount: function (tipo, amount) {
        const entry = effects.find(e => e.tipo === tipo);
        if (entry) setEffectAmountOn(entry, amount);
      },
      dispose: function () {
        try { instrument.dispose(); } catch (e) {}
        effects.forEach(fx => { try { fx.node.dispose(); } catch (e) {} });
        try { inputBus.dispose(); } catch (e) {}
        try { outputGain.dispose(); } catch (e) {}
      },
    };
  }

  // ─── Construcción de kits de batería / percusión ───

  function buildPiece(spec) {
    const T = Tone();
    switch (spec.engine) {
      case 'membrane':
        return new T.MembraneSynth(spec.options || {});
      case 'metal':
        return new T.MetalSynth(spec.options || {});
      case 'sample':
        // Pieza de kit basada en un sample real (Sampler con una nota).
        return new T.Sampler({
          urls: { C3: spec.file },
          baseUrl: spec.baseUrl || '',
          onerror: function (err) {
            console.warn('[backing-track] sample de batería no cargó: ' +
              (err && err.message ? err.message : err));
          },
        });
      case 'waf-drum':
        return buildWafDrumPiece(spec);
      case 'noise':
      default:
        return new T.NoiseSynth(Object.assign(
          { noise: { type: spec.noise || 'white' } }, spec.options || {}));
    }
  }

  // buildWafDrumPiece — una pieza de kit que reproduce un sample
  // individual del drum kit GM de FluidR3 (program 128, midi 35-81).
  // Permite armar kits regionales reales (claves, maracas, güiro,
  // cencerro, congas, timbales, bongó, agogo, etc.) usando samples
  // de un instrumento acústico, no síntesis.
  //
  // spec: { engine: 'waf-drum', url, variable, note }
  //   url      — URL del soundfont del drum (un archivo por midi note).
  //   variable — nombre de la variable global que el soundfont declara
  //              (ej. _drum_75_0_FluidR3_GM_sf2_file).
  //   note     — número midi 35-81 que dispara este sonido.
  //
  // Implementa la interfaz mínima que espera createDrumkit:
  //   .connect(target), .triggerAttackRelease(_note, _dur, time, vel), .dispose()
  function buildWafDrumPiece(spec) {
    const T = Tone();
    const rawCtx = T.getContext().rawContext;
    if (typeof W.WebAudioFontPlayer === 'undefined') {
      console.warn('[backing-track] WebAudioFontPlayer no cargado — pieza con ruido corto');
      // Fallback: NoiseSynth envuelto con la MISMA interfaz que la pieza WAF
      // real (note, dur, time, velocity). Sin el wrapper, createDrumkit pasaba
      // el midi como duración → triggerAttackRelease(75, '16n', time, vel)
      // creaba una ráfaga de ~75s con time como velocity. Acá ignoramos el
      // midi y damos un tick de ruido corto con la firma correcta de Tone.
      const noise = new T.NoiseSynth({ envelope: { attack: 0.001, decay: 0.05, sustain: 0 } });
      return {
        connect: function (target) { noise.connect(target); },
        triggerAttackRelease: function (_note, dur, time, velocity) {
          const v = Number.isFinite(velocity) ? velocity : 0.8;
          try { noise.triggerAttackRelease(dur || '16n', time, v); } catch (e) {}
        },
        dispose: function () { try { noise.dispose(); } catch (e) {} },
      };
    }
    const player = new W.WebAudioFontPlayer();
    const out = new T.Gain();
    const midiNote = Math.round(Number(spec.note));
    let presetData = null;
    let readyResolve;
    const readyPromise = new Promise(function (r) { readyResolve = r; });

    // Cache check: si el soundfont ya está como global, usar al toque.
    if (spec.variable && W[spec.variable]) {
      presetData = W[spec.variable];
      readyResolve();
    } else if (spec.url && spec.variable) {
      try {
        player.loader.startLoad(rawCtx, spec.url, spec.variable);
        player.loader.waitLoad(function () {
          presetData = W[spec.variable] || null;
          readyResolve();
        });
      } catch (err) {
        console.warn('[backing-track] WAF drum: no cargó "' +
          spec.variable + '": ' + (err && err.message ? err.message : err));
        readyResolve();
      }
    } else {
      readyResolve();
    }

    return {
      ready: readyPromise,
      connect: function (target) { out.connect(target); },
      // Firma compatible con membrane/sample (note, dur, time, velocity).
      // Si `note` es un número, se interpreta como midi destino (permite
      // pitch shift por tune — WAF repitcha el sample cargado). Si no,
      // usa el midi baked de la spec.
      triggerAttackRelease: function (note, _dur, time, velocity) {
        if (!presetData) return;
        const vol = Number.isFinite(velocity) ? velocity : 0.8;
        const t = (typeof time === 'number') ? time : rawCtx.currentTime;
        const midi = (typeof note === 'number') ? note : midiNote;
        try {
          // Duración fija de 0.4s — los drums GM tienen sus propios envelopes.
          player.queueWaveTable(rawCtx, out.input, presetData, t, midi, 0.4, vol);
        } catch (e) {}
      },
      dispose: function () {
        try { player.cancelQueue(rawCtx); } catch (e) {}
        try { out.dispose(); } catch (e) {}
      },
    };
  }

  // Helper para pitch-shift de notas en formato string ('C3', 'A#4').
  // Devuelve el nombre de nota desplazada `semitones` semitonos. Si
  // semitones es 0 o falsy, devuelve el original sin tocar.
  function shiftNoteSemitones(noteName, semitones) {
    if (!semitones) return noteName;
    const m = /^([A-G][#b]?)(-?\d+)$/.exec(String(noteName));
    if (!m) return noteName;
    const pc = NOTE_INDEX[m[1]];
    if (pc === undefined) return noteName;
    const midi = (parseInt(m[2], 10) + 1) * 12 + pc + Math.round(Number(semitones));
    const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const oct = Math.floor(midi / 12) - 1;
    const ni = ((midi % 12) + 12) % 12;
    return NAMES[ni] + oct;
  }

  function createDrumkit(preset) {
    const T = Tone();
    const config = preset.config || {};
    const pieces = config.pieces || DEFAULT_KIT;

    const inputBus = new T.Gain();
    const outputGain = new T.Gain();
    const effects = buildLabeledEffectChain(preset.efectos);
    const effectNodes = effects.map(e => e.node);
    inputBus.chain.apply(inputBus, effectNodes.concat([outputGain]));

    // Un synth por lane; todos van al bus de entrada del kit.
    // Guardamos una copia mutable de la spec para que setConfig pueda
    // actualizar vol/tune in-place sin reconstruir los voices.
    const voices = {};
    Object.keys(pieces).forEach(lane => {
      const spec = pieces[lane] || {};
      const voice = buildPiece(spec);
      voice.connect(inputBus);
      voices[lane] = { voice: voice, spec: Object.assign({}, spec) };
    });

    return {
      kind: 'drumkit',
      output: outputGain,
      triggerNote: function () { /* no aplica a un kit de batería */ },
      // whenReady — espera las piezas WAF (promesa propia) y los
      // samples (Tone.loaded() cubre los Sampler del contexto).
      whenReady: function () {
        const waits = [];
        Object.keys(voices).forEach(function (lane) {
          const v = voices[lane];
          if (v.voice && v.voice.ready) waits.push(v.voice.ready);
        });
        if (typeof T.loaded === 'function') waits.push(T.loaded());
        return Promise.all(waits);
      },
      // setConfig — actualiza vol y tune por pieza en vivo. Los campos
      // estructurales (engine/note/url/file/variable) se ignoran acá —
      // si cambian, el engine reconstruye el kit.
      setConfig: function (config) {
        const newPieces = (config && config.pieces) || {};
        Object.keys(voices).forEach(lane => {
          const np = newPieces[lane];
          if (!np) return;
          if ('vol' in np) voices[lane].spec.vol = np.vol;
          if ('tune' in np) voices[lane].spec.tune = np.tune;
        });
      },
      setEffectAmount: function (tipo, amount) {
        const entry = effects.find(e => e.tipo === tipo);
        if (entry) setEffectAmountOn(entry, amount);
      },
      voiceCount: function () { return 0; },   // golpes one-shot cortos
      silence: function () { /* los golpes de batería son one-shots cortos */ },
      triggerHit: function (lane, time, velocity) {
        const v = voices[lane];
        if (!v) return;   // lane sin pieza registrada: se ignora
        const eng = v.spec.engine;
        // vol: factor 0..1 que multiplica la velocity del hit (default 1).
        // tune: semitonos (-12..+12) que desplaza la altura (default 0).
        const vol = (typeof v.spec.vol === 'number') ? v.spec.vol : 1;
        const tune = (typeof v.spec.tune === 'number') ? Math.round(v.spec.tune) : 0;
        const finalVel = Math.max(0, Math.min(1, (velocity || 0) * vol));
        // Pieza muteada: no disparar. Why: WAF.limitVolume() trata 0 como
        // "no proporcionado" y lo reemplaza por 0.5 — sin este short-circuit,
        // Vol=0 en una pieza WAF sonaba al 50% en vez de muteado.
        if (finalVel <= 0.001) return;
        if (eng === 'membrane' || eng === 'sample' || eng === 'waf-drum') {
          // Pitched engines: desplazar la nota por tune. WAF drum acepta
          // midi number directo (repitcha el sample); membrane/sample
          // toman string ('A3') desplazada vía shiftNoteSemitones.
          const base = v.spec.note;
          let note;
          if (typeof base === 'number') {
            note = base + tune;
          } else {
            note = shiftNoteSemitones(base || 'C3', tune);
          }
          v.voice.triggerAttackRelease(note, '16n', time, finalVel);
        } else {
          // NoiseSynth / MetalSynth: sin altura — tune se ignora.
          v.voice.triggerAttackRelease('16n', time, finalVel);
        }
      },
      dispose: function () {
        Object.keys(voices).forEach(lane => {
          try { voices[lane].voice.dispose(); } catch (e) {}
        });
        effects.forEach(fx => { try { fx.node.dispose(); } catch (e) {} });
        try { inputBus.dispose(); } catch (e) {}
        try { outputGain.dispose(); } catch (e) {}
      },
    };
  }

  // ─── WebAudioFont (instrumentos GM reales por CDN) ───

  const NOTE_INDEX = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
    // Bemoles: el bajo y las progresiones transponibles emiten Eb/Ab/Bb/Db/Gb
    // en tonalidades de bemoles. Sin estas claves el note caía al fallback 60.
    'Db': 1, 'Eb': 3, 'Fb': 4, 'Gb': 6, 'Ab': 8, 'Bb': 10, 'Cb': 11,
  };
  // Nota con octava ("C#3" o "Eb3") → número MIDI (C4 = 60).
  function noteToMidi(name) {
    const m = /^([A-G][#b]?)(-?\d+)$/.exec(String(name));
    if (!m) return 60;
    const pc = NOTE_INDEX[m[1]];
    return (pc === undefined ? 0 : pc) + (parseInt(m[2], 10) + 1) * 12;
  }

  // Construye un instrumento WebAudioFont: carga su soundfont GM desde
  // un CDN libre y lo reproduce con queueWaveTable.
  //
  // Cada instrumento tiene su PROPIO player (no uno compartido): así
  // sus voces se pueden cortar de forma aislada y, al hacer dispose,
  // el player y su pool de envolventes se liberan con él (un player
  // global acumulaba envolventes para siempre).
  //
  // Además se lleva registro de las voces activas para poder cortarlas
  // explícitamente — no alcanza con cancelQueue.
  function createWebAudioFont(preset) {
    const T = Tone();
    const rawCtx = T.getContext().rawContext;
    if (typeof W.WebAudioFontPlayer === 'undefined') {
      throw new Error('WebAudioFontPlayer no está cargado (vendor/)');
    }
    const player = new W.WebAudioFontPlayer();
    const cfg = preset.config || {};

    const inputBus = new T.Gain();
    const outputGain = new T.Gain();
    const effects = buildLabeledEffectChain(preset.efectos);
    const effectNodes = effects.map(e => e.node);
    inputBus.chain.apply(inputBus, effectNodes.concat([outputGain]));

    let presetData = null;   // objeto del soundfont, una vez decodificado
    let voices = [];         // envolventes activas (devueltas por queueWaveTable)
    let readyResolve;
    const readyPromise = new Promise(function (r) { readyResolve = r; });

    if (cfg.url && cfg.variable) {
      // Cache hit: el soundfont ya está como global desde una carga
      // anterior — disponible sincrónico, sin ventana muda al recrear el
      // instrumento (p. ej. tras un toggle de efecto).
      if (W[cfg.variable]) {
        presetData = W[cfg.variable];
        readyResolve();
      } else {
        try {
          player.loader.startLoad(rawCtx, cfg.url, cfg.variable);
          player.loader.waitLoad(function () {
            presetData = W[cfg.variable] || null;
            readyResolve();
          });
        } catch (err) {
          console.warn('[backing-track] WebAudioFont: no se pudo cargar "' +
            (preset.id || '?') + '": ' + (err && err.message ? err.message : err));
          readyResolve();
        }
      }
    } else {
      readyResolve();
    }

    // Descarta del registro las voces que ya terminaron.
    function pruneVoices() {
      const now = rawCtx.currentTime;
      voices = voices.filter(function (env) {
        return env && (env.when + env.duration + 0.1 > now);
      });
    }

    // Corta de forma definitiva todas las voces activas: detiene el
    // buffer source y baja la ganancia a cero. cancelQueue por sí solo
    // no garantiza que las notas dejen de sonar.
    function stopAllVoices() {
      voices.forEach(function (env) {
        if (!env) return;
        try {
          if (env.audioBufferSourceNode) {
            env.audioBufferSourceNode.stop(0);
            env.audioBufferSourceNode.disconnect();
          }
        } catch (e) {}
        try {
          if (env.gain) {
            env.gain.cancelScheduledValues(0);
            env.gain.setValueAtTime(0.000001, rawCtx.currentTime);
          }
        } catch (e) {}
      });
      voices = [];
    }

    return {
      kind: 'melodic',
      output: outputGain,
      whenReady: function () { return readyPromise; },
      triggerNote: function (notes, duration, time, velocity) {
        if (!presetData || !notes || !notes.length) return;
        let durSec = Number(duration);          // ya viene en segundos
        if (!(durSec > 0)) durSec = 0.5;         // nunca duración inválida
        const vol = Number.isFinite(velocity) ? velocity : 0.8;
        pruneVoices();
        notes.forEach(function (n) {
          const env = player.queueWaveTable(rawCtx, inputBus.input,
            presetData, time, noteToMidi(n), durSec, vol);
          if (env) voices.push(env);
        });
      },
      triggerHit: function () { /* no aplica */ },
      setConfig: function () { /* WAF no se edita con sliders en v1 */ },
      setEffectAmount: function (tipo, amount) {
        const entry = effects.find(e => e.tipo === tipo);
        if (entry) setEffectAmountOn(entry, amount);
      },
      voiceCount: function () { pruneVoices(); return voices.length; },
      silence: function () {
        try { player.cancelQueue(rawCtx); } catch (e) {}
        stopAllVoices();
      },
      dispose: function () {
        try { player.cancelQueue(rawCtx); } catch (e) {}
        stopAllVoices();
        effects.forEach(fx => { try { fx.node.dispose(); } catch (e) {} });
        try { inputBus.dispose(); } catch (e) {}
        try { outputGain.dispose(); } catch (e) {}
      },
    };
  }

  // createInstrument — punto de entrada de la fábrica.
  function createInstrument(preset) {
    preset = preset || {};
    if (preset.motor === 'webaudiofont') return createWebAudioFont(preset);
    if (DRUM_TIPOS.indexOf(preset.tipo) >= 0) return createDrumkit(preset);
    return createMelodic(preset);
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.instruments = { createInstrument, DEFAULT_KIT };
})(typeof window !== 'undefined' ? window : globalThis);
