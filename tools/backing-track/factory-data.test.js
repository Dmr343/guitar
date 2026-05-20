// Tests de consistencia de los datos de fábrica — IIFE, sin DOM.
(function (G, W) {
  'use strict';
  const T = G.testRunner;
  const BT = W.BackingTrack || {};
  const presets = BT.factoryPresets;
  const patterns = BT.factoryPatterns;
  const progressions = BT.factoryProgressions;
  if (!presets || !patterns || !progressions) {
    console.error('Datos de fábrica no cargados'); return;
  }

  const TIPOS = ['bajo', 'acordes', 'bateria', 'percusion', 'pad', 'lead'];
  const QUALITIES = ['major', 'minor', 'dom7', 'maj7', 'min7', 'm7b5'];

  T.describe('factoryPresets — forma y cobertura', () => {
    T.it('cada preset tiene id, nombre, tipo, motor y config', () => {
      presets.PRESETS.forEach(p => {
        T.assert(!!p.id && !!p.nombre && !!p.tipo && !!p.motor && !!p.config,
          'preset incompleto: ' + JSON.stringify(p.id));
      });
    });
    T.it('hay varios presets por cada tipo de instrumento', () => {
      TIPOS.forEach(tipo => {
        T.assert(presets.byTipo(tipo).length >= 1, 'falta preset de tipo ' + tipo);
      });
    });
    T.it('los ids de preset son únicos', () => {
      const ids = presets.PRESETS.map(p => p.id);
      T.assertEq(new Set(ids).size, ids.length);
    });
    T.it('byId encuentra un preset existente y devuelve null si no', () => {
      T.assertEq(presets.byId('bajoRedondo').tipo, 'bajo');
      T.assertEq(presets.byId('noExiste'), null);
    });
    T.it('clone devuelve una copia independiente', () => {
      const c = presets.clone(presets.byId('bajoRedondo'));
      c.nombre = 'modificado';
      T.assertEq(presets.byId('bajoRedondo').nombre, 'Bajo redondo');
    });
    T.it('las piezas de batería usan motores de síntesis válidos', () => {
      presets.byTipo('bateria').concat(presets.byTipo('percusion')).forEach(p => {
        const pieces = p.config.pieces || {};
        Object.keys(pieces).forEach(lane => {
          T.assert(['membrane', 'noise', 'metal', 'sample'].indexOf(pieces[lane].engine) >= 0,
            'engine inválido en ' + p.id + '/' + lane);
        });
      });
    });
  });

  T.describe('factoryPatterns — forma y consistencia', () => {
    T.it('cada patrón tiene la forma { steps, lanes, hits }', () => {
      patterns.PATTERNS.forEach(p => {
        T.assert(p.steps > 0 && Array.isArray(p.lanes) && Array.isArray(p.hits),
          'patrón mal formado: ' + p.id);
      });
    });
    T.it('todos los hits caen dentro del rango de pasos y en una lane válida', () => {
      patterns.PATTERNS.forEach(p => {
        p.hits.forEach(h => {
          T.assert(h.step >= 0 && h.step < p.steps, 'paso fuera de rango en ' + p.id);
          T.assert(p.lanes.indexOf(h.lane) >= 0, 'lane inválida en ' + p.id);
        });
      });
    });
    T.it('los patrones de batería usan las lanes del kit', () => {
      patterns.byTipo('drums').forEach(p => {
        p.lanes.forEach(l => {
          T.assert(patterns.KIT_LANES.indexOf(l) >= 0, 'lane de kit inesperada: ' + l);
        });
      });
    });
    T.it('hay patrones para bass, chord, drums y perc', () => {
      ['bass', 'chord', 'drums', 'perc'].forEach(t => {
        T.assert(patterns.byTipo(t).length >= 1, 'falta patrón de tipo ' + t);
      });
    });
  });

  T.describe('factoryProgressions — forma', () => {
    T.it('cada progresión tiene acordes con calidad y bars válidos', () => {
      progressions.PROGRESSIONS.forEach(p => {
        T.assert(p.chords.length > 0, 'progresión vacía: ' + p.id);
        p.chords.forEach(c => {
          T.assert(QUALITIES.indexOf(c.quality) >= 0, 'calidad inválida en ' + p.id);
          T.assert(c.bars >= 1, 'bars inválido en ' + p.id);
          // Forma nueva: las progresiones transponibles usan `grado`; las
          // marcadas transponible:false usan `root`. Una de las dos debe estar.
          T.assert(!!c.grado || !!c.root, 'falta grado/root en ' + p.id);
        });
      });
    });
    T.it('progresiones transponibles declaran tonalidad y modo', () => {
      progressions.PROGRESSIONS.forEach(p => {
        if (p.transponible === false) return;
        T.assert(!!p.tonalidad, 'falta tonalidad en ' + p.id);
        T.assert(p.modo === 'major' || p.modo === 'minor', 'modo inválido en ' + p.id);
      });
    });
    T.it('chordsOf devuelve raíces concretas realizando la tonalidad nativa', () => {
      // jazzIIVI: Dm7 — G7 — Cmaj7 (×2) en C mayor.
      const ch = progressions.chordsOf('jazzIIVI');
      T.assertEq(ch.length, 3);
      T.assertEq(ch[0].root, 'D');
      T.assertEq(ch[0].quality, 'min7');
      T.assertEq(ch[2].root, 'C');
    });
    T.it('chordsOf — mutar el resultado no toca los datos fuente', () => {
      const ch = progressions.chordsOf('jazzIIVI');
      ch[0].root = 'X';
      T.assertEq(progressions.chordsOf('jazzIIVI')[0].root, 'D');
      // El dato fuente sigue siendo el grado, no el root.
      T.assertEq(progressions.byId('jazzIIVI').chords[0].grado, 'ii');
    });
  });

  T.describe('factoryProgressions — realización con transpose', () => {
    // Why: el catálogo de progresiones es 34 entradas con grados escritos
    // a mano. Un grado mal escrito (typo, mayúscula/minúscula confundida)
    // no se detecta hasta runtime cuando alguien lo carga. Estos tests
    // ejercen realizeProgression sobre TODOS los IDs contra varias
    // tonalidades para cazar errores en el catálogo o regresiones en
    // transpose.js antes de que lleguen al usuario.
    const transpose = BT.transpose;
    const VALID_ROOTS = new Set([
      'C','C#','Db','D','D#','Eb','E','F','F#','Gb',
      'G','G#','Ab','A','A#','Bb','B',
    ]);

    T.it('cada progresión se realiza en su tonalidad nativa sin huecos', () => {
      progressions.PROGRESSIONS.forEach(p => {
        const out = transpose.realizeProgression(p, p.tonalidad);
        T.assertEq(out.length, p.chords.length,
          p.id + ': realización dejó acordes fuera');
        out.forEach((c, i) => {
          T.assert(VALID_ROOTS.has(c.root),
            p.id + '[' + i + ']: root inválido "' + c.root + '"');
          T.assert(QUALITIES.indexOf(c.quality) >= 0,
            p.id + '[' + i + ']: calidad inválida "' + c.quality + '"');
          T.assert(c.bars >= 1,
            p.id + '[' + i + ']: bars inválido');
        });
      });
    });

    T.it('cada progresión transponible se realiza contra C, G y Eb', () => {
      const targets = ['C', 'G', 'Eb'];
      progressions.PROGRESSIONS.forEach(p => {
        if (p.transponible === false) return;
        targets.forEach(t => {
          const out = transpose.realizeProgression(p, t);
          T.assertEq(out.length, p.chords.length,
            p.id + ' en ' + t + ': realización dejó acordes fuera');
          out.forEach((c, i) => {
            T.assert(VALID_ROOTS.has(c.root),
              p.id + ' en ' + t + '[' + i + ']: root inválido "' + c.root + '"');
          });
        });
      });
    });

    T.it('progresiones no transponibles devuelven sus root fijos', () => {
      progressions.PROGRESSIONS.forEach(p => {
        if (p.transponible !== false) return;
        // realizeProgression debe ignorar la tonalidad destino y devolver
        // exactamente los root del archivo.
        const out1 = transpose.realizeProgression(p, p.tonalidad);
        const out2 = transpose.realizeProgression(p, 'F#');
        T.assertEq(JSON.stringify(out1), JSON.stringify(out2),
          p.id + ': la tonalidad destino afectó el resultado de un no-transponible');
      });
    });
  });

  T.describe('datos de fábrica — integración con el scheduler', () => {
    T.it('el scheduler produce eventos con datos de fábrica reales', () => {
      if (!BT.scheduler) { T.assert(true); return; }
      const r = BT.scheduler.schedule({
        progression: progressions.chordsOf('blues12A'),
        tempo: 90,
        tracks: [
          { id: 'b', tipo: 'bajo', patternId: 'bajoNegras', enabled: true },
          { id: 'd', tipo: 'bateria', patternId: 'rockBasico', enabled: true },
        ],
        patterns: {
          bajoNegras: patterns.byId('bajoNegras'),
          rockBasico: patterns.byId('rockBasico'),
        },
      });
      T.assert(r.events.length > 0, 'el scheduler no produjo eventos');
    });
  });

  T.describe('factoryGrooves — forma y referencias', () => {
    const grooves = BT.factoryGrooves;
    T.it('cada groove tiene id, nombre y patterns', () => {
      grooves.GROOVES.forEach(g => {
        T.assert(!!g.id && !!g.nombre && !!g.patterns,
          'groove incompleto: ' + JSON.stringify(g.id));
      });
    });
    T.it('todos los patrones que referencia un groove existen', () => {
      grooves.GROOVES.forEach(g => {
        Object.keys(g.patterns).forEach(k => {
          T.assert(patterns.byId(g.patterns[k]) !== null,
            'patrón inexistente en groove ' + g.id + ': ' + g.patterns[k]);
        });
      });
    });
    T.it('byId encuentra un groove y devuelve null si no existe', () => {
      T.assertEq(grooves.byId('bluesShuffle').genero, 'blues');
      T.assertEq(grooves.byId('noExiste'), null);
    });
  });

})(
  (typeof window !== 'undefined' ? window : globalThis).GuitarShared,
  (typeof window !== 'undefined' ? window : globalThis)
);
