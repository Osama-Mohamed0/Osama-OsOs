import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {EASE, fadeInOut, kf, noise1, ramp, rr} from '../lib/anim';
import {cue} from '../lib/cue';
import {SceneShell} from '../components/SceneShell';
import {Camera, Layer} from '../components/Camera';
import {Parchment, Svg} from '../components/Stage';
import {Banner, CavalryLine, DustCloud, InfantryRank} from '../components/Battle';
import {Fire, Flame, Flash, Particles, SunRays, Wash} from '../components/FX';
import {ActCard, Caption, DateCard, NameTag, Quote} from '../components/Cards';
import {Hills, Sky, Skyline, TentRow} from '../components/Sets';
import {City, MapArrow, MapLabel, OldMap, pt, viewAt} from '../components/OldMap';
import {Seg} from '../components/Seg';
import {Sprite} from '../components/Sprite';
import {Bayezid, Isa, LOOK, Mehmed, Musa, Rider, Suleyman, Timur} from '../characters/cast';
import {Person} from '../characters/Person';

/* =================================================================== S15 — Sivas */
export const S15: React.FC = () => {
  const f = useCurrentFrame();
  const cDig = cue('S15', 'وحفر', 0, 260);
  const cCrack = cue('S15', 'تصدعت', 0, 360);
  const cSurr = cue('S15', 'فاستسلمت', 0, 400);
  const cBuried = cue('S15', 'دفنوا', 0, 640);
  const cErt = cue('S15', 'أرطغرل', 0, 780);
  const crack = ramp(f, cCrack - 20, cCrack + 30);
  const dark = ramp(f, cBuried - 30, cBuried + 40);
  const fall = ramp(f, cErt + 10, cErt + 70, EASE.in);
  return (
    <SceneShell id="S15" fadeIn={0}>
      <Camera
        keys={[
          {f: 90, x: 960, y: 520, z: 1.05},
          {f: cDig, x: 900, y: 640, z: 1.35},
          {f: cCrack + 20, x: 960, y: 560, z: 1.15},
          {f: cBuried, x: 960, y: 600, z: 1.0},
          {f: cErt, x: 760, y: 700, z: 1.35},
          {f: 998, x: 740, y: 720, z: 1.6},
        ]}
        shake={(t) => (t > cCrack - 20 && t < cCrack + 30 ? 8 : 0)}
      >
        <Layer depth={0.1}>
          <Svg>
            <Sky mode={dark > 0.5 ? 'sunset' : 'storm'} clouds={6} />
          </Svg>
        </Layer>
        <Layer depth={0.5}>
          <Svg>
            <Hills y={560} color={C.inkFade} seed="sv0" amp={90} />
            <Skyline kind="sivas" x={960} y={720} s={0.95} />
            {/* cracks */}
            <g stroke={C.ink} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={600} strokeDashoffset={600 * (1 - crack)}>
              <path d="M760 720 L740 640 L770 580 L745 520 L770 470" />
              <path d="M1180 720 L1200 650 L1170 590 L1210 530" />
              <path d="M760 640 L700 610 M770 580 L820 560" />
            </g>
            {crack > 0.5 && <DustCloud x={600} y={720} w={800} h={160} seed="svd" opacity={0.6 * (1 - ramp(f, cCrack + 60, cCrack + 160))} />}
            {/* white flag of surrender */}
            {f > cSurr && (
              <g transform={`translate(960 ${430 - ramp(f, cSurr, cSurr + 30) * 40})`}>
                <Banner x={0} y={0} h={180} w={90} color={C.parchmentLight} accent={C.parchmentDark} seed="wf" scale={0.8} />
              </g>
            )}
          </Svg>
        </Layer>
        <Layer depth={1}>
          <Svg>
            <rect x={-400} y={820} width={2800} height={500} fill={C.goldDeep} />
            <TentRow x={-160} y={860} n={4} gap={260} color={C.turq} s={0.9} seed="svt" />
            {/* sappers */}
            {[1300, 1420, 1540].map((x, i) => (
              <Person key={i} look={LOOK.timuridSoldier} x={x} y={900 + i * 12} scale={0.62} facing="left" prop="axe" armFront={[90 + Math.sin(f / 5 + i) * 50, 110 + Math.sin(f / 5 + i) * 60]} t={f} />
            ))}
            {/* trench of the buried (no graphic violence: dark earth mounds) */}
            <g opacity={dark}>
              <path d="M200 1000 C600 980 1200 990 1800 1010 L1800 1040 C1200 1030 600 1020 200 1040 Z" fill={C.ink} />
              {Array.from({length: 14}).map((_, i) => (
                <ellipse key={i} cx={260 + i * 115} cy={1000} rx={60} ry={22} fill={C.inkSoft} />
              ))}
            </g>
            {/* Ertugrul's banner falls into the mud */}
            <g transform={`translate(720 1010) rotate(${-fall * 80})`} opacity={ramp(f, cErt - 30, cErt)}>
              <Banner x={0} y={0} h={360} w={160} color={C.red} accent={C.gold} seed="ert" />
            </g>
            <Particles kind="ash" count={70} seed="svash" opacity={dark} />
          </Svg>
        </Layer>
        <Wash color={C.redDeep} opacity={0.35 * dark} />
        <Wash color={C.ink} opacity={0.25 * dark} />
      </Camera>
      <DateCard text="سيواس" sub="أغسطس ١٤٠٠ — حصار ١٨ يوماً" from={110} to={cDig + 60} />
      <NameTag text="أرطغرل بن بايزيد" x={760} y={520} from={cErt} to={990} color={C.red} size={38} />
      <Caption text="تذكر الروايات العثمانية…" from={cErt - 20} to={cErt + 120} y={950} size={36} />
      <ActCard name="الفصل الثاني" title="الصدام" from={0} to={96} />
    </SceneShell>
  );
};

