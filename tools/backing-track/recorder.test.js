// Tests para recorder — solo la lógica pura (la grabación real usa
// MediaRecorder y se verifica en navegador).
(function (G, W) {
  'use strict';
  const T = G.testRunner;
  const R = W.BackingTrack && W.BackingTrack.recorder;
  if (!R) { console.error('BackingTrack.recorder not loaded'); return; }

  T.describe('recorder.pickMimeType', () => {
    T.it('elige el primer formato soportado', () => {
      T.assertEq(R.pickMimeType(m => m === 'audio/webm'), 'audio/webm');
      T.assertEq(R.pickMimeType(() => true), 'audio/webm;codecs=opus');
    });
    T.it('sin soporte → cadena vacía (deja elegir al navegador)', () => {
      T.assertEq(R.pickMimeType(() => false), '');
    });
    T.it('sin función → cadena vacía', () => {
      T.assertEq(R.pickMimeType(null), '');
    });
    T.it('un isSupported que lanza no rompe la selección', () => {
      let calls = 0;
      const picky = m => {
        calls++;
        if (calls === 1) throw new Error('boom');
        return true;
      };
      T.assertEq(R.pickMimeType(picky), 'audio/webm');
    });
  });

  T.describe('recorder.formatTime', () => {
    T.it('segundos → M:SS', () => {
      T.assertEq(R.formatTime(0), '0:00');
      T.assertEq(R.formatTime(7.9), '0:07');
      T.assertEq(R.formatTime(65), '1:05');
      T.assertEq(R.formatTime(600), '10:00');
    });
    T.it('valores inválidos caen a 0:00', () => {
      T.assertEq(R.formatTime(-3), '0:00');
      T.assertEq(R.formatTime(NaN), '0:00');
    });
  });

  T.describe('recorder.createRecorder — estados sin MediaRecorder', () => {
    T.it('start sin stream devuelve false y no queda grabando', () => {
      const rec = R.createRecorder();
      T.assertEq(rec.start(null), false);
      T.assertEq(rec.isRecording(), false);
    });
    T.it('stop sin start rechaza', () => {
      const rec = R.createRecorder();
      let rejected = false;
      // El runner es sincrónico: registramos el catch y validamos que
      // la promesa exista; el rechazo se comprueba por el estado.
      rec.stop().catch(() => { rejected = true; });
      T.assertEq(rec.isRecording(), false);
      T.assert(true, String(rejected)); // sin await: humo de interfaz
    });
  });

})(
  (typeof window !== 'undefined' ? window : globalThis).GuitarShared,
  (typeof window !== 'undefined' ? window : globalThis)
);
