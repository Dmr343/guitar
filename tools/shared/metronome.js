export class Metronome {
  constructor({ bpm = 80, beatsPerChord = 4, onBeat, onChordChange } = {}) {
    this._bpm          = bpm;
    this._beatsPerChord = beatsPerChord;
    this._onBeat       = onBeat       || (() => {});
    this._onChordChange = onChordChange || (() => {});
    this._playing  = false;
    this._beats    = 0;
    this._chordIdx = 0;
    this._timer    = null;
    this._startTime = 0;
    this._audioCtx  = null;
  }

  get playing()   { return this._playing; }
  get chordIdx()  { return this._chordIdx; }
  get bpm()       { return this._bpm; }

  _getAudioCtx() {
    if (!this._audioCtx) {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this._audioCtx;
  }

  _playClick() {
    try {
      const ctx = this._getAudioCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  }

  _tick() {
    if (!this._playing) return;
    this._beats++;
    this._playClick();
    this._onBeat(this._beats);

    if (this._beats > 1 && (this._beats - 1) % this._beatsPerChord === 0) {
      this._chordIdx++;
      this._onChordChange(this._chordIdx);
    }

    const elapsed   = performance.now() - this._startTime;
    const nextDelay = (60000 / this._bpm) * (this._beats + 1) - elapsed;
    this._timer = setTimeout(() => this._tick(), Math.max(0, nextDelay));
  }

  start() {
    if (this._playing) return;
    this._playing   = true;
    this._beats     = 0;
    this._chordIdx  = 0;
    this._startTime = performance.now();
    this._tick();
  }

  stop() {
    this._playing = false;
    clearTimeout(this._timer);
  }

  setBPM(bpm) {
    this._bpm = Math.max(40, Math.min(220, bpm));
  }

  setBeatsPerChord(n) {
    this._beatsPerChord = Math.max(1, n);
  }

  reset() {
    this.stop();
    this._beats    = 0;
    this._chordIdx = 0;
  }
}
