import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {EASE, fadeInOut, kf, noise1, ramp} from '../lib/anim';
import {cue} from '../lib/cue';
import {blob} from '../lib/shapes';
import {SceneShell} from '../components/SceneShell';
import {Camera, Layer} from '../components/Camera';
import {Parchment, Svg} from '../components/Stage';
import {Flash, InkWipe, Lightning, Particles, SunRays, Wash} from '../components/FX';
import {ActCard, Caption, DateCard, NameTag, Quote, Reveal} from '../components/Cards';
import {Divider, Rosette, StarLattice} from '../components/Ornament';
import {Hills, Sky, TentInterior} from '../components/Sets';
import {ArrowVolley, Banner, CavalryLine, ClashSparks, DustCloud, InfantryRank} from '../components/Battle';
import {City, MapArrow, MapLabel, OldMap, Territory, pt, viewAt} from '../components/OldMap';
import {Seg} from '../components/Seg';
import {Bayezid, LOOK, Rider, Stefan, Timur} from '../characters/cast';
import {Person} from '../characters/Person';
import {BEYLIKS} from '../data/mapData';

/* =================================================================== S01 — the tent (hook) */
export const S01: React.FC = () => {
  const f = useCurrentFrame();
  const cBolt = cue('S01', 'الصاعقة', 0, 380);
  const cOld = cue('S01', 'شيخ', 0, 520);
  const cHow = cue('S01', 'فكيف', 0, 690);
  const walkEnd = 250;
  const bx = kf(f, [[30, -180], [walkEnd, 620]], EASE.soft);
  const kneel = ramp(f, walkEnd, walkEnd + 14);
  const gx = (o: number) => kf(f, [[40, -360 + o], [walkEnd + 20, 330 + o]], EASE.soft);
  return (
    <SceneShell id="S01" vignette={0.85} fadeIn={20}>
      <Camera
        keys={[
          {f: 0, x: 900, y: 640, z: 1.3},
          {f: walkEnd, x: 900, y: 620, z: 1.22},
          {f: cBolt - 30, x: 820, y: 620, z: 1.3},
          {f: cBolt + 30, x: 700, y: 560, z: 2.1},
          {f: cOld - 10, x: 760, y: 560, z: 1.6},
          {f: cOld + 40, x: 1330, y: 540, z: 2.2},
          {f: cHow - 10, x: 1280, y: 560, z: 1.8},
          {f: cHow + 60, x: 960, y: 640, z: 1.35},
        ]}
      >
        <Layer depth={1}>
          <Svg>
            <TentInterior candle={[985, 700]} />
            {/* low dais for Timur */}
            <path d="M1150 810 L1560 810 L1580 840 L1130 840 Z" fill={C.gold} stroke={C.ink} strokeWidth={3} />
            <path d="M1170 790 C1170 770 1540 770 1540 790 L1540 812 L1170 812 Z" fill={C.green} stroke={C.ink} strokeWidth={2.5} />
            <Timur x={1350} y={800} scale={1.1} pose="throne" facing="left" expression={f > cOld ? 'confident' : 'neutral'} prop="none" t={f} />
            {/* staff resting on the dais */}
            <path d="M1520 820 L1600 520" stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
            <path d="M1520 820 L1600 520" stroke={C.goldDeep} strokeWidth={5} strokeLinecap="round" />
            {/* guards */}
            <Person look={LOOK.timuridSoldier} x={gx(0)} y={790} scale={0.95} pose={f < walkEnd + 20 ? 'walk' : 'stand'} t={f} prop="spear" lod={0} />
            <Person look={LOOK.timuridSoldier} x={gx(-190)} y={780} scale={0.9} pose={f < walkEnd + 20 ? 'walk' : 'stand'} t={f + 30} prop="spear" lod={0} />
            {/* Bayezid: led in bound, then forced to kneel */}
            {kneel < 1 && (
              <Bayezid x={bx} y={810} scale={1.1} pose="walk" expression="sad" bound armBack={[28, 70]} armFront={[22, 66]} t={f} opacity={1 - kneel} prop="none" />
            )}
            {kneel > 0 && <Bayezid x={640} y={812} scale={1.1} pose="broken" expression="sad" bound t={f} opacity={kneel} prop="none" />}
          </Svg>
        </Layer>
        {/* night grade + candle light */}
        <Wash color={C.ink} opacity={0.5} />
        <Wash color={C.goldLight} opacity={0.42 + noise1('cand', f / 4) * 0.05} blend="screen" radial={[985, 640]} />
        <Flash at={cBolt} color={C.turqLight} peak={0.55} />
        <Flash at={cHow + 20} color={C.turqLight} peak={0.5} />
      </Camera>
      <DateCard text="٢٨ يوليو ١٤٠٢" sub="سهل أنقرة" from={30} to={250} />
    </SceneShell>
  );
};

