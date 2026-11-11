import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {EASE, kf, noise1, ramp, rr} from '../lib/anim';
import {cue, sceneLen} from '../lib/cue';
import {SceneShell} from '../components/SceneShell';
import {Camera, Layer} from '../components/Camera';
import {Parchment, Svg} from '../components/Stage';
import {Flash, Lightning, Particles, SunRays, Wash, Flame} from '../components/FX';
import {ActCard, Caption, DateCard, NameTag, Quote, Reveal} from '../components/Cards';
import {Divider, Rosette, StarLattice} from '../components/Ornament';
import {Hills, Sky, ThroneHall, TentInterior} from '../components/Sets';
import {Banner, DustCloud, InfantryRank} from '../components/Battle';
import {City, MapArrow, MapLabel, OldMap, Territory, viewAt} from '../components/OldMap';
import {Seg} from '../components/Seg';
import {Sprite} from '../components/Sprite';
import {ByzantineHall, CityPlan, GreatCannon, HagiaSophia, Ox, RumeliHisari, Ship, TheodosianWalls} from '../components/FatihSets';
import {Aksemseddin, Constantine, Halil, LOOK, Mehmed2, MehmedBoy, Murad2, Orban, Rider, Throne} from '../characters/cast';
import {Person} from '../characters/Person';
import {OTTOMAN_1400} from '../data/mapData';

/* =================================================================== S01 — before the walls */
export const S01: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S01');
  const cCity = cue('S01', 'خلفها', 0, 330);
  const cChange = cue('S01', 'سيتغير', 0, 620);
  return (
    <SceneShell id="S01" vignette={0.8} fadeIn={20}>
      <Camera keys={[{f: 0, x: 1200, y: 560, z: 1.35}, {f: cCity, x: 960, y: 500, z: 1.0}, {f: cChange, x: 760, y: 620, z: 1.4}, {f: L, x: 700, y: 640, z: 1.6}]}>
        <Layer depth={0.05}>
          <Svg>
            <Sky mode="night" clouds={3} moon={[1560, 170]} />
          </Svg>
        </Layer>
        <Layer depth={0.55}>
          <Svg>
            <TheodosianWalls x={-300} y={700} w={2600} torches tone="night" />
          </Svg>
        </Layer>
        <Layer depth={1}>
          <Svg>
            <rect x={-400} y={900} width={2800} height={400} fill={C.ink} />
            {Array.from({length: 14}).map((_, i) => (
              <Flame key={i} x={rr('cf' + i, -200, 2200)} y={rr('cfy' + i, 930, 1060)} scale={0.4} seed={'cf' + i} glow={i % 3 === 0} />
            ))}
            <Rider who="mehmed2" x={720} y={1040} scale={0.95} gait="stand" t={f} expression="confident" prop="none" />
          </Svg>
        </Layer>
        <Wash color={C.navyDeep} opacity={0.4} />
      </Camera>
      <DateCard text="٢٨ مايو ١٤٥٣" sub="أمام أسوار القسطنطينية" from={30} to={cCity + 60} />
    </SceneShell>
  );
};

/* =================================================================== S02 — title */
export const S02: React.FC = () => {
  const f = useCurrentFrame();
  const draw = ramp(f, 10, 90, EASE.out);
  const tin = ramp(f, 30, 80, EASE.out);
  return (
    <SceneShell id="S02" fadeIn={4} fadeOut={14} vignette={0.75}>
      <Parchment dark />
      <Camera keys={[{f: 0, z: 1.08}, {f: 270, z: 1.0}]}>
        <Layer depth={0.4}>
          <Svg>
            <StarLattice w={1920} h={1080} cell={180} color={C.gold} opacity={0.07 * draw} offset={f * 0.2} />
          </Svg>
        </Layer>
        <Layer depth={1}>
          <Svg>
            <g opacity={0.35 * draw}>
              <HagiaSophia x={960} y={760} s={0.9} minarets={draw} tone={C.inkSoft} />
            </g>
            <g opacity={0.5}>
              <Rosette x={960} y={420} r={330} progress={draw} color={C.gold} width={2} rot={f * 0.03} dot={false} />
            </g>
            <Particles kind="motes" count={50} seed="ft" />
          </Svg>
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
            <div style={{transform: `translateY(-80px) scale(${0.9 + tin * 0.1})`, opacity: tin, fontFamily: FONT.title, fontSize: 230, color: C.goldLight, direction: 'rtl', textShadow: `0 6px 0 ${C.greenDeep}, 0 0 40px ${C.ink}`}}>
              الفاتح
            </div>
          </AbsoluteFill>
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
            <div style={{transform: 'translateY(110px)', textAlign: 'center'}}>
              <Svg style={{position: 'relative', width: 1920, height: 50}} viewBox="0 0 1920 50">
                <Divider x={960} y={25} w={800} progress={ramp(f, 60, 100)} />
              </Svg>
              <Reveal from={80} dur={40}>
                <div style={{fontFamily: FONT.display, fontSize: 52, color: C.parchment}}>محمد الثاني وسقوط القسطنطينية</div>
              </Reveal>
            </div>
          </AbsoluteFill>
        </Layer>
      </Camera>
      <Flash at={28} color={C.goldLight} peak={0.35} />
    </SceneShell>
  );
};

