# الفاتح — فيلم وثائقي متحرك (15:00)

فتح القسطنطينية 1453 بأسلوب المنمنمات العثمانية، مولّد بالكامل بالكود.

- الفيلم: `final/Al_Fatih.mp4` (نسخة مضغوطة) — والجودة العالية مقسّمة في `final/HQ_parts/`.
- الصورة المصغرة: `final/thumbnail.jpg` — الترجمة الإنجليزية: `final/Al_Fatih.en.srt` — بيانات يوتيوب: `final/youtube.md`.
- لاستبدال الصوت الآلي بصوتك: مجلد `voice/` (اقرأ `voice/README.md`).

## خط الإنتاج
1. `story/script.json` ← `scripts/tts.py` (Piper) ← `scripts/timing.py` + `scripts/cues.py`
2. `node scripts/render.mjs scenes all` (Remotion) ← `out/scenes/*.mp4`
3. `python scripts/music.py` ، `python scripts/sfx.py` ، `python scripts/mix.py`
4. `python scripts/assemble.py` ثم `python scripts/final_qa.py`