/* =================================================================== S02 — title */
export const S02: React.FC = () => {
  const f = useCurrentFrame();
  const draw = ramp(f, 16, 90, EASE.out);
  const titleIn = ramp(f, 26, 70, EASE.out);
  return (
    <SceneShell id="S02" fadeIn={4} fadeOut={14} vignette={0.75}>
      <Parchment dark />
      <Camera keys={[{f: 0, z: 1.08}, {f: 270, z: 1.0}]}>
        <Layer depth={0.4}>
          <Svg>
            <StarLattice w={1920} h={1080} cell={180} color={C.gold} opacity={0.08 * draw} offset={f * 0.2} />
          </Svg>
        </Layer>
        <Layer depth={1}>
          <Svg>
            <Rosette x={960} y={470} r={360} progress={draw} color={C.gold} width={2.4} rot={f * 0.03} />
            <Rosette x={960} y={470} r={210} progress={draw} color={C.red} width={1.8} rot={-f * 0.05} />
            <Particles kind="embers" count={50} seed="t-emb" opacity={0.8} />
            <Lightning x1={1180} y1={-40} x2={900} y2={470} at={12} seed="tb1" />
          </Svg>
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
            <div style={{transform: `translateY(-70px) scale(${0.9 + titleIn * 0.1})`, opacity: titleIn, textAlign: 'center'}}>
              <div style={{fontFamily: FONT.title, fontSize: 190, color: C.goldLight, direction: 'rtl', textShadow: `0 0 40px ${C.red}, 0 6px 0 ${C.redDeep}`}}>
                الصاعقة والأعرج
              </div>
            </div>
          </AbsoluteFill>
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
            <div style={{transform: 'translateY(110px)', textAlign: 'center'}}>
              <Svg style={{position: 'relative', width: 1920, height: 50}} viewBox="0 0 1920 50">
                <Divider x={960} y={25} w={900} progress={ramp(f, 60, 100)} />
              </Svg>
              <Reveal from={80} dur={40}>
                <div style={{fontFamily: FONT.display, fontSize: 52, color: C.parchment}}>بايزيد الأول وتيمورلنك — الطريق إلى أنقرة</div>
              </Reveal>
            </div>
          </AbsoluteFill>
        </Layer>
      </Camera>
      <Flash at={12} color={C.goldLight} peak={0.6} />
    </SceneShell>
  );
};

/* =================================================================== S03 — Kosovo */
export const S03: React.FC = () => {
  const f = useCurrentFrame();
  const cMurad = cue('S03', 'مراد', 0, 200);
  const cBay = cue('S03', 'بايزيد', 0, 330);
  const cYaq = cue('S03', 'يعقوب', 0, 470);
  const cAge = cue('S03', 'التاسعة', 0, 560);
  const bannerFall = ramp(f, cMurad + 10, cMurad + 70, EASE.in);
  const yaq = 1 - ramp(f, cYaq, cYaq + 50);
  return (
    <SceneShell id="S03" fadeIn={0}>
      <Camera
        keys={[
          {f: 90, x: 760, y: 600, z: 1.25},
          {f: cBay, x: 900, y: 560, z: 1.0},
          {f: cYaq + 40, x: 980, y: 540, z: 1.05},
          {f: cAge, x: 1020, y: 470, z: 1.6},
          {f: 837, x: 1030, y: 430, z: 2.2},
        ]}
      >
        <Layer depth={0.15}>
          <Svg>
            <Sky mode="sunset" clouds={4} />
            <SunRays x={1500} y={560} opacity={0.3} color={C.goldLight} />
          </Svg>
        </Layer>
        <Layer depth={0.4}>
          <Svg>
            <Hills y={640} color={C.redDeep} seed="ko1" amp={80} stroke={C.ink} />
          </Svg>
        </Layer>
        <Layer depth={0.7}>
          <Svg>
            <Hills y={760} color={C.goldDeep} seed="ko2" amp={50} trees={6} treeColor={C.inkSoft} />
            <DustCloud x={-200} y={760} w={2400} h={160} seed="kod" opacity={0.35} color={C.inkFade} />
            {/* broken banners of the field */}
            <g transform="translate(300 790) rotate(-14)">
              <Banner x={0} y={0} h={260} w={120} color={C.navy} accent={C.silver} seed="kb1" scale={0.8} />
            </g>
            <g transform="translate(1650 800) rotate(18)">
              <Banner x={0} y={0} h={240} w={110} color={C.silverDeep} accent={C.navy} seed="kb2" scale={0.8} />
            </g>
          </Svg>
        </Layer>
        <Layer depth={1}>
          <Svg>
            <rect x={-400} y={830} width={2800} height={400} fill={C.inkSoft} />
            {/* Murad's banner falls */}
            <g transform={`translate(560 880) rotate(${bannerFall * -78})`}>
              <Banner x={0} y={0} h={420} w={190} color={C.red} accent={C.gold} seed="mb" />
            </g>
            {/* Yaqub fades like ink */}
            <g opacity={yaq * 0.85}>
              <Person look={{...LOOK.musa, name: 'yaqub', robe: C.inkSoft, robeShade: C.ink, pattern: 'none'}} x={1380} y={900} scale={0.95} facing="left" expression="sad" t={f} opacity={1} />
            </g>
            <Bayezid
              x={kf(f, [[cBay - 60, 820], [cBay + 40, 1000]], EASE.soft)}
              y={900}
              scale={1.05}
              pose={f < cBay + 40 && f > cBay - 60 ? 'walk' : 'stand'}
              expression={f > cAge ? 'anger' : 'confident'}
              prop={f > cAge ? 'swordDrawn' : 'sword'}
              armFront={f > cAge ? [60, -20] : undefined}
              t={f}
            />
            <Particles kind="ash" count={50} seed="koash" opacity={0.6} wind={0.4} />
          </Svg>
        </Layer>
        <Wash color={C.redDeep} opacity={0.18} />
      </Camera>
      <DateCard text="قوصوه ١٣٨٩" sub="مقتل مراد الأول" from={100} to={330} />
      <NameTag text="بايزيد" x={1000} y={300} from={cBay + 20} to={cYaq - 10} color={C.red} />
      <ActCard name="الفصل الأول" title="غرور القوة" from={0} to={96} />
    </SceneShell>
  );
};

