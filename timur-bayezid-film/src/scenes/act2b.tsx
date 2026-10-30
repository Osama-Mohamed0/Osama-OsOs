import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {EASE, fadeInOut, kf, noise1, ramp, rr} from '../lib/anim';
import {cue, narrEnd as narrEndOf, narrStart, sceneLen} from '../lib/cue';
import {SceneShell} from '../components/SceneShell';
import {Camera, Layer} from '../components/Camera';
import {Parchment, Svg} from '../components/Stage';
import {ArrowVolley, Banner, CavalryLine, ClashSparks, DustCloud, InfantryRank} from '../components/Battle';
import {Flash, Particles, SunRays, Wash} from '../components/FX';
import {Caption, DateCard, NameTag, Quote} from '../components/Cards';
import {Rosette} from '../components/Ornament';
import {Hills, MiniCloud, Sky} from '../components/Sets';
import {City, MapArrow, MapLabel, OldMap, pt, viewAt} from '../components/OldMap';
import {Seg} from '../components/Seg';
import {Sprite} from '../components/Sprite';
import {Bayezid, Elephant, LOOK, MuhammadSultan, Rider, Stefan, Timur} from '../characters/cast';
import {Person} from '../characters/Person';

/* ------------------------------------------------------------ top-down formation diagram */
type BlockSpec = {x: number; y: number; w: number; h: number; color: string; label: string; at: number; kind?: 'inf' | 'cav' | 'ele'; dx?: number; dy?: number; fade?: number};

const Block: React.FC<{b: BlockSpec}> = ({b}) => {
  const f = useCurrentFrame();
  const p = ramp(f, b.at, b.at + 18, EASE.back);
  if (p <= 0) return null;
  const o = 1 - (b.fade ?? 0);
  const cols = Math.floor(b.w / 26);
  const rows = Math.floor(b.h / 26);
  const x = b.x + (b.dx ?? 0);
  const y = b.y + (b.dy ?? 0);
  return (
    <g transform={`translate(${x} ${y}) scale(${p})`} opacity={o}>
      <rect x={-b.w / 2} y={-b.h / 2} width={b.w} height={b.h} rx={14} fill={b.color} fillOpacity={0.22} stroke={b.color} strokeWidth={4} />
      {Array.from({length: rows * cols}).map((_, i) => {
        const cx = -b.w / 2 + 13 + (i % cols) * 26 + rr(b.label + i, -3, 3);
        const cy = -b.h / 2 + 13 + Math.floor(i / cols) * 26 + rr(b.label + 'y' + i, -3, 3) + Math.sin(f / 9 + i) * 1.2;
        return b.kind === 'cav' ? (
          <path key={i} d={`M${cx - 8} ${cy + 5} L${cx + 8} ${cy + 5} L${cx + 4} ${cy - 6} L${cx - 4} ${cy - 6} Z`} fill={b.color} stroke={C.ink} strokeWidth={1.2} />
        ) : b.kind === 'ele' ? (
          <ellipse key={i} cx={cx} cy={cy} rx={11} ry={8} fill={C.elephant} stroke={C.ink} strokeWidth={1.2} />
        ) : (
          <circle key={i} cx={cx} cy={cy} r={7} fill={b.color} stroke={C.ink} strokeWidth={1.2} />
        );
      })}
      <text x={0} y={-b.h / 2 - 16} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={34} fill={C.ink} stroke={C.parchmentLight} strokeWidth={6} paintOrder="stroke">
        {b.label}
      </text>
    </g>
  );
};

const FieldPlate: React.FC<{children: React.ReactNode}> = ({children}) => (
  <>
    <Parchment />
    <Svg>
      <rect x={70} y={60} width={1780} height={960} fill="none" stroke={C.gold} strokeWidth={5} />
      <rect x={84} y={74} width={1752} height={932} fill="none" stroke={C.red} strokeWidth={2} />
      {/* Cubuk stream & Timur's hill */}
      <path d="M1980 120 C1700 260 1560 420 1700 600 C1820 760 1700 900 1500 1100" stroke={C.turq} strokeWidth={14} fill="none" opacity={0.5} />
      <g transform="translate(1660 520)">
        <path d="M-160 80 C-110 -40 110 -40 160 80 Z" fill={C.parchmentDark} stroke={C.inkFade} strokeWidth={3} />
      </g>
      <text x={960} y={1050} textAnchor="middle" fontFamily={FONT.display} fontSize={30} fill={C.inkFade}>
        مخطط تقريبي بحسب أشهر الروايات
      </text>
      {children}
    </Svg>
  </>
);