/* =================================================================== S03 — the city */
export const S03: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S03');
  const cArabs = cue('S03', 'العرب', 0, 300);
  const cFall = cue('S03', 'تسقط', 0, 520);
  const cWalls = cue('S03', 'أسوارها', 1, 700);
  return (
    <SceneShell id="S03" fadeIn={0}>
      <Camera keys={[{f: 90, x: 980, y: 540, z: 0.95}, {f: cArabs, x: 960, y: 560, z: 1.0}, {f: cWalls, x: 760, y: 600, z: 1.25}, {f: L, x: 780, y: 590, z: 1.18}]} breathe={0.6}>
        <Layer depth={1}>
          <Svg>
            <rect x={-300} y={-200} width={2520} height={1500} fill={C.parchment} />
            <CityPlan ancientSieges={ramp(f, cArabs, cFall + 30)} chain={0} />
          </Svg>
        </Layer>
      </Camera>
      <Caption text="«هذه المدينة لا تسقط»" from={cFall - 10} to={cWalls} y={920} size={44} />
      <ActCard name="الفصل الأول" title="الحلم" from={0} to={96} />
    </SceneShell>
  );
};

/* =================================================================== S04 — half a century */
export const S04: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S04');
  const cNow = cue('S04', 'والآن', 0, 380);
  return (
    <SceneShell id="S04">
      <OldMap views={[viewAt(0, [32, 39.5], 2000), viewAt(cNow, [28.5, 40.5], 1100), viewAt(L, [28.98, 41.0], 800)]} cities={['ankara', 'bursa', 'edirne', 'constantinople']} cityFrom={0}>
        <City id="ankara" glow={20} color={C.turqDeep} />
        <MapLabel at="ankara" text="أنقرة ١٤٠٢" from={20} dy={-60} color={C.turqDeep} size={40} />
        <Territory d={OTTOMAN_1400} color={C.red} from={cNow - 120} dur={140} origin="bursa" id="ott" />
        <City id="constantinople" glow={cNow} color={C.purple} size={1.4} />
      </OldMap>
      <DateCard text="١٤٠٢ ← ١٤٥٣" sub="خمسون عاماً بعد أنقرة" from={cNow} to={L - 10} />
    </SceneShell>
  );
};

/* =================================================================== S05 — the young prince */
export const S05: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S05');
  const cThrone = cue('S05', 'تنازل', 0, 230);
  const cVarna = cue('S05', 'فارنا', 0, 450);
  const cHalil = cue('S05', 'خليل', 0, 640);
  const back = f > cVarna;
  return (
    <SceneShell id="S05">
      <Camera keys={[{f: 0, x: 960, y: 520, z: 1.15}, {f: cThrone, x: 960, y: 480, z: 1.6}, {f: cVarna, x: 960, y: 540, z: 1.05}, {f: cHalil, x: 1100, y: 500, z: 1.35}, {f: L, x: 1250, y: 520, z: 1.5}]}>
        <Layer depth={1}>
          <Svg>
            <ThroneHall />
            <Throne x={960} y={770} scale={0.95} />
            {!back ? (
              <MehmedBoy x={960} y={675} scale={0.78} pose="throne" expression="neutral" t={f} />
            ) : (
              <Murad2 x={960} y={675} scale={0.95} pose="throne" expression="confident" t={f} />
            )}
            {f > cHalil - 40 && <Halil x={1230} y={850} scale={0.95} facing="left" expression="confident" talk={f > cHalil} t={f} />}
            {back && <MehmedBoy x={kf(f, [[cHalil, 600], [L, 200]], EASE.soft)} y={880} scale={0.8} pose={f > cHalil ? 'walk' : 'stand'} facing="left" expression="sad" t={f} />}
          </Svg>
        </Layer>
        <Wash color={C.ink} opacity={0.2 * ramp(f, cHalil, L)} />
      </Camera>
      <DateCard text="أدرنة ١٤٣٢" sub="مولد محمد بن مراد الثاني" from={20} to={cThrone - 10} />
      <DateCard text="فارنا ١٤٤٤" sub="عودة مراد الثاني" from={cVarna} to={cHalil - 10} />
      <NameTag text="خليل باشا الجندرلي" x={1230} y={380} from={cHalil + 10} to={L - 10} color={C.inkSoft} size={36} />
    </SceneShell>
  );
};

