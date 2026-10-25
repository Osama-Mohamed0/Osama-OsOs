/* TerraMind Studio — AI copilot: tool schemas, dispatcher, LLM providers (Claude / OpenAI / Gemini), offline parser, auditor. */
(function (TM) {
  'use strict';
  const AI = TM.AI = {}; const L = TM.L, fmt = TM.fmt, esc = TM.esc;

  // ---------------------------------------------------------------- tool schemas (shared by all providers)
  const obj = (props, req = []) => ({ type: 'object', properties: props, required: req, additionalProperties: false });
  AI.TOOLS = [
    { name: 'get_project_summary', description: 'Return the current project state: drillhole statistics, top-cut, variogram, block model, pit, economics and live KPIs. Call this first when you need numbers.', input_schema: obj({}) },
    { name: 'filter_block_model', description: 'Set the cut-off grade (g/t) used to display blocks and to compute ore tonnage, grade, waste, strip ratio and NPV. Optionally change the colour map.', input_schema: obj({ cutoff_grade: { type: 'number', description: 'cut-off grade in g/t' }, colormap: { type: 'string', enum: ['gold', 'viridis', 'turbo'] } }, ['cutoff_grade']) },
    { name: 'audit_drillholes', description: 'QA/QC the drillhole database: apply an assay top-cut (0 = remove top-cut) and optionally fix overlapping/duplicate intervals. Re-estimation is needed afterwards for the block model to reflect it.', input_schema: obj({ apply_top_cut: { type: 'number' }, fix_overlaps: { type: 'boolean' } }, ['apply_top_cut', 'fix_overlaps']) },
    { name: 'validate_database', description: 'Run all database validation checks and return counts and the first issues.', input_schema: obj({}) },
    { name: 'run_estimation', description: 'Estimate the block model from composites. Ordinary kriging uses the fitted variogram (auto-fitted if missing).', input_schema: obj({ method: { type: 'string', enum: ['ok', 'idw', 'nn'] }, block_size: { type: 'number', description: 'cubic block size in metres (default 5)' } }, ['method']) },
    { name: 'run_pit_optimization', description: 'Lerchs-Grossmann (max-flow) nested pit shells for the given slope and economics; selects the best-NPV shell.', input_schema: obj({ slope_angle: { type: 'number' }, gold_price_oz: { type: 'number' }, mining_cost_t: { type: 'number' }, processing_cost_t: { type: 'number' } }, ['slope_angle']) },
    { name: 'select_pit_shell', description: 'Select a nested pit shell by number (1 = smallest).', input_schema: obj({ shell: { type: 'integer' } }, ['shell']) },
    { name: 'design_pit', description: 'Generate bench toe contours from the selected pit shell.', input_schema: obj({}) },
    { name: 'run_schedule', description: 'Annual production schedule (pushbacks from nested shells) with cash flow, NPV, IRR and payback.', input_schema: obj({}) },
    { name: 'set_section_slice', description: 'Clip the 3D view with a section plane. axis x = easting, y = northing, z = elevation (RL).', input_schema: obj({ axis: { type: 'string', enum: ['x', 'y', 'z'] }, position: { type: 'number' }, enabled: { type: 'boolean' } }, ['axis', 'position', 'enabled']) },
    { name: 'set_layer_visibility', description: 'Show or hide a layer in the 3D view.', input_schema: obj({ layer: { type: 'string', enum: ['surfaces', 'drillholes', 'strings', 'solids', 'block_model', 'pit_shell', 'pit_design', 'proposed_holes'] }, visible: { type: 'boolean' } }, ['layer', 'visible']) },
    { name: 'propose_infill_holes', description: 'Propose infill drillholes targeting high-grade blocks with the largest sample spacing (estimation uncertainty).', input_schema: obj({ count: { type: 'integer' } }, ['count']) },
    { name: 'build_grade_shell', description: 'Build an RBF implicit grade-shell solid at a threshold grade.', input_schema: obj({ threshold: { type: 'number' } }, ['threshold']) },
    { name: 'design_pit_from_toe', description: 'Engineer a pit from a closed toe string: benches, berms, ramp, daylighting to topography; reports volume and reserve. KPIs then use the design.', input_schema: obj({ toe_string: { type: 'string', description: 'name of a closed string; default = last closed string' }, bench_height: { type: 'number' }, batter_deg: { type: 'number' }, berm_m: { type: 'number' }, ramp_width_m: { type: 'number' }, ramp_gradient_pct: { type: 'number' } }, []) },
    { name: 'bench_report', description: 'Ore, grade and waste by bench inside the active pit (shell or design).', input_schema: obj({}) },
    { name: 'blast_pattern', description: 'Lay out a drill & blast pattern inside a closed string and compute charge and powder factor.', input_schema: obj({ boundary_string: { type: 'string' }, burden: { type: 'number' }, spacing: { type: 'number' }, diameter_mm: { type: 'number' }, pattern: { type: 'string', enum: ['staggered', 'square'] } }, ['burden', 'spacing']) },
    { name: 'optimise_stopes', description: 'Underground stope optimiser (MSO-style): generates stope solids below the pit/surface crown pillar from the block model and reports diluted tonnes, grade and value.', input_schema: obj({ cutoff_grade: { type: 'number' }, level_spacing_m: { type: 'number' }, stope_length_m: { type: 'number' }, min_width_m: { type: 'number' }, elos_m: { type: 'number' }, crown_pillar_m: { type: 'number' } }, []) },
    { name: 'spiral_decline', description: 'Generate a spiral decline (helix) with crosscuts to each level, a fresh-air raise, an ore pass and tunnel solids.', input_schema: obj({ radius_m: { type: 'number' }, gradient_pct: { type: 'number' }, level_spacing_m: { type: 'number' } }, []) },
    { name: 'ring_blast_design', description: 'Longhole fan (ring) drilling and charging design for a stope solid: holes, metres, explosive and powder factor.', input_schema: obj({ stope: { type: 'string' }, ring_burden_m: { type: 'number' }, toe_spacing_m: { type: 'number' } }, []) },
    { name: 'face_round_design', description: 'Development face round (burn cut, easers, perimeter smooth blasting, lifters) for a drive of given width and height.', input_schema: obj({ width_m: { type: 'number' }, height_m: { type: 'number' }, advance_m: { type: 'number' } }, []) },
    { name: 'op_ug_transition', description: 'Find the optimal RL to switch from open pit to underground by comparing combined NPV bench by bench.', input_schema: obj({ ug_cost_t: { type: 'number' }, crown_pillar_m: { type: 'number' } }, []) },
    { name: 'clean_strings', description: 'Remove duplicate/spike vertices and close strings whose ends nearly meet.', input_schema: obj({ close_tolerance_m: { type: 'number' } }, []) },
    { name: 'stope_report', description: 'Underground: tonnes, grade and ounces inside each stope solid (ST_*) from the block model; flags stopes below the cut-off.', input_schema: obj({ cutoff_grade: { type: 'number' } }, []) },
    { name: 'generate_executive_report', description: 'Open the executive engineering & reserve report.', input_schema: obj({ project_name: { type: 'string' }, include_sensitivity: { type: 'boolean' } }, ['project_name']) }
  ];
  const LAYER = { surfaces: 'topo', drillholes: 'holes', strings: 'strings', solids: 'solids', block_model: 'bm', pit_shell: 'pit', pit_design: 'design', proposed_holes: 'infill' };

  AI.dispatch = async function (name, a = {}) {
    const WF = TM.WF, UI = TM.UI;
    switch (name) {
      case 'get_project_summary': return WF.summary();
      case 'filter_block_model': if (!TM.P.bm) return { error: 'No block model yet. Run estimation first.' }; return WF.setCutoff(a.cutoff_grade, a.colormap);
      case 'audit_drillholes': return WF.audit({ apply_top_cut: a.apply_top_cut, fix_overlaps: a.fix_overlaps !== false });
      case 'validate_database': return WF.validate();
      case 'run_estimation': { const b = TM.clamp(+a.block_size || 5, 2, 50); return await UI.run(L('Estimating block model…', 'جارٍ تقدير نموذج البلوكات…'), p => WF.estimate({ method: a.method || 'ok', dx: b, dy: b, dz: b }, p)); }
      case 'run_pit_optimization': return await UI.run(L('Optimising pit (Lerchs-Grossmann)…', 'جارٍ تحسين الحفرة…'), p => WF.optimisePit(a, p));
      case 'select_pit_shell': return WF.selectShell((a.shell || 1) - 1);
      case 'design_pit': return WF.designPit();
      case 'run_schedule': { const r = WF.schedule(); TM.App && TM.App.showSchedule(); return r; }
      case 'set_section_slice': { const V = TM.VP; V.slice.axis = ['x', 'y', 'z'].includes(a.axis) ? a.axis : 'x'; V.slice.pos = +a.position; V.slice.enabled = a.enabled !== false; V.applySlice(); return { axis: V.slice.axis, position: V.slice.pos, enabled: V.slice.enabled }; }
      case 'set_layer_visibility': { const k = LAYER[a.layer]; if (!k) return { error: 'unknown layer' }; TM.VP.vis[k] = !!a.visible; TM.VP.applyVis(); UI.renderLayers(); return { layer: a.layer, visible: !!a.visible }; }
      case 'propose_infill_holes': return WF.proposeInfill(TM.clamp(a.count || 2, 1, 8));
      case 'build_grade_shell': return await UI.run(L('Building implicit grade shell…', 'جارٍ بناء الغلاف الضمني…'), p => WF.implicitShell({ threshold: +a.threshold || 0.5 }, p));
      case 'design_pit_from_toe': { const cl = TM.P.strings.filter(x => x.closed); const named = n => (TM.P.strings.find(x => x.name === n) || {}).id; const toe = (a.toe_string && named(a.toe_string)) || (TM.CAD.sel && TM.CAD.sel.closed ? TM.CAD.sel.id : ((cl.filter(x => /toe|قاع/i.test(x.name)).pop() || cl[cl.length - 1] || {}).id)); if (!toe) return { error: 'No closed toe string. Digitise one first.' }; const S_ = TM.P.settings; return await UI.run(L('Designing pit…', 'جارٍ تصميم الحفرة…'), async () => WF.pitDesign({ toe, benchH: a.bench_height || S_.benchH, batter: a.batter_deg || S_.batter, berm: a.berm_m ?? S_.bermW, rampWidth: a.ramp_width_m ?? S_.rampW, rampGrade: a.ramp_gradient_pct || S_.rampGrade, res: 1 })); }
      case 'bench_report': return { benches: WF.benchReport() };
      case 'optimise_stopes': { const r = TM.UG.optimiseStopes(Object.fromEntries(Object.entries({ cutoff: a.cutoff_grade, levelH: a.level_spacing_m, stopeLen: a.stope_length_m, minWidth: a.min_width_m, elos: a.elos_m, crown: a.crown_pillar_m }).filter(([, v]) => v != null))); return Object.assign({}, r, { rows: r.rows.slice(0, 10) }); }
      case 'spiral_decline': return TM.UG.spiralDecline(Object.fromEntries(Object.entries({ radius: a.radius_m, gradientPct: a.gradient_pct, levelH: a.level_spacing_m }).filter(([, v]) => v != null)));
      case 'ring_blast_design': { const st = TM.P.solids.filter(x => /^ST_/.test(x.name)); const so = (a.stope && TM.P.solids.find(x => x.name === a.stope)) || st[Math.floor(st.length / 2)]; if (!so) return { error: 'No stope solids (ST_*).' }; return TM.UG.ringDesign(Object.fromEntries(Object.entries({ stope: so.id, ringBurden: a.ring_burden_m, toeSpacing: a.toe_spacing_m }).filter(([, v]) => v != null))); }
      case 'face_round_design': { const r = TM.UG.faceRound(Object.fromEntries(Object.entries({ w: a.width_m, h: a.height_m, advance: a.advance_m }).filter(([, v]) => v != null))); delete r._blast; return r; }
      case 'op_ug_transition': { const r = TM.UG.transition(Object.fromEntries(Object.entries({ ugCost: a.ug_cost_t, crown: a.crown_pillar_m }).filter(([, v]) => v != null))); return Object.assign({}, r, { rows: r.rows.filter((_, i) => i % 3 === 0) }); }
      case 'clean_strings': return WF.cleanStrings({ closeTol: a.close_tolerance_m != null ? a.close_tolerance_m : 1 });
      case 'stope_report': { const r = WF.stopeReport(a.cutoff_grade || TM.P.settings.cutoff); TM.App && TM.App.showStopes(r); return Object.assign({}, r, { rows: r.rows.slice(0, 15) }); }
      case 'blast_pattern': { const cl = TM.P.strings.filter(x => x.closed); const named = n => (TM.P.strings.find(x => x.name === n) || {}).id; const poly = (a.boundary_string && named(a.boundary_string)) || (TM.CAD.sel && TM.CAD.sel.closed ? TM.CAD.sel.id : ((cl.filter(x => /blast|تفجير/i.test(x.name)).pop() || cl[cl.length - 1] || {}).id)); if (!poly) return { error: 'No closed boundary string.' }; return WF.blastPattern({ polygon: poly, burden: a.burden, spacing: a.spacing, pattern: a.pattern || 'staggered', azimuth: 90, dip: 90, benchH: TM.P.settings.benchH, subdrill: 1, stemming: 3, diameter: a.diameter_mm || 115, explosive: 'ANFO', delayRow: 67, delayHole: 17, density: TM.P.settings.density }); }
      case 'generate_executive_report': TM.Report.open({ name: a.project_name || TM.P.name, sensitivity: a.include_sensitivity !== false }); return { opened: true };
    }
    return { error: 'unknown tool ' + name };
  };
  AI.run = async function (name, args) { try { const r = await AI.dispatch(name, args); TM.P.ai.log.push({ t: new Date().toISOString(), tool: name, args }); return r; } catch (e) { return { error: e.message || String(e) }; } };

  // ---------------------------------------------------------------- providers
  AI.PROVIDERS = {
    local: { label: L('Offline parser', 'المحلل المحلي'), models: ['rules'] },
    claude: { label: 'Claude (Anthropic)', models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'] },
    openai: { label: 'OpenAI', models: ['gpt-4o', 'gpt-4.1'] },
    gemini: { label: 'Google Gemini', models: ['gemini-2.5-pro', 'gemini-2.5-flash'] }
  };
  AI.cfg = () => ({ provider: TM.prefs.get('ai.provider', 'local'), model: TM.prefs.get('ai.model.' + TM.prefs.get('ai.provider', 'local'), null), key: TM.prefs.get('ai.key.' + TM.prefs.get('ai.provider', 'local'), '') });
  const SYSTEM = () => `You are the AI copilot inside TerraMind Studio, a mining geology and mine-planning application.
You act on the open project only through the provided tools; never invent numbers — quote values returned by tools.
Units: metres, tonnes, grade in ${TM.P.settings.gradeUnit} (${TM.P.settings.gradeField}), money in USD, gold in troy ounces.
Reply in the user's language (Arabic or English), concise, with an engineering summary of what changed (tonnes, grade, ounces, strip ratio, NPV) and any caveat a Competent Person would raise.
Current project snapshot: ${JSON.stringify(TM.WF.summary())}`;
  let convo = { provider: null, messages: [] };
  AI.resetConversation = () => { convo = { provider: null, messages: [] }; };

  async function claudeTurn(cfg, userText, onTool) {
    const mod = await import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.129.0/+esm'); const Anthropic = mod.default;
    const client = new Anthropic({ apiKey: cfg.key, dangerouslyAllowBrowser: true });
    const model = cfg.model || 'claude-opus-5-5'; const tools = AI.TOOLS.map(t => ({ name: t.name, description: t.description, input_schema: t.input_schema }));
    convo.messages.push({ role: 'user', content: userText }); const out = [];
    const fallbackOK = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-fable-5-1', 'claude-opus-5'].includes(model);
    try {
      for (let step = 0; step < 8; step++) {
        const req = { model, max_tokens: 16000, system: SYSTEM(), tools, messages: convo.messages, output_config: { effort: 'medium' } };
        const resp = fallbackOK ? await client.beta.messages.create(Object.assign(req, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })) : await client.messages.create(req);
        if (resp.stop_reason === 'refusal') { out.push(L('The model declined this request.', 'رفض النموذج هذا الطلب.')); convo.messages.pop(); break; }
        convo.messages.push({ role: 'assistant', content: resp.content });
        for (const b of resp.content) if (b.type === 'text' && b.text.trim()) out.push(b.text);
        if (resp.stop_reason !== 'tool_use') break;
        const results = [];
        for (const b of resp.content) if (b.type === 'tool_use') { const r = await onTool(b.name, b.input || {}); results.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(r).slice(0, 20000), is_error: !!(r && r.error) }); }
        convo.messages.push({ role: 'user', content: results });
      }
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) throw new Error(L('Claude API key rejected (401).', 'مفتاح Claude API مرفوض (401).'));
      if (e instanceof Anthropic.RateLimitError) throw new Error(L('Claude rate limit reached — try again shortly.', 'تم بلوغ حد الطلبات — أعد المحاولة بعد قليل.'));
      if (e instanceof Anthropic.APIConnectionError) throw new Error(L('Cannot reach the Claude API (network/offline).', 'تعذّر الوصول إلى Claude API (الشبكة).'));
      if (e instanceof Anthropic.APIError) throw new Error(`Claude API ${e.status || ''}: ${e.message}`);
      throw e;
    }
    return out.join('\n\n');
  }
  async function openaiTurn(cfg, userText, onTool) {
    if (!convo.messages.length) convo.messages.push({ role: 'system', content: SYSTEM() });
    convo.messages.push({ role: 'user', content: userText }); const out = [];
    const tools = AI.TOOLS.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));
    for (let step = 0; step < 8; step++) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key }, body: JSON.stringify({ model: cfg.model || 'gpt-4o', messages: convo.messages, tools }) });
      if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const j = await r.json(); const msg = j.choices[0].message; convo.messages.push(msg); if (msg.content) out.push(msg.content);
      if (!msg.tool_calls || !msg.tool_calls.length) break;
      for (const c of msg.tool_calls) { let args = {}; try { args = JSON.parse(c.function.arguments || '{}'); } catch (e) { } const res = await onTool(c.function.name, args); convo.messages.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(res).slice(0, 20000) }); }
    }
    return out.join('\n\n');
  }
  const geminiSchema = s => JSON.parse(JSON.stringify(s, (k, v) => k === 'additionalProperties' ? undefined : v));
  async function geminiTurn(cfg, userText, onTool) {
    convo.messages.push({ role: 'user', parts: [{ text: userText }] }); const out = [];
    const tools = [{ functionDeclarations: AI.TOOLS.map(t => { const d = { name: t.name, description: t.description }; if (Object.keys(t.input_schema.properties).length) d.parameters = geminiSchema(t.input_schema); return d; }) }];
    for (let step = 0; step < 8; step++) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model || 'gemini-2.5-pro')}:generateContent`;
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM() }] }, contents: convo.messages, tools }) });
      if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const j = await r.json(); const content = j.candidates && j.candidates[0] && j.candidates[0].content; if (!content) break;
      convo.messages.push(content); const calls = (content.parts || []).filter(p => p.functionCall); (content.parts || []).forEach(p => { if (p.text) out.push(p.text); });
      if (!calls.length) break;
      const parts = []; for (const p of calls) { const res = await onTool(p.functionCall.name, p.functionCall.args || {}); parts.push({ functionResponse: { name: p.functionCall.name, response: { result: res } } }); }
      convo.messages.push({ role: 'user', parts });
    }
    return out.join('\n\n');
  }

  // ---------------------------------------------------------------- offline bilingual parser (no API key)
  const NUM = '(-?\\d+(?:[.,]\\d+)?)'; const pn = s => parseFloat(String(s).replace(',', '.'));
  const after = (s, kw, span = 26) => { const m = s.match(new RegExp('(?:' + kw + ')[^\\d\\-]{0,' + span + '}' + NUM, 'i')); return m ? pn(m[1]) : null; };
  const before = (s, unit) => { const m = s.match(new RegExp(NUM + '\\s*(?:' + unit + ')', 'i')); return m ? pn(m[1]) : null; };
  AI.parse = function (text) {
    const s = TM.normDigits(text), lo = s.toLowerCase(), has = re => re.test(lo), calls = [];
    if (has(/report|تقرير/)) { const m = s.match(/["“«](.+?)["”»]/); calls.push(['generate_executive_report', { project_name: m ? m[1] : TM.P.name, include_sensitivity: !has(/no sensitivity|without sensitivity|بدون حساسية/) }]); }
    if (has(/summary|status|ملخص|حالة المشروع/)) calls.push(['get_project_summary', {}]);
    if (has(/validat|تحقق|فحص القاعدة|check (the )?database/)) calls.push(['validate_database', {}]);
    if (has(/top-?cut|outlier|audit|qa\/?qc|تدقيق|شاذ|سقف|overlap|تداخل/)) { const n = after(s, 'top-?cut|cap|سقف|at|عند', 18); calls.push(['audit_drillholes', { apply_top_cut: n != null ? n : (TM.Drill.suggestTopCut() || { value: 15 }).value, fix_overlaps: !has(/keep overlaps/) }]); }
    if (has(/krig|estimat|idw|nearest|تقدير|كريج|كريغ/)) calls.push(['run_estimation', { method: has(/idw|inverse/) ? 'idw' : has(/nearest|\bnn\b/) ? 'nn' : 'ok', block_size: after(s, 'block|بلوك|size|حجم', 14) || 5 }]);
    if (has(/infill|حفر (?:إضافي|اضافي|تكميلي)|آبار (?:إضافية|تكميلية|مقترحة)|تكثيف|propose.*hole|اقترح/)) calls.push(['propose_infill_holes', { count: TM.clamp(Math.round(after(s, 'infill|propose|اقترح', 12) || 2), 1, 6) }]);
    if (has(/grade shell|implicit|rbf|غلاف|ضمني/)) calls.push(['build_grade_shell', { threshold: before(s, 'g\\/?t|gpt|غ\\/?ط|جرام|غرام') || 0.5 }]);
    if (has(/optim\w* (?:the )?(?:cut|cog)|best cut|optimal cut|حد القطع الأمثل|أمثل|أفضل حد|افضل حد|حسّن حد|تحسين حد/)) { const sc = TM.WF.cutoffScan(); if (sc.length) { const b = sc.reduce((a, x) => x.npv > a.npv ? x : a); calls.push(['filter_block_model', { cutoff_grade: b.c }]); } }
    else if (!calls.some(c => c[0] === 'audit_drillholes' || c[0] === 'build_grade_shell')) {
      let cog = before(s, 'g\\/?t|gpt|غ\\/?ط|جرام|غرام|جم\\/طن'); if (cog == null) cog = after(s, 'cut-?off|cog|grade above|above|greater than|>|حد القطع|تركيز|يزيد|أعلى من|فوق', 22);
      const cm = /colou?r|cmap|colormap|ألوان|تلوين|لون/.test(lo) ? (lo.match(/viridis|turbo|gold/) || [])[0] : null;
      if (cog != null && cog < 50) calls.push(['filter_block_model', { cutoff_grade: cog, colormap: cm || undefined }]); else if (cm) calls.push(['filter_block_model', { cutoff_grade: TM.P.settings.cutoff, colormap: cm }]);
    }
    if (has(/optimi[sz]e? stopes?|stope optimi[sz]er|\bmso\b|محسن الغرف|محسّن الغرف|ولّد الغرف|ولد الغرف|توليد الغرف|تحسين الغرف/)) calls.push(['optimise_stopes', { cutoff_grade: before(s, 'g\\/?t|gpt|غ\\/?ط|جرام|غرام') || undefined }]);
    else if (has(/spiral|helix|decline|حلزون|منحدر تحت/)) calls.push(['spiral_decline', { radius_m: after(s, 'radius|نصف قطر', 12) || undefined }]);
    else if (has(/\bring|fan drill|longhole|مروح|حلقات/)) calls.push(['ring_blast_design', {}]);
    else if (has(/face round|jumbo|burn cut|واجهة النفق|جبهة النفق|جامبو/)) calls.push(['face_round_design', { width_m: after(s, 'width|عرض', 10) || undefined, height_m: after(s, 'height|ارتفاع', 10) || undefined }]);
    else if (has(/transition|open.?pit to underground|نقطة التحول|التحول من سطحي|التحول إلى تحت/)) calls.push(['op_ug_transition', {}]);
    else if (has(/clean (?:the )?strings|تنظيف الخطوط|نظف الخطوط/)) calls.push(['clean_strings', {}]);
    else if (has(/blast|تفجير|نمط الحفر/)) { calls.push(['blast_pattern', { burden: after(s, 'burden|بردن', 10) || 4, spacing: after(s, 'spacing|تباعد', 10) || 4.5 }]); }
    else if (has(/bench report|تقرير المصاطب/)) calls.push(['bench_report', {}]);
    else if (has(/stope|الأعمال|الإيقافات|ستوب/)) calls.push(['stope_report', { cutoff_grade: before(s, 'g\\/?t|gpt|غ\\/?ط|جرام|غرام') || undefined }]);
    else if (has(/design (?:the )?pit|pit design|from (?:the )?toe|صمم الحفرة|تصميم الحفرة|من خط القاع/)) calls.push(['design_pit_from_toe', { berm_m: after(s, 'berm|رصيف', 10) ?? undefined, ramp_width_m: after(s, 'ramp|طريق', 12) ?? undefined }]);
    else if (has(/\bpit\b|حفرة|الحفرة|منجم مفتوح|slope|ميل|زاوية|منحدر|gold price|سعر/) && !calls.some(c => c[0] === 'propose_infill_holes')) {
      if (has(/schedule|جدول|جدولة|cash ?flow|تدفق/)) calls.push(['run_schedule', {}]);
      else if (has(/design|bench|تصميم|مصاطب/)) calls.push(['design_pit', {}]);
      else if (has(/shell \d|غلاف رقم|select shell/)) calls.push(['select_pit_shell', { shell: after(s, 'shell|غلاف', 8) || 1 }]);
      else { const a = { slope_angle: before(s, '°|deg|degree|درجة') ?? after(s, 'slope|ميل|زاوية|منحدر', 16) ?? TM.P.settings.slope }; const pr = after(s, 'price|سعر|\\$', 16) ?? before(s, '\\$|usd|دولار'); if (pr && pr > 300) a.gold_price_oz = pr; const mc = after(s, 'mining cost|تكلفة التعدين', 14); if (mc) a.mining_cost_t = mc; const pc = after(s, 'processing cost|تكلفة المعالجة', 14); if (pc) a.processing_cost_t = pc; if (a.slope_angle > 75 || a.slope_angle < 20) a.slope_angle = TM.P.settings.slope; calls.push(['run_pit_optimization', a]); }
    } else if (has(/schedule|جدول الإنتاج|جدولة|cash ?flow|تدفق نقدي/)) calls.push(['run_schedule', {}]);
    if (has(/section|slice|clip|مقطع|شريحة/)) { const off = has(/\boff\b|disable|remove|clear|أوقف|ألغ|إلغاء|أزل/); let axis = 'x'; if (has(/\bnorth|northing|\by\b|شمال/)) axis = 'y'; if (has(/\bz\b|\brl\b|elev|level|منسوب|أفقي|مستوى/)) axis = 'z'; if (has(/\beast|easting|\bx\b|شرق/)) axis = 'x'; const e = TM.extents(); const pos = after(s, 'at|@|=|east|north|rl|elevation|level|منسوب|عند|شرق|شمال', 14); calls.push(['set_section_slice', { axis, position: pos ?? Math.round(axis === 'x' ? e.cx : axis === 'y' ? e.cy : e.cz), enabled: !off }]); }
    const lay = [['surfaces', /topo|terrain|dtm|surface|طبوغراف|سطح|تضاريس/], ['drillholes', /drill ?holes?|\bholes\b|آبار|الآبار/], ['solids', /solid|wireframe|المجسم|مجسمات/], ['block_model', /block model|blocks|بلوك|كتل/], ['pit_shell', /pit shell|غلاف الحفرة/], ['strings', /strings|الخطوط/]];
    const hide = has(/\bhide\b|أخف|اخف|إخفاء|اخفاء/), show = has(/\bshow\b|اعرض|أظهر|اظهر|إظهار/);
    if (hide || show) for (const [id, re] of lay) if (re.test(lo)) calls.push(['set_layer_visibility', { layer: id, visible: show && !hide }]);
    return { calls, wantsSR: /strip|w:o|نسبة الكشف|الكشف/.test(lo) };
  };
  function summarize(name, r) {
    if (!r) return ''; if (r.error) return '⚠ ' + r.error; const M = v => fmt(v / 1e6, 2);
    switch (name) {
      case 'filter_block_model': return L(`Cut-off ${fmt(r.cutoff, 2)} g/t: ${fmt(r.visible_blocks)} blocks shown. Ore ${M(r.ore_t)} Mt @ ${fmt(r.grade, 2)} g/t (${fmt(r.contained_oz)} oz)` + (r.strip_ratio != null ? `, waste ${M(r.waste_t)} Mt, <b>strip ratio ${fmt(r.strip_ratio, 2)}</b>, NPV ${TM.usd(r.npv_musd)}M.` : '.'), `حد القطع ${fmt(r.cutoff, 2)} غ/طن: يُعرض ${fmt(r.visible_blocks)} بلوك. الخام ${M(r.ore_t)} مليون طن بتركيز ${fmt(r.grade, 2)} غ/طن (${fmt(r.contained_oz)} أونصة)` + (r.strip_ratio != null ? `، النفايات ${M(r.waste_t)} مليون طن، <b>نسبة الكشف ${fmt(r.strip_ratio, 2)}</b>، صافي القيمة الحالية ${TM.usd(r.npv_musd)} مليون.` : '.'));
      case 'run_pit_optimization': return L(`${r.shells} nested shells (${fmt(r.nodes)} blocks, ${r.seconds}s). Selected shell ${r.selected_shell} (RF ${r.revenue_factor}) at ${r.slope_angle}°: ore ${M(r.ore_t)} Mt @ ${r.grade} g/t, waste ${M(r.waste_t)} Mt, SR ${r.strip_ratio}, <b>NPV ${TM.usd(r.npv_musd)}M</b>.`, `${r.shells} غلافاً متداخلاً (${fmt(r.nodes)} بلوك، ${r.seconds} ث). الغلاف المختار ${r.selected_shell} (معامل الإيراد ${r.revenue_factor}) بميل ${r.slope_angle}°: خام ${M(r.ore_t)} مليون طن بتركيز ${r.grade} غ/طن، نفايات ${M(r.waste_t)} مليون طن، نسبة كشف ${r.strip_ratio}، <b>صافي القيمة ${TM.usd(r.npv_musd)} مليون</b>.`);
      case 'audit_drillholes': return L(`Top-cut ${r.top_cut ? fmt(r.top_cut, 1) + ' g/t' : 'none'} (${r.samples_capped} samples above). Fixed ${r.overlaps_fixed} overlap(s), removed ${r.duplicates_removed} duplicate(s). Max raw assay ${r.max_raw_assay ? `${fmt(r.max_raw_assay.g, 1)} in ${r.max_raw_assay.hole} at ${fmt(r.max_raw_assay.from)} m` : '—'}. ${r.note || ''}`, `السقف ${r.top_cut ? fmt(r.top_cut, 1) + ' غ/طن' : 'لا يوجد'} (${r.samples_capped} عينة فوقه). أُصلح ${r.overlaps_fixed} تداخل وحُذف ${r.duplicates_removed} مكرر. أعلى تحليل ${r.max_raw_assay ? `${fmt(r.max_raw_assay.g, 1)} في ${r.max_raw_assay.hole} عند ${fmt(r.max_raw_assay.from)} م` : '—'}. ${r.note || ''}`);
      case 'validate_database': return L(`${r.errors} error(s), ${r.warnings} warning(s), ${r.info} note(s).`, `${r.errors} خطأ، ${r.warnings} تحذير، ${r.info} ملاحظة.`);
      case 'run_estimation': return L(`${r.method.toUpperCase()} estimated ${fmt(r.blocks_estimated)} blocks in ${r.seconds}s. Resource ≥ ${r.resource_at_cutoff.cutoff} g/t: ${M(r.resource_at_cutoff.tonnes)} Mt @ ${r.resource_at_cutoff.grade} g/t (${fmt(r.resource_at_cutoff.oz)} oz).`, `قُدّر ${fmt(r.blocks_estimated)} بلوك بطريقة ${r.method.toUpperCase()} في ${r.seconds} ث. المورد فوق ${r.resource_at_cutoff.cutoff} غ/طن: ${M(r.resource_at_cutoff.tonnes)} مليون طن بتركيز ${r.resource_at_cutoff.grade} (${fmt(r.resource_at_cutoff.oz)} أونصة).`);
      case 'run_schedule': return L(`${r.years}-year schedule: ${M(r.ore_t)} Mt ore, ${fmt(r.recovered_oz)} oz recovered. <b>NPV ${TM.usd(r.npv_musd)}M</b>, IRR ${r.irr_pct != null ? r.irr_pct + '%' : '—'}, payback ${r.payback_years != null ? r.payback_years + ' yr' : '—'}.`, `جدول إنتاج ${r.years} سنوات: ${M(r.ore_t)} مليون طن خام، ${fmt(r.recovered_oz)} أونصة مستخلصة. <b>صافي القيمة ${TM.usd(r.npv_musd)} مليون</b>، معدل العائد ${r.irr_pct != null ? r.irr_pct + '%' : '—'}، الاسترداد ${r.payback_years != null ? r.payback_years + ' سنة' : '—'}.`);
      case 'propose_infill_holes': return r.holes.map(h => `<b>${h.id}</b>: E${h.collar_e} N${h.collar_n} RL${h.collar_rl}, ${h.azimuth}°/${h.dip}°, ${h.length_m} m → RL ${h.target_rl} (${L('avg sample distance', 'متوسط المسافة')} ${h.avg_sample_distance_m} m)`).join('<br>');
      case 'set_section_slice': return r.enabled ? L(`Section on: ${r.axis.toUpperCase()} ≤ ${fmt(r.position)}`, `المقطع مفعّل: ${r.axis.toUpperCase()} ≤ ${fmt(r.position)}`) : L('Section off.', 'تم إيقاف المقطع.');
      case 'design_pit': return L(`${r.benches} bench contours from RL ${r.from_rl}, ${r.bench_height} m benches, ${r.berm_m} m berms.`, `${r.benches} خط مصطبة من المنسوب ${r.from_rl}، ارتفاع ${r.bench_height} م، رصيف ${r.berm_m} م.`);
      case 'build_grade_shell': return L(`${r.solid}: ${fmt(r.volume_m3)} m³ (${M(r.tonnes)} Mt), ${fmt(r.triangles)} triangles, ${r.closed ? 'closed' : 'open'}.`, `${r.solid}: ${fmt(r.volume_m3)} م³ (${M(r.tonnes)} مليون طن)، ${fmt(r.triangles)} مثلث.`);
      case 'select_pit_shell': return L(`Shell ${r.shell} (RF ${r.rf}): ore ${M(r.ore_t)} Mt, SR ${r.strip_ratio}, NPV ${TM.usd(r.npv_musd)}M.`, `الغلاف ${r.shell} (معامل ${r.rf}): خام ${M(r.ore_t)} مليون طن، نسبة كشف ${r.strip_ratio}، صافي القيمة ${TM.usd(r.npv_musd)} مليون.`);
      case 'design_pit_from_toe': return L(`Pit design: ${r.benches} benches, overall ${r.overall_slope_deg}°, ${fmt(r.volume_m3 / 1e6, 2)} Mm³.` + (r.reserve ? ` Reserve ${M(r.reserve.ore_t)} Mt @ ${r.reserve.grade} g/t, SR ${r.reserve.strip_ratio}.` : ''), `تصميم الحفرة: ${r.benches} مصطبة، ميل كلي ${r.overall_slope_deg}°، ${fmt(r.volume_m3 / 1e6, 2)} مليون م³.` + (r.reserve ? ` الاحتياطي ${M(r.reserve.ore_t)} مليون طن بتركيز ${r.reserve.grade}، نسبة كشف ${r.reserve.strip_ratio}.` : ''));
      case 'optimise_stopes': return L(`Stope optimiser: ${r.stopes} stopes, <b>${M(r.ore_t)} Mt @ ${r.grade} g/t</b> (${fmt(r.oz)} oz diluted), value $${fmt(r.value_musd, 1)}M.`, `محسّن الغرف: ${r.stopes} غرفة، <b>${M(r.ore_t)} مليون طن بتركيز ${r.grade}</b> (${fmt(r.oz)} أونصة)، القيمة ${fmt(r.value_musd, 1)} مليون $.`);
      case 'spiral_decline': return L(`Spiral decline ${fmt(r.decline_m)} m at ${r.gradient}, ${r.crosscuts} crosscuts, ${fmt(r.excavated_m3)} m³ excavated.`, `منحدر حلزوني ${fmt(r.decline_m)} م بميل ${r.gradient}، ${r.crosscuts} نفقاً عرضياً، ${fmt(r.excavated_m3)} م³ حفر.`);
      case 'ring_blast_design': return L(`${r.rings} rings, ${r.holes} holes, ${fmt(r.drill_m)} m, PF ${r.powder_factor_kg_t} kg/t.`, `${r.rings} حلقة، ${r.holes} ثقباً، ${fmt(r.drill_m)} م، معامل التفجير ${r.powder_factor_kg_t} كغ/طن.`);
      case 'face_round_design': return L(`Face round ${r.size}: ${r.holes} holes, ${fmt(r.explosive_kg)} kg, ${r.powder_factor_kg_m3} kg/m³.`, `جولة واجهة ${r.size}: ${r.holes} ثقباً، ${fmt(r.explosive_kg)} كغ، ${r.powder_factor_kg_m3} كغ/م³.`);
      case 'op_ug_transition': return L(`Optimal transition at RL <b>${r.optimal_transition_rl}</b>: combined NPV $${fmt(r.combined_npv_musd, 1)}M (pit only $${fmt(r.pit_only_npv_musd, 1)}M).`, `التحول الأمثل عند المنسوب <b>${r.optimal_transition_rl}</b>: القيمة المشتركة ${fmt(r.combined_npv_musd, 1)} مليون $ (الحفرة وحدها ${fmt(r.pit_only_npv_musd, 1)}).`);
      case 'clean_strings': return L(`${r.vertices_removed} vertices removed, ${r.strings_closed} strings closed.`, `حُذفت ${r.vertices_removed} نقطة وأُغلق ${r.strings_closed} خطاً.`);
      case 'stope_report': return L(`${r.ore_stopes}/${r.stopes} stopes above ${r.cutoff} g/t: <b>${M(r.ore_t)} Mt @ ${r.grade} g/t</b> (${fmt(r.oz)} oz), operating margin ${TM.usd(r.operating_margin_musd)}M.`, `${r.ore_stopes} من ${r.stopes} عملاً فوق ${r.cutoff} غ/طن: <b>${M(r.ore_t)} مليون طن بتركيز ${r.grade}</b> (${fmt(r.oz)} أونصة)، هامش التشغيل ${TM.usd(r.operating_margin_musd)} مليون.`);
      case 'bench_report': return r.benches.slice(0, 12).map(b => `RL ${b.rl}: ${M(b.ore_t)} Mt @ ${b.grade} · waste ${M(b.waste_t)} Mt`).join('<br>');
      case 'blast_pattern': return L(`${r.holes} holes, ${fmt(r.drill_m)} m, ${fmt(r.explosive_kg)} kg, PF ${r.powder_factor_kg_t} kg/t.`, `${r.holes} ثقباً، ${fmt(r.drill_m)} م، ${fmt(r.explosive_kg)} كغ، عامل التفجير ${r.powder_factor_kg_t} كغ/طن.`);
      case 'get_project_summary': return `<pre class="call">${esc(JSON.stringify(r, null, 1)).slice(0, 1500)}</pre>`;
      case 'set_layer_visibility': return `${r.layer}: ${r.visible ? L('shown', 'ظاهر') : L('hidden', 'مخفي')}`;
      case 'generate_executive_report': return L('Report opened.', 'تم فتح التقرير.');
    }
    return '';
  }
  AI.summarize = summarize;

  // ---------------------------------------------------------------- chat
  const callHTML = (n, a) => `<div class="call"><span class="fn">${esc(n)}</span>(${esc(JSON.stringify(a))})</div>`;
  AI.addMsg = function (who, html) { const m = document.createElement('div'); m.className = 'msg ' + who; m.setAttribute('dir', 'auto'); m.innerHTML = html; const box = document.querySelector('#msgs'); box.appendChild(m); box.scrollTop = 1e9; return m; };
  AI.mdToHtml = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/^#+\s*(.+)$/gm, '<b>$1</b>').replace(/^\s*[-*]\s+/gm, '• ');
  let busy = false;
  AI.ask = async function (text) {
    text = (text || '').trim(); if (!text || busy) return; busy = true; const prevLang = TM.lang; if (TM.isArabic(text)) TM.lang = 'ar'; else if (/[a-z]{3}/i.test(text)) TM.lang = 'en';
    AI.addMsg('user', esc(text)); const cfg = AI.cfg(); const live = AI.addMsg('bot', '<span class="typing">…</span>');
    const onTool = async (name, args) => { const r = await AI.run(name, args); live.insertAdjacentHTML('beforebegin', `<div class="msg bot tool" dir="auto">${callHTML(name, args)}${summarize(name, r)}</div>`); return r; };
    try {
      if (cfg.provider === 'local' || !cfg.key) {
        const { calls, wantsSR } = AI.parse(text); let html = '';
        for (const [n, a] of calls) { const r = await AI.run(n, a); html += callHTML(n, a) + summarize(n, r) + '<br>'; }
        if (!calls.length && wantsSR) { const k = TM.WF.kpis(); html = k && k.sr != null ? L(`Strip ratio <b>${fmt(k.sr, 2)} : 1</b> at ${fmt(k.cutoff, 2)} g/t.`, `نسبة الكشف <b>${fmt(k.sr, 2)} : 1</b> عند ${fmt(k.cutoff, 2)} غ/طن.`) : L('Optimise the pit first to get a strip ratio.', 'حسّن الحفرة أولاً لحساب نسبة الكشف.'); }
        if (!html) html = L('I could not map that to a tool. Try: "show blocks above 1.2 g/t", "run kriging with 5 m blocks", "optimise the pit at 48° with gold at $2600", "schedule", "apply top-cut 15", "section north at 8300", "propose 3 infill holes", "executive report".' + (cfg.provider !== 'local' ? ' (Add an API key in AI settings for free-form questions.)' : ''), 'لم أتعرف على الأمر. جرّب: "اعرض البلوكات فوق 1.2 غ/طن"، "شغّل الكريجنغ ببلوكات 5 م"، "حسّن الحفرة بميل 48 درجة وسعر 2600"، "جدول الإنتاج"، "طبّق سقف 15"، "مقطع شمالي عند 8300"، "اقترح 3 آبار تكميلية"، "التقرير التنفيذي".');
        live.innerHTML = html;
      } else {
        if (convo.provider !== cfg.provider) convo = { provider: cfg.provider, messages: [] };
        const fn = { claude: claudeTurn, openai: openaiTurn, gemini: geminiTurn }[cfg.provider];
        const txt = await fn(cfg, text, onTool); live.innerHTML = AI.mdToHtml(txt || L('Done.', 'تم.'));
      }
    } catch (e) { live.innerHTML = '⚠ ' + esc(e.message || String(e)); convo = { provider: null, messages: [] }; }
    finally { busy = false; TM.lang = prevLang; TM.App && TM.App.refreshAll(false); }
  };

  // ---------------------------------------------------------------- AI auditor: proactive decision-support cards
  AI.cards = function () {
    const P = TM.P, out = []; if (!P || !P.db.collars.length) return out; const s = P.settings;
    const iss = TM.rt.issues || TM.Drill.validate(); const errs = iss.filter(i => i.sev === 'error');
    if (errs.length) out.push({ sev: 'crit', chip: L('Data integrity', 'سلامة البيانات'), text: L(`${errs.length} database error(s): ${[...new Set(errs.map(e => e.hole))].slice(0, 4).join(', ')}. ${errs[0].msg}.`, `${errs.length} خطأ في القاعدة: ${[...new Set(errs.map(e => e.hole))].slice(0, 4).join('، ')}. ${errs[0].msg}.`), btn: L('Auto-fix intervals', 'إصلاح الفترات تلقائياً'), tool: ['audit_drillholes', { apply_top_cut: s.topCut || 0, fix_overlaps: true }] });
    const mx = TM.WF.maxAssay(), sug = TM.Drill.suggestTopCut();
    if (!s.topCut && mx && sug && mx.g > sug.value * 1.5) out.push({ sev: 'crit', chip: L('Outlier detected', 'قيمة شاذة'), text: L(`Drillhole <b>${mx.hole}</b> has an extreme assay (<b>${fmt(mx.g, 1)} g/t</b> at ${fmt(mx.from)} m). Apply a top-cut at <b>${fmt(sug.value, 1)} g/t</b> (${sug.rule}, ${sug.nAbove} sample${sug.nAbove === 1 ? '' : 's'} above) to avoid overestimating the resource?`, `البئر <b>${mx.hole}</b> فيه تحليل متطرف (<b>${fmt(mx.g, 1)} غ/طن</b> عند ${fmt(mx.from)} م). تطبيق سقف عند <b>${fmt(sug.value, 1)} غ/طن</b> لتجنب المبالغة في المورد؟`), btn: L('Apply top-cut', 'تطبيق السقف'), tool: ['audit_drillholes', { apply_top_cut: sug.value, fix_overlaps: true }] });
    if (!P.bm) out.push({ sev: 'info', chip: L('Next step', 'الخطوة التالية'), text: L('No block model yet. Run ordinary kriging with an auto-fitted variogram (5 m blocks).', 'لا يوجد نموذج بلوكات. شغّل الكريجنغ العادي بتباين مُلاءم تلقائياً (بلوكات 5 م).'), btn: L('Run kriging', 'تشغيل الكريجنغ'), tool: ['run_estimation', { method: 'ok', block_size: 5 }] });
    else if (P.bm.topCut !== s.topCut) out.push({ sev: 'warn', chip: L('Model out of date', 'النموذج قديم'), text: L('The top-cut changed after the block model was estimated.', 'تغيّر السقف بعد تقدير نموذج البلوكات.'), btn: L('Re-estimate', 'إعادة التقدير'), tool: ['run_estimation', { method: P.bm.method || 'ok', block_size: P.bm.def.dx }] });
    else if (s.mineType === 'underground') { if (P.solids.some(x => /^ST_/.test(x.name))) out.push({ sev: 'info', chip: L('Underground', 'منجم سفلي'), text: L(`${P.solids.filter(x => /^ST_/.test(x.name)).length} stope solids are designed. Report their tonnes and grade from the block model at ${fmt(s.cutoff, 2)} g/t.`, `يوجد ${P.solids.filter(x => /^ST_/.test(x.name)).length} مجسم أعمال مصمَّم. احسب حمولتها وتركيزها من نموذج البلوكات عند ${fmt(s.cutoff, 2)} غ/طن.`), btn: L('Stope reserves', 'احتياطي الأعمال'), tool: ['stope_report', { cutoff_grade: s.cutoff }] }); }
    else if (!P.pit || P.pit.stale) out.push({ sev: 'info', chip: L('Next step', 'الخطوة التالية'), text: P.pit ? L('The block model changed — re-run the pit optimisation.', 'تغيّر نموذج البلوكات — أعد تحسين الحفرة.') : L(`Optimise the pit (Lerchs-Grossmann, ${s.slope}° slope, $${fmt(s.price)}/oz).`, `حسّن الحفرة (Lerchs-Grossmann، ميل ${s.slope}°، ${fmt(s.price)}$/أونصة).`), btn: L('Optimise pit', 'تحسين الحفرة'), tool: ['run_pit_optimization', { slope_angle: s.slope }] });
    if (P.bm && P.pit && !P.pit.stale && s.mineType !== 'underground') {
      const sc = TM.WF.cutoffScan(); const cur = TM.WF.kpis(); if (sc.length && cur) { const b = sc.reduce((a, x) => x.npv > a.npv ? x : a); const dN = (b.npv - cur.npv) / 1e6, dF = cur.ore ? (b.ore - cur.ore) / cur.ore * 100 : 0;
        if (Math.abs(b.c - s.cutoff) >= 0.05 && dN > 0.05) out.push({ sev: 'info', chip: L('Economic optimisation', 'تحسين اقتصادي'), text: L(`${b.c > s.cutoff ? 'Raising' : 'Lowering'} cut-off from <b>${fmt(s.cutoff, 2)}</b> to <b>${fmt(b.c, 2)} g/t</b> ${dF < 0 ? 'reduces' : 'increases'} mill feed by ${fmt(Math.abs(dF), 0)}% and increases NPV by <b>+$${fmt(dN, 1)}M</b>.`, `${b.c > s.cutoff ? 'رفع' : 'خفض'} حد القطع من <b>${fmt(s.cutoff, 2)}</b> إلى <b>${fmt(b.c, 2)} غ/طن</b> ${dF < 0 ? 'يقلل' : 'يزيد'} تغذية المصنع ${fmt(Math.abs(dF), 0)}% ويرفع صافي القيمة <b>+${fmt(dN, 1)} مليون $</b>.`), btn: L('Optimise cut-off', 'تحسين حد القطع'), tool: ['filter_block_model', { cutoff_grade: b.c }] }); }
      if (!(s.infill || []).length) { const bm = P.bm; let inf = 0, tot = 0; const d = bm.def; for (let id = 0; id < bm.N; id++) { if (!(bm.grade[id] >= s.cutoff)) continue; const i = id % d.nx, j = Math.floor(id / d.nx) % d.ny, k = Math.floor(id / (d.nx * d.ny)); const c = TM.Est.center(d, i, j, k); if (!(c[2] > TM.Pit.floorAt(c[0], c[1]))) continue; const t = TM.Est.blockTonnes(bm, id); tot += t; if (bm.cls[id] === 3) inf += t; }
        if (tot && inf / tot > 0.08) out.push({ sev: 'warn', chip: L('Infill drilling target', 'هدف حفر تكميلي'), text: L(`${fmt(inf / tot * 100, 0)}% of in-pit ore is Inferred (${fmt(inf / 1e6, 2)} Mt). Infill drilling would upgrade it for the reserve.`, `${fmt(inf / tot * 100, 0)}% من الخام داخل الحفرة فئة مستنتجة (${fmt(inf / 1e6, 2)} مليون طن). الحفر التكميلي يرفع تصنيفه للاحتياطي.`), btn: L('Plot proposed holes', 'رسم الآبار المقترحة'), tool: ['propose_infill_holes', { count: 3 }] }); }
    }
    return out.slice(0, 4);
  };
  AI.renderCards = function () {
    const cards = AI.cards(); AI._cards = cards; const el = document.querySelector('#cards');
    el.innerHTML = cards.length ? cards.map((c, i) => `<div class="card"><span class="chip ${c.sev}"><span class="dot"></span>${esc(c.chip)}</span><p>${c.text}</p><button class="act" type="button" data-card="${i}">${esc(c.btn)}</button></div>`).join('') : `<p class="hint">${L('No open items. The model is consistent with the current data and economics.', 'لا توجد ملاحظات مفتوحة.')}</p>`;
    document.querySelector('#alertCount').textContent = cards.length ? `${cards.length} ${L('open', 'مفتوحة')}` : '';
  };
  AI.runCard = async function (i) { const c = AI._cards && AI._cards[i]; if (!c) return; const [n, a] = c.tool; const r = await AI.run(n, a); AI.addMsg('bot', callHTML(n, a) + summarize(n, r)); TM.App && TM.App.refreshAll(false); };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
