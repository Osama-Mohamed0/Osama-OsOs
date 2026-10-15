# TerraMind Studio — Porting to the Python desktop engine

The web prototype (`index.html`) is the UI/interaction reference. Every engine
function in it has a direct Python counterpart below, and the AI tool schemas
(`TOOLS` in `index.html`, also shown via **AI Engine → Tool Schemas**) are reused
unchanged for Gemini, Claude and OpenAI function calling.

Stack: `PySide6` + `pyvistaqt.QtInteractor` (VTK) + `DuckDB` + `NumPy/SciPy/Pandas`.

```
terramind/
├── app.py                      # QApplication bootstrap, dark QSS, language (RTL/LTR) switch
├── resources/
│   ├── theme.qss               # #0B0F19 / #111827 / #10B981 / #3B82F6 tokens
│   ├── i18n/en.json, ar.json   # same keys as the T{} table in index.html
│   └── icons/                  # Lucide SVGs
├── core/
│   ├── project.py              # .tmd = one DuckDB file: collars, surveys, assays, lithology,
│   │                           #   blocks, strings, wireframes, ai_log tables + manifest
│   ├── state.py                # ProjectState (cut-off, economics, pit params) + Qt signals
│   └── commands.py             # undo/redo stack (QUndoStack) wrapping every tool call
├── data/
│   ├── importers.py            # CSV/Excel collars-surveys-assays → DuckDB (pandas)
│   ├── validation.py           # overlaps, duplicates, gaps, missing surveys (fixOverlaps)
│   └── desurvey.py             # minimum-curvature desurvey → sample XYZ (placeSamples)
├── geo/
│   ├── dtm.py                  # scipy.spatial.Delaunay DTM, contours (buildTopo)
│   ├── strings.py              # smart sketch polylines, cut & fill vs. pad (cutFill)
│   ├── implicit.py             # RBF implicit model (scipy RBFInterpolator) + marching cubes
│   │                           #   (skimage / vtkFlyingEdges3D); prototype uses surface nets
│   └── booleans.py             # vtkBooleanOperationPolyDataFilter / voxel intersections
├── estimation/
│   ├── blockmodel.py           # regular/sub-blocked grid, NumPy arrays (estimate)
│   ├── idw.py                  # cKDTree neighbour search + IDW^p
│   ├── kriging.py              # variography + ordinary kriging (PyKrige / gstools)
│   └── topcut.py               # percentile & log-probability top-cut analysis
├── mining/
│   ├── pit_optimizer.py        # Lerchs-Grossmann / pseudoflow (prototype: nested-shell search)
│   ├── pit_design.py           # benches: batter, berm, ramp at 10% (buildPit)
│   └── economics.py            # cut-off scan, NPV, sensitivity (econ, cutoffScan)
├── ai/
│   ├── schemas.py              # JSON tool schemas (copied from TOOLS)
│   ├── dispatcher.py           # name → handler; returns result dict (dispatch)
│   ├── providers/
│   │   ├── gemini.py           # google-genai function declarations
│   │   ├── claude.py           # anthropic tools API
│   │   └── openai.py           # openai tools API
│   ├── auditor.py              # proactive cards: outliers, cut-off optimum, infill targets
│   └── local_parser.py         # offline bilingual regex parser (parse) used when no API key
├── reports/
│   ├── executive.py            # Jinja2 HTML → PDF (QtPdf / WeasyPrint)
│   └── charts.py               # grade-tonnage curves (matplotlib)
└── ui/
    ├── main_window.py          # 5-zone layout with QDockWidgets
    ├── ribbon.py               # contextual workflow ribbon (TABS)
    ├── layer_tree.py           # QTreeView model: visibility, opacity, colour-by
    ├── viewport.py             # QtInteractor: clipping planes, axes widget, picking, HUD
    ├── kpi_bar.py              # live KPI cards bound to ProjectState signals
    ├── copilot_dock.py         # action cards + chat (QTextBrowser, RTL-aware)
    └── report_dialog.py        # executive report preview + export
```

Run the desktop build (once implemented): `pip install pyside6 pyvista pyvistaqt duckdb pandas scipy && python -m terramind.app`
