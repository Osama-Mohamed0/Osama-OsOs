import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {EASE, fadeInOut, kf, noise1, ramp, rr} from '../lib/anim';
import {cue} from '../lib/cue';
import {SceneShell} from '../components/SceneShell';
import {Camera, Layer} from '../components/Camera';
import {Parchment, Svg} from '../components/Stage';
import {ArrowVolley, Banner, CavalryLine, DustCloud, InfantryRank} from '../components/Battle';
import {Fire, Flash, Lightning, Particles, SunRays, Wash} from '../components/FX';
import {Caption, DateCard, NameTag, Quote} from '../components/Cards';
import {OrnateFrame, Rosette} from '../components/Ornament';
import {Hills, Sky, Skyline, TentInterior, TentRow, ThroneHall} from '../components/Sets';
import {City, MapArrow, MapLabel, OldMap, Territory, viewAt} from '../components/OldMap';
import {Letter} from '../components/Letter';
import {Seg} from '../components/Seg';
import {Sprite} from '../components/Sprite';
import {Bayezid, Envoy, LOOK, Rider, Throne, Timur} from '../characters/cast';
import {Person} from '../characters/Person';
import {OTTOMAN_1400, TIMURID_1400} from '../data/mapData';
import {blob} from '../lib/shapes';

/* ------------------------------------------------------------ throne-room helper */
const Court: React.FC<{f: number; bayezidExpr?: 'confident' | 'anger' | 'neutral' | 'sad'; talk?: boolean; armFront?: [number, number]; standing?: boolean}> = ({
  f,
  bayezidExpr = 'confident',
  talk,
  armFront,
  standing,
}) => (
  <>
    <ThroneHall />
    <Throne x={960} y={770} scale={0.95} />
    {standing ? (
      <Bayezid x={960} y={780} scale={1.0} expression={bayezidExpr} talk={talk} armFront={armFront} t={f} />
    ) : (
      <Bayezid x={960} y={770 - 95} scale={0.95} pose="throne" expression={bayezidExpr} talk={talk} armFront={armFront} t={f} />
    )}
    {[260, 420, 1500, 1660].map((x, i) => (
      <Sprite key={x} unit={i % 2 ? 'ottomanCourtier' : 'janissary'} anim="stand" x={x} y={800 + (i % 2) * 20} scale={0.62} facing={x < 960 ? 'right' : 'left'} />
    ))}
  </>
);

/* =================================================================== S06 — the throne */
export const S06: React.FC = () => {
  const f = useCurrentFrame();
  const cCal = cue('S06', 'الخليفة', 0, 160);
  const cDanger = cue('S06', 'الخطر', 0, 470);
  const cSmall = cue('S06', 'أصغر', 0, 680);
  const dim = ramp(f, cDanger - 10, cDanger + 60);
  const shadow = ramp(f, cDanger + 20, 750, EASE.inOut);
  return (
    <SceneShell id="S06">
      <Camera
        keys={[
          {f: 0, x: 965, y: 470, z: 2.4},
          {f: cCal, x: 962, y: 520, z: 1.6},
          {f: cDanger, x: 960, y: 560, z: 1.05},
          {f: 750, x: 960, y: 600, z: 0.92},
        ]}
      >
        <Layer depth={1}>
          <Svg>
            <Court f={f} />
            {/* Constantinople ghost in the window */}
            <g opacity={0.5 * ramp(f, 60, 140)}>
              <Skyline kind="constantinople" x={1300} y={540} s={0.26} />
            </g>
            {/* a turquoise shadow creeps across the floor */}
            <path
              d={`M${2300 - shadow * 1500} 700 L2400 700 L2400 1300 L${2000 - shadow * 1500} 1300 Z`}
              fill={C.turqDeep}
              opacity={0.45 * shadow}
            />
          </Svg>
        </Layer>
        <Wash color={C.ink} opacity={0.45 * dim} />
        <Wash color={C.goldLight} opacity={0.25 * (1 - dim)} blend="screen" radial={[960, 300]} />
      </Camera>
      <DateCard text="بورصة" sub="عاصمة بايزيد" from={20} to={cCal - 10} />
      <Caption text="«سلطان الروم» — لقب طلبه من الخليفة العباسي في القاهرة" from={cCal + 20} to={cDanger - 10} y={940} size={38} />
    </SceneShell>
  );
};