/* =================================================================== S06 — formative years */
export const S06: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S06');
  const cLang = cue('S06', 'تعلم', 0, 120);
  const cAk = cue('S06', 'آق', 0, 400);
  const cHadith = cue('S06', 'لتفتحن', 0, 760);
  return (
    <SceneShell id="S06" vignette={0.75}>
      <Camera keys={[{f: 0, x: 900, y: 560, z: 1.3}, {f: cAk, x: 960, y: 540, z: 1.05}, {f: cHadith, x: 820, y: 520, z: 1.5}, {f: L, x: 800, y: 500, z: 1.7}]}>
        <Layer depth={1}>
          <Svg>
            <TentInterior night={false} candle={[960, 700]} />
            {/* desk with books & a drawing of the walls */}
            <rect x={600} y={760} width={720} height={40} fill={C.horseBay} stroke={C.ink} strokeWidth={3} />
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={640 + i * 46} y={700 - (i % 2) * 14} width={40} height={60 + (i % 2) * 14} fill={[C.red, C.green, C.navy, C.goldDeep][i]} stroke={C.ink} strokeWidth={2} />
            ))}
            <g transform="translate(1060 700)">
              <rect x={-130} y={-60} width={260} height={60} fill={C.parchmentLight} stroke={C.ink} strokeWidth={2} />
              <path d="M-110 -10 L-110 -40 L-80 -40 L-80 -50 L-50 -50 L-50 -40 L50 -40 L50 -50 L80 -50 L80 -40 L110 -40 L110 -10 Z" fill="none" stroke={C.redDeep} strokeWidth={3} opacity={ramp(f, cAk, cAk + 60)} />
            </g>
            <Mehmed2 x={760} y={900} scale={0.95} expression="confident" prop="none" armFront={[70, 40]} t={f} />
            <Aksemseddin x={1360} y={900} scale={0.95} facing="left" expression="confident" talk={f > cAk && f < cHadith + 120} armFront={[80, 60]} t={f} />
          </Svg>
        </Layer>
        <Wash color={C.goldLight} opacity={0.25} blend="screen" radial={[960, 640]} />
      </Camera>
      <DateCard text="مانيسا" sub="سنوات الإبعاد" from={20} to={cLang + 80} />
      <NameTag text="آق شمس الدين" x={1360} y={420} from={cAk} to={cHadith - 20} color={C.greenDeep} size={36} />
      <Quote text="«لَتُفتحنَّ القسطنطينية…»" sub="حديث يتناقله الناس" from={cHadith} to={L - 10} y={120} size={66} color={C.parchmentLight} />
    </SceneShell>
  );
};

