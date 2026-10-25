# TerraMind Studio 1.3

TerraMind Studio is a mining geology, resource estimation, open-pit and underground mine planning application. It runs in the browser and is controlled by a bilingual (Arabic/English) AI copilot.

**Windows desktop app:** download the installer (`TerraMind-Studio-…-nsis.exe`) or the portable `.exe` from the repository's **Actions → TerraMind Studio desktop build → Artifacts** (or from a GitHub Release when a `v*` tag is pushed). The desktop edition adds native Open/Save dialogs, a menu bar, `.tmd` file association and unsaved-changes protection.

The browser edition needs no installation or server. On Windows, double-click `index.html` (Chrome or Edge). You can also open the published GitHub Pages site. Libraries are bundled in `vendor/`, so it works offline. The only exceptions are the fonts and the live AI connection.

> **Tip:** if a browser blocks some features when the file is opened directly, use the GitHub Pages copy. Another option is a local server: `python -m http.server` inside the folder, then open `http://localhost:8000`.

---

## الاستخدام السريع (بالعربية)

1. **أول تشغيل:** يُحمَّل مشروع تجريبي ببيانات اصطناعية. بطاقات «دعم القرار» على اليمين تقودك خطوة بخطوة.
2. **استيراد بياناتك:** من «بيانات الآبار» اختر «استيراد الآبار (CSV/Excel)».
   - اختر ملفات الأطواق والمسوحات والتحاليل والصخارة، أو ملف Excel واحداً فيه هذه الأوراق.
   - تتم مطابقة الأعمدة تلقائياً، ويمكنك تعديلها قبل الاستيراد.
   - تجد ملفات نموذجية في المجلد `samples/`.
3. **التحقق والسقف:** اضغط «تحقق» ثم «الإحصاء والسقف».
   - يكتشف التحقق التداخلات والمكررات والقيم المتطرفة وانحرافات المسح.
   - السقف (Top-cut) يُقترح تلقائياً، ويظهر على المدرج التكراري ومخطط الاحتمال.
4. **السطح الطبوغرافي:** من «التضاريس والخطوط» استورد نقاط XYZ أو ملفات `.str` (Surpac) أو DXF.
   - يُبنى سطح DTM بالتثليث.
   - من نفس القائمة: خطوط الكنتور، رسم الخطوط على السطح، وحساب القطع والردم.
5. **النمذجة:**
   - «التباين المكاني»: ملاءمة تلقائية لنموذج كروي ثلاثي الأبعاد.
   - «التقدير»: كريجنغ عادي للبلوكات (OK) أو IDW أو أقرب جار، مع إهليلج بحث، ثم «تصنيف الموارد» إلى مقاس ومؤشر ومستنتج.
   - «غلاف ضمني (RBF)»: يبني مجسماً مغلقاً لجسم الخام.
6. **الحفرة:**
   - «تحسين الحفرة (LG)»: حل Lerchs-Grossmann الدقيق بالتدفق الأعظم، مع أغلفة متداخلة وتحليل غلافاً بغلاف.
   - بعدها: «تصميم المصاطب»، ثم «الجدولة والتدفق النقدي» (صافي القيمة الحالية NPV، ومعدل العائد الداخلي IRR، وفترة الاسترداد)، ثم «الحساسية».
7. **التقرير:** «التقرير التنفيذي» يمكن طباعته أو حفظه PDF، أو تنزيله HTML، أو نسخه Markdown.
8. **الحفظ:**
   - يُحفظ العمل تلقائياً في المتصفح.
   - «حفظ ‎.tmd» ينشئ ملف مشروع واحداً مضغوطاً يحوي كل شيء.
   - اختصاران: Ctrl+S للحفظ، Ctrl+O للفتح.
9. **المساعد الذكي:**
   - يعمل دون إنترنت بمحلل أوامر عربي وإنجليزي.
   - للأسئلة الحرة أضف مفتاح API من «الذكاء والتقارير ← محرك الذكاء». المزودون المتاحون: Claude وOpenAI وGemini.
   - يُحفظ المفتاح في متصفحك فقط.
   - أمثلة على الأوامر:
     - «اعرض البلوكات فوق 1.2 غ/طن واحسب نسبة الكشف»
     - «حسّن الحفرة بميل 48 درجة وسعر 2600»
     - «جدول الإنتاج»
     - «اقترح 3 آبار تكميلية»
     - «مقطع شمالي عند 8300»

## الجديد في 1.3
- **الواجهة:**
  - شريط قوائم هندسي (ملف، تحرير، عرض، أدوات هندسية، مساعدة) بأيقونات واختصارات ومشاريع أخيرة.
  - كل النوافذ تُسحب من عنوانها ويتغير حجمها من الحواف، ولها شريط تمرير وأزرار ثابتة في الأسفل.
  - Enter ينفّذ الإجراء الرئيسي في النافذة، وEsc يغلقها.
