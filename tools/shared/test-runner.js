// Test runner — plain script. Attaches to window.GuitarShared.testRunner.
(function (G) {
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
      const container = (typeof document !== 'undefined')
        ? document.getElementById(containerId || 'test-results')
        : null;
      let totalPass = 0, totalFail = 0;
      this._suites.forEach(suite => {
        suite.tests.forEach(t => t.ok ? totalPass++ : totalFail++);
      });
      if (!container) {
        // CLI / node mode — return result object
        return { totalPass, totalFail, suites: this._suites };
      }
      const html = this._suites.map(suite => {
        const allOk = suite.tests.every(t => t.ok);
        const tests = suite.tests.map(t => {
          if (t.ok) return `<div class="test pass">✓ ${t.name}</div>`;
          return `<div class="test fail">✗ ${t.name}<pre>${t.error}</pre></div>`;
        }).join('');
        return `<details class="suite ${allOk ? 'suite-pass' : 'suite-fail'}" ${allOk ? '' : 'open'}>
          <summary>${allOk ? '✓' : '✗'} ${suite.name} (${suite.tests.filter(t => t.ok).length}/${suite.tests.length})</summary>
          ${tests}
        </details>`;
      }).join('');
      container.innerHTML = `<div class="summary ${totalFail ? 'fail' : 'pass'}">${totalPass} passed · ${totalFail} failed</div>${html}`;
      return { totalPass, totalFail, suites: this._suites };
    },
  };

  G.testRunner = T;
})(typeof window !== 'undefined'
    ? (window.GuitarShared = window.GuitarShared || {})
    : (globalThis.GuitarShared = globalThis.GuitarShared || {}));
