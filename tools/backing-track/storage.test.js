// Tests para storage — IIFE, sin DOM. Usa un adapter en memoria,
// igual que persistence.test.js del Atlas usa MemoryStorageAdapter.
(function (G, W) {
  'use strict';
  const T = G.testRunner;
  const BT = W.BackingTrack || {};
  if (!BT.createStorage || !BT.userLibrary) {
    console.error('storage / userLibrary no cargados'); return;
  }

  function memAdapter() {
    const m = {};
    return {
      _m: m,
      getItem: k => (k in m ? m[k] : null),
      setItem: (k, v) => { m[k] = String(v); },
      removeItem: k => { delete m[k]; },
    };
  }
  function fresh() {
    BT.userLibrary.replaceAll([]);
    return BT.createStorage({ storage: memAdapter() });
  }
  const SNAP = {
    progression: [{ root: 'C', quality: 'maj7', bars: 2 }],
    tempo: 120, loopEnabled: true, mode: 'practica',
    tracks: [{ id: 't1', tipo: 'bajo', presetId: 'bajoRedondo' }],
  };

  T.describe('storage — proyectos', () => {
    T.it('guarda y carga un proyecto', () => {
      const s = fresh();
      const id = s.saveProject('Mi blues', SNAP);
      const loaded = s.loadProject(id);
      T.assertEq(loaded.tempo, 120);
      T.assertEq(loaded.progression[0].root, 'C');
    });
    T.it('listProjects devuelve id y nombre', () => {
      const s = fresh();
      s.saveProject('Uno', SNAP);
      s.saveProject('Dos', SNAP);
      T.assertEq(s.listProjects().length, 2);
      T.assertEq(s.listProjects()[0].nombre, 'Uno');
    });
    T.it('guardar con un nombre existente reemplaza el proyecto', () => {
      const s = fresh();
      s.saveProject('Mismo', SNAP);
      s.saveProject('Mismo', Object.assign({}, SNAP, { tempo: 90 }));
      T.assertEq(s.listProjects().length, 1);
      T.assertEq(s.loadProject(s.listProjects()[0].id).tempo, 90);
    });
    T.it('borra un proyecto', () => {
      const s = fresh();
      const id = s.saveProject('Borrar', SNAP);
      s.deleteProject(id);
      T.assertEq(s.listProjects().length, 0);
    });
    T.it('loadProject de un id inexistente devuelve null', () => {
      T.assertEq(fresh().loadProject('no-existe'), null);
    });
  });

  T.describe('storage — librería de presets del usuario', () => {
    T.it('persiste y recupera la librería', () => {
      const s = fresh();
      BT.userLibrary.add({ nombre: 'Mi bajo', tipo: 'bajo', motor: 'synth', config: {} });
      s.saveLibrary();
      BT.userLibrary.replaceAll([]);   // simula recarga de la app
      T.assertEq(BT.userLibrary.getAll().length, 0);
      s.loadLibrary();
      T.assertEq(BT.userLibrary.getAll().length, 1);
      T.assertEq(BT.userLibrary.getAll()[0].nombre, 'Mi bajo');
    });
  });

  T.describe('storage — sesión actual', () => {
    T.it('guarda y recupera la sesión', () => {
      const s = fresh();
      s.saveSession(SNAP);
      T.assertEq(s.loadSession().tempo, 120);
    });
    T.it('loadSession sin sesión guardada devuelve null', () => {
      T.assertEq(fresh().loadSession(), null);
    });
    T.it('clearSession borra la sesión', () => {
      const s = fresh();
      s.saveSession(SNAP);
      s.clearSession();
      T.assertEq(s.loadSession(), null);
    });
  });

  T.describe('storage — exportar / importar', () => {
    T.it('exportAll produce JSON con librería y proyectos', () => {
      const s = fresh();
      BT.userLibrary.add({ nombre: 'P', tipo: 'pad', motor: 'synth', config: {} });
      s.saveProject('Proj', SNAP);
      const json = JSON.parse(s.exportAll());
      T.assertEq(json.library.length, 1);
      T.assertEq(json.projects.length, 1);
    });
    T.it('importAll restaura librería y proyectos', () => {
      const origen = fresh();
      BT.userLibrary.add({ nombre: 'X', tipo: 'lead', motor: 'synth', config: {} });
      origen.saveProject('Y', SNAP);
      const json = origen.exportAll();

      const destino = fresh();   // resetea userLibrary
      T.assertEq(destino.importAll(json), true);
      T.assertEq(BT.userLibrary.getAll().length, 1);
      T.assertEq(destino.listProjects().length, 1);
    });
    T.it('importAll con JSON inválido devuelve false', () => {
      T.assertEq(fresh().importAll('{no es json'), false);
    });
  });

  T.describe('storage — robustez y migración', () => {
    T.it('datos corruptos en una clave caen a un valor vacío', () => {
      const adapter = memAdapter();
      adapter._m['backing_track_projects'] = '{roto';
      const s = BT.createStorage({ storage: adapter });
      T.assertEq(s.listProjects().length, 0);
    });
    T.it('datos sin __v se aceptan (migración a v1)', () => {
      const adapter = memAdapter();
      adapter._m['backing_track_projects'] = JSON.stringify({
        projects: [{ id: 'a', nombre: 'Viejo', data: SNAP }],
      });
      const s = BT.createStorage({ storage: adapter });
      T.assertEq(s.listProjects().length, 1);
    });
  });

  T.describe('storage — migración v1→v2 (volumen perceptual)', () => {
    function v1Snap(vol) {
      return {
        progression: [{ root: 'C', quality: 'maj7', bars: 1 }],
        tempo: 100,
        tracks: [{ id: 't1', tipo: 'bajo', volumen: vol }],
      };
    }
    T.it('sesión v1: volumen 0.64 (ganancia) → 0.8 (slider, √v)', () => {
      const adapter = memAdapter();
      adapter._m['backing_track_session'] = JSON.stringify({
        __v: 1, session: v1Snap(0.64),
      });
      const s = BT.createStorage({ storage: adapter });
      const vol = s.loadSession().tracks[0].volumen;
      T.assert(Math.abs(vol - 0.8) < 1e-9, 'volumen ' + vol);
    });
    T.it('proyectos v1 también migran', () => {
      const adapter = memAdapter();
      adapter._m['backing_track_projects'] = JSON.stringify({
        __v: 1, projects: [{ id: 'a', nombre: 'V', data: v1Snap(0.25) }],
      });
      const s = BT.createStorage({ storage: adapter });
      T.assertEq(s.loadProject('a').tracks[0].volumen, 0.5);
    });
    T.it('datos v2 no se tocan', () => {
      const adapter = memAdapter();
      adapter._m['backing_track_session'] = JSON.stringify({
        __v: 2, session: v1Snap(0.64),
      });
      const s = BT.createStorage({ storage: adapter });
      T.assertEq(s.loadSession().tracks[0].volumen, 0.64);
    });
    T.it('lo que se guarda queda marcado v2 y no re-migra', () => {
      const adapter = memAdapter();
      const s = BT.createStorage({ storage: adapter });
      s.saveSession(v1Snap(0.5));   // guardado nuevo = ya en escala slider
      T.assertEq(s.loadSession().tracks[0].volumen, 0.5);
      T.assertEq(JSON.parse(adapter._m['backing_track_session']).__v, 2);
    });
    T.it('pistas sin volumen numérico quedan intactas', () => {
      const adapter = memAdapter();
      const snap = v1Snap(0.64);
      snap.tracks.push({ id: 't2', tipo: 'pad' });
      adapter._m['backing_track_session'] = JSON.stringify({ __v: 1, session: snap });
      const s = BT.createStorage({ storage: adapter });
      T.assertEq(s.loadSession().tracks[1].volumen, undefined);
    });
  });

})(
  (typeof window !== 'undefined' ? window : globalThis).GuitarShared,
  (typeof window !== 'undefined' ? window : globalThis)
);