/* =================================================================== S07 — the young sultan */
export const S07: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S07');
  const cEurope = cue('S07', 'تنفست', 0, 300);
  const cMistake = cue('S07', 'أكبر', 0, 560);
  return (
    <SceneShell id="S07">
      <Seg from={0} to={cEurope + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 960, y: 560, z: 1.0}, {f: cEurope, x: 960, y: 470, z: 1.6}]}>
          <Layer depth={1}>
            <Svg>
              <ThroneHall />
              <Throne x={960} y={770} scale={0.95} color={C.green} />
              <Mehmed2 x={960} y={675} scale={0.95} pose="throne" expression="confident" t={f} />
              {[300, 470, 1450, 1620].map((x, i) => (
                <Sprite key={x} unit={i % 2 ? 'ottomanCourtier' : 'janissary'} anim="stand" x={x} y={820} scale={0.62} facing={x < 960 ? 'right' : 'left'} />
              ))}
            </Svg>
          </Layer>
        </Camera>
        <DateCard text="فبراير ١٤٥١" sub="محمد الثاني سلطاناً في التاسعة عشرة" from={20} to={cEurope - 10} />
      </Seg>
      <Seg from={cEurope} to={L} fadeOut={0}>
        <Parchment />
        <Camera keys={[{f: cEurope, x: 960, y: 540, z: 1.05}, {f: L, x: 960, y: 540, z: 1.2}]}>
          <Layer depth={1}>
            <Svg>
              {/* European kings as shadows laughing over a map */}
              {[420, 760, 1160, 1500].map((x, i) => (
                <g key={i} opacity={0.85} style={{filter: 'brightness(0.15)'}}>
                  <Person look={{...LOOK.crusader, name: 'king' + i, headgear: 'serbCirclet'}} x={x} y={900 + Math.sin(f / 6 + i) * 4} scale={0.9} facing={x < 960 ? 'right' : 'left'} expression="confident" t={f} lod={0} />
                </g>
              ))}
              <g opacity={ramp(f, cMistake - 10, cMistake + 20)}>
                <rect x={-100} y={-100} width={2200} height={1300} fill={C.red} opacity={0.18} />
              </g>
            </Svg>
          </Layer>
        </Camera>
        <Caption text="«شابٌّ قليل الخبرة لا يُخشى»" from={cEurope + 20} to={cMistake} y={120} size={44} />
        <Quote text="وكان ذلك أكبر أخطائهم" from={cMistake} to={L - 4} y={430} size={76} color={C.redDeep} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S08 — the last emperor */
export const S08: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S08');
  const cTest = cue('S08', 'يختبر', 0, 380);
  const cPretext = cue('S08', 'الذريعة', 0, 700);
  return (
    <SceneShell id="S08">
      <Camera keys={[{f: 0, x: 960, y: 500, z: 1.5}, {f: cTest, x: 960, y: 560, z: 1.05}, {f: cPretext, x: 980, y: 480, z: 1.6}, {f: L, x: 980, y: 470, z: 1.8}]}>
        <Layer depth={1}>
          <Svg>
            <ByzantineHall />
            <Throne x={960} y={770} scale={0.95} color={C.purple} />
            <Constantine x={960} y={675} scale={0.95} pose="throne" expression={f > cTest ? 'confident' : 'sad'} talk={f > cTest && f < cPretext} t={f} />
            {[350, 1570].map((x, i) => (
              <Sprite key={x} unit="byzSoldier" anim="stand" x={x} y={830} scale={0.66} facing={i ? 'left' : 'right'} />
            ))}
          </Svg>
        </Layer>
        <Wash color={C.ink} opacity={0.25} />
      </Camera>
      <NameTag text="قسطنطين الحادي عشر باليولوغوس" x={960} y={250} from={30} to={cTest - 10} color={C.purpleDeep} size={40} />
      <Caption text="تهديد بإطلاق الأمير أورخان منافساً على العرش" from={cTest + 40} to={cPretext} y={940} size={36} />
    </SceneShell>
  );
};

/* =================================================================== S09 — the strait cutter */
export const S09: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S09');
  const cBuild = cue('S09', 'بدأ', 0, 160);
  const cDone = cue('S09', 'ارتفعت', 0, 560);
  const cName = cue('S09', 'قاطعة', 0, 680);
  const build = ramp(f, cBuild, cDone + 20, EASE.inOut);
  const day = (f / 18) % 1;
  return (
    <SceneShell id="S09">
      <Camera keys={[{f: 0, x: 900, y: 540, z: 1.1}, {f: cDone, x: 960, y: 520, z: 1.0}, {f: cName, x: 1000, y: 480, z: 1.25}, {f: L, x: 980, y: 520, z: 1.05}]}>
        <Layer depth={0.1}>
          <Svg>
            <Sky mode={build < 1 && Math.sin(day * Math.PI * 2) < -0.6 ? 'dusk' : 'day'} clouds={5} />
          </Svg>
        </Layer>
        <Layer depth={0.4}>
          <Svg>
            <Hills y={600} color={C.greenLight} seed="as" amp={70} trees={6} />
            <g transform="translate(1600 640) scale(0.4)" opacity={0.9}>
              <RumeliHisari x={0} y={0} build={1} />
            </g>
          </Svg>
        </Layer>
        <Layer depth={1}>
          <Svg>
            <path d="M-400 700 C300 680 1200 720 2400 690 L2400 1300 L-400 1300 Z" fill={C.turq} />
            <path d="M-400 760 C300 740 1200 780 2400 750" stroke={C.turqLight} strokeWidth={4} opacity={0.5} fill="none" />
            <path d="M200 860 C500 620 1100 560 1500 560 L1800 880 Z" fill={C.green} stroke={C.ink} strokeWidth={2} />
            <RumeliHisari x={1000} y={760} s={1} build={build} />
            {build < 1 &&
              Array.from({length: 8}).map((_, i) => (
                <Sprite key={i} unit="janissary" anim="walk" x={600 + i * 110} y={800 + (i % 2) * 14} scale={0.35} facing={i % 2 ? 'left' : 'right'} phase={f / 6 + i} />
              ))}
            <Particles kind="dust" count={30} seed="rh" opacity={1 - build} />
          </Svg>
        </Layer>
      </Camera>
      <DateCard text="ربيع ١٤٥٢" sub="البوسفور" from={20} to={cBuild + 120} />
      <DateCard text="روملي حصار" sub="«بوغاز كسن»: قاطعة المضيق" from={cDone} to={L - 10} />
    </SceneShell>
  );
};

