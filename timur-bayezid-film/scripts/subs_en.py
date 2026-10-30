"""English subtitles (SRT) timed to the recorded narration.
Each Arabic sentence has one English translation; its start = spoken start of the sentence's first word
(src/data/cues.ts), long sentences are split at commas proportionally. Output: final/Timur_vs_Bayezid.en.srt"""
import json, re, os
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

EN = {
 'S01': ["The evening of the twenty-eighth of July, 1402.", "A man in chains is led into a vast tent.", "Hours ago, he was master of an empire stretching from the Danube to the Euphrates. They called him: the Thunderbolt.", "Before him sits a lame old man who has never lost a battle in his life…", "So how does a thunderbolt fall?"],
 'S03': ["Thirteen years earlier, on the plain of Kosovo, Sultan Murad I was killed in the hour of victory.", "On that same field his son Bayezid took the throne, and ordered the death of his brother Yakub, so that no one would contest it.", "He was twenty-nine, fierce in battle, quick to anger…", "a man who could not wait."],
 'S04': ["Within a few years he swept over the Turkmen emirates of Anatolia one after another: Aydın, Saruhan, Menteşe, Germiyan, and then Karaman.", "He appeared with his army where no one expected him, crossing from Europe to Asia as if distance meant nothing.", "So the people named him Yıldırım: the Thunderbolt.", "But the deposed princes did not forget…", "and they carried their vengeance east."],
 'S05': ["Then Europe came for him.", "In 1396 the knights of Hungary, France and Germany marched in a great crusade; he met them at Nicopolis on the Danube and crushed them in a single day.", "At his side fought Stefan Lazarević, prince of the Serbs, son of the prince killed at Kosovo, who had become Bayezid's brother-in-law and his most loyal vassal.", "We will meet him again, in the Sultan's darkest hour."],
 'S06': ["Bayezid returned to Bursa crowned with glory, laid siege to Constantinople, and asked the Abbasid Caliph in Cairo for the title 'Sultan of Rum'.", "It seemed to him that no power on earth could stand against him.", "And that is exactly where the danger begins…", "when a man believes the world has grown smaller than he is."],
 'S07': ["But in the east there was a man who walked on only one sound leg.", "Timur was born near the city of Kesh, in Transoxiana.", "In his youth arrows struck his right leg and right hand, and he limped for the rest of his life.", "His enemies mocked him as Timur-i Lang: Timur the Lame.", "None of them laughed for long."],
 'S08': ["In thirty years he forged the tribes of Transoxiana into a war machine the world had not seen since Genghis Khan.", "He overran Persia and Iraq, crushed the Golden Horde on the northern steppes, and entered Delhi, returning with plunder and war elephants.", "Cities that resisted him became ruins, with towers of skulls rising at their gates."],
 'S09': ["He is credited with saying: just as there is one God in heaven, there should be only one king on earth.", "By the end of the century, the borders of the Thunderbolt and of the Lame had met in eastern Anatolia.", "One land…", "and two kings, neither of whom knew how to retreat."],
 'S10': ["The two courts became rival refuges.", "To Timur fled the Anatolian princes Bayezid had deposed, urging him to strike.", "To Bayezid fled Timur's enemies: Sultan Ahmad Jalayir, lord of Baghdad, and Qara Yusuf, chief of the Black Sheep Turkmen.", "The Sultan welcomed them and refused to hand them over.", "And on top of that, he demanded tribute from the emir of Erzincan, Timur's vassal."],
 'S11': ["So Timur sent his envoys to Bayezid's court, bearing a sealed letter.", "The chronicles say the words the two men exchanged struck harder than swords."],
 'S12': ["Timur wrote, as the chronicles paraphrase it: Know that most of the earth, from sea to sea, is in our grasp, and that kings stand at our door.", "Hand over our enemies, and do not overstep your measure…", "for if you refuse, you will see what you do not wish to see."],
 'S13': ["The reply came as fire.", "Bayezid scorned Timur as a highway robber, not a king, and dared him to come out and fight if he was a man.", "The chronicles say he sealed his letter with an insult against Timur's own household…", "an insult that, among Timur's people, only blood could wash away."],
 'S14': ["Timur read the letter in silence.", "Then he closed it…", "and ordered the drums to be beaten.", "In the summer of 1400, his armies moved west."],
 'S15': ["Sivas was the first step.", "Timur besieged it for eighteen days; his men tunnelled under the walls until they cracked, and the city surrendered on a promise that blood would be spared.", "But the promise did not cover the defenders: thousands of them were buried alive in the trenches.", "Ottoman chronicles say that Ertuğrul, Bayezid's son and governor of the city, was killed there on Timur's orders."],
 'S16': ["When the news reached the Sultan, it is said he wept for his son as he had wept for no one before, and swore revenge.", "But Timur did not wait for him.", "He turned south like a storm, took Aleppo, then Damascus, then returned to Baghdad and left it in rubble.", "He was securing his back before the great battle."],
 'S17': ["Bayezid seized on his absence, marched on Erzincan, and captured the family of its emir, Timur's vassal.", "It was a slap in the face of the Lame.", "Timur spent the winter on the pastures of Karabakh, preparing the greatest army of his life.", "And when spring came…", "there was nothing left to say."],
 'S18': ["In the spring of 1402, Bayezid lifted the siege of Constantinople and gathered his armies at Bursa: the Janissaries, the Sipahi cavalry, the Tatar horsemen, the troops of the emirates he had annexed, and the Serbian knights in their heavy armour.", "And with him, his sons: Süleyman, İsa, Musa and Mehmed."],
 'S19': ["The Sultan advanced east toward Tokat, waiting for his enemy on ground of his own choosing.", "But Timur did not come.", "He swung south through Kayseri and suddenly appeared behind the Ottoman army, besieging Ankara.", "The Thunderbolt, used to surprising his enemies…", "was surprised this time."],
 'S20': ["Bayezid turned back, on an exhausting march under the July heat.", "When his soldiers reached the plain of Çubuk near Ankara, they were burning with thirst.", "But Timur had reached the water first: he diverted the stream behind his camp and spoiled the wells along their route.", "The battle had already begun…", "before a single sword was drawn."],
 'S21': ["On the last night, the fires of both camps burned as far as the eye could see.", "Modern estimates put Bayezid's army at around a hundred thousand, and Timur's at more.", "And in the Ottoman ranks, the Tatar horsemen were whispering…", "for Timur's letters had reached them before his armies."],
 'S22': ["At dawn on the twenty-eighth of July, the two armies drew up.", "In the Ottoman centre stood Bayezid with the Janissaries; on his right the Serbs under Stefan; on his left Prince Süleyman with the Anatolian troops; and in the rear, Mehmed Çelebi.", "Facing them, Timur's grandson Muhammad Sultan led the vanguard, with the elephants before him.", "As for the Lame, he sat on a hill…", "watching."],
 'S23': ["The arrows fell like rain.", "Timurid horsemen struck the Ottoman wings wave after wave, shooting, withdrawing, and returning.", "The Ottomans answered bravely, and Süleyman's wing almost held.", "But thirst and the sun were fighting on Timur's side."],
 'S24': ["Then what had been plotted in the dark came to pass.", "The Tatar horsemen suddenly turned and fell upon their own comrades in arms.", "And when the riders of Aydın, Saruhan, Menteşe and Germiyan saw their former princes beckoning to them from Timur's ranks, they crossed over.", "Within a single hour, the entire left wing collapsed."],
 'S25': ["Only the right wing did not give way.", "The Serbs held firm in their iron armour and threw back attack after attack, until, it is said, Timur himself exclaimed: these poor wretches fight like lions.", "Stefan cut his way to the Sultan, begging him to withdraw while there was still time.", "Bayezid refused."],
 'S26': ["So Stefan protected Prince Süleyman and cleared him a path to the west.", "The sons scattered: Süleyman to Bursa, Mehmed to Amasya, and İsa wherever escape would take him.", "As for Musa, he was taken prisoner.", "And the father remained…", "alone."],
 'S27': ["On a small hill, about a thousand Janissaries gathered around Bayezid and fought until evening.", "The chronicles say the Sultan swung his axe with his own hand as enemies fell around him.", "When the last of his men had fallen, he tried to flee on horseback, but his horse stumbled…", "and the horsemen of Mahmud Khan surrounded him.", "And so, after thirteen years of victories…", "the Thunderbolt fell captive."],
 'S28': ["Bayezid was brought into Timur's tent.", "The chronicles say the Lame rose to receive him, seated him at his side, then reproached him for all that had happened: for the letters, for the pride, and for the blood that could have been spared.", "And the two men sat face to face: the master of Asia…", "and the Thunderbolt that had burned out."],
 'S29': ["Here the accounts diverge.", "It is said that Timur asked him: what would you have done with me had you captured me?", "Bayezid replied: I would have locked you in an iron cage.", "And Timur said: then that is your reward.", "Other historians believe he was carried in a latticed litter, and that the cage is a legend born of a misunderstood word.", "What is certain is that Timur's armies swept across Anatolia as far as Bursa, his capital…", "while he was a prisoner, powerless."],
 'S30': ["The Thunderbolt's heart could not bear the long captivity.", "On the eighth of March, 1403, Bayezid died at Akşehir, at about forty-three years of age.", "Some say of illness, some of grief, and some claim he poisoned himself.", "Timur released his son Musa to carry his father's body to Bursa…", "where he rests to this day."],
 'S31': ["But the cruellest legacy of Ankara was not the defeat, but what came after it.", "The state was divided among the brothers: Süleyman in Edirne, İsa in Bursa, Mehmed in Amasya, and then Musa.", "Eleven years of war between brothers, which historians call the Interregnum.", "İsa fell, then Süleyman, then Musa…", "until only Mehmed remained, and he reunited the state in 1413."],
 'S32': ["As for Timur, he did not outlive him for long.", "In the winter of 1405 he set out to conquer China, and died on the way, at Otrar.", "His empire was torn apart among his sons and grandsons, just as Bayezid's had been.", "And half a century after Ankara, Mehmed's grandson, Mehmed the Conqueror, entered Constantinople…", "the city that battle had spared for fifty years."],
 'S33': ["The two men met because the earth was too small for two kings.", "In the end, all that remained of them were two tombs: one in Bursa, and one in Samarkand.", "And between them, an old lesson the days repeat to every generation: a thunderbolt lights up the sky for a moment…", "but it never makes the dawn."],
}
TITLES = [(0, 'S02', ['THE THUNDERBOLT AND THE LAME', 'Bayezid I and Timur — the road to Ankara']),
          (0, 'S34', ['THE THUNDERBOLT AND THE LAME'])]

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
open('final/Timur_vs_Bayezid.en.srt', 'w', encoding='utf-8').write('\n'.join(out))
print(len(events), 'subtitles')
