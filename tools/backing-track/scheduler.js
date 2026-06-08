// ─────────────────────────────────────────────────────────────
// Backing Track — event scheduler
//
// Módulo profundo de lógica pura: el núcleo del motor. Dada una
// progresión, un tempo, la lista de pistas y los patrones, calcula
// QUÉ suena CUÁNDO — una lista de eventos temporizados — sin tocar
// audio. El motor (engine.js) consume esta lista para alimentar
// Tone.Part / Tone.Loop.
//
// Separar este cálculo del audio lo hace testeable sin navegador.
// Depende de BackingTrack.voicing. IIFE + namespace global.
//
// Salida:
//   {
//     loopSteps, loopSeconds, stepSeconds, stepsPerBar,
//     chords: [ { index, startStep, lengthSteps } ],
//     events: [ {
//       trackId, type:'note'|'hit', role, chordIndex,
//       step, time, durationSteps, duration,
//       notes:[...], lane, velocity
//     } ]
//   }
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const STEPS_PER_BAR = 16;   // 4/4, resolución de semicorcheas

  // Cada tipo de instrumento se mapea a un "rol" de scheduling.
  const ROLE_BY_TIPO = {
    bajo:      'bass',
    acordes:   'chord',
    lead:      'chord',   // v1: el lead acompaña como los acordes
    pad:       'pad',
    bateria:   'drums',
    percusion: 'drums',
  };

  const PAD_VELOCITY = 0.7;

  function clampBars(b) {
    b = Math.round(Number(b));
    if (!Number.isFinite(b) || b < 1) return 1;
    return Math.min(b, 8);
  }

  function voicingApi() {
    return (W.BackingTrack && W.BackingTrack.voicing) || null;
  }

  // ── Contorno de octavas ──────────────────────────────────────
  // Asigna una octava a cada acorde de la progresión según una forma
  // (ascendente / descendente / sube-baja), opcionalmente espejada sobre
  // un eje cada N compases. Si track.contour no está o mode!=='auto',
  // devuelve la octava fija de la pista (comportamiento histórico).
  function defaultOct(track, role) {
    if (Number.isFinite(track.octave)) return track.octave;
    return role === 'bass' ? 2 : 3;
  }
  function shapeBase(shape, idx, n, lo, hi) {
    const t = n > 1 ? idx / (n - 1) : 0;
    let f;
    if (shape === 'desc') f = 1 - t;
    else if (shape === 'updown') f = (t <= 0.5 ? t * 2 : (1 - t) * 2);
    else f = t; // 'asc'
    return Math.round(lo + (hi - lo) * f);
  }
  // octava efectiva del acorde `idx` (de n) en el compás absoluto `absBar`.
  function contourOctave(track, role, idx, n, absBar) {
    const base = defaultOct(track, role);
    const c = track && track.contour;
    if (!c || c.mode !== 'auto') return base;
    let lo = Number.isFinite(c.floor) ? c.floor : 2;
    let hi = Number.isFinite(c.ceil) ? c.ceil : 5;
    if (hi < lo) { const tmp = lo; lo = hi; hi = tmp; }
    let oct = shapeBase(c.shape || 'asc', idx, n, lo, hi);
    const cyc = Number.isFinite(c.cycle) ? c.cycle : 0;
    if (cyc > 0 && Math.floor(absBar / cyc) % 2 === 1) {
      const axis = Number.isFinite(c.axis) ? c.axis : Math.round((lo + hi) / 2);
      oct = 2 * axis - oct;            // reflexión sobre el eje
    }
    return Math.max(lo, Math.min(hi, oct));
  }

  // Notas de un acorde para una pista melódica (acordes / lead / pad).
  // `octave` (opcional) sobreescribe la octava base — lo usa el contorno.
  function chordNotes(chord, track, octave) {
    const v = voicingApi();
    if (!v) return [];
    return v.resolveChord(chord, {
      octave:    Number.isFinite(octave) ? octave
                 : (Number.isFinite(track.octave) ? track.octave : 3),
      voicing:   track.voicing,
      inversion: track.inversion,
    });
  }

  // Nota del bajo: la fundamental en octava grave.
  function bassNotes(chord, track, octave) {
    const v = voicingApi();
    if (!v) return [];
    const o = Number.isFinite(octave) ? octave
              : (Number.isFinite(track.octave) ? track.octave : 2);
    const n = v.resolveBass(chord, o);
    return n ? [n] : [];
  }

  // Pistas melódicas (bajo / acordes / lead): los hits del patrón
  // disparan notas. La duración de cada nota se extiende hasta el
  // siguiente hit dentro del compás (o hasta el fin del compás).
  function scheduleMelodic(track, role, placed, patterns, events) {
    const pattern = patterns[track.patternId];
    if (!pattern || !pattern.hits.length) return;
    const lane = pattern.lanes[0];
    const laneHits = pattern.hits
      .filter(h => h.lane === lane)
      .sort((a, b) => a.step - b.step);
    if (!laneHits.length) return;
    const orderedSteps = laneHits.map(h => h.step);

    const nChords = placed.length;
    placed.forEach(entry => {
      for (let b = 0; b < entry.bars; b++) {
        const absBar = entry.startBar + b;
        // El contorno puede cambiar la octava compás a compás (la "respiración").
        const oct = contourOctave(track, role, entry.index, nChords, absBar);
        const notes = role === 'bass'
          ? bassNotes(entry.chord, track, oct)
          : chordNotes(entry.chord, track, oct);
        if (!notes.length) continue;
        const barStart = absBar * STEPS_PER_BAR;
        laneHits.forEach((hit, i) => {
          const nextStep = (i + 1 < orderedSteps.length)
            ? orderedSteps[i + 1] : STEPS_PER_BAR;
          events.push({
            trackId: track.id, type: 'note', role: role,
            chordIndex: entry.index,
            step: barStart + hit.step,
            durationSteps: Math.max(1, nextStep - hit.step),
            notes: notes.slice(),
            velocity: hit.velocity,
          });
        });
      }
    });
  }

  // Pad: un acorde sostenido por toda la duración del acorde (ignora
  // el patrón rítmico).
  function schedulePad(track, placed, events) {
    const nChords = placed.length;
    placed.forEach(entry => {
      // El pad sostiene; usa una sola octava por acorde (la de su 1er compás).
      const oct = contourOctave(track, 'pad', entry.index, nChords, entry.startBar);
      const notes = chordNotes(entry.chord, track, oct);
      if (!notes.length) return;
      events.push({
        trackId: track.id, type: 'note', role: 'pad',
        chordIndex: entry.index,
        step: entry.startBar * STEPS_PER_BAR,
        durationSteps: entry.bars * STEPS_PER_BAR,
        notes: notes.slice(),
        velocity: PAD_VELOCITY,
      });
    });
  }

  // Batería / percusión: patrón multi-lane; cada hit es un golpe
  // (one-shot, sin altura).
  function scheduleDrums(track, placed, patterns, events) {
    const pattern = patterns[track.patternId];
    if (!pattern || !pattern.hits.length) return;
    placed.forEach(entry => {
      for (let b = 0; b < entry.bars; b++) {
        const barStart = (entry.startBar + b) * STEPS_PER_BAR;
        pattern.hits.forEach(hit => {
          events.push({
            trackId: track.id, type: 'hit', role: 'drums',
            chordIndex: entry.index,
            step: barStart + hit.step,
            durationSteps: 1,
            lane: hit.lane,
            velocity: hit.velocity,
          });
        });
      }
    });
  }

  // schedule — produce la lista de eventos temporizados del loop.
  function schedule(input) {
    input = input || {};
    const progression = Array.isArray(input.progression) ? input.progression : [];
    const tempo = Number(input.tempo) > 0 ? Number(input.tempo) : 120;
    const tracks = Array.isArray(input.tracks) ? input.tracks : [];
    const patterns = input.patterns || {};

    const stepSeconds = (60 / tempo) / 4;   // duración de una semicorchea

    // Ubica cada acorde dentro del loop (en compases).
    let barCursor = 0;
    const placed = progression.map((chord, index) => {
      const bars = clampBars(chord.bars);
      const entry = { chord, index, startBar: barCursor, bars };
      barCursor += bars;
      return entry;
    });
    const totalBars = barCursor;
    const loopSteps = totalBars * STEPS_PER_BAR;

    const events = [];
    tracks.forEach(track => {
      if (!track || track.enabled === false) return;
      const role = ROLE_BY_TIPO[track.tipo] || 'chord';
      if (role === 'pad') schedulePad(track, placed, events);
      else if (role === 'drums') scheduleDrums(track, placed, patterns, events);
      else scheduleMelodic(track, role, placed, patterns, events);
    });

    // Tiempos absolutos en segundos a partir de la posición en pasos.
    events.forEach(e => {
      e.time = e.step * stepSeconds;
      e.duration = e.durationSteps * stepSeconds;
    });
    events.sort((a, b) =>
      a.step - b.step ||
      String(a.trackId).localeCompare(String(b.trackId)));

    return {
      loopSteps,
      loopSeconds: loopSteps * stepSeconds,
      stepSeconds,
      stepsPerBar: STEPS_PER_BAR,
      chords: placed.map(p => ({
        index: p.index,
        startStep: p.startBar * STEPS_PER_BAR,
        lengthSteps: p.bars * STEPS_PER_BAR,
      })),
      events,
    };
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.scheduler = { schedule, STEPS_PER_BAR, ROLE_BY_TIPO, contourOctave };
})(typeof window !== 'undefined' ? window : globalThis);
