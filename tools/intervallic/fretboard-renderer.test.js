// Tests for FretboardRenderer — testea computeDrawPlan SIN DOM,
// con stubs deterministas de geometría.
(function (G, W) {
  const T = G.testRunner;
  const FR = W.FretboardRenderer;
  if (!FR) { console.error('FretboardRenderer not loaded'); return; }
  const TH = G.theory;

  // Stubs deterministas de geometría
  const stubGeom = {
    fretStart: 0,
    fretW: 10,
    fretX: (rf, fw) => rf * fw,
    stringY: (si) => si * 10,
    openNotes: ['E','A','D','G','B','E'],
    noteAt: (open, fret) => {
      const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
      return CHROMATIC[(CHROMATIC.indexOf(open) + fret) % 12];
    },
  };

  function defaultParams(over) {
    return Object.assign({
      chord: TH.buildChord('C','maj7'),
      nextChord: null,
      layers: { chordTones: true },
      hiddenIntervals: [],
      filter: { stringSet: [1,2,3,4,5,6], fretRange: [0,12], direction: 'all' },
      showNoteNames: false,
      numFrets: 22,
      geometry: stubGeom,
    }, over || {});
  }

  T.describe('FretboardRenderer — chord tones', () => {
    T.it('Cmaj7 genera cells con intervalos correctos', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      const intervals = new Set(plan.cells.map(c => c.interval));
      ['1','3','5','7'].forEach(i =>
        T.assert(intervals.has(i), 'falta interval ' + i));
    });
    T.it('cells de chord tones tienen radius=12 y hasFill=true', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      plan.cells.forEach(c => {
        T.assertEq(c.radius, 12);
        T.assertEq(c.hasFill, true);
      });
    });
    T.it('cell con interval "1" tiene halo', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      const rootCells = plan.cells.filter(c => c.interval === '1');
      T.assert(rootCells.length > 0);
      rootCells.forEach(c => T.assert(c.halo, 'falta halo en root'));
    });
    T.it('cells no-root no tienen halo', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      const others = plan.cells.filter(c => c.interval !== '1');
      others.forEach(c => T.assertEq(c.halo, null));
    });
    T.it('colorKey === interval', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      plan.cells.forEach(c => T.assertEq(c.colorKey, c.interval));
    });
  });

  T.describe('FretboardRenderer — filtros', () => {
    T.it('stringSet excluye cuerdas no listadas', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        filter: { stringSet: [1, 2], fretRange: [0, 12], direction: 'all' },
      }));
      plan.cells.forEach(c => T.assert(c.string === 1 || c.string === 2,
        'cuerda fuera: ' + c.string));
    });
    T.it('fretRange limita los frets', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        filter: { stringSet: [1,2,3,4,5,6], fretRange: [0, 4], direction: 'all' },
      }));
      plan.cells.forEach(c => T.assert(c.fret >= 0 && c.fret <= 4));
    });
    T.it('direction=horizontal con focusString=3 deja solo string 3', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        filter: { stringSet: [1,2,3,4,5,6], fretRange: [0, 12], direction: 'horizontal', focusString: 3 },
      }));
      plan.cells.forEach(c => T.assertEq(c.string, 3));
    });
    T.it('hiddenIntervals excluye los listados', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        hiddenIntervals: ['5', '7'],
      }));
      plan.cells.forEach(c => T.assert(c.interval !== '5' && c.interval !== '7'));
    });
  });

  T.describe('FretboardRenderer — extraIntervals', () => {
    T.it('extraIntervals=["b6"] agrega cells con interval b6 y kind extra', () => {
      const plan = FR.computeDrawPlan(defaultParams({ extraIntervals: ['b6'] }));
      const b6 = plan.cells.filter(c => c.interval === 'b6');
      T.assert(b6.length > 0, 'falta la b6');
      b6.forEach(c => {
        T.assertEq(c.kind, 'extra');
        T.assertEq(c.radius, 9);
        T.assertEq(c.hasFill, true);
      });
    });
    T.it('sin extraIntervals no aparecen notas ajenas al acorde', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      plan.cells.forEach(c =>
        T.assert(['1','3','5','7'].includes(c.interval), 'nota ajena: ' + c.interval));
    });
    T.it('un extraInterval que coincide con chord tone se queda como chordTones', () => {
      const m = FR.computeRenderMap(TH.buildChord('C','maj7'),
        { chordTones: true }, null, TH, ['3']);
      T.assertEq(m.get('E').kind, 'chordTones');
    });
  });

  T.describe('FretboardRenderer — hiddenCells (fantasma)', () => {
    T.it('una posición en hiddenCells produce una cell ghost', () => {
      const full = FR.computeDrawPlan(defaultParams());
      const target = full.cells[0];
      const key = FR.cellKey(target.string, target.fret);
      const plan = FR.computeDrawPlan(defaultParams({ hiddenCells: [key] }));
      const ghost = plan.cells.find(c => c.string === target.string && c.fret === target.fret);
      T.assert(ghost, 'la celda sigue presente en el plan (clickeable)');
      T.assertEq(ghost.ghost, true);
      T.assertEq(ghost.hasFill, false);
      T.assertEq(ghost.label, null);
      T.assert(ghost.ring, 'el fantasma debe tener anillo');
    });
    T.it('posiciones fuera de hiddenCells siguen normales', () => {
      const full = FR.computeDrawPlan(defaultParams());
      const target = full.cells[0];
      const key = FR.cellKey(target.string, target.fret);
      const plan = FR.computeDrawPlan(defaultParams({ hiddenCells: [key] }));
      plan.cells
        .filter(c => !(c.string === target.string && c.fret === target.fret))
        .forEach(c => T.assertEq(c.ghost, false));
    });
    T.it('sin hiddenCells ninguna celda es ghost', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      plan.cells.forEach(c => T.assertEq(c.ghost, false));
    });
  });

  T.describe('FretboardRenderer — cellKey + resolveBoardClick', () => {
    T.it('cellKey es estable y distingue cuerda de traste', () => {
      T.assertEq(FR.cellKey(3, 5), FR.cellKey(3, 5));
      T.assert(FR.cellKey(3, 5) !== FR.cellKey(5, 3), 's3f5 != s5f3');
    });
    T.it('posición con celda → toggleHide', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      const cell = plan.cells[0];
      const res = FR.resolveBoardClick({ string: cell.string, fret: cell.fret, plan });
      T.assertEq(res.action, 'toggleHide');
    });
    T.it('posición sin celda → setFocus', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      const res = FR.resolveBoardClick({ string: 99, fret: 99, plan });
      T.assertEq(res.action, 'setFocus');
    });
    T.it('una posición fantasma sigue resolviendo a toggleHide', () => {
      const full = FR.computeDrawPlan(defaultParams());
      const t = full.cells[0];
      const plan = FR.computeDrawPlan(defaultParams({
        hiddenCells: [FR.cellKey(t.string, t.fret)],
      }));
      const res = FR.resolveBoardClick({ string: t.string, fret: t.fret, plan });
      T.assertEq(res.action, 'toggleHide');
    });
  });

  T.describe('FretboardRenderer — approach (ghost)', () => {
    T.it('approach del próximo acorde produce ring + sin fill', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        chord: TH.buildChord('C','maj7'),
        nextChord: TH.buildChord('A','min7'),
        layers: { chordTones: true, approach: true },
      }));
      const approachCells = plan.cells.filter(c => c.kind === 'approach');
      T.assert(approachCells.length > 0, 'al menos una cell approach');
      approachCells.forEach(c => {
        T.assertEq(c.hasFill, false);
        T.assert(c.ring, 'falta ring en approach');
        T.assertEq(c.ring.dasharray, '2.2,1.8');
      });
    });
    T.it('approach radius=7 y alpha=0.55', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        chord: TH.buildChord('C','maj7'),
        nextChord: TH.buildChord('A','min7'),
        layers: { chordTones: true, approach: true },
      }));
      const ap = plan.cells.find(c => c.kind === 'approach');
      T.assert(ap);
      T.assertEq(ap.radius, 7);
      T.assertEq(ap.fillAlpha, 0.55);
    });
    T.it('cross-ref: chord tone que persiste en próximo tiene crossRef.badge', () => {
      // Cmaj7 → Am7: C, E, G persisten. Sus crossRef debe tener nextInterval.
      const plan = FR.computeDrawPlan(defaultParams({
        chord: TH.buildChord('C','maj7'),
        nextChord: TH.buildChord('A','min7'),
        layers: { chordTones: true, approach: true },
      }));
      const cWith = plan.cells.filter(c => c.kind === 'chordTones' && c.crossRef);
      T.assert(cWith.length > 0, 'al menos un chord tone con crossRef');
      cWith.forEach(c => {
        T.assert(c.crossRef.badge.text, 'badge debe tener text');
        T.assert(c.crossRef.ring, 'crossRef debe tener ring');
      });
    });
  });

  T.describe('FretboardRenderer — showNoteNames', () => {
    T.it('showNoteNames=false → no hay nameLabel', () => {
      const plan = FR.computeDrawPlan(defaultParams({ showNoteNames: false }));
      plan.cells.forEach(c => T.assertEq(c.nameLabel, null));
    });
    T.it('showNoteNames=true → cada cell tiene nameLabel con pill + text', () => {
      const plan = FR.computeDrawPlan(defaultParams({ showNoteNames: true }));
      T.assert(plan.cells.length > 0);
      plan.cells.forEach(c => {
        T.assert(c.nameLabel, 'falta nameLabel');
        T.assert(c.nameLabel.pill);
        T.assert(c.nameLabel.text);
        T.assertEq(c.nameLabel.text.value, c.note);
      });
    });
  });

  T.describe('FretboardRenderer — sin chord activo', () => {
    T.it('chord=null devuelve plan vacío', () => {
      const plan = FR.computeDrawPlan(defaultParams({ chord: null }));
      T.assertEq(plan.cells.length, 0);
    });
  });

  T.describe('FretboardRenderer — geometry resuelve x/y', () => {
    T.it('x = fretX(fret - fretStart, fretW)', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      const cell = plan.cells.find(c => c.fret === 3);
      if (cell) T.assertEq(cell.x, 3 * 10); // stub: 30
    });
    T.it('y = stringY(6 - string)', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      const cell = plan.cells.find(c => c.string === 5);
      if (cell) T.assertEq(cell.y, 10); // stub: (6-5)*10
    });
  });

  T.describe('FretboardRenderer — guide tones (capa)', () => {
    T.it('con guideTones activo, 3 y 7 llevan glow + halo grueso', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        layers: { chordTones: true, guideTones: true },
      }));
      const guides = plan.cells.filter(c => c.interval === '3' || c.interval === '7');
      T.assert(guides.length > 0, 'hay cells de 3 y 7');
      guides.forEach(c => {
        T.assert(c.glow, 'falta glow');
        T.assert(c.halo && c.halo.width > 2, 'falta halo grueso');
        T.assertEq(c.guide, true);
      });
    });
    T.it('la raíz y la 5ª no llevan glow (la raíz conserva su halo fino)', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        layers: { chordTones: true, guideTones: true },
      }));
      plan.cells.filter(c => c.interval === '1' || c.interval === '5')
        .forEach(c => {
          T.assert(!c.glow, 'glow indebido en ' + c.interval);
          if (c.interval === '1') T.assertEq(c.halo.width, 2);
        });
    });
    T.it('sin la capa, ninguna cell lleva glow', () => {
      const plan = FR.computeDrawPlan(defaultParams());
      plan.cells.forEach(c => T.assert(!c.glow));
    });
    T.it('en m7 los guide tones son b3 y b7', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        chord: TH.buildChord('A', 'min7'),
        layers: { chordTones: true, guideTones: true },
      }));
      const glowing = new Set(plan.cells.filter(c => c.glow).map(c => c.interval));
      T.assertArrayEq(Array.from(glowing).sort(), ['b3', 'b7']);
    });
  });

  T.describe('FretboardRenderer — prioridad de capas (spec Fase B)', () => {
    T.it('tensions gana sobre scale para la misma pc', () => {
      // Cmaj7 → lydian incluye D; D también es la tensión 9.
      const m = FR.computeRenderMap(TH.buildChord('C', 'maj7'),
        { scale: true, tensions: true }, null, TH);
      T.assertEq(m.get('D').kind, 'tensions');
      T.assertEq(m.get('D').interval, '9');
    });
    T.it('scale gana sobre approach', () => {
      // D está en la escala lydian de Cmaj7 y es raíz del próximo D7.
      const m = FR.computeRenderMap(TH.buildChord('C', 'maj7'),
        { scale: true, approach: true }, TH.buildChord('D', 'dom7'), TH);
      T.assertEq(m.get('D').kind, 'scale');
    });
    T.it('approach sigue ganando sobre allNotes', () => {
      const m = FR.computeRenderMap(TH.buildChord('C', 'maj7'),
        { allNotes: true, approach: true }, TH.buildChord('A', 'min7'), TH);
      T.assertEq(m.get('A').kind, 'approach');
    });
    T.it('chordTones sigue ganando sobre tensions', () => {
      const m = FR.computeRenderMap(TH.buildChord('C', 'maj7'),
        { chordTones: true, tensions: true, scale: true }, null, TH);
      T.assertEq(m.get('E').kind, 'chordTones');
      T.assertEq(m.get('B').kind, 'chordTones');
    });
  });

  T.describe('FretboardRenderer.guideTonesOf', () => {
    T.it('maj7: guide tones son 3 y 7', () => {
      const g = FR.guideTonesOf(TH.buildChord('C', 'maj7'));
      T.assertArrayEq(g.map(x => x.interval).sort(), ['3', '7']);
    });
    T.it('min7: guide tones son b3 y b7', () => {
      const g = FR.guideTonesOf(TH.buildChord('A', 'min7'));
      T.assertArrayEq(g.map(x => x.interval).sort(), ['b3', 'b7']);
    });
    T.it('acorde nulo → lista vacía', () => {
      T.assertArrayEq(FR.guideTonesOf(null), []);
    });
  });

  T.describe('FretboardRenderer — voice leading (capa)', () => {
    // ii–V clásico: Dm7 (guide tones b3=F, b7=C) → G7 (guide tones 3=B, b7=F).
    // F es común (Dm7.b3 == G7.b7): sin línea. C resuelve un semitono
    // abajo hacia B (Dm7.b7 → G7.3): la línea clásica del ii–V.
    function iiVParams(layers) {
      return defaultParams({
        chord: TH.buildChord('D', 'min7'),
        nextChord: TH.buildChord('G', 'dom7'),
        layers: layers,
      });
    }
    T.it('el b7 (C) resuelve por semitono hacia la 3ª (B) de G7', () => {
      const plan = FR.computeDrawPlan(
        iiVParams({ chordTones: true, guideTones: true, voiceLeading: true }));
      T.assert(plan.lines.length >= 1, 'debe haber al menos una línea');
      const l = plan.lines.find(x => x.fromInterval === 'b7');
      T.assert(l, 'falta línea desde b7 (C)');
      T.assertEq(l.toInterval, '3');
    });
    T.it('la nota común (b3=F ≡ b7=F) no genera línea', () => {
      const plan = FR.computeDrawPlan(
        iiVParams({ chordTones: true, guideTones: true, voiceLeading: true }));
      T.assertEq(plan.lines.find(x => x.fromInterval === 'b3'), undefined);
    });
    T.it('sin la capa voiceLeading, no hay líneas', () => {
      const plan = FR.computeDrawPlan(
        iiVParams({ chordTones: true, guideTones: true, voiceLeading: false }));
      T.assertArrayEq(plan.lines, []);
    });
    T.it('sin guideTones, no hay líneas aunque voiceLeading esté activo', () => {
      const plan = FR.computeDrawPlan(
        iiVParams({ chordTones: true, guideTones: false, voiceLeading: true }));
      T.assertArrayEq(plan.lines, []);
    });
    T.it('sin próximo acorde, no hay líneas', () => {
      const plan = FR.computeDrawPlan(defaultParams({
        chord: TH.buildChord('D', 'min7'), nextChord: null,
        layers: { chordTones: true, guideTones: true, voiceLeading: true },
      }));
      T.assertArrayEq(plan.lines, []);
    });
    T.it('las líneas conectan las coordenadas x/y de origen y destino', () => {
      const plan = FR.computeDrawPlan(
        iiVParams({ chordTones: true, guideTones: true, voiceLeading: true }));
      const l = plan.lines[0];
      T.assert(Number.isFinite(l.x1) && Number.isFinite(l.y1));
      T.assert(Number.isFinite(l.x2) && Number.isFinite(l.y2));
    });
  });

})((typeof window !== 'undefined' ? window : globalThis).GuitarShared,
   typeof window !== 'undefined' ? window : globalThis);