/* =================================================================== S10 — the first message */
export const S10: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S10');
  const cSink = cue('S10', 'أغرقتها', 0, 280);
  const cMsg = cue('S10', 'فهمت', 0, 400);
  const sink = ramp(f, cSink + 6, cSink + 110, EASE.in);
  return (
    <SceneShell id="S10">
      <Camera keys={[{f: 0, x: 960, y: 560, z: 1.05}, {f: cSink, x: 1100, y: 600, z: 1.3}, {f: L, x: 1150, y: 600, z: 1.15}]} shake={(t) => (t > cSink && t < cSink + 20 ? 8 : 0)}>
        <Layer depth={0.1}>
          <Svg>
            <Sky mode="dusk" clouds={5} />
          </Svg>
        </Layer>
        <Layer depth={0.5}>
          <Svg>
            <path d="M-400 620 C200 560 600 520 900 600 L900 1300 L-400 1300 Z" fill={C.greenDeep} />
            <g transform="translate(300 640) scale(0.55)">
              <RumeliHisari x={0} y={0} build={1} />
            </g>
            <GreatCannon x={560} y={640} s={0.25} fire={cSink - 4} facing="right" />
          </Svg>
        </Layer>
        <Layer depth={1}>
          <Svg>
            <path d="M-400 700 C300 690 1200 710 2400 700 L2400 1300 L-400 1300 Z" fill={C.turqDeep} />
            <g transform={`translate(0 ${sink * 260})`} opacity={1 - sink * 0.7}>
              <Ship x={kf(f, [[0, 1900], [cSink, 1250]], EASE.soft)} y={780} s={0.9} facing="left" kind="carrack" flag={C.red} sail={C.parchmentLight} t={f} tilt={sink * 24} />
            </g>
            <path d="M-400 760 C300 750 1200 770 2400 760 L2400 1300 L-400 1300 Z" fill={C.turqDeep} opacity={0.6} />
            <Particles kind="sparks" count={20} seed="sk" x={1150} y={600} w={200} h={200} opacity={ramp(f, cSink, cSink + 5) * (1 - ramp(f, cSink + 20, cSink + 40))} />
          </Svg>
        </Layer>
      </Camera>
      <DateCard text="نوفمبر ١٤٥٢" sub="مدافع القلعة تغرق سفينة بندقية" from={cSink + 20} to={cMsg + 60} />
      <Quote text="هذا الشابّ لا يلعب" from={cMsg + 40} to={L - 4} y={140} size={70} color={C.parchmentLight} />
    </SceneShell>
  );
};

