// ─────────────────────────────────────────────────────────────
// Backing Track — export de audio (WAV)
//
// Módulo de lógica pura: codifica un AudioBuffer a WAV PCM 16-bit
// y expande la lista de eventos del scheduler a N repeticiones del
// loop. El render offline en sí (Tone.Offline) vive en engine.js —
// acá no hay audio ni DOM, así que todo es testeable en Node.
//
// IIFE + namespace global (file:// safe).
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  // expandLoop — repite los eventos del loop N veces, desplazando el
  // tiempo de cada copia. Los eventos ya vienen con .time (segundos)
  // del scheduler (con swing/humanize aplicados). Pura: no muta.
  //
  //   events       lista de eventos con .time en segundos
  //   loopSeconds  duración de una pasada del loop
  //   repetitions  cuántas pasadas (se acota a 1..16)
  function expandLoop(events, loopSeconds, repetitions) {
    const list = Array.isArray(events) ? events : [];
    const loop = Number(loopSeconds);
    let reps = Math.round(Number(repetitions));
    if (!Number.isFinite(reps) || reps < 1) reps = 1;
    reps = Math.min(reps, 16);
    if (!(loop > 0)) reps = 1;
    const out = [];
    for (let r = 0; r < reps; r++) {
      const offset = r * loop;
      list.forEach(e => {
        const c = Object.assign({}, e);
        if (Number.isFinite(c.time)) c.time = c.time + offset;
        out.push(c);
      });
    }
    return out;
  }

  // encodeWav — AudioBuffer (o ToneAudioBuffer) → ArrayBuffer con un
  // WAV PCM 16-bit intercalado. Formato RIFF canónico:
  //   RIFF <size> WAVE  fmt <16> <PCM stereo…>  data <bytes>
  //
  // opts.normalize — si el pico supera 1.0 (el limiter de Tone no es
  // brickwall perfecto), escala TODO el buffer para que el pico quede
  // en 0.98 en vez de recortar los picos con el clamp. Si el pico ya
  // está en rango, no toca nada (no sube volumen).
  function encodeWav(buffer, opts) {
    if (buffer && typeof buffer.get === 'function') buffer = buffer.get();
    if (!buffer || typeof buffer.getChannelData !== 'function') {
      throw new Error('encodeWav: buffer inválido');
    }
    opts = opts || {};
    const channels = Math.max(1, buffer.numberOfChannels || 1);
    const sampleRate = buffer.sampleRate;
    const frames = buffer.length;
    const bytesPerSample = 2;
    const blockAlign = channels * bytesPerSample;
    const dataBytes = frames * blockAlign;

    const ab = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(ab);
    function writeString(offset, s) {
      for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    }
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);                       // tamaño del chunk fmt
    view.setUint16(20, 1, true);                        // 1 = PCM lineal
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);  // byte rate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);                       // bits por sample
    writeString(36, 'data');
    view.setUint32(40, dataBytes, true);

    // Intercalado L R L R…, float [-1,1] → int16 con clamp.
    const chans = [];
    for (let c = 0; c < channels; c++) chans.push(buffer.getChannelData(c));

    let scale = 1;
    if (opts.normalize) {
      let peak = 0;
      for (let c = 0; c < channels; c++) {
        const data = chans[c];
        for (let i = 0; i < frames; i++) {
          const a = Math.abs(data[i]);
          if (a > peak) peak = a;
        }
      }
      if (peak > 1) scale = 0.98 / peak;
    }

    let offset = 44;
    for (let i = 0; i < frames; i++) {
      for (let c = 0; c < channels; c++) {
        let x = chans[c][i] * scale;
        if (x > 1) x = 1; else if (x < -1) x = -1;
        view.setInt16(offset, x < 0 ? x * 0x8000 : x * 0x7FFF, true);
        offset += 2;
      }
    }
    return ab;
  }

  // wavFilename — nombre de archivo seguro a partir de un nombre libre.
  function wavFilename(name) {
    const base = String(name || '').trim().toLowerCase()
      .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
      .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return 'backing-track' + (base ? '-' + base : '') + '.wav';
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.exportAudio = { expandLoop, encodeWav, wavFilename };
})(typeof window !== 'undefined' ? window : globalThis);