- **الحسابات:**
  - مصدر واحد للأرقام: الشريط السفلي ونافذة الجدولة والتقرير التنفيذي تعطي القيم نفسها.
  - طاقة المصنع وطاقة التعدين وحد القطع تُقرأ من إعدادات المشروع.
  - المادة الواقعة بين حد القطع الحدي وحد القطع التشغيلي تذهب إلى مخزون منخفض التركيز.
  - صافي القيمة الحالية في أفضل حالة يُحسب لكل غلاف على حدة.
  - الإحصاء والتباين يُعاد حسابهما بعد تطبيق السقف.
- **الجدولة:** تُعدَّن المراحل مصطبة بمصطبة، مع احترام سقف التعدين وسقف المصنع في كل سنة.
- **النمذجة:**
  - بلوكات فرعية 2×2×2 أو 4×4×4 على حواف المجسم والسطح.
  - فوالق بحدود صلبة أو مرنة، مع إمكانية إزاحة المجسمات عبرها.
- **المنجم السطحي:**
  - طريق شاحنات مائل بنقاط انعكاس، ويدخل ميله في حساب الحجم.
  - خط القاع يُستخرج من غلاف LG.
  - لوحة حسابات حية لنمط التفجير.
  - المكب يُفحص بمعامل الانتفاش مقابل نفايات الحفرة.
  - المطابقة الشهرية بين النموذج والمساحة.
- **المنجم التحت سطحي:**
  - محسّن الغرف (على طريقة MSO).
  - مولّد المنحدر الحلزوني مع الأنفاق العرضية ومدخنة التهوية وممر الخام.
  - مجسمات الأنفاق والمداخن بمقاطع جاهزة.
  - التفجير المروحي للغرف، وجولة واجهة النفق (قطع حرق وثقوب توسيع ومحيط وأرضية).
  - حاسبة نقطة التحول من سطحي إلى تحت سطحي.

## الجديد في 1.1 (أدوات سورباك)
- **الرسم والخطوط (CAD):**
  - تحديد الخطوط والنقاط، وتحريك النقاط (Shift للالتقاط، Alt للإسقاط على السطح)، وإدراجها وحذفها، وقياس المسافة والسمت والانحدار والمساحة.
  - أدوات الخطوط: إزاحة وتوسيع، تنعيم، تكثيف، تبسيط، إسقاط على السطح، تعيين المنسوب، إزاحة وتدوير، تقسيم، وصل، قص بمضلع، نسخ وحذف.
  - تراجع وإعادة (Ctrl+Z / Ctrl+Y).
- **تصميم الحفرة من خط القاع:** مصاطب بارتفاع وزاوية وجه وعرض رصيف، وطريق نقل بعرض وانحدار. تنتهي المصاطب عند تقاطعها مع السطح، ثم يُحسب حجم الحفرة واحتياطيها وتقرير المصاطب. يمكن جعل المؤشرات تعتمد على التصميم بدل غلاف LG.
- **تصميم مكب النفايات:** طبقات وأرصفة بزاوية الاستقرار الطبيعية، مع حساب السعة.
- **المجسمات:**
  - تثليث مجسم بين مقاطع مغلقة.
  - عمليات منطقية على المجسمات: تقاطع واتحاد وطرح.
  - تقرير المجسم، ويشمل الحمولة والتركيز من نموذج البلوكات.
- **نموذج البلوكات:** حاسبة حقول بمعادلات، مثل قيمة البلوك بالدولار.
- **الحفر والتفجير:**
  - نمط مربع أو متعرج داخل مضلع.
  - حساب الحشوة وعامل التفجير وأقصى شحنة لكل تأخير.
  - تصدير جدول الثقوب.
- **لوحات المسقط والمقطع (F7):**
  - مقاطع شرقية أو شمالية بعرض محدد، أو مسقط عند منسوب معين.
  - تُعرض فيها البلوكات والآبار والمجسمات والتصميم.
  - الرسم مباشرة على المقطع، ولوحة A3 بإطار عنوان ومقياس رسم.
  - تصدير SVG أو PNG، أو طباعة إلى PDF.

## Workflow (English)