/* =================================================================== S11 — Orban */
export const S11: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S11');
  const cSultan = cue('S11', 'السلطان', 0, 400);
  const cAsk = cue('S11', 'أتقدر', 0, 560);
  const cYes = cue('S11', 'نعم', 0, 700);
  const split = cSultan - 10;
  return (
    <SceneShell id="S11">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 960, y: 540, z: 1.15}, {f: split, x: 980, y: 500, z: 1.35}]}>
          <Layer depth={1}>
            <Svg>
              <ByzantineHall />
              <Constantine x={1240} y={880} scale={0.95} facing="left" expression="sad" t={f} />
              <Orban x={680} y={880} scale={1.0} expression="confident" armFront={[70, 30]} talk t={f} />
            </Svg>
          </Layer>
        </Camera>
        <NameTag text="أوربان المجري" x={680} y={370} from={30} to={split} color={C.inkSoft} size={36} />
      </Seg>
      <Seg from={split} to={L} fadeOut={0}>
        <Camera keys={[{f: split, x: 960, y: 560, z: 1.05}, {f: cAsk, x: 1150, y: 480, z: 1.6}, {f: cYes, x: 760, y: 480, z: 1.7}, {f: L, x: 900, y: 520, z: 1.2}]}>
          <Layer depth={1}>
            <Svg>
              <rect x={-300} y={-200} width={2520} height={1500} fill={C.inkSoft} />
              <path d="M300 700 C500 600 900 600 1100 700 L1100 900 L300 900 Z" fill={C.ink} />
              <ellipse cx={700} cy={780} rx={220} ry={40} fill={C.redLight} opacity={0.6 + noise1('mlt', f / 5) * 0.2} />
              <Flame x={700} y={760} scale={2} seed="forge" />
              <Particles kind="embers" count={60} seed="fe" x={400} y={300} w={600} h={500} />
              <Mehmed2 x={1300} y={900} scale={1.0} facing="left" expression="confident" talk={f > cAsk && f < cYes - 10} t={f} />
              <Orban x={860} y={900} scale={1.0} expression="confident" talk={f > cYes - 6 && f < cYes + 20} t={f} />
            </Svg>
          </Layer>
          <Wash color={C.redLight} opacity={0.2} blend="screen" radial={[700, 760]} />
        </Camera>
        <Caption text="«أتقدر أن تهدم أسوار القسطنطينية؟» — «نعم»" from={cAsk} to={L - 6} y={940} size={40} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S12 — the great bombard */
export const S12: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S12');
  const cDrag = cue('S12', 'وجرته', 0, 330);
  const cEnd = cue('S12', 'كان', 0, 560);
  const split = cDrag - 10;
  return (
    <SceneShell id="S12">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 1300, y: 600, z: 1.6}, {f: split, x: 960, y: 560, z: 1.0}]}>
          <Layer depth={1}>
            <Svg>
              <rect x={-300} y={-200} width={2520} height={1500} fill={C.inkSoft} />
              <rect x={-300} y={820} width={2520} height={500} fill={C.ink} />
              <GreatCannon x={960} y={820} s={1.4} glow={0.5 + noise1('cg', f / 6) * 0.3} />
              <Orban x={330} y={830} scale={0.8} expression="confident" armFront={[60, 20]} t={f} />
              <Particles kind="embers" count={40} seed="ce" />
            </Svg>
          </Layer>
          <Wash color={C.redLight} opacity={0.18} blend="screen" radial={[960, 700]} />
        </Camera>
        <DateCard text="المدفع العظيم" sub="نحو ٨ أمتار — قذائف بمئات الكيلوغرامات" from={30} to={split - 6} />
      </Seg>
      <Seg from={split} to={L} fadeOut={0}>
        <Camera keys={[{f: split, x: 600, y: 540, z: 1.2}, {f: cEnd, x: 1100, y: 560, z: 1.0}, {f: L, x: 1500, y: 600, z: 1.3}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="winter" clouds={5} />
            </Svg>
          </Layer>
          <Layer depth={0.4}>
            <Svg>
              <Hills y={640} color={C.silverLight} seed="cr" amp={80} stroke={C.silverDeep} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={860} width={3200} height={400} fill={C.parchmentDark} />
              {(() => {
                const x0 = kf(f, [[split, -200], [L, 900]], (t) => t);
                return (
                  <g>
                    {Array.from({length: 7}).map((_, i) => (
                      <Ox key={i} x={x0 + 700 + i * 160} y={940 + (i % 2) * 20} s={0.6} t={f} phase={i} />
                    ))}
                    <GreatCannon x={x0} y={960} s={0.75} />
                    {Array.from({length: 6}).map((_, i) => (
                      <Sprite key={'p' + i} unit="bashibozuk" anim="walk" x={x0 - 320 + i * 60} y={990} scale={0.45} phase={f / 6 + i} />
                    ))}
                  </g>
                );
              })()}
              <DustCloud x={-300} y={1000} w={2600} h={160} seed="cd" opacity={0.4} color={C.parchmentDark} />
              <Particles kind="snow" count={60} seed="cs" wind={0.3} />
            </Svg>
          </Layer>
        </Camera>
        <DateCard text="شتاء ١٤٥٣" sub="من أدرنة إلى القسطنطينية" from={split + 20} to={cEnd} />
      </Seg>
    </SceneShell>
  );
};