/* =================================================================== S07 — the lame one */
export const S07: React.FC = () => {
  const f = useCurrentFrame();
  const cArrow = cue('S07', 'السهام', 0, 250);
  const cName = cue('S07', 'لنك', 0, 520);
  const cLaugh = cue('S07', 'يضحك', 0, 700);
  const flash = fadeInOut(f, cArrow - 10, cArrow + 110, 12);
  const tx = kf(f, [[0, 1500], [cLaugh - 20, 700]], EASE.soft);
  const walking = f < cLaugh - 20;
  return (
    <SceneShell id="S07">
      <Camera
        keys={[
          {f: 0, x: 1400, y: 560, z: 1.25},
          {f: cArrow, x: 1150, y: 560, z: 1.3},
          {f: cName, x: 950, y: 560, z: 1.1},
          {f: cLaugh, x: 730, y: 520, z: 1.7},
          {f: 803, x: 705, y: 510, z: 2.5},
        ]}
      >
        <Layer depth={0.1}>
          <Svg>
            <Sky mode="dawn" clouds={5} />
            <SunRays x={300} y={640} opacity={0.3} />
          </Svg>
        </Layer>
        <Layer depth={0.3}>
          <Svg>
            <Hills y={600} color={C.turqDeep} seed="st0" amp={160} stroke={C.ink} />
          </Svg>
        </Layer>
        <Layer depth={0.6}>
          <Svg>
            <Hills y={720} color={C.turq} seed="st1" amp={60} />
            <TentRow x={1500} y={720} n={4} gap={170} color={C.turq} s={0.45} seed="st-tents" />
          </Svg>
        </Layer>
        <Layer depth={1}>
          <Svg>
            <Hills y={860} color={C.goldDeep} seed="st2" amp={30} flowers />
            <Timur x={tx} y={900} scale={1.05} facing="left" pose={walking ? 'walk' : 'stand'} walkPhase={f / 9} expression={f > cLaugh ? 'confident' : 'neutral'} t={f} />
            <Particles kind="motes" count={40} seed="stm" />
          </Svg>
        </Layer>
        {/* flashback: arrows of Sistan */}
        <AbsoluteFill style={{opacity: flash}}>
          <AbsoluteFill style={{backgroundColor: C.ink, opacity: 0.6}} />
          <Svg>
            <ArrowVolley from={cArrow - 10} dur={30} count={18} x0={-200} x1={1000} y0={500} y1={760} waves={3} waveGap={22} seed="sist" arc={120} color={C.parchmentLight} />
          </Svg>
          <Wash color={C.red} opacity={0.35 * fadeInOut(f, cArrow + 15, cArrow + 40, 6)} blend="screen" />
        </AbsoluteFill>
      </Camera>
      <DateCard text="ما وراء النهر" sub="مولد تيمور قرب كِش ١٣٣٦" from={20} to={cArrow - 20} />
      <DateCard text="تيمور لنك" sub="بالفارسية: تيمور الأعرج" from={cName - 6} to={cLaugh + 40} corner="tl" />
    </SceneShell>
  );
};

