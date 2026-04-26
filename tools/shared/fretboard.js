// Fretboard rendering primitives — works as plain script (file:// safe).
// Reads window.GuitarShared.theory (must load theory.js first).
// Attaches all exports to window.GuitarShared.fretboard.
(function (G) {
  const { CHROMATIC } = G.theory;

  const OPEN_NOTES    = ['E','A','D','G','B','E'];
  const STRING_LABELS = ['E','A','D','G','B','e'];
  const FRET_MARKERS  = [3,5,7,9,12];
  const STRING_THICK  = [3.2,2.6,2.0,1.5,1.0,0.6];

  const FB_W      = 920;
  const FB_H      = 220;
  const FB_NUT    = 48;
  const FB_RIGHT  = FB_W - 16;
  const FB_STR_TOP = 28;
  const FB_STR_BOT = FB_H - 28;
  const FB_STR_GAP = (FB_STR_BOT - FB_STR_TOP) / 5;

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs) {
    const e = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  }

  function fbNoteAt(open, fret) {
    return CHROMATIC[(CHROMATIC.indexOf(open) + fret) % 12];
  }

  function fretX(fret, fretW) {
    return fret === 0 ? FB_NUT - 4 : FB_NUT + (fret - 0.5) * fretW;
  }

  function stringY(si) {
    return FB_STR_BOT - si * FB_STR_GAP;
  }

  function fbGetFretW(svgEl, numFrets) {
    return parseFloat(svgEl.dataset.fretW) || (FB_RIGHT - FB_NUT) / (numFrets || 12);
  }

  function fbGetDotsGroup(svgEl) {
    let dotsG = svgEl.querySelector('g[data-dots]');
    if (!dotsG) {
      dotsG = el('g');
      dotsG.dataset.dots = '1';
      svgEl.appendChild(dotsG);
    }
    return dotsG;
  }

  function fbInitBoard(svgEl, numFrets) {
    numFrets = numFrets || 12;
    const fretW = (FB_RIGHT - FB_NUT) / numFrets;
    svgEl.innerHTML = '';
    svgEl.dataset.fretW = fretW;
    svgEl.dataset.numFrets = numFrets;

    const defs = el('defs');
    defs.innerHTML = '<filter id="fbglow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    svgEl.appendChild(defs);

    const g = el('g');
    g.appendChild(el('rect', { x: FB_NUT - 5, y: FB_STR_TOP - 8, width: 5, height: FB_STR_GAP * 5 + 16, fill: '#5a4820' }));

    for (let f = 1; f <= numFrets; f++) {
      const x = FB_NUT + f * fretW;
      g.appendChild(el('line', { x1: x, y1: FB_STR_TOP - 6, x2: x, y2: FB_STR_BOT + 6, stroke: '#1a1a1a', 'stroke-width': 2 }));
    }

    for (let f = 0; f <= numFrets; f++) {
      const x = f === 0 ? FB_NUT - 18 : FB_NUT + (f - 0.5) * fretW;
      const t = el('text', {
        x, y: 14, 'text-anchor': 'middle', 'font-size': 10,
        fill: FRET_MARKERS.includes(f) ? '#d4a847' : '#2a2a2a',
        'font-family': 'Trebuchet MS,sans-serif',
      });
      t.textContent = f === 0 ? '○' : f;
      g.appendChild(t);
    }

    OPEN_NOTES.forEach((_, si) => {
      const y = stringY(si);
      g.appendChild(el('line', { x1: FB_NUT - 4, y1: y, x2: FB_RIGHT, y2: y, stroke: '#3a2a10', 'stroke-width': STRING_THICK[si] }));
      const t = el('text', { x: 22, y: y + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-style': 'italic', 'font-weight': 700, fill: '#444', 'font-family': 'Trebuchet MS,sans-serif' });
      t.textContent = STRING_LABELS[si];
      g.appendChild(t);
    });

    FRET_MARKERS.forEach(f => {
      if (f > numFrets) return;
      if (f === 12) {
        [1, 3].forEach(si => {
          g.appendChild(el('circle', { cx: FB_NUT + (f - 0.5) * fretW, cy: stringY(si) - FB_STR_GAP * 0.5, r: 4, fill: '#1e1e1e' }));
        });
      } else {
        g.appendChild(el('circle', { cx: FB_NUT + (f - 0.5) * fretW, cy: stringY(2) - FB_STR_GAP * 0.5, r: 4, fill: '#1e1e1e' }));
      }
    });

    svgEl.appendChild(g);
    const dotsG = el('g');
    dotsG.dataset.dots = '1';
    svgEl.appendChild(dotsG);
  }

  // Convert chord strings[] → fretboard positions [{si, fret, d, note}]
  // strings: [e, B, G, D, A, E] high→low (index 0 = high e = si 5)
  function chordToFbPositions(chord) {
    const siMap = [5, 4, 3, 2, 1, 0];
    const positions = [];
    chord.strings.forEach((fret, idx) => {
      if (fret === 'x' || fret === null) return;
      const si = siMap[idx];
      const openNote = OPEN_NOTES[si];
      const noteName = fbNoteAt(openNote, fret);
      const degree = chord.notes ? chord.notes.indexOf(noteName) + 1 : 1;
      positions.push({ si, fret, d: degree > 0 ? degree : 1, note: noteName });
    });
    return positions;
  }

  function fbRenderChordDots(svgEl, chord, color) {
    const fretW = fbGetFretW(svgEl);
    const dotsG = fbGetDotsGroup(svgEl);
    dotsG.innerHTML = '';
    const positions = chordToFbPositions(chord);
    const col = color || '#3498db';
    positions.forEach(p => {
      const cx = fretX(p.fret, fretW), cy = stringY(p.si);
      const isRoot = p.d === 1;
      const r = isRoot ? 14 : 11;
      const c = el('circle', { cx, cy, r, fill: isRoot ? col : col + 'aa' });
      if (isRoot) {
        c.setAttribute('filter', 'url(#fbglow)');
        dotsG.appendChild(el('circle', { cx, cy, r: r + 4, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-opacity': 0.8 }));
      }
      dotsG.appendChild(c);
      const t = el('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 800, fill: isRoot ? '#fff' : '#000', 'font-family': 'Trebuchet MS,sans-serif' });
      t.textContent = p.note;
      dotsG.appendChild(t);
    });
  }

  function fbDrawBarre(svgEl, capoFret, fromSi, toSi, color) {
    const fretW = fbGetFretW(svgEl);
    const dotsG = fbGetDotsGroup(svgEl);
    const x = FB_NUT + (capoFret - 0.5) * fretW;
    const y1 = stringY(Math.max(fromSi, toSi));
    const y2 = stringY(Math.min(fromSi, toSi));
    const line = el('line', {
      x1: x, y1, x2: x, y2,
      stroke: color || '#ffffff',
      'stroke-width': 3,
      'stroke-opacity': 0.35,
      'stroke-linecap': 'round',
    });
    line.dataset.barre = capoFret;
    dotsG.appendChild(line);
  }

  const FUNC_DOT_COLORS = { R: '#d4a847', '3': '#e67e22', '5': '#3498db', '7': '#2ecc71' };

  function fbRenderFunctionalDot(svgEl, si, fret, funcName, noteName) {
    const fretW = fbGetFretW(svgEl);
    const dotsG = fbGetDotsGroup(svgEl);
    const cx = fretX(fret, fretW), cy = stringY(si);
    const col = FUNC_DOT_COLORS[funcName] || '#888';
    const r = funcName === 'R' ? 14 : 11;
    if (funcName === 'R') {
      dotsG.appendChild(el('circle', { cx, cy, r: r + 4, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-opacity': 0.8 }));
    }
    const c = el('circle', { cx, cy, r, fill: col });
    if (funcName === 'R') c.setAttribute('filter', 'url(#fbglow)');
    dotsG.appendChild(c);
    const t = el('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 800, fill: '#000', 'font-family': 'Trebuchet MS,sans-serif' });
    t.textContent = noteName;
    dotsG.appendChild(t);
  }

  G.fretboard = {
    OPEN_NOTES, STRING_LABELS, FRET_MARKERS, STRING_THICK,
    FB_W, FB_H, FB_NUT, FB_RIGHT, FB_STR_TOP, FB_STR_BOT, FB_STR_GAP,
    fbNoteAt, fretX, stringY, fbGetFretW, fbGetDotsGroup,
    fbInitBoard, chordToFbPositions, fbRenderChordDots,
    fbDrawBarre, fbRenderFunctionalDot,
  };
})(typeof window !== 'undefined'
    ? (window.GuitarShared = window.GuitarShared || {})
    : (globalThis.GuitarShared = globalThis.GuitarShared || {}));