| Step | Ribbon | What it does |
|---|---|---|
| Import | Drillhole Data → Import | Collar / survey / assay / lithology from CSV or Excel. Columns are auto-mapped. Dips may be positive-down or negative-down. |
| QA/QC | Validate, Statistics & top-cut | Finds duplicates, overlaps, gaps, intervals past total depth, dog-legs and extreme values. Auto-fixes intervals. Suggests a top-cut from the tail break. |
| Desurvey | automatic | Minimum-curvature desurvey of every hole. |
| Composite | Composite | Fixed-length, length-weighted composites. Optional lithology domain. Top-cut is applied before compositing. |
| Surfaces | Terrain & Strings | XYZ points, Surpac `.str`, DXF (polylines / 3DFACE / points), OBJ. Delaunay DTM, contours, string digitising, cut & fill against a level pad or another surface. |
| Variography | Block Model → Variography | Experimental variograms (omni plus a 12-direction fan), automatic major / semi / minor axes, spherical model fit. |
| Estimation | Estimate | Ordinary block kriging (2×2×2 discretisation) / IDW / NN. Anisotropic search ellipsoid, min/max samples, max per hole. Optional domain solid. Partial blocks under topography. |
| Classification | Classify | Measured / Indicated / Inferred by distance, holes and samples. Resource table by class. |
| Validation | Validation swath | Composite vs block mean, swath plot. |
| Solids | Geological Modeling | RBF implicit grade shells (closed meshes), solid from block model, solid ∩ pit, OBJ/STL/DXF export. |
| Pit | Pit Design & Schedule | Lerchs-Grossmann maximum closure (Dinic max-flow) with nested shells by revenue factor, pit-by-pit best/worst NPV, bench contours, design → strings. |
| Schedule | Schedule & cash flow | Pushback schedule limited by mill and mining rates. Annual cash flow, NPV, IRR, payback, and price/cost sensitivity. |
| CAD | CAD & Strings | Select / move / insert / delete vertices, measure, offset, smooth, densify, simplify, drape, set RL, translate, rotate, split, join, clip, undo/redo. |
| Pit design | Pit Design → Pit design from toe | Bench expansion from a closed toe string: batter, berm, ramp (width, gradient, direction), daylighting to topography, design surface, volume, reserve, bench report. Optional KPI source. |
| Dump design | Pit Design → Dump design | Lifts stepping in from a base string at the angle of repose, capacity. |
| Solids | Geology & Solids | Triangulate between section strings, voxel Booleans (∩, ∪, −), solid report with block-model tonnes and grade. |
| Drill & blast | Drill & Blast | Square/staggered patterns in a polygon, hole dip and azimuth, sub-drill, stemming, charge, powder factor, delays, CSV export. |
| Plots | Surfaces & Plots → Plan / section plots (F7) | Plan or section sheets (A3) with grid, title block, scale bar and legend. Digitise on section. SVG/PNG/PDF export. |
| Report | AI & Reports → Executive report | Summary, QA/QC, resource by class, grade-tonnage, pit-by-pit, schedule, sensitivity, recommendations. Print/PDF, HTML or Markdown. |

### Project file (`.tmd`)
A `.tmd` file is a gzip-compressed JSON document. It holds the drillhole database, surfaces, strings, solids, block model arrays, pit shells, settings, history and the AI action log. Your work also autosaves to the browser (IndexedDB).

### AI copilot
- Every action is a tool with a JSON schema: **AI & Reports → Tool schemas**. The same schemas go to Claude (Anthropic SDK), OpenAI and Gemini function calling.
- Without a key, the offline parser maps Arabic and English commands to the same tools.
- The decision-support cards are produced by the auditor (`js/80-ai.js`): data errors, outliers, out-of-date models, the economic cut-off and infill targets.

### Code map
```
index.html            UI shell (5 zones)
css/app.css           dark CAD theme, print styles
js/00-core.js         math, i18n, events, typed-array codec, gzip
js/10-project.js      project model, .tmd save/open, IndexedDB autosave
js/20-io.js           CSV/XLSX, Surpac .str, DXF, OBJ, STL
js/30-drillholes.js   desurvey, validation, compositing, top-cut, demo data
js/35-surfaces.js     Delaunay TIN, z lookup, contours, cut & fill
js/40-estimation.js   variography, block model, OK/IDW/NN, classification, reporting
js/45-implicit.js     RBF implicit modelling, surface nets, volume, point-in-solid
js/50-mining.js       economics, max-flow LG, nested shells, pit-by-pit, design, schedule
js/52-design.js       pit (ramp, switchbacks) and dump design from strings
js/55-workflow.js     high-level operations shared by UI and AI (single plan for KPIs/schedule/report)
js/57-blast.js        open-pit drill & blast patterns
js/58-underground.js  stope optimiser, tunnels & spiral decline, ring and face-round blasting, OP→UG transition
js/60-viewport.js     three.js scene, section clipping, picking, sketching
js/70-ui.js           forms, tables, SVG charts, layers, KPIs, inspector
js/80-ai.js           tool schemas, providers, offline parser, auditor cards
js/85-report.js       executive report
js/88-menu.js         menu bar, keyboard shortcuts, recent projects
js/90-app.js          ribbon commands, dialogs, import wizards, boot
tests/run-tests.js    engine tests:  node terramind-studio/tests/run-tests.js
tools/make-samples.js regenerates samples/ from the demo generator
```

### Limits to know
- The demo project is synthetic. A Competent Person must review domains, top-cut, variogram and classification before any public reporting.
- The DTM uses unconstrained Delaunay: strings are densified, not enforced as hard breaklines.
- In the pit design, the ramp is modelled as a widened berm along its path (correct footprint and waste volume). The climbing ramp surface itself is drawn as a centreline, not as a sloped surface.
- Solid Booleans are voxel-based: accuracy equals the voxel size you choose.
- Kriging and LG run on the main thread with a progress bar. Allow about 10–20 s for ~100k blocks on a laptop.
- Faults are planes fitted to a string or surface (unbounded). Displacing a solid moves the vertices on the hanging-wall side, so triangles that cross the fault are stretched rather than cut.
- The stope optimiser is a slice method on the block model (vertical panels following dip through sub-slices), not a full MSO shape optimisation. Ventilation network simulation is not included.
- The open-pit → underground transition uses the active pit truncated at each RL and values the underground ore at break-even-style costs with a single production rate.
