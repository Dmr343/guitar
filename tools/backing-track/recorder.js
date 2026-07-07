// ─────────────────────────────────────────────────────────────
// Backing Track — grabadora ("grabá tu solo encima")
//
// Envuelve MediaRecorder para grabar en un solo archivo la mezcla de
// la pista (tap post-limiter del motor, ver engine.getRecordTap) y,
// opcionalmente, el micrófono. El resultado crudo (webm/ogg Opus) se
// convierte a WAV reutilizando exportAudio.encodeWav.
//
// La captura del micrófono y su conexión al tap las hace app.js (son
// del grafo de audio de la página); acá vive la máquina de estados de
// MediaRecorder y la conversión. IIFE + namespace global (file:// safe).
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  // Formatos candidatos, del mejor al peor. La elección real depende
  // del navegador (MediaRecorder.isTypeSupported).
  const MIME_CANDIDATES = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];

  // pickMimeType — primer formato soportado. `isSupported` se inyecta
  // (MediaRecorder.isTypeSupported en producción) para poder testearlo.
  function pickMimeType(isSupported) {
    if (typeof isSupported !== 'function') return '';
    for (let i = 0; i < MIME_CANDIDATES.length; i++) {
      try { if (isSupported(MIME_CANDIDATES[i])) return MIME_CANDIDATES[i]; }
      catch (e) {}
    }
    return '';
  }

  // formatTime — segundos → 'M:SS' para el timer del botón.
  function formatTime(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  // createRecorder — grabadora de un solo uso por toma.
  //   start(stream) → true si arrancó
  //   stop() → Promise<Blob> con el audio crudo (webm/ogg)
  function createRecorder() {
    let mr = null;
    let chunks = [];
    return {
      isRecording: function () { return !!mr && mr.state === 'recording'; },
      start: function (stream) {
        if (mr || typeof MediaRecorder === 'undefined' || !stream) return false;
        const mime = pickMimeType(MediaRecorder.isTypeSupported
          ? MediaRecorder.isTypeSupported.bind(MediaRecorder) : null);
        try {
          mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        } catch (e) {
          mr = null;
          return false;
        }
        chunks = [];
        mr.ondataavailable = function (e) {
          if (e.data && e.data.size) chunks.push(e.data);
        };
        mr.start(250);   // chunks periódicos: nada se pierde si algo falla
        return true;
      },
      stop: function () {
        return new Promise(function (resolve, reject) {
          if (!mr) { reject(new Error('no está grabando')); return; }
          const rec = mr;
          mr = null;
          rec.onstop = function () {
            resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
          };
          rec.onerror = function (e) {
            reject((e && e.error) || new Error('MediaRecorder falló'));
          };
          try { rec.stop(); } catch (e) { reject(e); }
        });
      },
    };
  }

  // blobToWav — audio crudo (webm/ogg) → ArrayBuffer WAV PCM 16-bit,
  // decodificando con el AudioContext dado y reusando encodeWav.
  function blobToWav(blob, audioCtx) {
    const EX = W.BackingTrack && W.BackingTrack.exportAudio;
    if (!EX) return Promise.reject(new Error('exportAudio no cargado'));
    return blob.arrayBuffer().then(function (ab) {
      return new Promise(function (resolve, reject) {
        // Forma con callbacks: compatibilidad más amplia que la promesa.
        audioCtx.decodeAudioData(ab, resolve, reject);
      });
    }).then(function (buffer) {
      // normalize: la suma pista + micrófono puede pasar de 1.0; mejor
      // escalar todo que recortar los picos del solo.
      return EX.encodeWav(buffer, { normalize: true });
    });
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.recorder = {
    createRecorder, blobToWav, pickMimeType, formatTime, MIME_CANDIDATES,
  };
})(typeof window !== 'undefined' ? window : globalThis);