/* =================================================================== S08 — the war machine */
export const S08: React.FC = () => {
  const f = useCurrentFrame();
  const cPersia = cue('S08', 'فارس', 0, 200);
  const cIraq = cue('S08', 'والعراق', 0, 240);
  const cHorde = cue('S08', 'الذهبية', 0, 330);
  const cDelhi = cue('S08', 'دلهي', 0, 430);
  const cElep = cue('S08', 'الحرب', 1, 560);
  const cSkull = cue('S08', 'الجماجم', 0, 800);
  const split = cElep - 10;
  return (
    <SceneShell id="S08">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <OldMap
          views={[viewAt(0, 'samarkand', 1400), viewAt(cPersia, [58, 37], 2500), viewAt(cDelhi + 40, [58, 36], 3100)]}
          cities={['samarkand', 'herat', 'isfahan', 'shiraz', 'baghdad', 'tabriz', 'sarai', 'delhi']}
          cityFrom={4}
        >
          <Territory d={blob(2440, 1000, 230, 'transox', 10, 0.3)} color={C.turq} from={20} dur={120} origin="samarkand" id="trx" />
          <City id="samarkand" from={0} glow={30} color={C.turqDeep} />
          <MapArrow via={['samarkand', 'herat', 'isfahan', 'shiraz']} from={cPersia - 20} dur={50} color={C.turq} width={14} />
          <MapArrow via={['isfahan', 'tabriz', 'baghdad']} from={cIraq} dur={50} color={C.turq} width={14} />
          <MapArrow via={['samarkand', [62, 45], 'sarai']} from={cHorde - 30} dur={55} color={C.turq} width={14} />
          <MapArrow via={['samarkand', [70, 34], 'delhi']} from={cDelhi - 30} dur={50} color={C.turq} width={14} />
          <City id="isfahan" from={0} burn={cPersia + 30} />
          <City id="baghdad" from={0} burn={cIraq + 50} />
          <City id="sarai" from={0} burn={cHorde + 25} />
          <City id="delhi" from={0} burn={cDelhi + 20} />
          <MapLabel at={[66.9, 41]} text="تيمور" from={10} color={C.turqDeep} size={46} />
          <MapLabel at={[49, 48.5]} text="القبيلة الذهبية" from={cHorde} color={C.inkSoft} size={40} />
          <MapLabel at={[52, 32.5]} text="فارس" from={cPersia} color={C.inkSoft} size={44} />
        </OldMap>
        <DateCard text="١٣٧٠ – ١٤٠٠" sub="ثلاثون عاماً من الفتوح" from={20} to={split - 10} />
      </Seg>
      <Seg from={split} to={893} fadeOut={0}>
        <Camera keys={[{f: split, x: 1100, y: 560, z: 1.1}, {f: 893, x: 820, y: 560, z: 1.25}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="sunset" clouds={3} />
            </Svg>
          </Layer>
          <Layer depth={0.4}>
            <Svg>
              <Hills y={720} color={C.redDeep} seed="el1" amp={60} stroke={C.ink} />
              <Fire x={300} y={700} scale={2} seed="el-f1" />
              <Fire x={1500} y={690} scale={1.6} seed="el-f2" />
            </Svg>
          </Layer>
          <Layer depth={0.8}>
            <Svg>
              <g opacity={0.95} style={{filter: 'brightness(0.12)'}}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Sprite key={i} unit="elephant" anim="walk" x={kf(f, [[split, 2100 + i * 330], [893, 700 + i * 330]], EASE.soft)} y={840} scale={0.8} facing="left" phase={f * 0.1 + i} />
                ))}
              </g>
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-300} y={860} width={2600} height={400} fill={C.ink} />
              {/* tower of skulls (silhouette) */}
              <g opacity={ramp(f, cSkull - 20, cSkull + 20)} transform="translate(1480 870)">
                {Array.from({length: 36}).map((_, i) => {
                  const row = Math.floor((-1 + Math.sqrt(1 + 8 * i)) / 2);
                  const k = i - (row * (row + 1)) / 2;
                  const n = row + 1;
                  return <circle key={i} cx={(k - (n - 1) / 2) * 30} cy={-260 + row * 30} r={15} fill={C.ink} stroke={C.redDeep} strokeWidth={1.5} />;
                })}
              </g>
              <Particles kind="ash" count={60} seed="elash" />
            </Svg>
          </Layer>
          <Wash color={C.red} opacity={0.15} />
        </Camera>
        <Caption text="فيلة الحرب الهندية — غنائم دلهي ١٣٩٨" from={split + 20} to={cSkull - 30} y={950} size={38} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S09 — one land, two kings */
