// ─────────────────────────────────────────────────────────────
// Backing Track — humanize
//
// Módulo profundo de lógica pura. Aplica micro-desplazamientos de
// timing y de velocity a una lista de eventos (la salida del
// scheduler), para que el acompañamiento no suene mecánico.
//
// Usa un PRNG con semilla: misma semilla + misma entrada → misma
// salida, de modo que el resultado es reproducible y testeable.
// No muta la entrada. Sin audio, sin DOM. IIFE + namespace global.
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  const DEFAULT_TIME_RANGE = 0.02;      // ±20 ms de timing a intensidad 1
  const DEFAULT_VELOCITY_RANGE = 0.15;  // ±0.15 de velocity a intensidad 1

  // PRNG determinista (mulberry32): rápido y con buena distribución.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp01(v, fallback) {
    v = Number(v);
    if (!Number.isFinite(v)) return fallback;
    return Math.max(0, Math.min(1, v));
  }

  // apply — devuelve una nueva lista de eventos con timing y velocity
  // humanizados.
  //
  // opts:
  //   amount         intensidad 0..1 (0 = sin cambios, default 0)
  //   seed           semilla del PRNG (entero, default 1)
  //   timeRange      desplazamiento máx. de timing en segundos (default 0.02)
  //   velocityRange  desplazamiento máx. de velocity (default 0.15)
  function apply(events, opts) {
    opts = opts || {};
    const list = Array.isArray(events) ? events : [];
    const amount = clamp01(opts.amount, 0);
    const seed = Number.isFinite(opts.seed) ? opts.seed : 1;
    const timeRange = Number.isFinite(opts.timeRange)
      ? opts.timeRange : DEFAULT_TIME_RANGE;
    const velRange = Number.isFinite(opts.velocityRange)
      ? opts.velocityRange : DEFAULT_VELOCITY_RANGE;

    // Intensidad nula: clones sin cambios (sigue siendo operación pura).
    if (amount <= 0) return list.map(e => Object.assign({}, e));

    const rng = mulberry32(seed);
    return list.map(e => {
      const timeOffset = (rng() * 2 - 1) * timeRange * amount;
      const velOffset = (rng() * 2 - 1) * velRange * amount;
      const out = Object.assign({}, e);
      if (Number.isFinite(out.time)) {
        out.time = Math.max(0, out.time + timeOffset);
      }
      if (Number.isFinite(out.velocity)) {
        out.velocity = Math.max(0, Math.min(1, out.velocity + velOffset));
      }
      return out;
    });
  }

  // applySwing — desplaza los contratiempos hacia el tresillo. amount
  // 0..1: 0 = recto, 1 = swing de tresillo completo (el contratiempo
  // cae en 2/3 de su par en vez de 1/2).
  //
  // Dos granularidades (opts.mode):
  //   'eighth' (default) — swing de corchea: mueve la contra del pulso
  //     (step % 4 === 2). Desplazamiento máx = 2/3 de semicorchea.
  //     El feel de jazz/blues/shuffle.
  //   'sixteenth' — swing de semicorchea (estilo MPC): mueve cada
  //     semicorchea impar (step % 2 === 1) dentro de su corchea.
  //     Desplazamiento máx = 1/3 de semicorchea. El feel de funk,
  //     hip-hop y neo-soul.
  //
  // Trabaja sobre e.time (segundos) usando la posición e.step.
  // Pura: no muta la entrada.
  //
  // opts:
  //   amount       intensidad 0..1 (default 0)
  //   stepSeconds  duración de una semicorchea en segundos (requerido)
  //   mode         'eighth' (default) | 'sixteenth'
  function applySwing(events, opts) {
    opts = opts || {};
    const list = Array.isArray(events) ? events : [];
    const amount = clamp01(opts.amount, 0);
    const stepSeconds = Number(opts.stepSeconds);
    if (amount <= 0 || !(stepSeconds > 0)) {
      return list.map(e => Object.assign({}, e));
    }
    const sixteenth = opts.mode === 'sixteenth';
    // Par de corcheas = 4 steps con contra en 2 → corre 2/3 de step.
    // Par de semicorcheas = 2 steps con contra en 1 → corre 1/3 de step.
    const shift = amount * (sixteenth ? (1 / 3) : (2 / 3)) * stepSeconds;
    return list.map(e => {
      const out = Object.assign({}, e);
      const pos = Number.isFinite(out.step) ? ((out.step % 4) + 4) % 4 : -1;
      const isOffbeat = sixteenth ? (pos === 1 || pos === 3) : (pos === 2);
      if (isOffbeat && Number.isFinite(out.time)) {
        out.time = out.time + shift;
      }
      return out;
    });
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.humanize = {
    apply, applySwing, DEFAULT_TIME_RANGE, DEFAULT_VELOCITY_RANGE,
  };
})(typeof window !== 'undefined' ? window : globalThis);