/* =================================================================== S22 — the formation */
export const S22: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S22');
  const cLine = cue('S22', 'اصطف', 0, 90);
  const cCenter = cue('S22', 'قلب', 0, 150);
  const cRight = cue('S22', 'يمينه', 0, 260);
  const cLeft = cue('S22', 'يساره', 0, 350);
  const cRear = cue('S22', 'الخلف', 0, 450);
  const cFace = cue('S22', 'وقبالتهم', 0, 520);
  const cEle = cue('S22', 'الفيلة', 0, 690);
  const cLame = cue('S22', 'الأعرج', 0, 760);
  const blocks: BlockSpec[] = [
    {x: 560, y: 520, w: 240, h: 150, color: C.red, label: 'بايزيد والإنكشارية', at: cCenter},
    {x: 600, y: 790, w: 260, h: 130, color: C.navy, label: 'الصرب — ستيفان', at: cRight, kind: 'cav'},
    {x: 600, y: 250, w: 280, h: 130, color: C.redLight, label: 'سليمان وعساكر الأناضول', at: cLeft, kind: 'cav'},
    {x: 880, y: 300, w: 130, h: 104, color: C.goldDeep, label: 'التتار', at: cLeft + 20, kind: 'cav'},
    {x: 250, y: 520, w: 170, h: 130, color: C.green, label: 'محمد جلبي', at: cRear},
    {x: 1290, y: 520, w: 220, h: 150, color: C.turq, label: 'محمد سلطان', at: cFace, kind: 'cav'},
    {x: 1110, y: 520, w: 80, h: 160, color: C.elephant, label: 'الفيلة', at: cEle, kind: 'ele'},
    {x: 1300, y: 230, w: 250, h: 130, color: C.turqDeep, label: 'الجناح الأيمن', at: cFace + 30, kind: 'cav'},
    {x: 1300, y: 810, w: 250, h: 130, color: C.turqDeep, label: 'الجناح الأيسر', at: cFace + 40, kind: 'cav'},
  ];
  const split = cLame - 10;
  return (
    <SceneShell id="S22">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 960, y: 540, z: 1.14}, {f: cFace, x: 960, y: 540, z: 1.02}, {f: split, x: 960, y: 540, z: 1.08}]} breathe={0}>
          <Layer depth={1}>
            <FieldPlate>
              {blocks.map((b, i) => (
                <Block key={i} b={b} />
              ))}
              <g opacity={ramp(f, cFace + 60, cFace + 80)}>
                <rect x={1585} y={470} width={150} height={80} rx={10} fill={C.ink} fillOpacity={0.2} stroke={C.ink} strokeWidth={4} />
                <text x={1660} y={455} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={36} fill={C.turqDeep} stroke={C.parchmentLight} strokeWidth={6} paintOrder="stroke">
                  تيمور
                </text>
              </g>
            </FieldPlate>
          </Layer>
        </Camera>
        <DateCard text="فجر ٢٨ يوليو ١٤٠٢" sub="سهل چوبوق" from={cLine - 10} to={cCenter + 60} corner="tl" />
      </Seg>
      <Seg from={split} to={L} fadeOut={0}>
        <Camera keys={[{f: split, x: 1000, y: 560, z: 1.0}, {f: L, x: 1150, y: 480, z: 1.6}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="dawn" clouds={4} />
              <SunRays x={1700} y={560} opacity={0.35} />
            </Svg>
          </Layer>
          <Layer depth={0.5}>
            <Svg>
              <Hills y={720} color={C.turqDeep} seed="th22" amp={50} />
              {[0, 1, 2].map((i) => (
                <Sprite key={i} unit="elephant" anim="walk" x={300 + i * 260} y={780} scale={0.45} facing="left" phase={f * 0.1 + i * 2} />
              ))}
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <path d="M700 1100 C800 760 1500 700 1700 1100 Z" fill={C.green} stroke={C.ink} strokeWidth={3} />
              <Banner x={960} y={820} h={360} w={160} color={C.turq} accent={C.ink} emblem="threeRings" seed="hb1" />
              <Banner x={1420} y={820} h={340} w={150} color={C.ink} accent={C.turq} emblem="threeRings" seed="hb2" />
              <path d="M1290 470 L1290 860" stroke={C.ink} strokeWidth={6} />
              <path d="M1130 500 C1180 430 1400 430 1450 500 Z" fill={C.red} stroke={C.ink} strokeWidth={3} />
              <Timur x={1190} y={880} pose="throne" facing="left" expression="confident" prop="none" scale={0.95} t={f} />
            </Svg>
          </Layer>
        </Camera>
        <Caption text="تيمور يرقب من التلة" from={split + 20} to={L - 13} y={80} size={38} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S23 — rain of arrows */
export const S23: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S23');
  const c0 = narrStart('S23');
  const cCharge = cue('S23', 'انقض', 0, 150);
  const cRet = cue('S23', 'وينسحبون', 0, 260);
  const cBack = cue('S23', 'يعودون', 0, 300);
  const cOtt = cue('S23', 'ورد', 0, 380);
  const cThirst = cue('S23', 'العطش', 0, 560);
  const end = L;
  const riderX = kf(f, [[cCharge - 20, 2600], [cRet, 860], [cBack, 1700], [cOtt + 40, 780], [cThirst - 30, 1600], [end - 120, 720], [end, 1200]], EASE.inOut);
  const riderFacing = (f > cRet && f < cBack + 10) || (f > cOtt + 40 && f < cThirst - 30) || f > end - 120 ? 'right' : 'left';
  const shakeAt = (t: number) => (t > cOtt && t < cOtt + 50) || (t > end - 140 && t < end - 60) ? 9 : t > c0 + 10 ? 2 : 0;
  return (
    <SceneShell id="S23" fadeIn={4}>
      <Seg from={0} to={cThirst + 10} fadeIn={0}>
        <Camera
          keys={[
            {f: 0, x: 700, y: 600, z: 1.3},
            {f: c0, x: 760, y: 580, z: 1.25},
            {f: cCharge, x: 1000, y: 540, z: 1.0},
            {f: cOtt, x: 900, y: 560, z: 1.12},
            {f: cThirst, x: 820, y: 560, z: 1.2},
          ]}
          shake={shakeAt}
        >
          <BattleField f={f} riderX={riderX} riderFacing={riderFacing} cVolley={c0 + 4} />
        </Camera>
      </Seg>
      <Seg from={cThirst} to={end - 150}>
        <Camera keys={[{f: cThirst, x: 960, y: 500, z: 1.0}, {f: end - 150, x: 960, y: 440, z: 1.35}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="heat" clouds={0} />
              <SunRays x={960} y={120} opacity={0.6} color={C.parchmentLight} n={20} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={800} width={2800} height={500} fill={C.goldDeep} />
              <Person look={LOOK.janissary} x={960} y={1060} scale={1.5} expression="sad" prop="axe" armFront={[10, 20]} headTilt={14} lean={8} t={f} lod={0} />
              <DustCloud x={-200} y={1050} w={2400} h={200} seed="s23h" opacity={0.5} color={C.gold} />
            </Svg>
          </Layer>
          <Wash color={C.goldLight} opacity={0.3 + noise1('h23', f / 8) * 0.05} blend="screen" />
        </Camera>
      </Seg>
      <Seg from={end - 150} to={end} fadeOut={0}>
        <Camera keys={[{f: end - 150, x: 900, y: 560, z: 1.25}, {f: end, x: 1000, y: 540, z: 1.0}]} shake={shakeAt}>
          <BattleField f={f} riderX={riderX} riderFacing={riderFacing} cVolley={end - 150} />
        </Camera>
      </Seg>
      <Flash at={c0} color={C.parchmentLight} peak={0.25} dur={10} />
    </SceneShell>
  );
};

const BattleField: React.FC<{f: number; riderX: number; riderFacing: 'left' | 'right'; cVolley: number}> = ({f, riderX, riderFacing, cVolley}) => (
  <>
    <Layer depth={0.08}>
      <Svg>
        <Sky mode="heat" clouds={2} />
        <SunRays x={1500} y={80} opacity={0.4} color={C.parchmentLight} />
      </Svg>
    </Layer>
    <Layer depth={0.35}>
      <Svg>
        <Hills y={600} color={C.gold} seed="bf0" amp={70} />
        <CavalryLine who="timuridSoldier" n={16} x0={1800} x1={1500} y={640} from={0} dur={900} gap={90} scale={0.18} facing="left" gait="walk" seed="bff" />
        <InfantryRank look="janissary" n={18} x={-300} y={650} gap={50} scale={0.22} seed="bfj" />
      </Svg>
    </Layer>
    <Layer depth={0.7}>
      <Svg>
        <Hills y={760} color={C.goldDeep} seed="bf1" amp={30} />
        <InfantryRank look="janissary" n={18} x={-300} y={800} gap={60} scale={0.42} attack seed="bfj2" />
        {[0, 300, 620].map((x, i) => (
          <Banner key={i} x={x - 120} y={770} h={260} w={120} color={C.red} accent={C.gold} seed={'bfb' + i} scale={0.8} />
        ))}
        <CavalryLine who="timuridArcher" n={8} x0={riderX + 500} x1={riderX + 500} y={820} from={0} dur={2000} gap={160} scale={0.42} facing={riderFacing} seed="bfa1" />
      </Svg>
    </Layer>
    <Layer depth={1}>
      <Svg>
        <rect x={-400} y={900} width={2800} height={400} fill={C.goldDeep} opacity={0.9} />
        <InfantryRank look="janissary" n={10} x={-260} y={1010} gap={85} scale={0.62} attack seed="bfj3" />
        <CavalryLine who="timuridArcher" n={6} x0={riderX} x1={riderX} y={1000} from={0} dur={2000} gap={210} scale={0.62} facing={riderFacing} seed="bfa2" />
        <ArrowVolley from={cVolley} dur={36} count={40} x0={1700} x1={300} y0={700} y1={900} waves={6} waveGap={60} seed={'bv' + cVolley} arc={300} spread={600} />
        <ArrowVolley from={cVolley + 30} dur={36} count={25} x0={400} x1={1500} y0={800} y1={950} waves={4} waveGap={80} seed={'bo' + cVolley} arc={260} spread={400} />
        {Array.from({length: 8}).map((_, i) => (
          <ClashSparks key={i} x={700 + rr('cx' + i, 0, 500)} y={900 + rr('cy' + i, 0, 120)} at={cVolley + 60 + i * 37} seed={'bcs' + i} />
        ))}
        <DustCloud x={500} y={1080} w={1400} h={240} seed="bfdu" opacity={0.55} />
        <Particles kind="dust" count={80} seed="bfd" opacity={0.8} wind={1} />
      </Svg>
    </Layer>
    <Wash color={C.goldLight} opacity={0.12} blend="screen" />
  </>
);

/* =================================================================== S24 — betrayal */
export const S24: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S24');
  const cTurn = cue('S24', 'استدار', 0, 120);
  const cSaw = cue('S24', 'وحين', 0, 300);
  const cCross = cue('S24', 'عبروا', 0, 560);
  const cFall = cue('S24', 'انهار', 0, 650);
  const split = cSaw - 10;
  const turned = f > cTurn + 10;
  const tatarX = turned ? kf(f, [[cTurn + 10, 1300], [split, -400]], EASE.in) : 1300;
  return (
    <SceneShell id="S24">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 1100, y: 560, z: 1.2}, {f: cTurn, x: 1150, y: 560, z: 1.3}, {f: split, x: 800, y: 560, z: 1.05}]} shake={(t) => (t > cTurn + 10 && t < cTurn + 60 ? 7 : 2)}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="heat" clouds={2} />
            </Svg>
          </Layer>
          <Layer depth={0.5}>
            <Svg>
              <Hills y={680} color={C.gold} seed="dv0" amp={60} />
              <InfantryRank look="janissary" n={16} x={-300} y={760} gap={55} scale={0.35} attack seed="dvj" />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={880} width={2800} height={400} fill={C.goldDeep} />
              <CavalryLine who="tatar" n={7} x0={tatarX} x1={tatarX} y={980} from={0} dur={2000} gap={190} scale={0.62} facing={turned ? 'left' : 'right'} gait={turned ? 'gallop' : 'stand'} seed="dvt" rows={2} rowGap={60} />
              {/* banners swap */}
              {[900, 1400].map((x, i) => (
                <g key={i}>
                  <g transform={`translate(${x} 960) rotate(${-ramp(f, cTurn + 4 + i * 6, cTurn + 30 + i * 6, EASE.in) * 85})`}>
                    <Banner x={0} y={0} h={340} w={150} color={C.red} accent={C.gold} seed={'dvb' + i} />
                  </g>
                  <Banner x={x + 60} y={kf(f, [[cTurn + 20, 1400], [cTurn + 60, 960]], EASE.out)} h={360} w={160} color={C.turq} accent={C.ink} emblem="threeRings" seed={'dvn' + i} />
                </g>
              ))}
              <DustCloud x={-300} y={1080} w={2600} h={220} seed="dvd" opacity={0.5} />
            </Svg>
          </Layer>
        </Camera>
        <Caption text="انشقاق فرسان التتار" from={cTurn + 10} to={split - 6} y={90} size={44} />
      </Seg>
      <Seg from={split} to={L} fadeOut={0}>
        <Camera keys={[{f: split, x: 960, y: 540, z: 1.04}, {f: L, x: 960, y: 520, z: 1.14}]} breathe={0}>
        <Layer depth={1}>
        <FieldPlate>
          {[
            {x: 560, y: 520, w: 240, h: 150, color: C.red, label: 'بايزيد', at: -100},
            {x: 600, y: 790, w: 260, h: 130, color: C.navy, label: 'الصرب', at: -100, kind: 'cav' as const},
            {x: 250, y: 520, w: 170, h: 130, color: C.green, label: 'محمد جلبي', at: -100},
            {x: 1290, y: 520, w: 220, h: 150, color: C.turq, label: 'محمد سلطان', at: -100, kind: 'cav' as const},
            {x: 1300, y: 230, w: 250, h: 130, color: C.turqDeep, label: 'الجناح الأيمن', at: -100, kind: 'cav' as const},
            {x: 1300, y: 810, w: 250, h: 130, color: C.turqDeep, label: 'الجناح الأيسر', at: -100, kind: 'cav' as const},
            {x: 1660, y: 510, w: 150, h: 80, color: C.ink, label: 'تيمور', at: -100},
          ].map((b, i) => (
            <Block key={i} b={b} />
          ))}
          {/* Tatars already gone over */}
          <Block b={{x: 1060, y: 420, w: 130, h: 104, color: C.turq, label: 'التتار', at: -100, kind: 'cav'}} />
          {/* beylik horsemen cross */}
          <Block
            b={{
              x: 600,
              y: 250,
              w: 280,
              h: 130,
              color: f > cCross ? C.turq : C.redLight,
              label: f > cCross ? 'فرسان الإمارات ← تيمور' : 'سليمان وعساكر الأناضول',
              at: -100,
              kind: 'cav',
              dx: kf(f, [[cCross, 0], [cCross + 70, 380]], EASE.inOut),
              fade: ramp(f, cFall, cFall + 40) * 0.8,
            }}
          />
          <MapArrowSimple from={cCross} x0={760} x1={1000} y={250} />
          {f > cFall && <Particles kind="dust" count={40} seed="lwf" x={300} y={160} w={700} h={220} opacity={1 - ramp(f, cFall + 40, cFall + 90)} />}
        </FieldPlate>
        </Layer>
        </Camera>
        <Caption text="انهيار الجناح الأيسر" from={cFall} to={L} y={940} size={42} />
      </Seg>
    </SceneShell>
  );
};

