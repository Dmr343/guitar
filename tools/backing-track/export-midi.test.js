// Tests para export-midi — IIFE, sin DOM ni audio.
(function (G, W) {
  'use strict';
  const T = G.testRunner;
  const EM = W.BackingTrack && W.BackingTrack.exportMidi;
  if (!EM) { console.error('BackingTrack.exportMidi not loaded'); return; }

  function bytes(ab) { return new Uint8Array(ab); }
  function str(u8, offset, len) {
    let s = '';
    for (let i = 0; i < len; i++) s += String.fromCharCode(u8[offset + i]);
    return s;
  }
  // Payload mínimo: un bajo con una nota y una batería con un kick.
  function samplePayload() {
    return {
      tempo: 120,
      events: [
        { trackId: 'b', type: 'note', step: 0, durationSteps: 4,
          notes: ['C2'], velocity: 1.0 },
        { trackId: 'd', type: 'hit', step: 4, durationSteps: 1,
          lane: 'kick', velocity: 0.5 },
      ],
      tracks: [
        { id: 'b', tipo: 'bajo', laneMidi: {} },
        { id: 'd', tipo: 'bateria', laneMidi: {} },
      ],
    };
  }
  // Busca la secuencia `seq` dentro de u8. Devuelve el índice o -1.
  function indexOf(u8, seq) {
    outer:
    for (let i = 0; i <= u8.length - seq.length; i++) {
      for (let j = 0; j < seq.length; j++) {
        if (u8[i + j] !== seq[j]) continue outer;
      }
      return i;
    }
    return -1;
  }

  T.describe('exportMidi — varint y noteToMidi', () => {
    T.it('varint de 0 y valores de 1 byte', () => {
      T.assertArrayEq(EM._varint(0), [0]);
      T.assertArrayEq(EM._varint(127), [127]);
    });
    T.it('varint multi-byte (128, 16384)', () => {
      T.assertArrayEq(EM._varint(128), [0x81, 0x00]);
      T.assertArrayEq(EM._varint(16384), [0x81, 0x80, 0x00]);
    });
    T.it('noteToMidi: C4=60, A4=69, bemoles', () => {
      T.assertEq(EM._noteToMidi('C4'), 60);
      T.assertEq(EM._noteToMidi('A4'), 69);
      T.assertEq(EM._noteToMidi('Eb3'), 51);
      T.assertEq(EM._noteToMidi('C#3'), 49);
    });
    T.it('noteToMidi: inválidas → null', () => {
      T.assertEq(EM._noteToMidi('X2'), null);
      T.assertEq(EM._noteToMidi('C'), null);
    });
  });

  T.describe('exportMidi.encodeMidi — estructura del archivo', () => {
    T.it('cabecera MThd: formato 1, 3 chunks de pista, PPQ 480', () => {
      const u8 = bytes(EM.encodeMidi(samplePayload()));
      T.assertEq(str(u8, 0, 4), 'MThd');
      T.assertEq((u8[8] << 8) | u8[9], 1);      // formato
      T.assertEq((u8[10] << 8) | u8[11], 3);    // meta + bajo + batería
      T.assertEq((u8[12] << 8) | u8[13], 480);  // PPQ
    });
    T.it('pista 0 lleva el tempo (120 BPM = 500000 µs/negra)', () => {
      const u8 = bytes(EM.encodeMidi(samplePayload()));
      T.assert(indexOf(u8, [0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20]) >= 0);
    });
    T.it('cada pista termina con end-of-track', () => {
      const u8 = bytes(EM.encodeMidi(samplePayload()));
      let count = 0;
      for (let i = 0; i + 2 < u8.length; i++) {
        if (u8[i] === 0xFF && u8[i + 1] === 0x2F && u8[i + 2] === 0x00) count++;
      }
      T.assertEq(count, 3);
    });
    T.it('sin eventos o pistas lanza error', () => {
      let threw = false;
      try { EM.encodeMidi({ tempo: 120, events: [], tracks: [] }); }
      catch (e) { threw = true; }
      T.assert(threw);
    });
  });

  T.describe('exportMidi.encodeMidi — notas y batería', () => {
    T.it('el bajo emite NoteOn/NoteOff en canal 0 con program change', () => {
      const u8 = bytes(EM.encodeMidi(samplePayload()));
      T.assert(indexOf(u8, [0xC0, 33]) >= 0, 'program change bajo GM 33');
      // C2 = midi 36, vel 127; off tras 4 steps = 480 ticks (varint 0x83 0x60).
      T.assert(indexOf(u8, [0x90, 36, 127]) >= 0, 'note on');
      T.assert(indexOf(u8, [0x83, 0x60, 0x80, 36, 0]) >= 0, 'note off a +480 ticks');
    });
    T.it('la batería va por canal 10 (0x99) con nota GM del lane', () => {
      const u8 = bytes(EM.encodeMidi(samplePayload()));
      // kick → GM 36, vel 0.5 → 64 (0x99 = NoteOn canal 9).
      T.assert(indexOf(u8, [0x99, 36, 64]) >= 0);
    });
    T.it('laneMidi del kit pisa el mapa GM', () => {
      const p = samplePayload();
      p.tracks[1].laneMidi = { kick: 75 };   // claves
      const u8 = bytes(EM.encodeMidi(p));
      T.assert(indexOf(u8, [0x99, 75, 64]) >= 0);
      T.assertEq(indexOf(u8, [0x99, 36, 64]), -1);
    });
    T.it('lane desconocido se omite sin romper', () => {
      const p = samplePayload();
      p.events[1].lane = 'inventado';
      const u8 = bytes(EM.encodeMidi(p));
      T.assertEq(str(u8, 0, 4), 'MThd');
      T.assertEq(indexOf(u8, [0x99, 36, 64]), -1);
    });
    T.it('acorde: un NoteOn por nota, mismo tick', () => {
      const p = {
        tempo: 100,
        events: [{ trackId: 'a', type: 'note', step: 0, durationSteps: 16,
          notes: ['C3', 'E3', 'G3'], velocity: 0.8 }],
        tracks: [{ id: 'a', tipo: 'acordes', laneMidi: {} }],
      };
      const u8 = bytes(EM.encodeMidi(p));
      T.assert(indexOf(u8, [0x90, 48, 102]) >= 0);
      T.assert(indexOf(u8, [0x90, 52, 102]) >= 0);
      T.assert(indexOf(u8, [0x90, 55, 102]) >= 0);
    });
    T.it('las notas del acorde no parseables se omiten', () => {
      const p = {
        tempo: 100,
        events: [{ trackId: 'a', type: 'note', step: 0, durationSteps: 4,
          notes: ['C3', '???'], velocity: 0.8 }],
        tracks: [{ id: 'a', tipo: 'acordes', laneMidi: {} }],
      };
      const u8 = bytes(EM.encodeMidi(p));
      T.assert(indexOf(u8, [0x90, 48, 102]) >= 0);
    });
  });

  T.describe('exportMidi.midiFilename', () => {
    T.it('slug seguro', () => {
      T.assertEq(EM.midiFilename('Blues en Ám'), 'backing-track-blues-en-am.mid');
      T.assertEq(EM.midiFilename(''), 'backing-track.mid');
    });
  });

})(
  (typeof window !== 'undefined' ? window : globalThis).GuitarShared,
  (typeof window !== 'undefined' ? window : globalThis)
);
