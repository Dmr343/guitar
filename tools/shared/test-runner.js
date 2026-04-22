const T = {
  _suites: [],
  _current: null,

  describe(name, fn) {
    this._current = { name, tests: [] };
    this._suites.push(this._current);
    try { fn(); } catch (e) {
      this._current.tests.push({ name: 'SETUP ERROR', ok: false, error: e.message });
    }
    this._current = null;
  },

  it(name, fn) {
    const suite = this._current;
    if (!suite) return;
    try { fn(); suite.tests.push({ name, ok: true }); }
    catch (e) { suite.tests.push({ name, ok: false, error: e.message }); }
  },

  assertEq(actual, expected, msg) {
    if (actual !== expected) throw new Error(
      `${msg || ''}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`
    );
  },

  assertArrayEq(actual, expected, msg) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a !== e) throw new Error(
      `${msg || ''}\n  expected: ${e}\n  actual:   ${a}`
    );
  },

  assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
  },

  run(containerId) {
    const container = document.getElementById(containerId || 'test-results');
    if (!container) return;
    let totalPass = 0, totalFail = 0;
    const html = this._suites.map(suite => {
      const allOk = suite.tests.every(t => t.ok);
      const tests = suite.tests.map(t => {
        if (t.ok) { totalPass++; return `<div class="test pass">✓ ${t.name}</div>`; }
        totalFail++;
        return `<div class="test fail">✗ ${t.name}<pre>${t.error}</pre></div>`;
      }).join('');
      return `<details class="suite ${allOk ? 'suite-pass' : 'suite-fail'}" ${allOk ? '' : 'open'}>
        <summary>${allOk ? '✓' : '✗'} ${suite.name} (${suite.tests.filter(t => t.ok).length}/${suite.tests.length})</summary>
        ${tests}
      </details>`;
    }).join('');
    container.innerHTML = `<div class="summary ${totalFail ? 'fail' : 'pass'}">${totalPass} passed · ${totalFail} failed</div>${html}`;
  },
};

export default T;