/* =================================================================== S16 — tears and storm */
export const S16: React.FC = () => {
  const f = useCurrentFrame();
  const cOath = cue('S16', 'وأقسم', 0, 170);
  const cTimur = cue('S16', 'لكن', 0, 230);
  const cAleppo = cue('S16', 'حلب', 0, 380);
  const cDam = cue('S16', 'دمشق', 0, 430);
  const cBag = cue('S16', 'بغداد', 0, 520);
  const split = cTimur - 6;
  return (
    <SceneShell id="S16">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Parchment dark />
        <Camera keys={[{f: 0, x: 960, y: 640, z: 1.45}, {f: cOath, x: 960, y: 600, z: 1.7}, {f: split, x: 960, y: 580, z: 1.85}]}>
          <Layer depth={1}>
            <Svg>
              <Flame x={1250} y={760} scale={0.9} seed="s16c" />
              <rect x={1238} y={760} width={24} height={110} fill={C.parchmentLight} stroke={C.ink} strokeWidth={2} />
              <g transform="translate(640 880) rotate(-6)">
                <Banner x={0} y={0} h={300} w={150} color={C.red} accent={C.gold} seed="s16b" wind={0.2} />
              </g>
              {f < cOath ? (
                <Bayezid x={960} y={880} pose="kneel" expression="sad" prop="none" armFront={[40, 80]} t={f} />
              ) : (
                <Bayezid x={960} y={880} expression="anger" prop="swordDrawn" armFront={[150, 170]} t={f} />
              )}
            </Svg>
          </Layer>
          <Wash color={C.goldLight} opacity={0.3} blend="screen" radial={[1250, 700]} />
        </Camera>
        <Flash at={cOath} color={C.redLight} peak={0.35} />
      </Seg>
      <Seg from={split} to={725} fadeOut={0}>
        <OldMap views={[viewAt(split, 'sivas', 1500), viewAt(cDam, [39, 35.5], 2000), viewAt(725, [41, 35.5], 2200)]} cities={['sivas', 'malatya', 'aleppo', 'damascus', 'baghdad']} cityFrom={split}>
          <MapArrow via={['sivas', 'malatya', 'aleppo']} from={split + 20} dur={cAleppo - split - 10} color={C.turq} width={13} />
          <MapArrow via={['aleppo', [37.5, 34.8], 'damascus']} from={cAleppo + 10} dur={cDam - cAleppo + 5} color={C.turq} width={13} />
          <MapArrow via={['damascus', [40.5, 33.6], 'baghdad']} from={cDam + 20} dur={cBag - cDam} color={C.turq} width={13} />
          <City id="aleppo" burn={cAleppo + 10} />
          <City id="damascus" burn={cDam + 15} />
          <City id="baghdad" burn={cBag + 10} />
          <MapLabel at="aleppo" text="١٤٠٠" from={cAleppo + 10} dy={-70} color={C.turqDeep} size={30} />
          <MapLabel at="damascus" text="١٤٠١" from={cDam + 15} dy={-70} color={C.turqDeep} size={30} />
          <MapLabel at="baghdad" text="١٤٠١" from={cBag + 10} dy={-70} color={C.turqDeep} size={30} />
        </OldMap>
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S17 — Erzincan & Karabakh */
export const S17: React.FC = () => {
  const f = useCurrentFrame();
  const cErz = cue('S17', 'أرزنجان', 0, 70);
  const cSlap = cue('S17', 'صفعة', 0, 200);
  const cKar = cue('S17', 'قراباغ', 0, 300);
  const split = cSlap + 50;
  return (
    <SceneShell id="S17">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <OldMap views={[viewAt(0, [34, 39.5], 1500), viewAt(split, [38, 39.5], 1300)]} cities={['bursa', 'ankara', 'sivas', 'erzincan']} cityFrom={0}>
          <MapArrow via={['bursa', 'ankara', 'sivas', 'erzincan']} from={cErz - 30} dur={50} color={C.red} width={12} zigzag />
          <City id="erzincan" glow={cErz + 25} color={C.red} />
          <MapLabel at="erzincan" text="١٤٠١" from={cErz + 25} dy={-70} color={C.redDeep} size={40} />
        </OldMap>
        <Flash at={cSlap} color={C.redLight} peak={0.3} />
      </Seg>
      <Seg from={split} to={674} fadeOut={0}>
        <Camera keys={[{f: split, x: 700, y: 540, z: 1.2}, {f: 674, x: 1250, y: 560, z: 1.05}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="winter" clouds={5} />
            </Svg>
          </Layer>
          <Layer depth={0.4}>
            <Svg>
              <Hills y={600} color={C.silverLight} seed="kb0" amp={140} stroke={C.silverDeep} />
              <TentRow x={-200} y={640} n={14} gap={170} color={C.turq} s={0.35} seed="kbt0" fires />
            </Svg>
          </Layer>
          <Layer depth={0.75}>
            <Svg>
              <Hills y={760} color={C.white} seed="kb1" amp={40} stroke={C.silverDeep} />
              <TentRow x={-300} y={800} n={11} gap={260} color={C.turq} s={0.75} seed="kbt1" fires />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={900} width={2800} height={400} fill={C.silverLight} />
              {Array.from({length: 8}).map((_, i) => (
                <Sprite key={i} unit="timuridSoldier" anim="ride" x={200 + i * 260} y={980 + (i % 2) * 20} scale={0.55} facing={i % 3 ? 'right' : 'left'} />
              ))}
              <Rider who="timur" x={kf(f, [[split, 200], [674, 1400]], EASE.soft)} y={1060} scale={0.75} gait="walk" t={f} prop="none" />
              <Particles kind="snow" count={120} seed="kbs" wind={0.6} />
            </Svg>
          </Layer>
          <Wash color={C.turqDeep} opacity={0.18} />
        </Camera>
        <DateCard text="قراباغ" sub="شتاء ١٤٠١ – ١٤٠٢" from={split + 10} to={660} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S18 — the muster */
export const S18: React.FC = () => {
  const f = useCurrentFrame();
  const units = [
    {w: 'الإنكشارية', label: 'الإنكشارية', x: 500},
    {w: 'السباهية', label: 'السباهية', x: 1250},
    {w: 'التتار', label: 'فرسان التتار', x: 2000},
    {w: 'الإمارات', label: 'عساكر الإمارات', x: 2750},
    {w: 'الصرب', label: 'الفرسان الصرب', x: 3500},
  ].map((u, i) => ({...u, at: cue('S18', u.w, 0, 150 + i * 80)}));
  const cSons = cue('S18', 'أبناؤه', 0, 640);
  const names = ['سليمان', 'وعيسى', 'وموسى', 'ومحمد'].map((w, i) => cue('S18', w, 0, cSons + 20 + i * 25));
  const camX = kf(f, [[0, 300], ...units.map((u) => [u.at + 10, u.x] as [number, number]), [cSons - 10, 3700]], EASE.inOut);
  const split = cSons - 10;
  return (
    <SceneShell id="S18">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: camX, y: 560, z: 1.0}, {f: split, x: camX, y: 560, z: 1.0}]} ease={(t) => t}>
          <CamFollow x={camX} />
        </Camera>
        {units.map((u, i) => (
          <NameTag key={i} text={u.label} x={960} y={180} from={u.at} to={(units[i + 1]?.at ?? split) - 6} color={C.redDeep} size={50} />
        ))}
        <DateCard text="بورصة — ربيع ١٤٠٢" sub="الحشد الكبير" from={10} to={units[1].at - 10} corner="tl" />
      </Seg>
      <Seg from={split} to={847} fadeOut={0}>
        <Camera keys={[{f: split, x: 960, y: 560, z: 1.2}, {f: 847, x: 960, y: 600, z: 1.0}]}>
          <Layer depth={0.15}>
            <Svg>
              <Sky mode="day" clouds={4} />
            </Svg>
          </Layer>
          <Layer depth={0.5}>
            <Svg>
              <Hills y={640} color={C.greenLight} seed="ms3" amp={70} trees={6} />
              <Skyline kind="bursa" x={960} y={660} s={0.7} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={880} width={2800} height={400} fill={C.goldDeep} opacity={0.7} />
              <Banner x={960} y={900} h={520} w={200} color={C.red} accent={C.gold} seed="ms-b" />
              <Bayezid x={960} y={930} scale={0.95} expression="confident" t={f} />
              <Suleyman x={420} y={960} scale={0.88} expression="confident" opacity={ramp(f, names[0], names[0] + 12)} t={f} />
              <Isa x={650} y={960} scale={0.86} opacity={ramp(f, names[1], names[1] + 12)} t={f} />
              <Musa x={1270} y={960} scale={0.86} facing="left" opacity={ramp(f, names[2], names[2] + 12)} t={f} />
              <Mehmed x={1500} y={960} scale={0.84} facing="left" expression="confident" opacity={ramp(f, names[3], names[3] + 12)} t={f} />
            </Svg>
          </Layer>
        </Camera>
        {['سليمان', 'عيسى', 'موسى', 'محمد'].map((n, i) => (
          <NameTag key={n} text={n} x={[420, 650, 1270, 1500][i]} y={950} above={false} from={names[i]} to={847} color={C.redDeep} size={36} />
        ))}
      </Seg>
    </SceneShell>
  );
};

/** The parade strip used in S18 (world 4200 px wide). */
const CamFollow: React.FC<{x: number}> = () => {
  const f = useCurrentFrame();
  return (
    <>
      <Layer depth={0.2}>
        <Svg>
          <Sky mode="day" clouds={8} w={6000} x={-600} />
        </Svg>
      </Layer>
      <Layer depth={0.5}>
        <Svg>
          <Hills y={620} color={C.greenLight} seed="mst" amp={70} w={6000} x={-600} trees={14} />
          <Skyline kind="bursa" x={1200} y={640} s={0.6} />
        </Svg>
      </Layer>
      <Layer depth={1}>
        <Svg>
          <rect x={-600} y={860} width={6000} height={400} fill={C.goldDeep} opacity={0.7} />
          <InfantryRank look="janissary" n={14} x={-60} y={880} gap={70} scale={0.5} march seed="pj1" />
          <InfantryRank look="janissary" n={13} x={-20} y={990} gap={78} scale={0.6} march seed="pj2" />
          <CavalryLine who="sipahi" n={6} x0={1500} x1={1580} y={950} from={0} dur={900} gap={170} scale={0.55} gait="walk" seed="psp" rows={2} rowGap={60} />
          <CavalryLine who="tatar" n={6} x0={2250} x1={2330} y={950} from={0} dur={900} gap={170} scale={0.55} gait="walk" seed="ptt" rows={2} rowGap={60} />
          <CavalryLine who="refugee" n={6} x0={3000} x1={3080} y={950} from={0} dur={900} gap={170} scale={0.55} gait="walk" seed="pbe" rows={2} rowGap={60} />
          <CavalryLine who="serbKnight" n={6} x0={3750} x1={3830} y={950} from={0} dur={900} gap={170} scale={0.58} gait="walk" seed="psr" rows={2} rowGap={60} />
          {[200, 900, 1500, 2250, 3000, 3750].map((x, i) => (
            <Banner
              key={i}
              x={x}
              y={850}
              h={300}
              w={130}
              color={[C.red, C.red, C.red, C.goldDeep, C.inkFade, C.navy][i]}
              accent={i === 5 ? C.silver : C.gold}
              emblem={i === 5 ? 'eagle' : 'none'}
              seed={'pb' + i}
              scale={0.9}
            />
          ))}
          <Particles kind="dust" count={60} seed="pdust" w={4400} />
        </Svg>
      </Layer>
    </>
  );
};

/* =================================================================== S19 — the manoeuvre */
export const S19: React.FC = () => {
  const f = useCurrentFrame();
  const cTokat = cue('S19', 'توقات', 0, 60);
  const cNot = cue('S19', 'يأت', 0, 240);
  const cKay = cue('S19', 'قيصرية', 0, 330);
  const cAnk = cue('S19', 'أنقرة', 0, 450);
  const cSurp = cue('S19', 'فوجئت', 0, 620);
  return (
    <SceneShell id="S19">
      <OldMap
        views={[viewAt(0, [33.5, 39.8], 1300), viewAt(cNot, [35.5, 39.5], 1250), viewAt(cAnk, [34.5, 39.3], 1200), viewAt(701, [33.5, 39.6], 950)]}
        cities={['bursa', 'ankara', 'tokat', 'sivas', 'kayseri']}
        cityFrom={0}
      >
        <MapArrow via={['bursa', [31, 40.2], 'ankara', [35, 40.4], 'tokat']} from={cTokat - 50} dur={80} color={C.red} width={12} />
        {f > cNot && (
          <text x={0} y={0} transform={`translate(${pt('tokat')[0] - 25} ${pt('tokat')[1] - 50}) scale(${1 + Math.sin(f / 6) * 0.06})`} fontFamily={FONT.title} fontSize={110} fill={C.red} stroke={C.parchmentLight} strokeWidth={6} paintOrder="stroke" opacity={ramp(f, cNot, cNot + 15)}>
            ؟
          </text>
        )}
        <MapArrow via={['sivas', [36.3, 38.9], 'kayseri', [34.2, 39.1], [33.3, 39.6], 'ankara']} from={cKay - 40} dur={cAnk - cKay + 40} color={C.turq} width={13} />
        <City id="ankara" glow={cAnk} color={C.turqDeep} size={1.3} />
      </OldMap>
      <Flash at={cSurp} color={C.goldLight} peak={0.35} />
      <Caption text="الصاعقة… فوجئت هذه المرة" from={cSurp - 10} to={700} y={880} size={56} />
    </SceneShell>
  );
};

/* =================================================================== S20 — thirst */
export const S20: React.FC = () => {
  const f = useCurrentFrame();
  const cCubuk = cue('S20', 'چوبوق', 0, 200);
  const cWater = cue('S20', 'سبقهم', 0, 420);
  const cBattle = cue('S20', 'كانت', 0, 640);
  const split = cWater - 20;
  const divert = ramp(f, cWater + 10, cWater + 120);
  return (
    <SceneShell id="S20">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 1200, y: 560, z: 1.15}, {f: cCubuk, x: 900, y: 600, z: 1.3}, {f: split, x: 760, y: 600, z: 1.6}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="heat" clouds={1} />
              <SunRays x={960} y={60} opacity={0.5} color={C.parchmentLight} n={18} />
            </Svg>
          </Layer>
          <Layer depth={0.5}>
            <Svg>
              <Hills y={620} color={C.gold} seed="th0" amp={60} />
              <InfantryRank look="janissary" n={20} x={1000 - f * 0.6} y={700} gap={60} scale={0.3} march facing="left" seed="thr1" />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={800} width={2800} height={500} fill={C.goldDeep} />
              <InfantryRank look="janissary" n={12} x={1250 - f * 1.1} y={930} gap={110} scale={0.62} march facing="left" seed="thr2" />
              {/* a soldier tips an empty waterskin */}
              <g transform="translate(760 0)">
                <Person look={LOOK.janissary} x={0} y={980} scale={0.95} facing="left" expression="sad" prop="none" armFront={[150, 150 + Math.sin(f / 10) * 10]} t={f} lod={0} />
                <ellipse cx={-38} cy={600} rx={20} ry={30} fill={C.horseBay} stroke={C.ink} strokeWidth={2.5} transform={`rotate(${30 + Math.sin(f / 10) * 8} -38 600)`} />
              </g>
              <DustCloud x={400} y={1020} w={1800} h={160} seed="thd" opacity={0.45} color={C.gold} />
            </Svg>
          </Layer>
          <Wash color={C.goldLight} opacity={0.22 + noise1('heat', f / 10) * 0.03} blend="screen" />
        </Camera>
        <DateCard text="يوليو ١٤٠٢" sub="سهل چوبوق قرب أنقرة" from={cCubuk - 10} to={split - 10} />
      </Seg>
      <Seg from={split} to={803} fadeOut={0}>
        <Camera keys={[{f: split, x: 960, y: 560, z: 1.25}, {f: cBattle, x: 960, y: 560, z: 1.0}, {f: 803, x: 900, y: 600, z: 1.1}]}>
          <Layer depth={0.15}>
            <Svg>
              <Sky mode="heat" clouds={2} />
            </Svg>
          </Layer>
          <Layer depth={0.5}>
            <Svg>
              <Hills y={560} color={C.gold} seed="dm0" amp={50} />
              <TentRow x={1250} y={590} n={6} gap={140} color={C.turq} s={0.45} seed="dmt" />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={640} width={2800} height={700} fill={C.goldDeep} />
              {/* old bed drying & cracking */}
              <path d="M-300 900 C200 860 600 940 960 880" stroke={C.turq} strokeWidth={70 * (1 - divert) + 4} fill="none" strokeLinecap="round" opacity={1 - divert * 0.7} />
              <g stroke={C.ink} strokeWidth={2} opacity={divert}>
                {Array.from({length: 18}).map((_, i) => (
                  <path key={i} d={`M${-250 + i * 70} ${890 + rr('cr' + i, -20, 20)} l${rr('crx' + i, -20, 20)} ${rr('cry' + i, -25, 25)} l${rr('crz' + i, 10, 30)} ${rr('crw' + i, -10, 10)}`} />
                ))}
              </g>
              {/* new channel toward the Timurid camp */}
              <path d="M960 880 C1200 820 1500 760 2300 700" stroke={C.turq} strokeWidth={70 * divert + 4} fill="none" strokeLinecap="round" strokeDasharray={1600} strokeDashoffset={1600 * (1 - divert)} />
              <path d="M2300 700 C1500 760 1200 820 960 880" stroke={C.turqLight} strokeWidth={10} fill="none" strokeDasharray="30 50" strokeDashoffset={-f * 4} opacity={divert * 0.7} />
              {/* dam of rocks */}
              <g>
                {Array.from({length: 12}).map((_, i) => (
                  <ellipse key={i} cx={930 + (i % 4) * 26 - 30} cy={850 + Math.floor(i / 4) * 22} rx={24} ry={16} fill={C.inkFade} stroke={C.ink} strokeWidth={2} opacity={ramp(f, cWater + i * 5, cWater + i * 5 + 10)} />
                ))}
              </g>
              {[820, 1100].map((x, i) => (
                <Person key={i} look={LOOK.timuridSoldier} x={x} y={900 + i * 30} scale={0.7} facing={i ? 'left' : 'right'} prop="none" armFront={[60 + Math.sin(f / 6 + i) * 40, 100]} t={f} />
              ))}
            </Svg>
          </Layer>
        </Camera>
        <Caption text="تيمور يحوّل مجرى الماء خلف معسكره" from={cWater + 20} to={cBattle - 10} y={960} size={38} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S21 — the last night */
export const S21: React.FC = () => {
  const f = useCurrentFrame();
  const cNum = cue('S21', 'تقدر', 0, 200);
  const cTatar = cue('S21', 'التتار', 0, 470);
  const split = cTatar - 30;
  const beat = Math.max(0, Math.sin(f / 4.5)) ** 10;
  return (
    <SceneShell id="S21">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 600, y: 540, z: 1.15}, {f: split, x: 1350, y: 560, z: 1.05}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="night" clouds={3} moon={[1500, 180]} />
            </Svg>
          </Layer>
          <Layer depth={0.4}>
            <Svg>
              <Hills y={620} color={C.navyDeep} seed="nt0" amp={90} stroke={C.ink} />
              {Array.from({length: 60}).map((_, i) => (
                <circle key={i} cx={rr('nf' + i, -200, 2200)} cy={rr('nfy' + i, 640, 720)} r={3 + noise1('nfl' + i, f / 4)} fill={i % 2 ? C.goldLight : C.redLight} opacity={0.7 + 0.3 * noise1('nfo' + i, f / 3)} />
              ))}
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={800} width={2800} height={500} fill={C.ink} />
              <TentRow x={-250} y={860} n={5} gap={210} color={C.red} s={0.8} seed="ntr" fires />
              <TentRow x={1350} y={860} n={6} gap={210} color={C.turq} s={0.8} seed="ntt" fires />
            </Svg>
          </Layer>
          <Wash color={C.navyDeep} opacity={0.35} />
        </Camera>
        <DateCard text="ليلة ٢٧ يوليو ١٤٠٢" sub="سهل أنقرة" from={10} to={cNum - 10} />
        <Caption text="العثمانيون: نحو ١٠٠ ألف — التيموريون: أكثر من ذلك (تقديرات حديثة)" from={cNum} to={split} y={930} size={36} />
      </Seg>
      <Seg from={split} to={797} fadeOut={0}>
        <Camera keys={[{f: split, x: 960, y: 600, z: 1.1}, {f: 797, x: 1010, y: 560, z: 1.5}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="night" clouds={2} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={850} width={2800} height={500} fill={C.ink} />
              <Flame x={960} y={900} scale={1.8} seed="ntf" />
              <Person look={LOOK.tatar} x={760} y={930} scale={1.05} expression="neutral" lod={0} prop="none" armFront={[40, 90]} headTilt={8} t={f} />
              <Person look={LOOK.tatar} x={1180} y={930} scale={1.05} facing="left" expression="confident" lod={0} prop="scroll" armFront={[30, 70]} headTilt={8} t={f} />
            </Svg>
          </Layer>
          <Wash color={C.navyDeep} opacity={0.45} />
          <Wash color={C.goldLight} opacity={0.35 + noise1('ntw', f / 3) * 0.05} blend="screen" radial={[960, 820]} />
          <Wash color={C.red} opacity={0.12 * beat} blend="screen" />
        </Camera>
        <Caption text="رسائل تيمور تصل قبل جيوشه…" from={split + 40} to={760} y={90} size={38} />
      </Seg>
    </SceneShell>
  );
};
