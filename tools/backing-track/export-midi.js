// ─────────────────────────────────────────────────────────────
// Backing Track — export MIDI (Standard MIDI File, formato 1)
//
// Módulo de lógica pura: convierte la salida del scheduler en un
// archivo .mid multipista listo para un DAW. Sin audio, sin DOM —
// testeable en Node. El motor (engine.exportMidiData) arma el
// payload; acá solo se codifican bytes.
//
// Decisiones:
// - La grilla va DERECHA (desde los steps), sin swing ni humanize:
//   en un DAW se quiere el material editable sobre la grilla, no la
//   interpretación. El feel se re-aplica en el DAW.
// - Formato 1: pista 0 = tempo + compás; una pista MIDI por pista
//   del motor. Batería/percusión en canal 10 (índice 9) con notas GM.
// - PPQ 480 → un step (semicorchea) = 120 ticks.
//
// IIFE + namespace global (file:// safe).
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const PPQ = 480;
  const TICKS_PER_STEP = PPQ / 4;   // step = semicorchea

  // Programa GM por tipo de pista (0-based) — para que el .mid suene
  // razonable al abrirlo: bajo eléctrico, piano, lead cuadrada, pad.
  const GM_PROGRAM = { bajo: 33, acordes: 0, lead: 80, pad: 88 };

  // Nota GM de batería por lane (canal 10). Los kits WAF traen su
  // propio midi por pieza (laneMidi del payload) y pisan este mapa.
  const GM_DRUM = {
    kick: 36, snare: 38, hat: 42, cymbal: 49,
    conga: 63, shaker: 70, perc: 75,
  };

  const NOTE_INDEX = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
    'Db': 1, 'Eb': 3, 'Fb': 4, 'Gb': 6, 'Ab': 8, 'Bb': 10, 'Cb': 11,
  };
  // 'C#3' / 'Eb2' → número MIDI (C4 = 60). null si no parsea.
  function noteToMidi(name) {
    const m = /^([A-G][#b]?)(-?\d+)$/.exec(String(name));
    if (!m) return null;
    const pc = NOTE_INDEX[m[1]];
    if (pc === undefined) return null;
    const midi = pc + (parseInt(m[2], 10) + 1) * 12;
    return (midi >= 0 && midi <= 127) ? midi : null;
  }

  // Variable-length quantity de MIDI (7 bits por byte, MSB primero).
  function varint(n) {
    n = Math.max(0, Math.round(n));
    const bytes = [n & 0x7F];
    while ((n >>= 7) > 0) bytes.unshift((n & 0x7F) | 0x80);
    return bytes;
  }

  function velByte(v) {
    const b = Math.round((Number.isFinite(v) ? v : 0.8) * 127);
    return Math.max(1, Math.min(127, b));
  }

  function str2bytes(s) {
    const out = [];
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0x7F);
    return out;
  }

  function uint32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
  function uint16(n) { return [(n >>> 8) & 255, n & 255]; }

  // Un chunk MTrk a partir de eventos absolutos {tick, bytes, order}.
  // order desempata en el mismo tick: NoteOff (0) antes que NoteOn (1)
  // para no encadenar notas repetidas.
  function trackChunk(absEvents) {
    const evs = absEvents.slice().sort((a, b) =>
      a.tick - b.tick || a.order - b.order);
    const body = [];
    let lastTick = 0;
    evs.forEach(e => {
      body.push.apply(body, varint(e.tick - lastTick));
      body.push.apply(body, e.bytes);
      lastTick = e.tick;
    });
    body.push(0x00, 0xFF, 0x2F, 0x00);   // end of track
    return [0x4D, 0x54, 0x72, 0x6B].concat(uint32(body.length), body);
  }

  // encodeMidi — payload → ArrayBuffer .mid.
  //   payload: {
  //     tempo,                               BPM
  //     events,                              salida del scheduler (una pasada)
  //     tracks: [{ id, tipo, laneMidi }],    pistas activas, en orden
  //   }
  function encodeMidi(payload) {
    payload = payload || {};
    const tempo = Number(payload.tempo) > 0 ? Number(payload.tempo) : 120;
    const events = Array.isArray(payload.events) ? payload.events : [];
    const tracks = Array.isArray(payload.tracks) ? payload.tracks : [];
    if (!tracks.length || !events.length) {
      throw new Error('encodeMidi: sin eventos o pistas');
    }

    // Pista 0: tempo (µs por negra) + compás 4/4.
    const usPerQuarter = Math.round(60000000 / tempo);
    const meta = [
      { tick: 0, order: 0, bytes: [0xFF, 0x51, 0x03,
        (usPerQuarter >> 16) & 255, (usPerQuarter >> 8) & 255, usPerQuarter & 255] },
      { tick: 0, order: 0, bytes: [0xFF, 0x58, 0x04, 4, 2, 24, 8] },
    ];

    // Canal por pista: melódicas 0,1,2… salteando el 9; batería → 9.
    let nextChannel = 0;
    const chunks = [trackChunk(meta)];
    const byTrack = {};
    events.forEach(e => {
      (byTrack[e.trackId] = byTrack[e.trackId] || []).push(e);
    });

    tracks.forEach(track => {
      const isDrums = (track.tipo === 'bateria' || track.tipo === 'percusion');
      let channel;
      if (isDrums) {
        channel = 9;
      } else {
        if (nextChannel === 9) nextChannel++;
        channel = Math.min(15, nextChannel++);
      }
      const abs = [];
      const name = str2bytes(String(track.tipo));
      abs.push({ tick: 0, order: 0, bytes: [0xFF, 0x03, name.length].concat(name) });
      if (!isDrums && GM_PROGRAM[track.tipo] !== undefined) {
        abs.push({ tick: 0, order: 0, bytes: [0xC0 | channel, GM_PROGRAM[track.tipo]] });
      }
      const laneMidi = track.laneMidi || {};
      (byTrack[track.id] || []).forEach(e => {
        const tick = Math.round(e.step * TICKS_PER_STEP);
        const durTicks = Math.max(1, Math.round(
          (e.durationSteps > 0 ? e.durationSteps : 1) * TICKS_PER_STEP));
        const vel = velByte(e.velocity);
        if (e.type === 'hit') {
          const key = Number.isFinite(laneMidi[e.lane])
            ? laneMidi[e.lane] : GM_DRUM[e.lane];
          if (key === undefined) return;   // lane desconocido: se omite
          abs.push({ tick: tick, order: 1, bytes: [0x90 | channel, key, vel] });
          abs.push({ tick: tick + durTicks, order: 0, bytes: [0x80 | channel, key, 0] });
        } else {
          (e.notes || []).forEach(n => {
            const key = noteToMidi(n);
            if (key === null) return;
            abs.push({ tick: tick, order: 1, bytes: [0x90 | channel, key, vel] });
            abs.push({ tick: tick + durTicks, order: 0, bytes: [0x80 | channel, key, 0] });
          });
        }
      });
      chunks.push(trackChunk(abs));
    });

    // Header MThd: formato 1, ntrks, división PPQ.
    const header = [0x4D, 0x54, 0x68, 0x64].concat(
      uint32(6), uint16(1), uint16(chunks.length), uint16(PPQ));
    let total = header.length;
    chunks.forEach(c => { total += c.length; });
    const out = new Uint8Array(total);
    out.set(header, 0);
    let off = header.length;
    chunks.forEach(c => { out.set(c, off); off += c.length; });
    return out.buffer;
  }

  // Nombre de archivo seguro (mismo slug que el WAV).
  function midiFilename(name) {
    const base = String(name || '').trim().toLowerCase()
      .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
      .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return 'backing-track' + (base ? '-' + base : '') + '.mid';
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.exportMidi = {
    encodeMidi, midiFilename,
    // expuestos para tests
    _noteToMidi: noteToMidi, _varint: varint,
    PPQ, TICKS_PER_STEP, GM_DRUM, GM_PROGRAM,
  };
})(typeof window !== 'undefined' ? window : globalThis);
