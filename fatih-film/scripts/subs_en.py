"""English subtitles (SRT) timed to the recorded narration.
Each Arabic sentence has one English translation; its start = spoken start of the sentence's first word
(src/data/cues.ts), long sentences are split at commas proportionally. Output: final/Al_Fatih.en.srt"""
import json, re, os
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

EN = {
 'S01': ["The night of the twenty-eighth of May, 1453.", "A young man of twenty-one sits on his horse before the greatest walls ever built by human hands.", "Behind them lies a city that has stood for a thousand years, turning armies from its gates generation after generation.", "And in a few hours…", "the face of history will change."],
 'S03': ["Emperor Constantine founded it where two continents and two seas meet, and it became the capital of the Romans and the heart of the world.", "The Arabs besieged it twice under the Umayyads, and many others tried after them; all were thrown back from its walls.", "Until people came to say: this city does not fall.", "Its land walls ran for about six kilometres, and the sea guarded every other side, as if nature had built a fortress before men did."],
 'S04': ["Fifty years earlier the city had nearly fallen to the Ottomans, had Timur not defeated Bayezid at Ankara and plunged his sons into a long civil war.", "And now, Bayezid's great-great-grandson stands before it…", "to finish what his forefathers began."],
 'S05': ["Mehmed, son of Murad II, was born in Edirne in 1432.", "At twelve, his father gave up the throne to him.", "But a crusade marched east, and Murad returned to lead the army at Varna, and won.", "Then, through the grand vizier Halil Pasha, Murad took back the throne and sent the boy away to Manisa."],
 'S06': ["There, in the years of exile, the boy made himself.", "He learned Arabic, Persian and Greek, read history, geometry and the art of war, and studied under scholars, the foremost among them Akshamsaddin.", "It is said his teacher showed him the city's walls on maps, and told him of the hadith people repeated: Constantinople shall surely be conquered.", "He drew siege plans with his own hand and asked about every tower and every gate, as if he knew his day was coming."],
 'S07': ["In February 1451 Murad II died, and Mehmed took the throne at nineteen.", "Europe breathed a sigh of relief; they saw an inexperienced youth, no one to fear.", "And that was…", "their greatest mistake."],
 'S08': ["In Constantinople ruled Constantine XI, last emperor of the Romans, over a city whose empire had shrunk to its walls.", "He wanted to test the new sultan: he demanded money, and threatened to release an Ottoman prince living at his court to contest the throne.", "That became the pretext."],
 'S09': ["Mehmed answered with stone, not words.", "In the spring of 1452 he began a huge fortress on the European shore of the Bosphorus, at its narrowest point, facing a castle built by his great-grandfather Bayezid.", "In about four and a half months, Rumeli Hisarı rose…", "and people called it: the Cutter of the Strait.", "The strait was in his grip, and the wheat and aid that reached the city from the Black Sea were cut off."],
 'S10': ["He declared that every ship passing the strait must stop to be searched.", "When a Venetian ship tried to pass without leave, the fortress guns sank it.", "Europe finally understood the message: this young man was not playing."],
 'S11': ["In those days a Hungarian engineer named Orban came to the emperor, offering to cast cannons the world had never seen.", "The emperor could not pay his fee.", "So Orban went to the sultan, and Mehmed asked him one question: can you bring down the walls of Constantinople?", "He said: yes."],
 'S12': ["In Edirne Orban cast a monstrous cannon, about eight metres long, hurling stone balls weighing hundreds of kilograms.", "Dozens of oxen and hundreds of men dragged it for long weeks toward Constantinople.", "The old world was rolling toward its end…", "on wheels."],
 'S13': ["In early April 1453, the plains before the walls filled with tents.", "Modern historians estimate the Ottoman army at some eighty thousand, and the defenders at only about seven thousand.", "Among them was a commander from Genoa with seven hundred fighters: Giovanni Giustiniani…", "the city's last hope.", "The Ottoman army spread along the walls, and the sultan's red tent was pitched facing the Gate of Saint Romanus, where the fiercest fighting would be."],
 'S14': ["The Theodosian walls were three lines: a wide moat, an outer wall, and a higher inner wall guarded by dozens of towers.", "On the sea side, the Romans stretched a massive iron chain across the mouth of the Golden Horn, so no ship could enter."],
 'S15': ["On the sixth of April, the bombardment began.", "For the first time in history, thousand-year-old walls shook under the blows of gunpowder.", "By day the shot broke the stones; by night the defenders plugged the breaches with timber and earth.", "This went on for weeks.", "The great cannon needed hours to cool between shots, so the men poured oil on it and patiently loaded it again."],
 'S16': ["On the twentieth of April, four ships appeared on the horizon, carrying aid for the city.", "The Ottoman fleet swooped on them, but the tall ships forced their way through and entered the Golden Horn to cheers from the walls.", "It is said the sultan rode his horse into the sea in fury."],
 'S17': ["The chain protected the city's weakest wall: the Golden Horn wall.", "If the ships could not cross the sea…", "let them cross the land.", "An idea that seemed to everyone like madness."],
 'S18': ["On the night of the twenty-second of April, greased wooden planks were laid over the hills of Galata.", "Men and oxen hauled some seventy ships up and down, their sails unfurled as if sailing on dry land.", "When morning came, the people of the city saw the Ottoman fleet…", "inside the Golden Horn.", "The sultan had crossed the chain without touching it."],
 'S19': ["In May, the war moved underground.", "The Ottomans dug tunnels under the walls, the defenders dug counter-tunnels, and the two sides met in the dark.", "The Ottomans built a great wooden siege tower; the Romans burned it in a single night.", "The siege dragged on, and both sides were worn out."],
 'S20': ["On the twenty-fourth of May, the moon was eclipsed.", "Byzantine sources tell that the icon of the Virgin slipped from its bearers' hands during a procession of prayer, and that a thick fog covered the city.", "Despair crept into hearts…", "before it crept over the walls."],
 'S21': ["The sultan sent the emperor an offer of surrender: safety for the people, and for him, leave to go wherever he wished.", "The reply came, as the sources relate: it is not in my power, nor in anyone's here, to surrender the city; we have all resolved to die rather than give it up."],
 'S22': ["So Mehmed gathered his commanders.", "Halil Pasha said: lift the siege before Europe comes to their rescue.", "Zaganos Pasha said: no, we attack now; the city is exhausted.", "The sultan was silent for a long time…", "then he gave his word: a general assault, at dawn on the twenty-ninth of May."],
 'S23': ["On the twenty-eighth of May, everything fell still.", "In the Ottoman camp the soldiers fasted, prayed and lit fires.", "In the city, people gathered in Hagia Sophia for the last prayer.", "Two cities praying on the same night…", "and waiting for dawn."],
 'S24': ["Just before dawn on the twenty-ninth of May, drums and horns thundered, and the assault began in three waves.", "The first wave rushed at the breaches, then the second, and the defenders threw them back with stubborn despair.", "The third wave remained…", "the Janissaries.", "Fire, gunpowder and screams filled the darkness, as the sultan watched the great breach near the Gate of Saint Romanus."],
 'S25': ["The Janissaries advanced in ordered ranks to the beat of the drums, the sultan himself urging them on at the moat.", "At that moment Giustiniani was gravely wounded and carried from his post.", "When his men saw him withdraw, panic spread through the ranks."],
 'S26': ["It is said that a small gate in the wall, the Kerkoporta, had been left open, and some attackers slipped through.", "Ottoman sources tell of a giant soldier named Hasan of Ulubat who climbed the wall and raised the banner, then fell a martyr.", "And within moments…", "banners were flying from the towers."],
 'S27': ["As for Constantine, the accounts say he cast off his imperial insignia and charged to where the fighting was fiercest, and was never seen again.", "With him died the last trace of an empire that had lived more than a thousand years."],
 'S28': ["At noon Mehmed rode into the city and made for Hagia Sophia.", "It is said he dismounted at its door, took a handful of earth and scattered it on his turban in humility.", "Then he ordered that it become a mosque.", "He was twenty-one…", "and from that day he was called: the Conqueror.", "He led the first Friday prayer there three days later."],
 'S29': ["The Conqueror did not want a ruined city, but a living capital.", "He moved his capital there, invited people of every faith to settle, restored the Orthodox their patriarch, and built mosques, markets and schools.", "And Constantinople became…", "Istanbul.", "He issued pledges of safety to other faiths for their lives, churches and property, and many who had fled came home."],
 'S30': ["And he did not stop.", "He took Serbia, the Morea, Trebizond and Bosnia, and sent his armies as far as Otranto in southern Italy, and Rome trembled.", "On the third of May 1481 he died on the road to a new campaign whose target he never revealed, at the age of forty-nine."],
 'S31': ["Many historians regard the fall of Constantinople as the end of the Middle Ages.", "Gunpowder had proved that walls no longer protected anyone, and Greek scholars carried their books to Italy and helped spark its Renaissance.", "A city fell…", "and a new world began.", "Trade routes shifted, and Europe turned to the sea in search of new routes to the East."],
 'S32': ["A young man of twenty-one, whom everyone underestimated, took what commanders had failed to take for a thousand years.", "He did not take it by force alone, but by knowledge and planning, and the daring of one who sees a road…", "where others see only a wall."],
 'S33': ["On the shores of the Bosphorus his fortress still stands over the strait, and his name still echoes on every bridge and minaret.", "Walls fall…", "but great dreams remain."],
}
TITLES = [(0, 'S02', ['THE CONQUEROR', 'Mehmed II and the fall of Constantinople, 1453']),
          (0, 'S34', ['THE CONQUEROR'])]