/* =================================================================== S04 — the lightning (map) */
const BEY_ORDER: [keyof typeof BEYLIKS, string][] = [
  ['aydin', 'آيدين'],
  ['saruhan', 'صاروخان'],
  ['mentese', 'منتشا'],
  ['germiyan', 'كرميان'],
  ['karaman', 'قرمان'],
];

export const S04: React.FC = () => {
  const f = useCurrentFrame();
  const cYil = cue('S04', 'يلدرم', 0, 640);
  const cRev = cue('S04', 'المخلوعين', 0, 790);
  const hits = BEY_ORDER.map(([, w], i) => cue('S04', w, 0, 120 + i * 70));
  return (
    <SceneShell id="S04">
      <OldMap
        views={[
          viewAt(0, [29.5, 39.2], 1300),
          viewAt(hits[4] + 30, [31.5, 38.8], 1500),
          viewAt(cYil, [31.5, 39], 1650),
          viewAt(cRev + 20, [36, 39.4], 2300),
          viewAt(967, [40, 39.6], 2600),
        ]}
        cities={['bursa', 'edirne', 'constantinople', 'konya', 'ankara']}
        cityFrom={6}
      >
        {BEY_ORDER.map(([k, w], i) => {
          const b = BEYLIKS[k];
          return (
            <g key={k}>
              <Territory d={blob(b.x, b.y, k === 'karaman' ? 130 : 62, k, 10, 0.35)} color={C.red} from={hits[i]} dur={18} origin={b} id={'bt' + k} />
              <MapArrow via={['bursa', b]} from={hits[i] - 14} dur={14} zigzag color={C.red} width={10} fadeAt={hits[i] + 40} />
              <MapLabel at={b} text={w} from={hits[i]} color={C.redDeep} size={30} dy={k === 'mentese' ? 46 : k === 'saruhan' ? -30 : 8} dx={k === 'saruhan' ? -40 : k === 'germiyan' ? 30 : 0} />
            </g>
          );
        })}
        {/* deposed emirs slip east */}
        {(['saruhan', 'germiyan', 'aydin'] as const).map((k, i) => (
          <MapArrow key={k} via={[BEYLIKS[k], 'sivas', 'tabriz']} from={cRev + i * 12} dur={130} color={C.inkFade} width={7} dashed />
        ))}
      </OldMap>
      <Flash at={cYil} color={C.goldLight} peak={0.5} />
      <Quote text="يلدرم: الصاعقة" from={cYil} to={cYil + 110} y={760} size={84} color={C.redDeep} />
    </SceneShell>
  );
};

