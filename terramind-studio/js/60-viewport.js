/* TerraMind Studio — 3D viewport (three.js): layers, section clipping, picking, sketching, gizmo, labels. */
(function (TM) {
  'use strict';
  const VP = TM.VP = {};
  let renderer, scene, camera, controls, raycaster, O = { x: 0, y: 0, z: 0 };
  const objs = {}; // layer key → THREE.Object3D
  const clipPlanes = [], clipMats = [];
  VP.clipPlanes = clipPlanes;

  // Display state (persisted in prefs per project is overkill; kept in memory, applied on rebuild)
  VP.vis = { topo: true, holes: true, labels: true, colorBy: 'grade', strings: true, solids: true, bm: true, bmOpacity: 0.9, bmFilter: 'cog', pit: true, design: true, infill: true, topoOpacity: 0.32, topoMode: 'solid', contours: false, comps: false };
  VP.hidden = new Set(); // ids of individually hidden strings/solids/surfaces
  VP.slice = { axis: 'x', pos: 0, enabled: false, thick: 0 };

  const V3 = (x, y, z) => new THREE.Vector3(x - O.x, z - O.z, -(y - O.y));
  VP.V3 = V3;
  VP.toWorld = v => ({ x: v.x + O.x, y: -v.z + O.y, z: v.y + O.z });
  const clipMat = m => { m.clippingPlanes = clipPlanes; clipMats.push(m); return m; };

  VP.CMAPS = { gold: ['#4a3216', '#8a5715', '#cf8a1c', '#f2b740', '#fde9ad'], viridis: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'], turbo: ['#30123b', '#4686fb', '#1ae4b6', '#a2fc3c', '#fabb39', '#e4460a', '#7a0403'] };
  const hexRgb = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  VP.gmax = 3;
  VP.cmap = function (g, name) { const st = (VP.CMAPS[name || TM.P.settings.colormap] || VP.CMAPS.gold).map(hexRgb); const x = TM.clamp(g / VP.gmax, 0, 1) * (st.length - 1); const i = Math.min(Math.floor(x), st.length - 2), f = x - i; return [0, 1, 2].map(k => st[i][k] + (st[i + 1][k] - st[i][k]) * f); };
  VP.LITH_COLORS = ['#F2C94C', '#C0784A', '#7C8CE0', '#8E99AB', '#E57373', '#4DB6AC', '#BA68C8', '#90A4AE'];
  VP.lithColor = code => { const codes = VP.lithCodes(); const i = codes.indexOf(code); return i < 0 ? '#5b6577' : VP.LITH_COLORS[i % VP.LITH_COLORS.length]; };
  VP.lithCodes = () => { if (!VP._lc || VP._lcN !== TM.P.db.lith.length) { VP._lc = [...new Set(TM.P.db.lith.map(l => l.code))].sort(); VP._lcN = TM.P.db.lith.length; } return VP._lc; };

  VP.init = function (canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.localClippingEnabled = true;
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(42, 1, 1, 20000);
    controls = new THREE.OrbitControls(camera, canvas); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.screenSpacePanning = true;
    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x1a1408, 0.6)); const dl = new THREE.DirectionalLight(0xffffff, 0.7); dl.position.set(-400, 800, 300); scene.add(dl); scene.add(new THREE.AmbientLight(0xffffff, 0.18));
    raycaster = new THREE.Raycaster(); raycaster.params.Line.threshold = 3;
    new ResizeObserver(VP.resize).observe(canvas.parentElement); VP.resize();
    VP.bindPointer(canvas);
    const loop = () => { requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); VP.renderLabels(); VP.drawGizmo(); };
    loop();
  };
  VP.resize = function () { const el = renderer.domElement.parentElement; const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  VP.fit = function () {
    const e = TM.extents(); O = { x: Math.round(e.cx), y: Math.round(e.cy), z: Math.round(e.cz) };
    const s = e.size || 500; camera.position.copy(V3(e.cx + s * 0.75, e.cy - s * 0.85, e.cz + s * 0.75)); controls.target.copy(V3(e.cx, e.cy, e.z0 + (e.z1 - e.z0) * 0.45)); controls.update();
    camera.far = s * 20; camera.updateProjectionMatrix(); VP.slice.pos = VP.slice.pos || Math.round(e.cx);
  };
  VP.view = function (name) {
    const e = TM.extents(), s = e.size || 500, t = V3(e.cx, e.cy, e.cz); controls.target.copy(t);
    const d = { top: [0, 0, s * 1.6], north: [0, s * 1.6, 0], south: [0, -s * 1.6, 0], east: [s * 1.6, 0, 0], west: [-s * 1.6, 0, 0], iso: [s * .75, -s * .85, s * .75] }[name] || [s, -s, s];
    camera.position.copy(V3(e.cx + d[0], e.cy + d[1] + (name === 'top' ? -1 : 0), e.cz + d[2])); controls.update();
  };
  VP.screenshot = () => renderer.domElement.toDataURL('image/png');

  function dispose(key) { const o = objs[key]; if (!o) return; scene.remove(o); o.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach(m => { const i = clipMats.indexOf(m); if (i >= 0) clipMats.splice(i, 1); m.dispose(); }); }); delete objs[key]; }
  function put(key, o) { dispose(key); if (o) { objs[key] = o; scene.add(o); } }

  // ---------------------------------------------------------------- builders
  VP.rebuildAll = function () { VP.fit(); VP.buildGrid(); VP.buildSurfaces(); VP.buildHoles(); VP.buildStrings(); VP.buildSolids(); VP.buildBM(); VP.buildPit(); VP.buildDesign(); VP.buildBlast(); VP.buildInfill(); VP.applySlice(); };
  VP.buildGrid = function () {
    const e = TM.extents(), st = e.size > 1500 ? 500 : 100, pts = []; const x0 = Math.floor(e.x0 / st) * st, x1 = Math.ceil(e.x1 / st) * st, y0 = Math.floor(e.y0 / st) * st, y1 = Math.ceil(e.y1 / st) * st, z = e.z0 - 20;
    for (let x = x0; x <= x1; x += st) pts.push(V3(x, y0, z), V3(x, y1, z)); for (let y = y0; y <= y1; y += st) pts.push(V3(x0, y, z), V3(x1, y, z));
    put('grid', new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1f2a3d })));
  };
  VP.buildSurfaces = function () {
    Object.keys(objs).filter(k => k.startsWith('srf:')).forEach(dispose);
    for (const s of TM.P.surfaces) {
      TM.Surf.ensureTri(s); const tin = TM.Surf.tinOf(s); const n = s.pts.length / 3, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const v = V3(s.pts[i * 3], s.pts[i * 3 + 1], s.pts[i * 3 + 2]); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; const f = (s.pts[i * 3 + 2] - tin.z0) / Math.max(tin.z1 - tin.z0, 1); const a = [0.15, 0.19, 0.16], b = [0.45, 0.42, 0.31]; for (let k = 0; k < 3; k++) col[i * 3 + k] = a[k] + (b[k] - a[k]) * f; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(new THREE.BufferAttribute(new Uint32Array(s.tri), 1)); geo.computeVertexNormals();
      const g = new THREE.Group(); g.userData = { kind: 'surface', ref: s };
      const solid = new THREE.Mesh(geo, clipMat(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: VP.vis.topoOpacity, side: THREE.DoubleSide, depthWrite: false }))); solid.renderOrder = 1; solid.userData = { kind: 'surface', ref: s };
      const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), clipMat(new THREE.LineBasicMaterial({ color: 0x5b6b56, transparent: true, opacity: 0.18 })));
      g.add(solid, wire); g.userData.solid = solid; g.userData.wire = wire;
      if (VP.vis.contours) { const c = TM.Surf.contours(tin, 5), pts = []; for (const lv of c) for (const L of lv.lines) for (let i = 1; i < L.length; i++) pts.push(V3(...L[i - 1]).add(new THREE.Vector3(0, 0.3, 0)), V3(...L[i]).add(new THREE.Vector3(0, 0.3, 0))); g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), clipMat(new THREE.LineBasicMaterial({ color: 0xA7B1C2, transparent: true, opacity: 0.45 })))); }
      put('srf:' + s.id, g);
    }
    VP.applyVis();
  };
  VP.buildHoles = function () {
    const holes = TM.rt.holes; const cnt = holes.reduce((a, h) => a + Math.max(h.samples.length, 1), 0); if (!holes.length) { dispose('holes'); return; }
    const g = new THREE.Group(); const geo = new THREE.CylinderGeometry(1.2, 1.2, 1, 6); const mesh = new THREE.InstancedMesh(geo, clipMat(new THREE.MeshLambertMaterial({ color: 0xffffff })), cnt);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color(); let k = 0; const index = [];
    const cap = TM.P.settings.topCut; const trace = [];
    for (const h of holes) {
      for (let i = 1; i < h.st.length; i++) trace.push(V3(h.st[i - 1].x, h.st[i - 1].y, h.st[i - 1].z), V3(h.st[i].x, h.st[i].y, h.st[i].z));
      for (const s of h.samples) {
        const a = TM.Drill.posAt(h.st, s.from), b = TM.Drill.posAt(h.st, s.to); const va = V3(...a), vb = V3(...b); const dir = vb.clone().sub(va); const len = dir.length(); if (len < 1e-6) continue;
        q.setFromUnitVectors(up, dir.normalize()); m4.compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, len * 0.97, 1)); mesh.setMatrixAt(k, m4);
        if (VP.vis.colorBy === 'lith') c.set(VP.lithColor(TM.Drill.lithAt(h, (s.from + s.to) / 2))); else { const gv = cap ? Math.min(s.g, cap) : s.g; if (!isFinite(gv) || gv < 0.15) c.set('#3a4558'); else c.setRGB(...VP.cmap(gv)); }
        mesh.setColorAt(k, c); index.push([h, s]); k++;
      }
      const col = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 1.2, 12), clipMat(new THREE.MeshBasicMaterial({ color: 0xE6EAF1 }))); col.position.copy(V3(h.collar.x, h.collar.y, h.collar.z + 0.6)); g.add(col);
    }
    mesh.count = k; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.userData = { kind: 'holes', index };
    g.add(mesh, new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(trace), clipMat(new THREE.LineBasicMaterial({ color: 0x8a94a6, transparent: true, opacity: 0.5 }))));
    g.userData.mesh = mesh; put('holes', g); VP.applyVis();
  };
  VP.buildStrings = function () {
    Object.keys(objs).filter(k => k.startsWith('str:')).forEach(dispose);
    for (const s of TM.P.strings) {
      if (s.pts.length < 2) continue; const P = s.closed ? s.pts.concat([s.pts[0]]) : s.pts; const pts = P.map(p => V3(p[0], p[1], p[2]));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), clipMat(new THREE.LineBasicMaterial({ color: new THREE.Color(s.color || '#F59E0B') }))); line.userData = { kind: 'string', ref: s };
      put('str:' + s.id, line);
    }
    VP.applyVis();
  };
  VP.buildSolids = function () {
    Object.keys(objs).filter(k => k.startsWith('sol:')).forEach(dispose);
    for (const s of TM.P.solids) {
      const n = s.pos.length / 3, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = V3(s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(new THREE.BufferAttribute(new Uint32Array(s.idx), 1)); geo.computeVertexNormals();
      const g = new THREE.Group(); const color = new THREE.Color(s.color || '#10B981');
      const mesh = new THREE.Mesh(geo, clipMat(new THREE.MeshPhongMaterial({ color, transparent: true, opacity: s.opacity != null ? s.opacity : 0.25, side: THREE.DoubleSide, depthWrite: false, shininess: 30 }))); mesh.renderOrder = 3; mesh.userData = { kind: 'solid', ref: s };
      const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), clipMat(new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.08 })));
      g.add(mesh, wire); g.userData = { kind: 'solid', ref: s }; put('sol:' + s.id, g);
    }
    VP.applyVis();
  };
  VP.buildBM = function () {
    const bm = TM.P.bm; if (!bm) { dispose('bm'); return; } const d = bm.def;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(d.dx * 0.92, d.dz * 0.92, d.dy * 0.92), clipMat(new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: VP.vis.bmOpacity < 1, opacity: VP.vis.bmOpacity })), Math.max(1, bm.estimated || 1));
    mesh.count = 0; mesh.frustumCulled = false; mesh.userData = { kind: 'bm', vis: new Int32Array(Math.max(1, bm.estimated || 1)) }; put('bm', mesh); VP.filterBM();
  };
  VP.filterBM = function () {
    const bm = TM.P.bm, mesh = objs.bm; if (!bm || !mesh) return; const d = bm.def, cog = TM.P.settings.cutoff, m4 = new THREE.Matrix4(), c = new THREE.Color(); let k = 0; const cap = mesh.userData.vis.length;
    const shell = VP.vis.bmFilter === 'pit' ? TM.Pit && TM.Pit.active() : null;
    for (let id = 0; id < bm.N && k < cap; id++) {
      const g = bm.grade[id]; if (!(g >= cog)) continue;
      const i = id % d.nx, j = Math.floor(id / d.nx) % d.ny, kk = Math.floor(id / (d.nx * d.ny)); const x = d.x0 + (i + .5) * d.dx, y = d.y0 + (j + .5) * d.dy, z = d.z0 + (kk + .5) * d.dz;
      if (shell && !(z > shell.floorAt(x, y))) continue;
      const v = V3(x, y, z); m4.makeTranslation(v.x, v.y, v.z); mesh.setMatrixAt(k, m4);
      if (VP.vis.bmColor === 'class') c.set(TM.Est.CLASS[bm.cls[id]] ? TM.Est.CLASS[bm.cls[id]].c : '#5b6577'); else c.setRGB(...VP.cmap(g)); mesh.setColorAt(k, c); mesh.userData.vis[k] = id; k++;
    }
    mesh.count = k; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; VP.bmCount = k; VP.applyVis();
  };
  VP.buildPit = function () {
    dispose('pit'); dispose('design'); const pit = TM.P.pit; if (!pit || !pit.shells || pit.selected == null) return;
    const lg = pit.lg, floor = pit.shells[pit.selected].floor; const hm = TM.Mine.pitSurface(lg, floor);
    const pos = [], idx = [], ins = [];
    for (let j = 0; j < hm.ny; j++) for (let i = 0; i < hm.nx; i++) { const x = hm.x0 + i * hm.cs, y = hm.y0 + j * hm.cs, z = hm.z[i + hm.nx * j], t = TM.topoZ(x, y); const v = V3(x, y, z - 0.2); pos.push(v.x, v.y, v.z); ins.push(isFinite(t) ? z < t - 0.5 : false); }
    for (let j = 0; j < hm.ny - 1; j++) for (let i = 0; i < hm.nx - 1; i++) { const a = i + hm.nx * j, b = a + 1, c = a + hm.nx, d = c + 1; if (ins[a] || ins[b] || ins[c] || ins[d]) idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const g = new THREE.Group(); const sh = new THREE.Mesh(geo, clipMat(new THREE.MeshLambertMaterial({ color: 0x3B82F6, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }))); sh.renderOrder = 2; g.add(sh);
    g.add(new THREE.LineSegments(new THREE.WireframeGeometry(geo), clipMat(new THREE.LineBasicMaterial({ color: 0x3B82F6, transparent: true, opacity: 0.12 })))); put('pit', g);
    if (pit.design) { const pts = []; for (const lv of pit.design) for (const L of lv.lines) for (let i = 1; i < L.length; i++) pts.push(V3(...L[i - 1]), V3(...L[i])); put('design', new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), clipMat(new THREE.LineBasicMaterial({ color: 0x7AA9F8 })))); }
    VP.applyVis();
  };
  VP.buildInfill = function () {
    dispose('infill'); const L = TM.P.settings.infill || []; if (!L.length) return; const g = new THREE.Group();
    for (const h of L) { const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(...h.collar), V3(...h.end)]), clipMat(new THREE.LineDashedMaterial({ color: 0x67E8F9, dashSize: 6, gapSize: 4 }))); ln.computeLineDistances(); g.add(ln); const s = new THREE.Mesh(new THREE.SphereGeometry(4, 14, 10), clipMat(new THREE.MeshBasicMaterial({ color: 0x67E8F9, transparent: true, opacity: 0.6 }))); s.position.copy(V3(...h.target)); g.add(s); }
    put('infill', g); VP.applyVis();
  };
  VP.sketchPreview = function (pts, closed) {
    dispose('sketch'); if (!pts || !pts.length) return; const g = new THREE.Group(); const P = closed ? pts.concat([pts[0]]) : pts;
    if (P.length > 1) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(P.map(p => V3(p[0], p[1], p[2] + 0.8))), new THREE.LineBasicMaterial({ color: 0xF59E0B })));
    for (const p of pts) { const m = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xF59E0B })); m.position.copy(V3(p[0], p[1], p[2] + 0.8)); g.add(m); }
    put('sketch', g);
  };


  VP.buildDesign = function () {
    dispose('designSurf'); dispose('designStr'); const D = TM.P.design; if (!D) return;
    const m = TM.Design.toMesh(D, Math.max(1, Math.round(2 / D.grid.res))), n = m.pos.length / 3, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const v = V3(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2] + 0.15); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(new THREE.BufferAttribute(m.idx, 1)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, clipMat(new THREE.MeshLambertMaterial({ color: D.kind === 'pit' ? 0x8fa6c4 : 0xb59a6a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }))); mesh.renderOrder = 2; mesh.userData = { kind: 'design', ref: { name: D.kind === 'pit' ? 'Pit design' : 'Dump design' } }; put('designSurf', mesh);
    const pts = [], ramp = []; for (const s of D.strings) { const arr = s.kind === 'ramp' ? ramp : pts; for (let i = 1; i < s.pts.length; i++) arr.push(V3(...s.pts[i - 1]).add(new THREE.Vector3(0, 0.3, 0)), V3(...s.pts[i]).add(new THREE.Vector3(0, 0.3, 0))); }
    const g = new THREE.Group(); g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), clipMat(new THREE.LineBasicMaterial({ color: D.kind === 'pit' ? 0x34D399 : 0xF2B740 }))));
    if (ramp.length) g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ramp), clipMat(new THREE.LineBasicMaterial({ color: 0xF97316 })))); put('designStr', g); VP.applyVis();
  };
  VP.buildBlast = function () {
    dispose('blast'); const B = TM.P.blast; if (!B || !B.holes.length) return; const pts = [], col = []; const g = new THREE.Group();
    for (const h of B.holes) { pts.push(V3(h.x, h.y, h.z), V3(h.ex, h.ey, h.ez)); }
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), clipMat(new THREE.LineBasicMaterial({ color: 0xF472B6 }))));
    g.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(B.holes.map(h => V3(h.x, h.y, h.z + 0.3))), new THREE.PointsMaterial({ color: 0xF472B6, size: 6, sizeAttenuation: false })));
    put('blast', g); VP.applyVis();
  };
  VP.applyVis = function () {
    const v = VP.vis;
    for (const k in objs) {
      const o = objs[k];
      if (k.startsWith('srf:')) { const id = k.slice(4); o.visible = v.topo && !VP.hidden.has(id); o.userData.solid.visible = v.topoMode === 'solid'; o.userData.solid.material.opacity = v.topoOpacity; o.userData.wire.material.opacity = v.topoMode === 'solid' ? 0.12 : 0.55; }
      else if (k === 'holes') o.visible = v.holes;
      else if (k.startsWith('str:')) o.visible = v.strings && !VP.hidden.has(k.slice(4));
      else if (k.startsWith('sol:')) o.visible = v.solids && !VP.hidden.has(k.slice(4));
      else if (k === 'bm') { o.visible = v.bm; o.material.opacity = v.bmOpacity; o.material.transparent = v.bmOpacity < 1; }
      else if (k === 'pit') o.visible = v.pit;
      else if (k === 'design') o.visible = v.design;
      else if (k === 'infill') o.visible = v.infill;
      else if (k === 'designSurf' || k === 'designStr') o.visible = v.designP !== false;
      else if (k === 'blast') o.visible = v.blast !== false;
      else if (k === 'grid') o.visible = v.grid !== false;
    }
  };

  // ---------------------------------------------------------------- section clipping
  VP.applySlice = function () {
    const s = VP.slice; clipPlanes.length = 0;
    if (s.enabled) {
      const n = s.axis === 'x' ? new THREE.Vector3(-1, 0, 0) : s.axis === 'y' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, -1, 0);
      const c = s.axis === 'x' ? s.pos - O.x : s.axis === 'y' ? s.pos - O.y : s.pos - O.z; clipPlanes.push(new THREE.Plane(n, c));
      if (s.thick > 0) clipPlanes.push(new THREE.Plane(n.clone().negate(), -(c - s.thick)));
    }
    clipMats.forEach(m => m.needsUpdate = true);
    dispose('sliceFrame');
    if (s.enabled) { const e = TM.extents(), p = s.pos, z0 = e.z0 - 20, z1 = e.z1 + 10; let pts; if (s.axis === 'x') pts = [V3(p, e.y0, z0), V3(p, e.y1, z0), V3(p, e.y1, z1), V3(p, e.y0, z1)]; else if (s.axis === 'y') pts = [V3(e.x0, p, z0), V3(e.x1, p, z0), V3(e.x1, p, z1), V3(e.x0, p, z1)]; else pts = [V3(e.x0, e.y0, p), V3(e.x1, e.y0, p), V3(e.x1, e.y1, p), V3(e.x0, e.y1, p)]; pts.push(pts[0]); put('sliceFrame', new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xF59E0B }))); }
    TM.emit('slice', s);
  };
  VP.passesClip = p => clipPlanes.every(pl => pl.distanceToPoint(p) >= 0);

  // ---------------------------------------------------------------- picking & sketching
  const mouse = new THREE.Vector2();
  VP.pick = function (ev, list) {
    const r = renderer.domElement.getBoundingClientRect(); mouse.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1); raycaster.setFromCamera(mouse, camera);
    const targets = []; for (const k in objs) { if (!objs[k].visible) continue; if (list && !list.some(p => k.startsWith(p))) continue; objs[k].traverse(o => { if (o.isMesh && o.visible !== false) targets.push(o); }); }
    return raycaster.intersectObjects(targets, false).filter(h => VP.passesClip(h.point));
  };
  VP.sketch = null; // {pts:[], onDone}
  VP.tool = null; // active interactive tool: {down(e,ctx), move(e,ctx), up(e,ctx), key(e)} → return true to consume
  VP.three = () => ({ renderer, camera, controls, scene, raycaster });
  VP.objs = objs; VP.put = put; VP.dispose = dispose;
  // ray → horizontal plane at RL z (world coords)
  VP.rayToZ = function (ev, z) { const r = renderer.domElement.getBoundingClientRect(); mouse.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1); raycaster.setFromCamera(mouse, camera); const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(z - O.z)); const hit = new THREE.Vector3(); return raycaster.ray.intersectPlane(pl, hit) ? VP.toWorld(hit) : null; };
  // world → screen px
  VP.toScreen = function (x, y, z) { const v = V3(x, y, z).project(camera); const r = renderer.domElement.getBoundingClientRect(); return { x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height, front: v.z < 1 }; };
  VP.surfacePoint = function (ev) { const h = VP.pick(ev, ['srf:', 'sol:', 'pit', 'design'])[0]; return h ? VP.toWorld(h.point) : null; };
  VP.bindPointer = function (cv) {
    let down = null, pend = false;
    const ctxOf = e => { const r = cv.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; if (VP.tool && VP.tool.down && VP.tool.down(e, ctxOf(e))) { controls.enabled = false; cv.setPointerCapture(e.pointerId); } });
    cv.addEventListener('pointermove', e => {
      if (VP.tool && VP.tool.move && VP.tool.move(e, ctxOf(e))) return;
      if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; const h = VP.pick(e, ['srf:', 'bm', 'sol:', 'pit'])[0]; TM.emit('hover', h ? { p: VP.toWorld(h.point), hit: h } : null); });
    });
    cv.addEventListener('pointerup', e => {
      const click = down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) <= 4; controls.enabled = true;
      if (VP.tool && VP.tool.up && VP.tool.up(e, Object.assign(ctxOf(e), { click }))) return;
      if (!click) return;
      if (VP.sketch) { const h = VP.pick(e, ['srf:', 'sol:', 'pit'])[0]; if (h) { const p = VP.toWorld(h.point); VP.sketch.pts.push([+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)]); VP.sketchPreview(VP.sketch.pts, false); TM.emit('sketch', VP.sketch); } return; }
      const h = VP.pick(e, ['bm', 'holes', 'sol:', 'srf:', 'pit'])[0]; if (!h) return; TM.emit('pick', VP.describeHit(h));
    });
    cv.addEventListener('dblclick', e => { if (VP.tool && VP.tool.dbl && VP.tool.dbl(e)) return; if (VP.sketch && VP.sketch.onDone) VP.sketch.onDone(); });
  };
  VP.describeHit = function (h) {
    const o = h.object, p = VP.toWorld(h.point);
    if (o === objs.bm) { const id = o.userData.vis[h.instanceId]; return { kind: 'block', id, p }; }
    if (objs.holes && o === objs.holes.userData.mesh) { const [hole, s] = o.userData.index[h.instanceId]; return { kind: 'sample', hole, s, p }; }
    return { kind: o.userData.kind || 'object', ref: o.userData.ref, p };
  };

  // ---------------------------------------------------------------- labels & gizmo
  VP.labelsEl = null;
  VP.renderLabels = function () {
    const box = VP.labelsEl; if (!box || !TM.P) return; const w = box.clientWidth, h = box.clientHeight; const items = [];
    if (VP.vis.holes && VP.vis.labels) for (const hh of TM.rt.holes) items.push({ p: V3(hh.collar.x, hh.collar.y, hh.collar.z + 5), t: hh.id, cls: VP.flagged && VP.flagged.has(hh.id) ? 'flag' : '' });
    if (VP.vis.infill) for (const hh of TM.P.settings.infill || []) items.push({ p: V3(hh.collar[0], hh.collar[1], hh.collar[2] + 5), t: hh.id, cls: 'ph' });
    if (box.childElementCount !== items.length) box.innerHTML = items.map(() => '<span class="lbl"></span>').join('');
    const v = new THREE.Vector3();
    items.forEach((it, i) => { const el = box.children[i]; v.copy(it.p).project(camera); const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && VP.passesClip(it.p); el.hidden = !vis; if (!vis) return; el.style.left = ((v.x + 1) / 2 * w) + 'px'; el.style.top = ((1 - v.y) / 2 * h) + 'px'; if (el.textContent !== it.t) el.textContent = it.t; el.className = 'lbl ' + it.cls; });
  };
  VP.gizmoEl = null;
  VP.drawGizmo = function () {
    const cv = VP.gizmoEl; if (!cv) return; const g = cv.getContext('2d'), s = cv.width, c = s / 2; g.clearRect(0, 0, s, s);
    g.fillStyle = 'rgba(11,15,25,.72)'; g.strokeStyle = '#2B3648'; g.lineWidth = 2; g.beginPath(); g.arc(c, c, c - 3, 0, Math.PI * 2); g.fill(); g.stroke();
    const qi = camera.quaternion.clone().invert();
    const ax = [{ v: new THREE.Vector3(1, 0, 0), l: 'E', col: '#F87171' }, { v: new THREE.Vector3(0, 0, -1), l: 'N', col: '#34D399' }, { v: new THREE.Vector3(0, 1, 0), l: 'Z', col: '#7AA9F8' }].map(a => (a.p = a.v.clone().applyQuaternion(qi), a)).sort((a, b) => a.p.z - b.p.z);
    g.font = '600 22px "JetBrains Mono",monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const a of ax) { const x = c + a.p.x * (c - 30), y = c - a.p.y * (c - 30); g.globalAlpha = a.p.z < -0.2 ? 0.45 : 1; g.strokeStyle = a.col; g.lineWidth = 4; g.beginPath(); g.moveTo(c, c); g.lineTo(x, y); g.stroke(); g.fillStyle = a.col; g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.fill(); g.fillStyle = '#0B0F19'; g.fillText(a.l, x, y + 1); }
    g.globalAlpha = 1;
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