DIAC = re.compile(r'[ً-ْٰ]')
tim = {s['id']: s for s in json.load(open('story/timing.json'))['scenes']}
src = open('src/data/cues.ts', encoding='utf-8').read()
cues = json.loads(src[src.index('= ') + 2: src.rindex(';')])
script = {s['id']: s for s in json.load(open('story/script.json', encoding='utf-8'))['scenes']}


def wrap(t, n=44):
    if len(t) <= n:
        return t
    mid = len(t) // 2
    cands = [i for i, ch in enumerate(t) if ch == ' ']
    cut = min(cands, key=lambda i: abs(i - mid))
    return t[:cut].strip() + '\n' + t[cut:].strip()


def chunks(text, maxlen=88, minlen=38):
    if len(text) <= maxlen:
        return [text]
    pieces = re.split(r'(?<=[,;:.])\s+', text)
    parts, cur = [], ''
    for piece in pieces:
        if cur and len(cur) >= minlen and len(cur) + len(piece) + 1 > maxlen:
            parts.append(cur); cur = piece
        else:
            cur = (cur + ' ' + piece).strip()
    if cur:
        if parts and len(cur) < minlen:
            parts[-1] = parts[-1] + ' ' + cur
        else:
            parts.append(cur)
    out = []
    def halve(t):
        if len(t) <= maxlen:
            out.append(t); return
        mid = len(t) // 2
        cut = min((i for i, ch in enumerate(t) if ch == ' '), key=lambda i: abs(i - mid))
        halve(t[:cut].strip()); halve(t[cut:].strip())
    for prt in parts:
        halve(prt)
    return out