/* =================================================================== S05 — Nicopolis */
export const S05: React.FC = () => {
  const f = useCurrentFrame();
  const cCrush = cue('S05', 'وسحقهم', 0, 420);
  const cStef = cue('S05', 'ستيفان', 0, 520);
  const split = cStef - 20;
  return (
    <SceneShell id="S05">
      <Seg from={0} to={split + 10} fadeIn={0}>
        <Camera
          keys={[
            {f: 0, x: 1200, y: 520, z: 1.15},
            {f: 200, x: 1000, y: 540, z: 1.0},
            {f: cCrush - 20, x: 900, y: 560, z: 1.1},
            {f: cCrush + 20, x: 820, y: 560, z: 1.25},
          ]}
          shake={(t) => (t > cCrush - 30 && t < cCrush + 40 ? 9 : 0)}
        >
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="day" clouds={6} />
            </Svg>
          </Layer>
          <Layer depth={0.35}>
            <Svg>
              <Hills y={560} color={C.turqLight} seed="nk0" amp={90} stroke={C.turqDeep} />
              <path d="M-400 600 C200 580 900 620 2400 590 L2400 640 C900 660 200 630 -400 650 Z" fill={C.turq} opacity={0.7} />
              <text x={1500} y={630} fontFamily={FONT.display} fontSize={30} fill={C.turqDeep}>الدانوب</text>
            </Svg>
          </Layer>
          <Layer depth={0.65}>
            <Svg>
              <Hills y={720} color={C.greenLight} seed="nk1" amp={40} trees={5} />
              <InfantryRank look="janissary" n={20} x={-260} y={790} gap={56} scale={0.42} seed="nkj" />
              {[60, 380, 700].map((bx, i) => (
                <Banner key={i} x={bx} y={760} h={260} w={120} color={C.red} accent={C.gold} seed={'nb' + i} scale={0.8} />
              ))}
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={880} width={2800} height={300} fill={C.goldDeep} opacity={0.65} />
              <CavalryLine who="crusader" n={7} x0={2500} x1={1150} y={960} from={20} dur={cCrush - 40} gap={190} scale={0.62} facing="left" rows={2} rowGap={70} seed="cru" />
              <InfantryRank look="janissary" n={14} x={-120} y={1000} gap={78} scale={0.62} seed="nkf" prop="spear" />
              <ArrowVolley from={110} dur={44} count={36} x0={300} x1={1500} y0={760} y1={930} waves={3} waveGap={40} seed="nkv" arc={320} />
              {[0, 1, 2, 3, 4].map((i) => (
                <ClashSparks key={i} x={950 + i * 60} y={850 + (i % 2) * 40} at={cCrush - 30 + i * 6} seed={'nks' + i} />
              ))}
              <DustCloud x={700} y={1000} w={1600} h={220} seed="nkdu" opacity={0.5} />
              <Particles kind="dust" count={70} seed="nkd" opacity={0.8} wind={0.6} />
            </Svg>
          </Layer>
        </Camera>
        <DateCard text="نيكوبوليس ١٣٩٦" sub="سحق الحملة الصليبية" from={30} to={split - 20} />
      </Seg>
      <Seg from={split} to={1064} fadeOut={0}>
        <Camera keys={[{f: split, x: 900, y: 520, z: 1.25}, {f: 1064, x: 960, y: 560, z: 1.0}]}>
          <Layer depth={0.15}>
            <Svg>
              <Sky mode="sunset" clouds={4} />
              <SunRays x={980} y={620} opacity={0.35} />
            </Svg>
          </Layer>
          <Layer depth={0.5}>
            <Svg>
              <Hills y={700} color={C.redDeep} seed="nk3" amp={60} stroke={C.ink} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <Hills y={860} color={C.inkSoft} seed="nk4" amp={30} />
              <Banner x={760} y={880} h={380} w={170} color={C.red} accent={C.gold} seed="nkb5" />
              <Banner x={1260} y={880} h={360} w={160} color={C.navy} accent={C.silver} emblem="eagle" seed="nkb6" />
              <Bayezid x={880} y={900} scale={1.05} expression="confident" t={f} />
              <Stefan x={1120} y={905} scale={1.05} facing="left" expression="confident" t={f} prop="sword" />
              <Particles kind="motes" count={40} seed="nkm" />
            </Svg>
          </Layer>
          <Wash color={C.redDeep} opacity={0.15} />
        </Camera>
        <NameTag text="ستيفان لازاريفيتش" x={1130} y={330} from={cStef + 6} to={1040} color={C.navy} />
        <Caption text="ابن الأمير لازار الذي قُتل في قوصوه — صهر بايزيد وتابعه" from={cStef + 70} to={1040} y={930} size={38} />
      </Seg>
    </SceneShell>
  );
};
