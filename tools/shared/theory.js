export const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const MAJOR_STEPS      = [2,2,1,2,2,2,1];
export const MINOR_STEPS      = [2,1,2,2,1,2,2];
export const PENTATONIC_MAJOR_STEPS = [2,2,3,2,3];
export const PENTATONIC_MINOR_STEPS = [3,2,2,3,2];
export const MIXOLYDIAN_STEPS = [2,2,1,2,2,1,2];
export const DORIAN_STEPS     = [2,1,2,2,2,1,2];

const NOTE_HUES = {
  C:0, 'C#':30, D:60, 'D#':90, E:120, F:150,
  'F#':180, G:210, 'G#':240, A:270, 'A#':300, B:330,
};

export function chordColor(root, quality) {
  const hue = NOTE_HUES[root] ?? 0;
  if (quality === 'major') return `hsl(${hue},75%,60%)`;
  if (quality === 'minor') return `hsl(${hue},60%,56%)`;
  if (quality === 'dim')   return `hsl(${hue},40%,52%)`;
  return `hsl(${hue},75%,60%)`;
}

export function buildScale(root, scaleType) {
  const stepsMap = {
    major:      MAJOR_STEPS,
    minor:      MINOR_STEPS,
    pent_major: PENTATONIC_MAJOR_STEPS,
    pent_minor: PENTATONIC_MINOR_STEPS,
    mixolydian: MIXOLYDIAN_STEPS,
    dorian:     DORIAN_STEPS,
  };
  const steps = stepsMap[scaleType];
  if (!steps) return [];
  let cur = CHROMATIC.indexOf(root);
  const notes = [root];
  steps.slice(0, steps.length - 1).forEach(s => {
    cur = (cur + s) % 12;
    notes.push(CHROMATIC[cur]);
  });
  return notes;
}

const CHORD_SEMITONES = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dom7:  [0, 4, 7, 10],
  maj7:  [0, 4, 7, 11],
  min7:  [0, 3, 7, 10],
};

const CHORD_INTERVALS = {
  major: ['1', '3', '5'],
  minor: ['1', 'b3', '5'],
  dom7:  ['1', '3', '5', 'b7'],
  maj7:  ['1', '3', '5', '7'],
  min7:  ['1', 'b3', '5', 'b7'],
};

export function buildChord(root, quality) {
  const ri = CHROMATIC.indexOf(root);
  const semitones = CHORD_SEMITONES[quality] || CHORD_SEMITONES.major;
  const intervals = CHORD_INTERVALS[quality] || CHORD_INTERVALS.major;
  const notes = semitones.map(s => CHROMATIC[(ri + s) % 12]);
  return { root, quality, notes, intervals };
}

export function intervalToFunction(interval) {
  if (interval === '1')              return 'R';
  if (interval === '3' || interval === 'b3') return '3';
  if (interval === '5' || interval === 'b5') return '5';
  if (interval === '7' || interval === 'b7') return '7';
  return null;
}

// CAGED open-chord root index in CHROMATIC for each shape
const CAGED_OPEN = { C: 0, A: 9, G: 7, E: 4, D: 2 };

// Shape colors for Mode 1/2 (learning shapes): C=green A=blue G=yellow E=red D=purple
export const CAGED_COLORS = {
  C: '#2ecc71', A: '#3498db', G: '#f1c40f', E: '#e74c3c', D: '#9b59b6',
};

// Functional tone colors for Modes 3/4 (improvisation)
export const FUNC_COLORS = {
  R: '#d4a847', '3': '#e67e22', '5': '#3498db', '7': '#2ecc71',
};

// Returns the 5 CAGED shapes for a given root note.
// Each entry: { shape, barre, fretRange }
// barre: fret where the index finger (cejilla) is placed
// fretRange: [min, max] frets the shape spans
export function cagedShapeFor(root) {
  const ri = CHROMATIC.indexOf(root);
  return ['C', 'A', 'G', 'E', 'D'].map(shape => {
    const oi = CAGED_OPEN[shape];
    let barre = (ri - oi + 12) % 12;
    // barre=0 means the open-chord position; use 12 so it shows at the upper octave
    // and doesn't visually overlap with the E-shape barre-0 equivalent
    if (barre === 0) barre = 12;
    const fretRange = [barre, Math.min(barre + 4, 15)];
    return { shape, barre, fretRange };
  });
}

// Returns the [min, max] fret range a given CAGED shape covers for a root note.
export function fretsForCagedShape(shape, root) {
  const ri = CHROMATIC.indexOf(root);
  const oi = CAGED_OPEN[shape];
  let barre = (ri - oi + 12) % 12;
  if (barre === 0) barre = 12;
  return [barre, Math.min(barre + 4, 15)];
}

// Quality display helpers
export const QUALITY_LABELS = {
  major: 'Mayor', minor: 'Menor', dom7: '7', maj7: 'maj7', min7: 'm7',
};

export const QUALITY_SUFFIX = {
  major: '', minor: 'm', dom7: '7', maj7: 'maj7', min7: 'm7',
};

export function chordName(root, quality) {
  return root + (QUALITY_SUFFIX[quality] || '');
}
