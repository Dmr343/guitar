// ─────────────────────────────────────────────────────────────
// Backing Track — librería de presets de fábrica (solo datos)
//
// Cada preset es un objeto serializable que la instruments factory
// (instruments.js) convierte en un instrumento Tone.js. Los presets
// de fábrica son inmutables: editarlos genera presets nuevos del
// usuario (ver storage.js).
//
// Motores:
//   'synth'        — sintetizado, 100% offline.
//   'sampler'      — samples reales por CDN libre (requiere internet).
//   'webaudiofont' — soundfonts GM por CDN libre (requiere internet).
//
// Orden del arreglo: agrupado por `tipo` (bajo · acordes · pad · lead ·
// bateria · percusion) y, dentro de cada tipo, primero los sintetizados
// (offline) y después los que cargan recursos de la web.
//
// IIFE + namespace global.
// ─────────────────────────────────────────────────────────────
(function (W) {
  'use strict';

  // wafDrum — helper para piezas de kit que disparan un sample individual
  // del drum kit GM de FluidR3. Pasale el midi note (35-81); devuelve el
  // spec listo para engine: 'waf-drum'. Sonidos relevantes:
  //   56=cencerro · 60=hi bongó · 61=lo bongó · 62=mute hi conga ·
  //   63=open hi conga · 64=low conga · 65=hi timbal · 66=lo timbal ·
  //   67=hi agogo · 68=lo agogo · 69=cabasa · 70=maracas ·
  //   73=güiro corto · 74=güiro largo · 75=claves · 76/77=wood block ·
  //   78/79=cuica · 54=tambourine · 80/81=triangle · 39=hand clap
  function wafDrum(midi) {
    return {
      engine: 'waf-drum',
      url: 'https://surikov.github.io/webaudiofontdata/sound/128' + midi
           + '_0_FluidR3_GM_sf2_file.js',
      variable: '_drum_' + midi + '_0_FluidR3_GM_sf2_file',
      note: midi,
    };
  }

  const PRESETS = [

    // ═══════════════════ BAJO ═══════════════════

    // ── Sintetizados (MonoSynth) ──
    {
      id: 'bajoRedondo', nombre: 'Bajo redondo', tipo: 'bajo', motor: 'synth',
      config: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.6, release: 0.4 },
        filter: { type: 'lowpass', Q: 1 },
        filterEnvelope: { attack: 0.03, decay: 0.2, sustain: 0.5,
          baseFrequency: 120, octaves: 2.5 },
      },
      efectos: [],
    },
    {
      id: 'bajoPunchy', nombre: 'Bajo punchy', tipo: 'bajo', motor: 'synth',
      config: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.005, decay: 0.18, sustain: 0.3, release: 0.2 },
        filter: { type: 'lowpass', Q: 3 },
        filterEnvelope: { attack: 0.01, decay: 0.25, sustain: 0.2,
          baseFrequency: 200, octaves: 3 },
      },
      efectos: [{ tipo: 'distortion', cantidad: 0.08 }],
    },
    {
      id: 'bajoSubgrave', nombre: 'Bajo subgrave', tipo: 'bajo', motor: 'synth',
      config: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.04, decay: 0.4, sustain: 0.8, release: 0.6 },
        filter: { type: 'lowpass', Q: 0.5 },
        filterEnvelope: { attack: 0.05, decay: 0.3, sustain: 0.7,
          baseFrequency: 80, octaves: 1.5 },
      },
      efectos: [],
    },
    {
      id: 'bajoMoog', nombre: 'Bajo Moog', tipo: 'bajo', motor: 'synth',
      config: {
        oscillator: { type: 'square' },
        envelope: { attack: 0.01, decay: 0.25, sustain: 0.5, release: 0.3 },
        filter: { type: 'lowpass', Q: 4 },
        filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3,
          baseFrequency: 150, octaves: 3.5 },
      },
      efectos: [],
    },

    // ── Samples reales (CDN) ──
    {
      id: 'bajoElectricoReal', nombre: 'Bajo eléctrico real', tipo: 'bajo', motor: 'sampler',
      config: {
        baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/bass-electric/',
        urls: { 'E1': 'E1.mp3', 'G1': 'G1.mp3', 'C#2': 'Cs2.mp3',
                'E2': 'E2.mp3', 'G2': 'G2.mp3', 'A#2': 'As2.mp3' },
      },
      efectos: [],
    },

    // ── WebAudioFont (soundfonts GM por CDN) ──
    {
      id: 'wafContrabajo', nombre: 'Contrabajo', tipo: 'bajo', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0320_FluidR3_GM_sf2_file.js',
        variable: '_tone_0320_FluidR3_GM_sf2_file',
      },
      efectos: [],
    },
    {
      id: 'wafBajoDedos', nombre: 'Bajo eléctrico (dedos)', tipo: 'bajo', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0330_FluidR3_GM_sf2_file.js',
        variable: '_tone_0330_FluidR3_GM_sf2_file',
      },
      efectos: [],
    },
    {
      id: 'wafTuba', nombre: 'Tuba', tipo: 'bajo', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0580_FluidR3_GM_sf2_file.js',
        variable: '_tone_0580_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.25 }],
    },
    {
      // Slap bass: funk eléctrico, el bajo con "pop".
      id: 'wafBajoSlap', nombre: 'Bajo slap', tipo: 'bajo', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0370_FluidR3_GM_sf2_file.js',
        variable: '_tone_0370_FluidR3_GM_sf2_file',
      },
      efectos: [],
    },
    {
      // Synth bass clásico: electrónica, synthwave.
      id: 'wafBajoSynth1', nombre: 'Bajo synth', tipo: 'bajo', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0380_FluidR3_GM_sf2_file.js',
        variable: '_tone_0380_FluidR3_GM_sf2_file',
      },
      efectos: [],
    },
    {
      // Synth bass 2: variante más resonante.
      id: 'wafBajoSynth2', nombre: 'Bajo synth 2', tipo: 'bajo', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0390_FluidR3_GM_sf2_file.js',
        variable: '_tone_0390_FluidR3_GM_sf2_file',
      },
      efectos: [],
    },

    // ═══════════════════ ACORDES ═══════════════════

    // ── Sintetizados (PolySynth) ──
    {
      id: 'acordesCalido', nombre: 'Acordes cálidos', tipo: 'acordes', motor: 'synth',
      config: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.04, decay: 0.4, sustain: 0.5, release: 0.8 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.25 }],
    },
    {
      id: 'acordesElectrico', nombre: 'Acordes eléctricos', tipo: 'acordes', motor: 'synth',
      config: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.35, release: 0.4 },
      },
      efectos: [{ tipo: 'chorus', cantidad: 0.4 }, { tipo: 'reverb', cantidad: 0.15 }],
    },
    {
      id: 'acordesPercusivo', nombre: 'Acordes percusivos', tipo: 'acordes', motor: 'synth',
      config: {
        oscillator: { type: 'square' },
        envelope: { attack: 0.005, decay: 0.5, sustain: 0.05, release: 0.3 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.18 }],
    },
    {
      id: 'acordesVidrio', nombre: 'Acordes de vidrio', tipo: 'acordes', motor: 'synth',
      config: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.6, sustain: 0.1, release: 0.5 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.4 }],
    },

    // ── Samples reales (CDN) ──
    {
      id: 'pianoReal', nombre: 'Piano real', tipo: 'acordes', motor: 'sampler',
      config: {
        baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/piano/',
        urls: { 'C2': 'C2.mp3', 'C3': 'C3.mp3', 'C4': 'C4.mp3',
                'A4': 'A4.mp3', 'C5': 'C5.mp3' },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.2 }],
    },

    // ── WebAudioFont (soundfonts GM por CDN) ──
    {
      // Piano de cola GM: ideal para comping y para el montuno de salsa.
      id: 'wafPiano', nombre: 'Piano de cola', tipo: 'acordes', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0000_FluidR3_GM_sf2_file.js',
        variable: '_tone_0000_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.2 }],
    },
    {
      // Piano eléctrico (Rhodes): comping cálido, soul y montunos suaves.
      id: 'wafPianoElectrico', nombre: 'Piano eléctrico', tipo: 'acordes', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0040_FluidR3_GM_sf2_file.js',
        variable: '_tone_0040_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.18 }],
    },
    {
      // Honky-tonk: piano de salón, country, blues.
      id: 'wafPianoHonky', nombre: 'Piano honky-tonk', tipo: 'acordes', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0030_FluidR3_GM_sf2_file.js',
        variable: '_tone_0030_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.18 }],
    },
    {
      // Clavinet: funk eléctrico — el sonido de Stevie Wonder en "Superstition".
      id: 'wafClavinet', nombre: 'Clavinet', tipo: 'acordes', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0070_FluidR3_GM_sf2_file.js',
        variable: '_tone_0070_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.12 }],
    },

    // ═══════════════════ PAD ═══════════════════

    // ── Sintetizados (PolySynth) ──
    {
      id: 'padCalido', nombre: 'Pad cálido', tipo: 'pad', motor: 'synth',
      config: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.8, decay: 1, sustain: 0.9, release: 2 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.5 }],
    },
    {
      id: 'padAire', nombre: 'Pad de aire', tipo: 'pad', motor: 'synth',
      config: {
        oscillator: { type: 'fatsawtooth' },
        envelope: { attack: 1.2, decay: 1.5, sustain: 0.8, release: 3 },
      },
      efectos: [{ tipo: 'chorus', cantidad: 0.6 }, { tipo: 'reverb', cantidad: 0.6 }],
    },
    {
      id: 'padOscuro', nombre: 'Pad oscuro', tipo: 'pad', motor: 'synth',
      config: {
        oscillator: { type: 'fattriangle' },
        envelope: { attack: 1.5, decay: 1, sustain: 0.7, release: 2.5 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.55 }],
    },

    // ── WebAudioFont (soundfonts GM por CDN) ──
    {
      // Pad halo: textura etérea y resonante, brillo arriba.
      id: 'wafPadHalo', nombre: 'Pad halo', tipo: 'pad', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0940_FluidR3_GM_sf2_file.js',
        variable: '_tone_0940_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.55 }],
    },
    {
      // Pad sweep / atmósfera: barrido lento, color cinematográfico.
      id: 'wafPadAtmosfera', nombre: 'Pad atmósfera', tipo: 'pad', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0950_FluidR3_GM_sf2_file.js',
        variable: '_tone_0950_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.6 }],
    },

    // ═══════════════════ LEAD ═══════════════════

    // ── Sintetizados (PolySynth) ──
    {
      id: 'leadSuave', nombre: 'Lead suave', tipo: 'lead', motor: 'synth',
      config: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.5 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },
    {
      id: 'leadBrillante', nombre: 'Lead brillante', tipo: 'lead', motor: 'synth',
      config: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0.5, release: 0.4 },
      },
      efectos: [{ tipo: 'distortion', cantidad: 0.12 }, { tipo: 'reverb', cantidad: 0.2 }],
    },
    {
      id: 'leadCristal', nombre: 'Lead cristal', tipo: 'lead', motor: 'synth',
      config: {
        oscillator: { type: 'square' },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.6 },
      },
      efectos: [{ tipo: 'chorus', cantidad: 0.3 }, { tipo: 'reverb', cantidad: 0.25 }],
    },
    {
      // Sitar: timbre brillante y zumbante por las cuerdas simpáticas;
      // la distorsión leve aporta ese carácter.
      id: 'sitar', nombre: 'Sitar (India)', tipo: 'lead', motor: 'synth',
      config: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.005, decay: 0.9, sustain: 0.15, release: 1.2 },
      },
      efectos: [{ tipo: 'distortion', cantidad: 0.18 }, { tipo: 'reverb', cantidad: 0.35 }],
    },
    {
      // Sarod: cuerda profunda e introspectiva, más mate que el sitar.
      id: 'sarod', nombre: 'Sarod (India)', tipo: 'lead', motor: 'synth',
      config: {
        oscillator: { type: 'fatsawtooth' },
        envelope: { attack: 0.01, decay: 0.7, sustain: 0.25, release: 1 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.4 }],
    },
    {
      // Bansuri: flauta de bambú; timbre suave y aireado.
      id: 'bansuri', nombre: 'Bansuri (India)', tipo: 'lead', motor: 'synth',
      config: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.12, decay: 0.3, sustain: 0.7, release: 0.6 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.45 }],
    },
    {
      // Lead árabe (oud/qanun): pulsado brillante de Medio Oriente.
      id: 'leadArabe', nombre: 'Lead árabe (oud)', tipo: 'lead', motor: 'synth',
      config: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.004, decay: 0.5, sustain: 0.1, release: 0.7 },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.35 }],
    },

    // ── Samples reales (CDN) ──
    {
      id: 'bansuriReal', nombre: 'Bansuri real (flauta)', tipo: 'lead', motor: 'sampler',
      config: {
        baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/flute/',
        urls: { 'C4': 'C4.mp3', 'E4': 'E4.mp3', 'A4': 'A4.mp3',
                'C5': 'C5.mp3', 'A5': 'A5.mp3', 'C6': 'C6.mp3' },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.4 }],
    },
    {
      // Saxofón real — muestreo multi-velocidad. Carácter cálido, ideal
      // para jazz, soul, city pop. Versión con muchas más capas que el
      // wafSaxoAlto/Tenor (que son SoundFont más estandarizado).
      id: 'saxofonReal', nombre: 'Saxofón real', tipo: 'lead', motor: 'sampler',
      config: {
        baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/saxophone/',
        urls: {
          'D3':  'D3.mp3',  'G3':  'G3.mp3',  'C4':  'C4.mp3',
          'F4':  'F4.mp3',  'A4':  'A4.mp3',  'C5':  'C5.mp3',
          'F5':  'F5.mp3',  'A5':  'A5.mp3',
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },
    {
      // Trompeta real — muestreo más natural que wafTrompeta. Brillante,
      // perfecta para salsa, funk, mariachi, fanfarria.
      id: 'trompetaReal', nombre: 'Trompeta real', tipo: 'lead', motor: 'sampler',
      config: {
        baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/trumpet/',
        urls: {
          'F3':  'F3.mp3',  'A3':  'A3.mp3',  'C4':  'C4.mp3',
          'F4':  'F4.mp3',  'G4':  'G4.mp3',  'D5':  'D5.mp3',
          'F5':  'F5.mp3',  'A5':  'A5.mp3',  'C6':  'C6.mp3',
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.28 }],
    },
    {
      // Trombón real — muestreo multi-velocidad desde Bb1 hasta F4.
      // Carácter de bronce grave; funciona como sección de bronces o
      // como melódico solista.
      id: 'trombonReal', nombre: 'Trombón real', tipo: 'lead', motor: 'sampler',
      config: {
        baseUrl: 'https://nbrosowsky.github.io/tonejs-instruments/samples/trombone/',
        urls: {
          'A#1': 'As1.mp3', 'F2':  'F2.mp3',  'A#2': 'As2.mp3',
          'C3':  'C3.mp3',  'F3':  'F3.mp3',  'A#3': 'As3.mp3',
          'C4':  'C4.mp3',  'F4':  'F4.mp3',
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },

    // ── WebAudioFont — guitarras ──
    {
      id: 'wafGuitarraNylon', nombre: 'Guitarra nylon', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0240_FluidR3_GM_sf2_file.js',
        variable: '_tone_0240_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.22 }],
    },
    {
      id: 'wafGuitarraAcustica', nombre: 'Guitarra acústica', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0250_FluidR3_GM_sf2_file.js',
        variable: '_tone_0250_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.22 }],
    },
    {
      id: 'wafGuitarraElectrica', nombre: 'Guitarra eléctrica', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0270_FluidR3_GM_sf2_file.js',
        variable: '_tone_0270_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.18 }],
    },
    {
      // Guitarra con overdrive: saturación suave, blues/rock clásico.
      id: 'wafGuitarraOverdrive', nombre: 'Guitarra overdrive', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0290_FluidR3_GM_sf2_file.js',
        variable: '_tone_0290_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.18 }],
    },
    {
      // Guitarra distorsionada: rock pesado.
      id: 'wafGuitarraDistorsion', nombre: 'Guitarra distorsionada', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0300_FluidR3_GM_sf2_file.js',
        variable: '_tone_0300_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.18 }],
    },
    {
      id: 'wafBanjo', nombre: 'Banjo', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1050_FluidR3_GM_sf2_file.js',
        variable: '_tone_1050_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.2 }],
    },
    {
      id: 'wafSitar', nombre: 'Sitar', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1040_FluidR3_GM_sf2_file.js',
        variable: '_tone_1040_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },

    // ── WebAudioFont — cuerdas ──
    {
      id: 'wafCuerdas', nombre: 'Cuerdas (ensemble)', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0480_FluidR3_GM_sf2_file.js',
        variable: '_tone_0480_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.4 }],
    },
    {
      id: 'wafViolin', nombre: 'Violín', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0400_FluidR3_GM_sf2_file.js',
        variable: '_tone_0400_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.35 }],
    },
    {
      // Fiddle: violín folk/country/celta, distinto del clásico.
      id: 'wafFiddle', nombre: 'Fiddle (violín folk)', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1100_FluidR3_GM_sf2_file.js',
        variable: '_tone_1100_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },
    {
      // Pizzicato strings: cuerdas pulsadas, distinto del ensemble normal.
      id: 'wafPizzicato', nombre: 'Cuerdas pizzicato', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0450_FluidR3_GM_sf2_file.js',
        variable: '_tone_0450_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },
    {
      id: 'wafViola', nombre: 'Viola', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0410_FluidR3_GM_sf2_file.js',
        variable: '_tone_0410_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.35 }],
    },
    {
      id: 'wafCello', nombre: 'Cello', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0420_FluidR3_GM_sf2_file.js',
        variable: '_tone_0420_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.35 }],
    },
    {
      id: 'wafArpa', nombre: 'Arpa', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0460_FluidR3_GM_sf2_file.js',
        variable: '_tone_0460_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.4 }],
    },

    // ── WebAudioFont — bronces ──
    {
      // Brass section: el ensemble entero — salsa/funk/Motown.
      id: 'wafBrassSection', nombre: 'Sección de bronces', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0610_FluidR3_GM_sf2_file.js',
        variable: '_tone_0610_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.28 }],
    },
    {
      id: 'wafTrompeta', nombre: 'Trompeta', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0560_FluidR3_GM_sf2_file.js',
        variable: '_tone_0560_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.28 }],
    },
    {
      id: 'wafTrombon', nombre: 'Trombón', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0570_FluidR3_GM_sf2_file.js',
        variable: '_tone_0570_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.28 }],
    },
    {
      id: 'wafCornoFrances', nombre: 'Corno francés', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0600_FluidR3_GM_sf2_file.js',
        variable: '_tone_0600_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.32 }],
    },

    // ── WebAudioFont — vientos de madera ──
    {
      id: 'wafFlauta', nombre: 'Flauta', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0730_FluidR3_GM_sf2_file.js',
        variable: '_tone_0730_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.4 }],
    },
    {
      id: 'wafClarinete', nombre: 'Clarinete', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0710_FluidR3_GM_sf2_file.js',
        variable: '_tone_0710_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.32 }],
    },
    {
      id: 'wafOboe', nombre: 'Oboe', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0680_FluidR3_GM_sf2_file.js',
        variable: '_tone_0680_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.34 }],
    },
    {
      id: 'wafSaxoAlto', nombre: 'Saxo alto', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0650_FluidR3_GM_sf2_file.js',
        variable: '_tone_0650_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },
    {
      id: 'wafSaxoTenor', nombre: 'Saxo tenor', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0660_FluidR3_GM_sf2_file.js',
        variable: '_tone_0660_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },
    {
      id: 'wafShanai', nombre: 'Shanai', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1110_FluidR3_GM_sf2_file.js',
        variable: '_tone_1110_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },
    {
      // Pan flute: flauta de pan andina, color sudamericano.
      id: 'wafPanFlauta', nombre: 'Flauta de pan', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0750_FluidR3_GM_sf2_file.js',
        variable: '_tone_0750_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.4 }],
    },
    {
      // Ocarina: flautita dulce, color de cuento.
      id: 'wafOcarina', nombre: 'Ocarina', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0790_FluidR3_GM_sf2_file.js',
        variable: '_tone_0790_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.38 }],
    },
    {
      // Gaita escocesa: drone permanente, sabor folk.
      id: 'wafGaita', nombre: 'Gaita escocesa', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1090_FluidR3_GM_sf2_file.js',
        variable: '_tone_1090_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },

    // ── WebAudioFont — teclas y voz ──
    {
      id: 'wafOrgano', nombre: 'Órgano', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0190_FluidR3_GM_sf2_file.js',
        variable: '_tone_0190_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.25 }],
    },
    {
      id: 'wafAcordeon', nombre: 'Acordeón', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0210_FluidR3_GM_sf2_file.js',
        variable: '_tone_0210_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.2 }],
    },
    {
      id: 'wafCoro', nombre: 'Coro', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0520_FluidR3_GM_sf2_file.js',
        variable: '_tone_0520_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.5 }],
    },
    {
      // Celesta: campanitas etéreas, color navideño/onírico.
      id: 'wafCelesta', nombre: 'Celesta', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0080_FluidR3_GM_sf2_file.js',
        variable: '_tone_0080_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.4 }],
    },

    // ── WebAudioFont — sintetizadores ──
    {
      // Lead 1 (square): lead synth clásico de los 80.
      id: 'wafLeadSquare', nombre: 'Lead synth (cuadrada)', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0800_FluidR3_GM_sf2_file.js',
        variable: '_tone_0800_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.25 }],
    },
    {
      // Lead 2 (sawtooth): el otro lead 80 arquetípico.
      id: 'wafLeadSaw', nombre: 'Lead synth (sierra)', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0810_FluidR3_GM_sf2_file.js',
        variable: '_tone_0810_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.25 }],
    },

    // ── WebAudioFont — láminas y del mundo ──
    {
      id: 'wafVibrafono', nombre: 'Vibráfono', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0110_FluidR3_GM_sf2_file.js',
        variable: '_tone_0110_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.35 }],
    },
    {
      id: 'wafMarimba', nombre: 'Marimba', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/0120_FluidR3_GM_sf2_file.js',
        variable: '_tone_0120_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.28 }],
    },
    {
      id: 'wafKalimba', nombre: 'Kalimba', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1080_FluidR3_GM_sf2_file.js',
        variable: '_tone_1080_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.35 }],
    },
    {
      id: 'wafKoto', nombre: 'Koto', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1070_FluidR3_GM_sf2_file.js',
        variable: '_tone_1070_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },
    {
      id: 'wafShamisen', nombre: 'Shamisen', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1060_FluidR3_GM_sf2_file.js',
        variable: '_tone_1060_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.25 }],
    },
    {
      // Steel drum: timbre tropical/caribeño metálico y resonante.
      id: 'wafSteelDrum', nombre: 'Steel drum', tipo: 'lead', motor: 'webaudiofont',
      config: {
        url: 'https://surikov.github.io/webaudiofontdata/sound/1140_FluidR3_GM_sf2_file.js',
        variable: '_tone_1140_FluidR3_GM_sf2_file',
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.3 }],
    },

    // ═══════════════════ BATERÍA ═══════════════════

    // ── Sintetizadas (kit Membrane/Noise/Metal) ──
    {
      id: 'bateriaAcustica', nombre: 'Batería acústica', tipo: 'bateria', motor: 'synth',
      config: {
        pieces: {
          kick:   { engine: 'membrane', note: 'C1',
                    options: { pitchDecay: 0.05, octaves: 4 } },
          snare:  { engine: 'noise', noise: 'white',
                    options: { envelope: { attack: 0.001, decay: 0.2, sustain: 0 } } },
          hat:    { engine: 'noise', noise: 'white',
                    options: { envelope: { attack: 0.001, decay: 0.05, sustain: 0 } } },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 0.8, release: 0.3 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.18 }],
    },
    {
      id: 'bateriaElectronica', nombre: 'Batería electrónica', tipo: 'bateria', motor: 'synth',
      config: {
        pieces: {
          kick:   { engine: 'membrane', note: 'C1',
                    options: { pitchDecay: 0.02, octaves: 6 } },
          snare:  { engine: 'noise', noise: 'pink',
                    options: { envelope: { attack: 0.001, decay: 0.12, sustain: 0 } } },
          hat:    { engine: 'noise', noise: 'white',
                    options: { envelope: { attack: 0.001, decay: 0.03, sustain: 0 } } },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 0.4, release: 0.2 } } },
        },
      },
      efectos: [],
    },
    {
      id: 'bateriaVintage', nombre: 'Batería vintage', tipo: 'bateria', motor: 'synth',
      config: {
        pieces: {
          kick:   { engine: 'membrane', note: 'C1',
                    options: { pitchDecay: 0.08, octaves: 3 } },
          snare:  { engine: 'noise', noise: 'brown',
                    options: { envelope: { attack: 0.001, decay: 0.18, sustain: 0 } } },
          hat:    { engine: 'noise', noise: 'white',
                    options: { envelope: { attack: 0.001, decay: 0.04, sustain: 0 } } },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 1, release: 0.4 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.25 }],
    },
    {
      id: 'bateriaLoFi', nombre: 'Batería lo-fi', tipo: 'bateria', motor: 'synth',
      config: {
        pieces: {
          kick:   { engine: 'membrane', note: 'C1',
                    options: { pitchDecay: 0.1, octaves: 2 } },
          snare:  { engine: 'noise', noise: 'pink',
                    options: { envelope: { attack: 0.002, decay: 0.1, sustain: 0 } } },
          hat:    { engine: 'noise', noise: 'pink',
                    options: { envelope: { attack: 0.001, decay: 0.02, sustain: 0 } } },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 0.3, release: 0.15 } } },
        },
      },
      efectos: [{ tipo: 'distortion', cantidad: 0.1 }],
    },
    {
      id: 'bateriaPunchy', nombre: 'Batería punchy', tipo: 'bateria', motor: 'synth',
      config: {
        pieces: {
          kick:   { engine: 'membrane', note: 'C1',
                    options: { pitchDecay: 0.03, octaves: 5 } },
          snare:  { engine: 'noise', noise: 'white',
                    options: { envelope: { attack: 0.001, decay: 0.15, sustain: 0 } } },
          hat:    { engine: 'noise', noise: 'white',
                    options: { envelope: { attack: 0.001, decay: 0.045, sustain: 0 } } },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 0.7, release: 0.25 } } },
        },
      },
      efectos: [],
    },

    // ── Samples reales (CDN) ──
    {
      id: 'bateriaAcusticaReal', nombre: 'Batería acústica real', tipo: 'bateria', motor: 'sampler',
      config: {
        pieces: {
          kick:   { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/',
                    file: 'kick.mp3' },
          snare:  { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/',
                    file: 'snare.mp3' },
          hat:    { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/acoustic-kit/',
                    file: 'hihat.mp3' },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 0.8, release: 0.3 } } },
        },
      },
      efectos: [],
    },
    {
      id: 'bateriaTechnoReal', nombre: 'Batería techno real', tipo: 'bateria', motor: 'sampler',
      config: {
        pieces: {
          kick:   { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/Techno/',
                    file: 'kick.mp3' },
          snare:  { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/Techno/',
                    file: 'snare.mp3' },
          hat:    { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/Techno/',
                    file: 'hihat.mp3' },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 0.4, release: 0.2 } } },
        },
      },
      efectos: [],
    },
    {
      id: 'bateriaCR78Real', nombre: 'Batería CR-78 real (vintage)', tipo: 'bateria', motor: 'sampler',
      config: {
        pieces: {
          kick:   { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/CR78/',
                    file: 'kick.mp3' },
          snare:  { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/CR78/',
                    file: 'snare.mp3' },
          hat:    { engine: 'sample',
                    baseUrl: 'https://tonejs.github.io/audio/drum-samples/CR78/',
                    file: 'hihat.mp3' },
          cymbal: { engine: 'metal',
                    options: { envelope: { attack: 0.001, decay: 0.5, release: 0.2 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.12 }],
    },

    // ═══════════════════ PERCUSIÓN ═══════════════════

    // ── Sintetizada (kit Membrane/Noise/Metal) ──
    {
      id: 'percLatina', nombre: 'Percusión latina', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'membrane', note: 'A3',
                      options: { pitchDecay: 0.02, octaves: 2 } },
          bongo_lo: { engine: 'membrane', note: 'E3',
                      options: { pitchDecay: 0.02, octaves: 2 } },
          conga:    { engine: 'membrane', note: 'C3',
                      options: { pitchDecay: 0.03, octaves: 2 } },
          shaker:   { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.04, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.12 }],
    },
    {
      id: 'percAfricana', nombre: 'Percusión africana', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'membrane', note: 'D4',
                      options: { pitchDecay: 0.03, octaves: 2 } },
          bongo_lo: { engine: 'membrane', note: 'A3',
                      options: { pitchDecay: 0.04, octaves: 2 } },
          conga:    { engine: 'membrane', note: 'F3',
                      options: { pitchDecay: 0.05, octaves: 1.5 } },
          shaker:   { engine: 'noise', noise: 'brown',
                      options: { envelope: { attack: 0.001, decay: 0.06, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.18 }],
    },
    {
      id: 'percElectronica', nombre: 'Percusión electrónica', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'metal',
                      options: { envelope: { attack: 0.001, decay: 0.12, release: 0.05 } } },
          bongo_lo: { engine: 'membrane', note: 'E3',
                      options: { pitchDecay: 0.02, octaves: 4 } },
          conga:    { engine: 'membrane', note: 'C3',
                      options: { pitchDecay: 0.02, octaves: 5 } },
          shaker:   { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.03, sustain: 0 } } },
        },
      },
      efectos: [],
    },
    {
      id: 'percCajon', nombre: 'Percusión cajón', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.05, sustain: 0 } } },
          bongo_lo: { engine: 'membrane', note: 'C2',
                      options: { pitchDecay: 0.06, octaves: 3 } },
          conga:    { engine: 'membrane', note: 'G2',
                      options: { pitchDecay: 0.05, octaves: 2 } },
          shaker:   { engine: 'noise', noise: 'brown',
                      options: { envelope: { attack: 0.001, decay: 0.04, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.12 }],
    },
    {
      // Tabla: tambores de mano afinados. El pitchDecay de MembraneSynth
      // recrea el "tun" con caída de altura característico.
      id: 'tabla', nombre: 'Tabla (India)', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'membrane', note: 'A4',
                      options: { pitchDecay: 0.06, octaves: 3 } },
          bongo_lo: { engine: 'membrane', note: 'D2',
                      options: { pitchDecay: 0.18, octaves: 4 } },
          conga:    { engine: 'membrane', note: 'E4',
                      options: { pitchDecay: 0.08, octaves: 2 } },
          shaker:   { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.03, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.2 }],
    },
    {
      // Merengue: tambora (lanes bongo/conga) + güira (shaker, ruido corto).
      id: 'percMerengue', nombre: 'Percusión merengue', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'membrane', note: 'A3',
                      options: { pitchDecay: 0.02, octaves: 2 } },
          bongo_lo: { engine: 'membrane', note: 'D2',
                      options: { pitchDecay: 0.06, octaves: 3 } },
          conga:    { engine: 'membrane', note: 'G2',
                      options: { pitchDecay: 0.04, octaves: 2 } },
          shaker:   { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.035, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.12 }],
    },
    {
      // Cumbia: congas/llamador (membrana) + guacharaca (shaker, raspado).
      id: 'percCumbia', nombre: 'Percusión cumbia', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'membrane', note: 'C4',
                      options: { pitchDecay: 0.03, octaves: 2 } },
          bongo_lo: { engine: 'membrane', note: 'F3',
                      options: { pitchDecay: 0.04, octaves: 2 } },
          conga:    { engine: 'membrane', note: 'A2',
                      options: { pitchDecay: 0.05, octaves: 1.5 } },
          shaker:   { engine: 'noise', noise: 'brown',
                      options: { envelope: { attack: 0.002, decay: 0.06, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.12 }],
    },
    {
      // Salsa: congas + bongó (membrana), clave (metal, clic) y güiro (shaker).
      id: 'percSalsa', nombre: 'Percusión salsa', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'membrane', note: 'D4',
                      options: { pitchDecay: 0.02, octaves: 2 } },
          bongo_lo: { engine: 'metal',
                      options: { envelope: { attack: 0.001, decay: 0.12, release: 0.05 } } },
          conga:    { engine: 'membrane', note: 'E3',
                      options: { pitchDecay: 0.035, octaves: 2 } },
          shaker:   { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.045, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.14 }],
    },
    {
      // Bachata: güira (shaker) + bongó (membrana, agudo y grave).
      id: 'percBachata', nombre: 'Percusión bachata', tipo: 'percusion', motor: 'synth',
      config: {
        pieces: {
          bongo_hi: { engine: 'membrane', note: 'E4',
                      options: { pitchDecay: 0.02, octaves: 2 } },
          bongo_lo: { engine: 'membrane', note: 'A3',
                      options: { pitchDecay: 0.03, octaves: 2 } },
          conga:    { engine: 'membrane', note: 'D3',
                      options: { pitchDecay: 0.04, octaves: 1.5 } },
          shaker:   { engine: 'noise', noise: 'white',
                      options: { envelope: { attack: 0.001, decay: 0.04, sustain: 0 } } },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.1 }],
    },

    // ── Samples reales (CDN) ──
    {
      id: 'percBongosReal', nombre: 'Percusión bongós real', tipo: 'percusion', motor: 'sampler',
      config: {
        pieces: {
          bongo_hi: { engine: 'sample',
                      baseUrl: 'https://tonejs.github.io/audio/drum-samples/Bongos/',
                      file: 'tom1.mp3' },
          bongo_lo: { engine: 'sample',
                      baseUrl: 'https://tonejs.github.io/audio/drum-samples/Bongos/',
                      file: 'tom2.mp3' },
          conga:    { engine: 'sample',
                      baseUrl: 'https://tonejs.github.io/audio/drum-samples/Bongos/',
                      file: 'tom3.mp3' },
          shaker:   { engine: 'sample',
                      baseUrl: 'https://tonejs.github.io/audio/drum-samples/Bongos/',
                      file: 'hihat.mp3' },
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.15 }],
    },

    // ── Kits regionales reales (WAF GM drum kit) ──
    // Cada lane carga su propio sample del drum kit GM FluidR3.
    // Suenan a percusión acústica real, no a síntesis.

    // Cuba — son, salsa clásica. Claves como heartbeat.
    {
      id: 'percCubaReal', nombre: 'Cuba real (claves + bongó + congas)',
      tipo: 'percusion', motor: 'sampler',
      config: {
        pieces: {
          bongo_hi: wafDrum(60),   // Hi Bongo
          bongo_lo: wafDrum(61),   // Lo Bongo
          conga:    wafDrum(63),   // Open Hi Conga
          shaker:   wafDrum(75),   // Claves
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.18 }],
    },

    // Salsa — ensamble con cowbell y conga grave. Para tumbao denso.
    {
      id: 'percSalsaReal', nombre: 'Salsa real (cowbell + congas + claves)',
      tipo: 'percusion', motor: 'sampler',
      config: {
        pieces: {
          bongo_hi: wafDrum(63),   // Open Hi Conga
          bongo_lo: wafDrum(64),   // Low Conga
          conga:    wafDrum(56),   // Cowbell (cencerro)
          shaker:   wafDrum(75),   // Claves
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.16 }],
    },

    // Brasil — samba/bossa: agogos + cuica + maracas.
    {
      id: 'percBrasilReal', nombre: 'Brasil real (agogos + cuica + maracas)',
      tipo: 'percusion', motor: 'sampler',
      config: {
        pieces: {
          bongo_hi: wafDrum(67),   // High Agogo
          bongo_lo: wafDrum(68),   // Low Agogo
          conga:    wafDrum(78),   // Mute Cuica
          shaker:   wafDrum(70),   // Maracas
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.2 }],
    },

    // Latín general — paquete amplio: congas + güiro + maracas + cowbell.
    {
      id: 'percLatinaReal', nombre: 'Latina real (congas + güiro + maracas)',
      tipo: 'percusion', motor: 'sampler',
      config: {
        pieces: {
          bongo_hi: wafDrum(62),   // Mute Hi Conga
          bongo_lo: wafDrum(64),   // Low Conga
          conga:    wafDrum(74),   // Long Guiro
          shaker:   wafDrum(70),   // Maracas
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.16 }],
    },

    // Timbales latinos — para latin jazz. Timbales altos/bajos con
    // cowbell y claves para el clave del 3-2 / 2-3.
    {
      id: 'percTimbalesReal', nombre: 'Timbales reales (latin jazz)',
      tipo: 'percusion', motor: 'sampler',
      config: {
        pieces: {
          bongo_hi: wafDrum(65),   // High Timbale
          bongo_lo: wafDrum(66),   // Low Timbale
          conga:    wafDrum(56),   // Cowbell
          shaker:   wafDrum(75),   // Claves
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.2 }],
    },

    // Medio oriente — aproximación dumbek con bongós + tambourine +
    // triángulo. La GM no tiene darbuka real; bongó cumple el rol
    // tek/dum (alto/bajo) y el triángulo aporta el brillo metálico
    // del riq.
    {
      id: 'percMedioOrienteReal', nombre: 'Medio oriente real (dumbek + tambourine)',
      tipo: 'percusion', motor: 'sampler',
      config: {
        pieces: {
          bongo_hi: wafDrum(60),   // Hi Bongo (≈ dumbek tek)
          bongo_lo: wafDrum(61),   // Lo Bongo (≈ dumbek dum)
          conga:    wafDrum(54),   // Tambourine
          shaker:   wafDrum(80),   // Mute Triangle
        },
      },
      efectos: [{ tipo: 'reverb', cantidad: 0.25 }],
    },
  ];

  function byId(id) {
    return PRESETS.find(p => p.id === id) || null;
  }
  function byTipo(tipo) {
    return PRESETS.filter(p => p.tipo === tipo);
  }
  // Clon profundo de un preset — punto de partida para editarlo sin
  // mutar el de fábrica.
  function clone(preset) {
    return preset ? JSON.parse(JSON.stringify(preset)) : null;
  }

  W.BackingTrack = W.BackingTrack || {};
  W.BackingTrack.factoryPresets = { PRESETS, byId, byTipo, clone };
})(typeof window !== 'undefined' ? window : globalThis);
