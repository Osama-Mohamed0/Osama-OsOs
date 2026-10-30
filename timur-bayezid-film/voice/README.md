# تغيير صوت المعلّق (دون إعادة رسم الفيديو)

## محتويات المجلد
| الملف | ما هو |
|---|---|
| `voice_script.md` | نص التعليق كاملاً مشكولاً، لكل مشهد: وقت البداية + أقصى مدة مسموحة |
| `narration.srt` | نفس النص كملف ترجمة بالتوقيتات (يُفتح في VLC أو أي محرر ترجمة) |
| `background.m4a` | الموسيقى والمؤثرات وحدها بدون صوت المعلّق |
| `slots.json` | التوقيتات التي يستخدمها السكربت |
| `make_voice.py` | السكربت: يولّد الصوت أو يأخذ تسجيلاتك، ويركّبه على الفيديو |

## التجهيز (مرة واحدة على ويندوز)
افتح PowerShell واكتب:
```
winget install Python.Python.3.12 Gyan.FFmpeg
pip install edge-tts
```
ثم أغلق PowerShell وافتحه من جديد.

## الطريقة 1: صوت Microsoft المجاني (edge-tts)، الأسرع
داخل مجلد `voice`:
```
python make_voice.py
```
الناتج: `final\Timur_vs_Bayezid_newvoice.mp4`.
- لتجربة صوت آخر احذف مجلد `clips_...` القديم ثم:
  `python make_voice.py --voice ar-EG-ShakirNeural` (مصري) أو `ar-SA-HamedNeural` (سعودي، الافتراضي) أو `ar-AE-HamdanNeural`.
- لتبطئة الإلقاء أكثر: `--rate -10%`.

## الطريقة 2: أفضل جودة، ElevenLabs أو تسجيلك بصوتك
1. من `voice_script.md` انسخ نص كل مشهد وولّده على elevenlabs.io (موديل Multilingual v2، صوت ذكوري عميق). أو سجّله بالميكروفون.
2. احفظ كل مقطع باسم مشهده داخل مجلد `clips`: `S01.mp3`، `S03.mp3`، … `S33.mp3` (32 ملفاً؛ S02 وS34 بلا كلام).
3. شغّل:
```
python make_voice.py --from-folder clips
```
إذا كان مقطع أطول من «أقصى مدة» يسرّعه السكربت تلقائياً ليناسب المشهد ويطبع تنبيهاً. الأفضل أن تلتزم بالمدة.