const MapArrowSimple: React.FC<{from: number; x0: number; x1: number; y: number}> = ({from, x0, x1, y}) => {
  const f = useCurrentFrame();
  const p = ramp(f, from, from + 40);
  if (p <= 0) return null;
  const x = x0 + (x1 - x0) * p;
  return (
    <g>
      <path d={`M${x0} ${y} L${x} ${y}`} stroke={C.turq} strokeWidth={14} strokeDasharray="24 14" />
      <path d={`M${x + 30} ${y} L${x - 6} ${y - 22} L${x - 6} ${y + 22} Z`} fill={C.turq} stroke={C.ink} strokeWidth={2} />
    </g>
  );
};

/* =================================================================== S25 — lions of Serbia */
export const S25: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S25');
  const cLions = cue('S25', 'هؤلاء', 0, 300);
  const cPlead = cue('S25', 'وشق', 0, 520);
  const cRefuse = cue('S25', 'فأبى', 0, 700);
  const split = cPlead - 10;
  const wave = (k: number) => kf(f, [[k, 2500], [k + 70, 1250], [k + 100, 1400], [k + 160, 2400]], EASE.inOut);
  return (
    <SceneShell id="S25">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 900, y: 560, z: 1.15}, {f: cLions, x: 760, y: 520, z: 1.35}, {f: split, x: 900, y: 560, z: 1.1}]} shake={(t) => ((t + 30) % 160 < 30 ? 6 : 1.5)}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="heat" clouds={3} />
            </Svg>
          </Layer>
          <Layer depth={0.5}>
            <Svg>
              <Hills y={700} color={C.gold} seed="sb0" amp={50} />
              <InfantryRank look="serbKnight" n={14} x={-200} y={790} gap={60} scale={0.38} attack seed="sbs1" />
              <Banner x={200} y={770} h={300} w={140} color={C.navy} accent={C.silver} emblem="eagle" seed="sbb" scale={0.8} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={890} width={2800} height={400} fill={C.goldDeep} />
              <InfantryRank look="serbKnight" n={9} x={-150} y={1020} gap={95} scale={0.66} attack seed="sbs2" />
              <Rider who="stefan" x={760} y={1010} scale={0.85} gait="rear" rear={0.3 + 0.3 * Math.sin(f / 12)} prop="swordDrawn" armFront={[150, 175]} expression="anger" t={f} />
              <CavalryLine who="timuridSoldier" n={5} x0={wave(30)} x1={wave(30)} y={960} from={0} dur={2000} gap={200} scale={0.58} facing="left" seed="sbw1" />
              <CavalryLine who="timuridSoldier" n={5} x0={wave(190)} x1={wave(190)} y={1040} from={0} dur={2000} gap={200} scale={0.64} facing="left" seed="sbw2" />
              <CavalryLine who="timuridSoldier" n={5} x0={wave(350)} x1={wave(350)} y={980} from={0} dur={2000} gap={200} scale={0.6} facing="left" seed="sbw3" />
              {[100, 260, 420, 580].map((k, i) => (
                <ClashSparks key={i} x={1150} y={940 + i * 20} at={k} seed={'sbc' + i} />
              ))}
              <DustCloud x={900} y={1080} w={1400} h={220} seed="sbd" opacity={0.5} />
            </Svg>
          </Layer>
        </Camera>
        <NameTag text="ستيفان لازاريفيتش" x={760} y={330} from={40} to={cLions - 10} color={C.navy} size={38} />
        <Quote text="«هؤلاء البؤساء يقاتلون كالأسود»" sub="عبارة تُروى عن تيمور" from={cLions} to={split} y={120} size={60} color={C.redDeep} />
      </Seg>
      <Seg from={split} to={L} fadeOut={0}>
        <Camera keys={[{f: split, x: 960, y: 520, z: 1.25}, {f: cRefuse, x: 1060, y: 440, z: 1.6}, {f: L, x: 1080, y: 420, z: 1.9}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="sunset" clouds={3} />
            </Svg>
          </Layer>
          <Layer depth={0.6}>
            <Svg>
              <Hills y={720} color={C.redDeep} seed="sp0" amp={50} />
              <DustCloud x={-200} y={760} w={2400} h={200} seed="spd" opacity={0.5} color={C.inkFade} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={880} width={2800} height={400} fill={C.inkSoft} />
              <Stefan x={760} y={940} scale={1.05} expression="sad" armFront={[80, 60]} prop="none" t={f} />
              <Bayezid x={1150} y={940} scale={1.05} facing="left" expression="anger" prop="axe" armFront={f > cRefuse ? [60, -30] : [20, -10]} headTilt={f > cRefuse ? Math.sin((f - cRefuse) / 3) * 6 : 0} t={f} />
            </Svg>
          </Layer>
          <Wash color={C.redDeep} opacity={0.2} />
        </Camera>
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S26 — the sons scatter */
export const S26: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S26');
  const cSul = cue('S26', 'سليمان', 1, 120);
  const cMeh = cue('S26', 'ومحمد', 0, 200);
  const cIsa = cue('S26', 'وعيسى', 0, 250);
  const cMusa = cue('S26', 'موسى', 0, 330);
  const cAlone = cue('S26', 'وبقي', 0, 420);
  const split = cAlone - 10;
  const [mx, my] = pt([33.5, 39.75]);
  return (
    <SceneShell id="S26">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <OldMap views={[viewAt(0, [32.5, 39.9], 1150), viewAt(split, [32.8, 40], 1300)]} cities={['bursa', 'ankara', 'amasya']} cityFrom={0}>
          <MapArrow via={['ankara', [31, 40.3], 'bursa']} from={0} dur={cSul + 30} color={C.redLight} width={10} />
          <MapLabel at={[30.6, 40.75]} text="سليمان" from={cSul} color={C.red} size={34} />
          <MapArrow via={['ankara', [34.5, 40.6], 'amasya']} from={cMeh - 10} dur={50} color={C.green} width={10} />
          <MapLabel at={[35.2, 41.1]} text="محمد" from={cMeh} color={C.green} size={34} />
          <MapArrow via={['ankara', [31.5, 39.2], [30, 39.3]]} from={cIsa - 10} dur={50} color={C.goldDeep} width={10} dashed />
          <MapLabel at={[30.3, 38.85]} text="عيسى" from={cIsa} color={C.goldDeep} size={34} />
          <MapArrow via={['ankara', [33.5, 39.75]]} from={cMusa - 10} dur={20} color={C.redDeep} width={10} />
          {f > cMusa + 12 && (
            <g transform={`translate(${mx} ${my})`} opacity={ramp(f, cMusa + 12, cMusa + 24)}>
              <circle r={26} fill={C.ink} />
              <path d="M-12 -12 L12 12 M12 -12 L-12 12" stroke={C.parchmentLight} strokeWidth={6} />
            </g>
          )}
          <MapLabel at={[33.9, 39.4]} text="موسى: الأسر" from={cMusa + 12} color={C.ink} size={34} />
        </OldMap>
      </Seg>
      <Seg from={split} to={L} fadeOut={0}>
        <Camera keys={[{f: split, x: 960, y: 520, z: 1.4}, {f: L, x: 960, y: 560, z: 0.95}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="sunset" clouds={2} />
            </Svg>
          </Layer>
          <Layer depth={0.5}>
            <Svg>
              <Hills y={760} color={C.redDeep} seed="al0" amp={40} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={850} width={2800} height={500} fill={C.inkSoft} />
              <Bayezid x={960} y={930} scale={0.8} expression="sad" prop="axe" armFront={[10, 10]} t={f} />
              <DustCloud x={-300} y={980} w={2600} h={240} seed="ald" opacity={0.55} color={C.inkFade} />
              <Particles kind="dust" count={60} seed="aldp" wind={1.5} color={C.parchmentDark} />
            </Svg>
          </Layer>
          <Wash color={C.redDeep} opacity={0.2} />
        </Camera>
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S27 — the last stand */
export const S27: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S27');
  const cAxe = cue('S27', 'بفأسه', 0, 260);
  const cLast = cue('S27', 'آخر', 0, 420);
  const cFlee = cue('S27', 'الفرار', 0, 500);
  const cStumble = cue('S27', 'فتعثر', 0, 580);
  const cMahmud = cue('S27', 'محمود', 0, 660);
  const cFallen = cue('S27', 'سقطت', 0, 900);
  const fallen = ramp(f, 60, cLast, EASE.in);
  const split = cFlee - 10;
  const split2 = cMahmud - 12;
  const horseFall = ramp(f, cStumble, cStumble + 45, EASE.out);
  const ring = ramp(f, cMahmud, cMahmud + 90, EASE.out);
  return (
    <SceneShell id="S27" fadeOut={30}>
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 960, y: 560, z: 1.05}, {f: cAxe, x: 980, y: 460, z: 1.5}, {f: split, x: 960, y: 520, z: 1.15}]} shake={(t) => 2 + (t % 90 < 12 ? 5 : 0)}>
          <Layer depth={0.08}>
            <Svg>
              <Sky mode="sunset" clouds={4} />
              <SunRays x={400} y={700} opacity={0.35} color={C.goldLight} />
            </Svg>
          </Layer>
          <Layer depth={0.5}>
            <Svg>
              <Hills y={720} color={C.redDeep} seed="ls0" amp={50} />
              <CavalryLine who="timuridSoldier" n={10} x0={2300} x1={2000} y={760} from={0} dur={600} gap={110} scale={0.3} facing="left" gait="trot" seed="lsf" />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <path d="M300 1200 C500 760 1400 760 1600 1200 Z" fill={C.inkSoft} stroke={C.ink} strokeWidth={3} />
              <InfantryRank look="janissary" n={9} x={560} y={900} gap={95} scale={0.55} attack fallen={fallen} seed="lsj" />
              <Bayezid x={960} y={880} scale={0.95} expression="anger" prop="axe" armFront={[100 + Math.sin(f / 6) * 60, 120 + Math.sin(f / 6) * 70]} t={f} />
              <CavalryLine who="timuridSoldier" n={4} x0={kf(f, [[0, 2300], [split, 1500]])} x1={kf(f, [[0, 2300], [split, 1500]])} y={1000} from={0} dur={2000} gap={230} scale={0.6} facing="left" gait="trot" seed="lsr" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <ClashSparks key={i} x={900 + rr('lc' + i, -200, 260)} y={760 + rr('lcy' + i, 0, 100)} at={60 + i * 55} seed={'lcs' + i} />
              ))}
              <Particles kind="ash" count={70} seed="lsa" />
            </Svg>
          </Layer>
          <Wash color={C.red} opacity={0.18} />
        </Camera>
        <DateCard text="مساء ٢٨ يوليو ١٤٠٢" sub="الوقفة الأخيرة" from={20} to={200} />
      </Seg>
      <Seg from={split} to={split2 + 12}>
        <Camera keys={[{f: split, x: 700, y: 560, z: 1.1}, {f: cStumble, x: 1000, y: 600, z: 1.3}, {f: split2, x: 1150, y: 640, z: 1.55}]} shake={(t) => (t > cStumble + 10 && t < cStumble + 30 ? 12 : 2)}>
          <Layer depth={0.08}>
            <Svg>
              <Sky mode="sunset" clouds={4} />
            </Svg>
          </Layer>
          <Layer depth={0.5}>
            <Svg>
              <Hills y={740} color={C.redDeep} seed="ls1" amp={40} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={880} width={2800} height={400} fill={C.inkSoft} />
              <Rider who="bayezid" x={kf(f, [[split, 200], [cStumble, 1000], [cStumble + 45, 1120]], EASE.out)} y={1000} scale={0.85} gait={f < cStumble ? 'gallop' : 'fall'} fall={horseFall} prop="axe" t={f} />
              <DustCloud x={700} y={1060} w={900} h={200} seed="lsfd" opacity={0.6 * horseFall} color={C.inkFade} />
            </Svg>
          </Layer>
          <Wash color={C.red} opacity={0.2} />
        </Camera>
      </Seg>
      <Seg from={split2} to={L} fadeOut={0}>
        <Camera keys={[{f: split2, x: 960, y: 560, z: 1.0}, {f: cFallen, x: 960, y: 540, z: 1.25}, {f: L, x: 960, y: 520, z: 1.45}]}>
          <Layer depth={0.08}>
            <Svg>
              <Sky mode="dusk" clouds={3} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={850} width={2800} height={500} fill={C.ink} />
              {(() => {
                const riders = Array.from({length: 8}).map((_, i) => {
                  const a = (i / 8) * Math.PI * 2 + Math.PI / 8 + (1 - ring) * 0.6;
                  const r = 950 - ring * 380;
                  return {i, a, x: 960 + Math.cos(a) * r, y: 990 + Math.sin(a) * 110, s: 0.62 + Math.sin(a) * 0.08};
                });
                const node = (q: {i: number; a: number; x: number; y: number; s: number}) => (
                  <Sprite key={q.i} unit="timuridSoldier" anim={ring < 1 ? 'gallop' : 'ride'} x={q.x} y={q.y} scale={q.s} facing={Math.cos(q.a) > 0 ? 'left' : 'right'} phase={f * 0.42 + q.i} />
                );
                return (
                  <>
                    {riders.filter((q) => Math.sin(q.a) < 0).map(node)}
                    <Bayezid x={960} y={1000} scale={1.1} pose="broken" expression="sad" prop="none" t={f} />
                    {riders.filter((q) => Math.sin(q.a) >= 0).map(node)}
                  </>
                );
              })()}
              <Particles kind="ash" count={60} seed="lsa2" />
            </Svg>
          </Layer>
          <Wash color={C.ink} opacity={0.3 * ramp(f, cFallen, 1153)} />
        </Camera>
        <NameTag text="فرسان محمود خان" x={1500} y={640} from={cMahmud + 10} to={cFallen - 10} color={C.turqDeep} size={36} />
        <Quote text="سقطت الصاعقة أسيرة" from={cFallen + 10} to={L - 13} y={140} size={76} color={C.parchmentLight} />
      </Seg>
    </SceneShell>
  );
};