def ts(x):
    ms = int(round(x * 1000))
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'


events = []
for sid, en in EN.items():
    t = tim[sid]
    base = t['from'] / 30
    words = cues[sid]['words']
    off = cues[sid]['offset'] / 30
    ar = [p.strip() for p in re.split(r'(?<=[.؟…!])\s+', DIAC.sub('', script[sid]['narration'])) if p.strip()]
    assert len(ar) == len(en), (sid, len(ar), len(en))
    idx, starts = 0, []
    for a in ar:
        starts.append(base + off + words[idx][1])
        idx += len(a.split())
    end_all = base + (t['narrFrom'] + t['narrFrames']) / 30
    for i, e in enumerate(en):
        s0 = starts[i]
        s1 = (starts[i + 1] - 0.08) if i + 1 < len(en) else end_all
        cs = chunks(e)
        total = sum(len(c) for c in cs)
        cur = s0
        for c in cs:
            d = (s1 - s0) * len(c) / total
            events.append((cur, cur + d, c))
            cur += d
for _, sid, lines in TITLES:
    t = tim[sid]
    b = t['from'] / 30
    events.append((b + 1.0, b + min(t['frames'] / 30 - 1.0, 8.0), '\n'.join(lines)))
events.sort()
out = []
for k, (a, b, txt) in enumerate(events, 1):
    nxt = events[k][0] - 0.05 if k < len(events) else 900
    b = min(max(b, a + 1.2), nxt)
    out.append(f'{k}\n{ts(a)} --> {ts(b)}\n{txt if chr(10) in txt else wrap(txt)}\n')
os.makedirs('final', exist_ok=True)
open('final/Al_Fatih.en.srt', 'w', encoding='utf-8').write('\n'.join(out))
print(len(events), 'subtitles')
