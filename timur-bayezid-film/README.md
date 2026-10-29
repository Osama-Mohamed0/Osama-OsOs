# الصاعقة والأعرج — فيلم موشن جرافيك (15 دقيقة)

فيلم قصصي سينمائي عن صراع **تيمورلنك** و**بايزيد الأول «يلدرم»**: من الرسائل والتهديدات، إلى سقوط سيواس، إلى معركة أنقرة (28 يوليو 1402)، ثم أسر بايزيد ووفاته (1403) وانقسام أبنائه.

**الفيلم النهائي:** `final/Timur_vs_Bayezid.mp4` — 1920×1080، 30fps، 15:00 دقيقة، تعليق عربي فصيح، موسيقى ومؤثرات مولّدة بالكود.

## البنية
| المجلد | المحتوى |
|---|---|
| `research/timeline.md` | الخط الزمني مع فصل الثابت عن المختلف فيه |
| `story/` | السيناريو (`script.json`، 34 مشهداً)، المسودة والمراجعة النقدية، التوقيت المحسوب |
| `characters/*.md` | ملفات تصميم الشخصيات |
| `src/characters/` | نظام الشخصيات (Person بارامتري، الخيل والفيلة، `cast.tsx` = تثبيت الشخصيات) |
| `src/components/` | الكاميرا والـ Parallax، الخريطة القديمة، الرسالة الملكية، المعركة، المؤثرات، البطاقات والزخارف |
| `src/scenes/` | المشاهد S01–S34 (كل مشهد Composition مستقلة) + `CharacterSheet` + `Main` |
| `scripts/` | التعليق الصوتي، التوقيت، الموسيقى، المؤثرات، الميكساج، الرندر، التجميع، فحوص الجودة |
| `manifest.json` | حالة كل مشهد (للاستئناف) |

## إعادة الإنتاج على Windows
1. ثبّت المتطلبات (مرة واحدة، من PowerShell):
   ```powershell
   winget install OpenJS.NodeJS.LTS Python.Python.3.12 Gyan.FFmpeg
   ```
2. داخل هذا المجلد:
   ```powershell
   npm install
   pip install piper-tts sherpa-onnx numpy scipy soundfile shapely matplotlib pillow edge-tts
   ```
3. خط الإنتاج كاملاً (بالترتيب):
   ```powershell
   python scripts/fetch_models.py       # نموذج الصوت + نموذج Whisper لفحص الجودة
   python scripts/build_map.py; python scripts/gen_textures.py
   python scripts/tts.py                # التعليق (Piper). أو: python scripts/tts.py --engine edge  لصوت ar-SA-HamedNeural
   python scripts/timing.py; python scripts/cues.py
   node scripts/sprites.mjs              # رسوم الحشود
   python scripts/music.py; python scripts/sfx.py; python scripts/mix.py
   node scripts/render.mjs scenes all    # تصدير كل مشهد إلى out/scenes
   python scripts/assemble.py            # الفيلم النهائي إلى final/
   ```
   ملاحظة: `build_map.py` يحتاج ملفات Natural Earth في `.cache/ne/` (تُنزّل من مستودع nvkelso/natural-earth-vector)؛ والمخرجات الجاهزة مضمّنة أصلاً في `src/data` و`public/tex`.
4. للمعاينة التفاعلية: `npm run studio`.

انظر `DECISIONS.md` لكل القرارات، و`PROJECT_STATUS.md` و`FINAL_REPORT.md`.
