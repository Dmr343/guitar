// Tests para export-audio — IIFE, sin DOM ni audio real (usa un
// AudioBuffer falso con la misma interfaz).
(function (G, W) {
  'use strict';
  const T = G.testRunner;
  const EX = W.BackingTrack && W.BackingTrack.exportAudio;
  if (!EX) { console.error('BackingTrack.exportAudio not loaded'); return; }

  // AudioBuffer falso: canales como arrays de floats.
  function fakeBuffer(channels, sampleRate) {
    return {
      numberOfChannels: channels.length,
      sampleRate: sampleRate || 44100,
      length: channels[0].length,
      getChannelData: i => Float32Array.from(channels[i]),
    };
  }

  T.describe('exportAudio.expandLoop', () => {
    const events = [
      { trackId: 'a', time: 0.0, step: 0 },
      { trackId: 'a', time: 1.5, step: 6 },
    ];
    T.it('1 repetición devuelve clones sin desplazar', () => {
      const out = EX.expandLoop(events, 2.0, 1);
      T.assertEq(out.length, 2);
      T.assertEq(out[1].time, 1.5);
    });
    T.it('N repeticiones desplazan cada pasada loopSeconds', () => {
      const out = EX.expandLoop(events, 2.0, 3);
      T.assertEq(out.length, 6);
      T.assertEq(out[2].time, 2.0);   // pasada 2, evento 1
      T.assertEq(out[5].time, 5.5);   // pasada 3, evento 2
    });
    T.it('no muta la entrada', () => {
      EX.expandLoop(events, 2.0, 4);
      T.assertEq(events[0].time, 0.0);
    });
    T.it('repeticiones se acotan a 1..16', () => {
      T.assertEq(EX.expandLoop(events, 2.0, 0).length, 2);
      T.assertEq(EX.expandLoop(events, 2.0, 99).length, 32);
      T.assertEq(EX.expandLoop(events, 2.0, NaN).length, 2);
    });
    T.it('loopSeconds inválido fuerza una sola pasada', () => {
      T.assertEq(EX.expandLoop(events, 0, 4).length, 2);
    });
    T.it('entrada no-array → lista vacía', () => {
      T.assertEq(EX.expandLoop(null, 2.0, 2).length, 0);
    });
  });

  T.describe('exportAudio.encodeWav — cabecera RIFF', () => {
    function header(buf) {
      const ab = EX.encodeWav(buf);
      return { ab: ab, view: new DataView(ab) };
    }
    function str(view, offset, len) {
      let s = '';
      for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i));
      return s;
    }
    T.it('magia RIFF/WAVE/fmt/data', () => {
      const { view } = header(fakeBuffer([[0, 0.5]], 44100));
      T.assertEq(str(view, 0, 4), 'RIFF');
      T.assertEq(str(view, 8, 4), 'WAVE');
      T.assertEq(str(view, 12, 4), 'fmt ');
      T.assertEq(str(view, 36, 4), 'data');
    });
    T.it('PCM 16-bit, canales y sample rate correctos', () => {
      const { view } = header(fakeBuffer([[0, 0], [0, 0]], 48000));
      T.assertEq(view.getUint16(20, true), 1);       // PCM
      T.assertEq(view.getUint16(22, true), 2);       // stereo
      T.assertEq(view.getUint32(24, true), 48000);   // sample rate
      T.assertEq(view.getUint16(32, true), 4);       // block align 2ch·2B
      T.assertEq(view.getUint16(34, true), 16);      // bits
    });
    T.it('tamaño total = 44 + frames·canales·2', () => {
      const { ab, view } = header(fakeBuffer([[0, 0, 0], [0, 0, 0]]));
      T.assertEq(ab.byteLength, 44 + 3 * 2 * 2);
      T.assertEq(view.getUint32(40, true), 12);      // data bytes
      T.assertEq(view.getUint32(4, true), 36 + 12);  // RIFF size
    });
  });

  T.describe('exportAudio.encodeWav — samples', () => {
    T.it('escala float → int16 (1.0 → 32767, -1.0 → -32768)', () => {
      const ab = EX.encodeWav(fakeBuffer([[1.0, -1.0, 0]]));
      const view = new DataView(ab);
      T.assertEq(view.getInt16(44, true), 32767);
      T.assertEq(view.getInt16(46, true), -32768);
      T.assertEq(view.getInt16(48, true), 0);
    });
    T.it('clampea fuera de rango', () => {
      const ab = EX.encodeWav(fakeBuffer([[2.5, -3.0]]));
      const view = new DataView(ab);
      T.assertEq(view.getInt16(44, true), 32767);
      T.assertEq(view.getInt16(46, true), -32768);
    });
    T.it('intercala L R L R en stereo', () => {
      const ab = EX.encodeWav(fakeBuffer([[0.5, 0.5], [-0.5, -0.5]]));
      const view = new DataView(ab);
      T.assert(view.getInt16(44, true) > 0, 'frame 0 L');
      T.assert(view.getInt16(46, true) < 0, 'frame 0 R');
      T.assert(view.getInt16(48, true) > 0, 'frame 1 L');
    });
    T.it('normalize baja un buffer que pasa de 1.0 sin recortar', () => {
      // Pico 2.0 → escala 0.98/2.0 = 0.49: el sample de 1.0 queda ~0.49.
      const ab = EX.encodeWav(fakeBuffer([[2.0, 1.0]]), { normalize: true });
      const view = new DataView(ab);
      const peak = view.getInt16(44, true) / 0x7FFF;
      const half = view.getInt16(46, true) / 0x7FFF;
      T.assert(Math.abs(peak - 0.98) < 0.001, 'pico ' + peak);
      T.assert(Math.abs(half - 0.49) < 0.001, 'mitad ' + half);
    });
    T.it('normalize no toca un buffer que ya está en rango', () => {
      const ab = EX.encodeWav(fakeBuffer([[0.5]]), { normalize: true });
      const view = new DataView(ab);
      T.assert(Math.abs(view.getInt16(44, true) / 0x7FFF - 0.5) < 0.001);
    });
    T.it('acepta un wrapper con .get() (ToneAudioBuffer)', () => {
      const native = fakeBuffer([[0.1]]);
      const ab = EX.encodeWav({ get: () => native });
      T.assertEq(ab.byteLength, 44 + 2);
    });
    T.it('buffer inválido lanza error', () => {
      let threw = false;
      try { EX.encodeWav(null); } catch (e) { threw = true; }
      T.assert(threw);
    });
  });

  T.describe('exportAudio.wavFilename', () => {
    T.it('slug seguro con acentos y espacios', () => {
      T.assertEq(EX.wavFilename('Blues en Ám №1!'), 'backing-track-blues-en-am-1.wav');
    });
    T.it('vacío → nombre base', () => {
      T.assertEq(EX.wavFilename(''), 'backing-track.wav');
      T.assertEq(EX.wavFilename(null), 'backing-track.wav');
    });
  });

})(
  (typeof window !== 'undefined' ? window : globalThis).GuitarShared,
  (typeof window !== 'undefined' ? window : globalThis)
);