export const S09: React.FC = () => {
  const f = useCurrentFrame();
  const cEnd = cue('S09', 'ومع', 0, 260);
  const cTouch = cue('S09', 'تلامست', 0, 420);
  const cKings = cue('S09', 'وملكان', 0, 560);
  const beat = Math.max(0, Math.sin((f - cKings) / 4.5)) ** 8;
  return (
    <SceneShell id="S09">
      <Seg from={0} to={cEnd + 10} fadeIn={0}>
        <Parchment drift={1} />
        <Camera keys={[{f: 0, z: 1.05}, {f: cEnd, z: 1.15}]}>
          <Layer depth={0.6}>
            <Svg>
              <g opacity={0.45}><Rosette x={960} y={520} r={360} color={C.gold} width={2} progress={ramp(f, 0, 80)} rot={f * 0.05} dot={false} /></g>
            </Svg>
          </Layer>
        </Camera>
        <Quote text="«كما أن في السماء إلهاً واحداً… فلا ينبغي أن يكون في الأرض إلا ملك واحد»" sub="قول يُنسب إلى تيمور" from={10} to={cEnd + 10} y={380} size={60} />
      </Seg>
      <Seg from={cEnd} to={cKings + 10}>
        <OldMap views={[viewAt(cEnd, [44, 38], 2700), viewAt(cTouch, [38.5, 39.6], 1300), viewAt(cKings + 10, [38.5, 39.6], 1150)]} cities={['bursa', 'samarkand', 'sivas', 'erzincan']} cityFrom={cEnd}>
          <Territory d={OTTOMAN_1400} color={C.red} from={cEnd + 10} dur={110} origin="bursa" id="o14" />
          <Territory d={TIMURID_1400} color={C.turq} from={cEnd + 10} dur={110} origin="samarkand" id="t14" />
          <City id="sivas" from={0} glow={cTouch} color={C.red} />
          <City id="erzincan" from={0} glow={cTouch + 10} color={C.turqDeep} />
          {f > cTouch && (
            <g>
              {Array.from({length: 10}).map((_, i) => {
                const a = rr('sp' + i, 0, Math.PI * 2);
                const life = (f - cTouch + i * 4) % 30;
                return <circle key={i} cx={1360 + Math.cos(a) * life * 4} cy={1000 + Math.sin(a) * life * 4} r={5} fill={C.goldLight} opacity={1 - life / 30} />;
              })}
            </g>
          )}
        </OldMap>
      </Seg>
      <Seg from={cKings} to={712} fadeOut={0}>
        <Parchment dark />
        <Svg>
          <OrnateFrame x={110} y={110} w={800} h={860} color={C.gold} inner={C.red} progress={ramp(f, cKings, cKings + 30)} />
          <OrnateFrame x={1010} y={110} w={800} h={860} color={C.gold} inner={C.turq} progress={ramp(f, cKings, cKings + 30)} />
          <defs>
            <clipPath id="s09l">
              <rect x={130} y={130} width={760} height={820} />
            </clipPath>
            <clipPath id="s09r">
              <rect x={1030} y={130} width={760} height={820} />
            </clipPath>
          </defs>
          <g clipPath="url(#s09l)">
            <rect x={130} y={130} width={760} height={820} fill={C.redDeep} />
            <Bayezid x={470 + kf(f, [[cKings, -60], [712, 0]]) } y={1880} scale={4.1 * (1 + beat * 0.01)} expression="anger" t={f} />
          </g>
          <g clipPath="url(#s09r)">
            <rect x={1030} y={130} width={760} height={820} fill={C.turqDeep} />
            <Timur x={1450 + kf(f, [[cKings, 60], [712, 0]])} y={1880} scale={4.1 * (1 + beat * 0.01)} facing="left" expression="confident" prop="none" t={f} />
          </g>
          <path d="M960 120 L960 980" stroke={C.gold} strokeWidth={4} />
        </Svg>
        <Wash color={C.red} opacity={0.18 * beat} blend="screen" />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S10 — refugees */
export const S10: React.FC = () => {
  const f = useCurrentFrame();
  const cEmirs = cue('S10', 'أمراء', 0, 120);
  const cJal = cue('S10', 'أحمد', 0, 420);
  const cQara = cue('S10', 'قره', 0, 520);
  const cHonor = cue('S10', 'فأكرمهما', 0, 690);
  const cErz = cue('S10', 'أرزنجان', 0, 870);
  const toHall = cHonor - 10;
  const toMap2 = cErz - 30;
  return (
    <SceneShell id="S10">
      <Seg from={0} to={toHall + 12} fadeIn={0}>
        <OldMap
          views={[viewAt(0, [38, 38], 2300), viewAt(cJal, [38, 36.5], 2400), viewAt(toHall, [33, 38.5], 1900)]}
          cities={['bursa', 'ankara', 'sivas', 'tabriz', 'karabakh', 'baghdad']}
          cityFrom={0}
        >
          {(['aydin', 'saruhan', 'germiyan', 'mentese'] as const).map((k, i) => (
            <MapArrow key={k} via={[[27.5 + i, 38.2 + (i % 2) * 0.6], 'sivas', 'karabakh']} from={cEmirs + i * 10} dur={150} color={C.inkFade} width={7} dashed />
          ))}
          <MapLabel at="karabakh" text="معسكر تيمور" from={cEmirs + 120} color={C.turqDeep} size={36} dx={150} dy={10} />
          <MapArrow via={['baghdad', [40, 36.5], 'aleppo', [35, 38.5], 'bursa']} from={cJal} dur={180} color={C.red} width={9} dashed />
          <MapLabel at="baghdad" text="أحمد الجلائري" from={cJal} color={C.redDeep} size={36} dy={-50} />
          <MapLabel at={[43, 39.2]} text="قره يوسف" from={cQara} color={C.redDeep} size={36} />
          <MapArrow via={[[43, 38.8], [38, 38.6], [33, 39.4], 'bursa']} from={cQara} dur={150} color={C.red} width={9} dashed />
        </OldMap>
      </Seg>
      <Seg from={toHall} to={toMap2 + 12}>
        <Camera keys={[{f: toHall, x: 960, y: 560, z: 1.0}, {f: toMap2, x: 900, y: 540, z: 1.15}]}>
          <Layer depth={1}>
            <Svg>
              <ThroneHall />
              <Bayezid x={1120} y={860} scale={1.05} facing="left" expression="confident" armFront={[70, 40]} armBack={[-50, -20]} t={f} />
              <Person look={{...LOOK.refugee, name: 'jalayir', robe: C.inkFade, headgear: 'princeTurban', hgCap: C.ink}} x={700} y={870} scale={1.0} expression="sad" t={f} />
              <Person look={{...LOOK.refugee, name: 'qarayusuf', robe: C.ink, robeShade: C.inkSoft, headgear: 'furCap', hgMain: C.ink, hgAccent: C.inkSoft, beardColor: C.beardBlack}} x={460} y={880} scale={1.0} expression="neutral" t={f} />
            </Svg>
          </Layer>
        </Camera>
        <NameTag text="أحمد الجلائري" x={700} y={360} from={toHall + 20} to={toMap2} color={C.inkSoft} size={34} />
        <NameTag text="قره يوسف" x={460} y={380} from={toHall + 30} to={toMap2} color={C.inkSoft} size={34} />
      </Seg>
      <Seg from={toMap2} to={995} fadeOut={0}>
        <OldMap views={[viewAt(toMap2, [35, 39.5], 1500), viewAt(995, [37.5, 39.7], 1250)]} cities={['bursa', 'ankara', 'sivas', 'erzincan']} cityFrom={toMap2}>
          <MapArrow via={['bursa', 'ankara', 'sivas', 'erzincan']} from={cErz} dur={60} color={C.red} width={10} />
          <City id="erzincan" from={0} glow={cErz + 50} color={C.turqDeep} />
          <MapLabel at="erzincan" text="الجزية!" from={cErz + 55} color={C.red} size={52} dy={-70} />
        </OldMap>
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S11 — the envoy */
export const S11: React.FC = () => {
  const f = useCurrentFrame();
  const kneel = ramp(f, 300, 320);
  const ex = kf(f, [[10, 120], [300, 760]], EASE.soft);
  return (
    <SceneShell id="S11">
      <Camera
        keys={[
          {f: 0, x: 520, y: 600, z: 1.35},
          {f: 300, x: 840, y: 580, z: 1.2},
          {f: 464, x: 900, y: 520, z: 1.6},
        ]}
      >
        <Layer depth={1}>
          <Svg>
            <Court f={f} />
            {kneel < 1 && <Envoy x={ex} y={900} scale={0.95} pose="walk" walkPhase={f / 8} t={f} armFront={[30, 60]} opacity={1 - kneel} />}
            {kneel > 0 && <Envoy x={760} y={910} scale={0.95} pose="kneel" armFront={[70, 100]} t={f} opacity={kneel} />}
          </Svg>
        </Layer>
        <Wash color={C.ink} opacity={0.15} />
      </Camera>
      <NameTag text="رسول تيمور" x={ex} y={420} from={60} to={280} color={C.turqDeep} size={36} />
    </SceneShell>
  );
};

/* =================================================================== S12 — Timur's letter */
export const S12: React.FC = () => {
  const f = useCurrentFrame();
  const cStart = cue('S12', 'اعلم', 0, 150);
  const narrEnd = 624;
  const lines = ['اعلم أن أكثر الأرض، من البحر إلى البحر، في قبضتنا،', 'وأن الملوك يقفون ببابنا.', 'فسلّم إلينا أعداءنا، ولا تتجاوز قدرك…', 'فإنك إن أبيت، فسترى ما لا تحب.'];
  const chars = lines.join('').length;
  const cps = (chars / Math.max(60, narrEnd - cStart - 20)) * 30;
  return (
    <SceneShell id="S12">
      <Parchment dark drift={1} />
      <Camera keys={[{f: 0, x: 960, y: 520, z: 0.95}, {f: cStart, x: 960, y: 500, z: 1.02}, {f: 648, x: 1000, y: 600, z: 1.12}]}>
        <Layer depth={1}>
          <Letter lines={lines} heading="من الأمير تيمور گورگان" from={6} unroll={40} writeFrom={cStart} cps={cps} accent={C.turqDeep} seal={C.ink} sealAt={narrEnd - 10} fontSize={50} note="(بتصرّف عن الحوليات)" />
        </Layer>
      </Camera>
    </SceneShell>
  );
};

/* =================================================================== S13 — the reply */
export const S13: React.FC = () => {
  const f = useCurrentFrame();
  const cLegend = cue('S13', 'وتقول', 0, 300);
  const cBlood = cue('S13', 'بالدم', 0, 600);
  const lines = ['لسنا ممن يسلّم من استجار به…', 'وما أنت إلا قاطع طريق،', 'فإن كنت رجلاً فاخرج إلينا…'];
  return (
    <SceneShell id="S13">
      <Seg from={0} to={cLegend + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 960, y: 520, z: 1.1}, {f: cLegend, x: 1000, y: 440, z: 1.9}]} shake={(t) => (t > 60 ? 2 : 0)}>
          <Layer depth={1}>
            <Svg>
              <Court f={f} standing bayezidExpr="anger" talk armFront={[85, 100]} />
              <Person look={LOOK.ottomanCourtier} x={1380} y={880} scale={0.9} pose="kneel" facing="left" prop="scroll" armFront={[60, 90]} t={f} lod={0} />
            </Svg>
          </Layer>
          <Wash color={C.red} opacity={0.2} />
        </Camera>
      </Seg>
      <Seg from={cLegend} to={658} fadeOut={0}>
        <Parchment dark />
        <Camera keys={[{f: cLegend, x: 960, y: 520, z: 1.0}, {f: 658, x: 920, y: 600, z: 1.1}]} shake={(t) => (t > cBlood - 4 && t < cBlood + 20 ? 10 : 1.5)}>
          <Layer depth={1}>
            <Letter lines={lines} heading="من السلطان بايزيد" from={cLegend} unroll={22} cps={16} ink={C.redDeep} accent={C.red} seal={C.red} sealAt={cBlood - 6} angry fontSize={54} note="(بتصرّف عن الروايات)" />
          </Layer>
        </Camera>
        <Flash at={cBlood - 6} color={C.redLight} peak={0.6} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S14 — the drums */
const KettleDrum: React.FC<{x: number; y: number; s?: number; hit: number}> = ({x, y, s = 1, hit}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-110 -80 C-110 40 110 40 110 -80 Z" fill={C.goldDeep} stroke={C.ink} strokeWidth={4} />
    <ellipse cx={0} cy={-80} rx={110} ry={26} fill={C.parchmentLight} stroke={C.ink} strokeWidth={4} />
    <ellipse cx={0} cy={-80} rx={110 * (1 + hit * 0.03)} ry={26 * (1 - hit * 0.3)} fill={C.parchmentDark} opacity={hit * 0.6} />
    {[-80, -40, 0, 40, 80].map((dx) => (
      <path key={dx} d={`M${dx} -72 L${dx * 0.6} 20`} stroke={C.ink} strokeWidth={2} opacity={0.5} />
    ))}
    <path d="M-110 -40 C-60 -20 60 -20 110 -40" stroke={C.turq} strokeWidth={8} fill="none" />
  </g>
);

export const S14: React.FC = () => {
  const f = useCurrentFrame();
  const cSilent = cue('S14', 'صامتا', 0, 60);
  const cClose = cue('S14', 'أغلق', 0, 120);
  const cDrums = cue('S14', 'الطبول', 0, 200);
  const cMarch = cue('S14', 'تحركت', 0, 320);
  const beatT = (f - cDrums) / 12;
  const hit = f > cDrums ? Math.max(0, 1 - (beatT % 1) * 3) : 0;
  return (
    <SceneShell id="S14">
      <Seg from={0} to={cDrums + 6} fadeIn={0} fadeOut={4}>
        <Camera keys={[{f: 0, x: 960, y: 560, z: 1.3}, {f: cSilent + 20, x: 1060, y: 580, z: 2.2}, {f: cClose, x: 1062, y: 575, z: 2.5}]}>
          <Layer depth={1}>
            <Svg>
              <TentInterior candle={[700, 720]} />
              <Timur x={1060} y={830} pose="throne" scale={1.05} expression={f > cSilent + 10 ? 'anger' : 'neutral'} prop={f < cClose ? 'scroll' : 'none'} armFront={f < cClose ? [40, 80] : undefined} t={f} />
            </Svg>
          </Layer>
          <Wash color={C.ink} opacity={0.35} />
        </Camera>
      </Seg>
      <Seg from={cDrums} to={cMarch + 12} fadeIn={2}>
        <Camera keys={[{f: cDrums, x: 960, y: 560, z: 1.25}, {f: cMarch, x: 960, y: 520, z: 1.05}]} shake={() => hit * 10}>
          <Layer depth={0.2}>
            <Svg>
              <Sky mode="storm" clouds={6} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              {[300, 960, 1620].map((x, i) => (
                <g key={i}>
                  <Person look={LOOK.timuridSoldier} x={x - 30} y={930} scale={0.95} armFront={[120 - hit * 80, 140 - hit * 90]} armBack={[-30, 30]} prop="none" t={f} lod={0} />
                  <KettleDrum x={x} y={1000} s={1.45} hit={hit} />
                </g>
              ))}
              {[150, 650, 1270, 1780].map((x, i) => (
                <Banner key={i} x={x} y={kf(f, [[cDrums, 1200], [cDrums + 40 + i * 8, 700]], EASE.out)} h={420} w={170} color={C.turq} accent={C.ink} emblem="threeRings" seed={'tb' + i} />
              ))}
            </Svg>
          </Layer>
        </Camera>
      </Seg>
      <Seg from={cMarch} to={514} fadeOut={0}>
        <Camera keys={[{f: cMarch, x: 1100, y: 540, z: 1.2}, {f: 514, x: 700, y: 520, z: 1.0}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="dawn" clouds={4} />
            </Svg>
          </Layer>
          <Layer depth={0.4}>
            <Svg>
              <Hills y={650} color={C.turqDeep} seed="m1" amp={80} />
              <CavalryLine who="timuridSoldier" n={14} x0={2400} x1={-200} y={660} from={cMarch - 30} dur={260} gap={120} scale={0.22} facing="left" gait="walk" seed="m14a" />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <Hills y={850} color={C.goldDeep} seed="m2" amp={30} />
              <CavalryLine who="timuridArcher" n={8} x0={2500} x1={300} y={930} from={cMarch - 30} dur={300} gap={220} scale={0.5} facing="left" seed="m14b" rows={2} rowGap={60} />
              <DustCloud x={600} y={980} w={1800} h={180} seed="m14d" opacity={0.4} />
            </Svg>
          </Layer>
        </Camera>
        <DateCard text="صيف ١٤٠٠" sub="تيمور يزحف غرباً" from={cMarch + 10} to={500} />
      </Seg>
    </SceneShell>
  );
};
