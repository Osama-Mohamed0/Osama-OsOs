import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {EASE, kf, noise1, ramp, rr} from '../lib/anim';
import {cue, sceneLen} from '../lib/cue';
import {SceneShell} from '../components/SceneShell';
import {Camera, Layer} from '../components/Camera';
import {Parchment, Svg} from '../components/Stage';
import {Fire, Flame, Flash, Particles, SunRays, Wash} from '../components/FX';
import {ActCard, Caption, DateCard, NameTag, Quote} from '../components/Cards';
import {Hills, Sky, TentInterior, TentRow} from '../components/Sets';
import {ArrowVolley, Banner, ClashSparks, DustCloud, InfantryRank} from '../components/Battle';
import {Letter} from '../components/Letter';
import {Seg} from '../components/Seg';
import {Sprite} from '../components/Sprite';
import {CityPlan, GreatCannon, HagiaSophia, Ox, Ship, SiegeTower, SophiaInterior, TheodosianWalls, TunnelSection} from '../components/FatihSets';
import {Constantine, Giustiniani, Halil, LOOK, Mehmed2, Rider, Zaganos} from '../characters/cast';
import {Person} from '../characters/Person';

/* =================================================================== S13 — arrival */
export const S13: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S13');
  const cNum = cue('S13', 'تقدر', 0, 300);
  const cGiu = cue('S13', 'جوفاني', 0, 760);
  const cTent = cue('S13', 'وتوزع', 0, 950);
  const split = cGiu - 40;
  const split2 = cTent - 10;
  return (
    <SceneShell id="S13" fadeIn={0}>
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 90, x: 700, y: 560, z: 1.2}, {f: split, x: 1300, y: 540, z: 1.0}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="day" clouds={5} />
            </Svg>
          </Layer>
          <Layer depth={0.45}>
            <Svg>
              <TheodosianWalls x={-300} y={770} w={2700} s={0.85} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={760} width={3000} height={600} fill={C.greenLight} />
              <TentRow x={-300} y={800} n={14} gap={150} color={C.red} s={0.55} seed="ar1" />
              <TentRow x={-250} y={900} n={12} gap={180} color={C.red} s={0.75} seed="ar2" />
              <InfantryRank look="janissary" n={12} x={-200} y={1030} gap={95} scale={0.55} march seed="arj" />
              {[100, 520, 940].map((x, i) => (
                <Banner key={i} x={x} y={1000} h={320} w={140} color={C.red} accent={C.gold} seed={'ab' + i} scale={0.9} />
              ))}
            </Svg>
          </Layer>
        </Camera>
        <DateCard text="أبريل ١٤٥٣" sub="الجيش العثماني أمام الأسوار" from={100} to={cNum - 10} />
        <Caption text="العثمانيون: نحو ٨٠ ألفاً — المدافعون: نحو ٧ آلاف (تقديرات حديثة)" from={cNum} to={split} y={930} size={38} />
      </Seg>
      <Seg from={split} to={split2 + 12}>
        <Camera keys={[{f: split, x: 960, y: 560, z: 1.0}, {f: split2, x: 900, y: 480, z: 1.45}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="day" clouds={4} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-300} y={760} width={2520} height={600} fill={C.parchmentDark} stroke={C.ink} strokeWidth={3} />
              {Array.from({length: 8}).map((_, i) => (
                <rect key={i} x={-300 + i * 340} y={690} width={180} height={70} fill={C.parchmentDark} stroke={C.ink} strokeWidth={2} />
              ))}
              <Giustiniani x={880} y={920} scale={1.05} expression="confident" prop="sword" t={f} />
              {[460, 620, 1260, 1420].map((x, i) => (
                <Sprite key={x} unit={i % 2 ? 'genoese' : 'byzSoldier'} anim="stand" x={x} y={930} scale={0.7} facing={x < 880 ? 'right' : 'left'} />
              ))}
              <Banner x={1100} y={900} h={360} w={160} color={C.white} accent={C.red} emblem="cross" seed="gen" />
            </Svg>
          </Layer>
        </Camera>
        <NameTag text="جوفاني جوستينياني" x={880} y={380} from={split + 20} to={split2} color={C.red} size={40} />
      </Seg>
      <Seg from={split2} to={L} fadeOut={0}>
        <Camera keys={[{f: split2, x: 960, y: 540, z: 1.0}, {f: L, x: 760, y: 560, z: 1.2}]} breathe={0.6}>
          <Layer depth={1}>
            <Svg>
              <rect x={-300} y={-200} width={2520} height={1500} fill={C.parchment} />
              <CityPlan siegeCamp={ramp(f, split2, split2 + 60)} chain={1} />
              <g transform="translate(250 625)" opacity={ramp(f, split2 + 40, split2 + 60)}>
                <circle r={34 + Math.sin(f / 5) * 4} fill={C.gold} opacity={0.4} />
              </g>
            </Svg>
          </Layer>
        </Camera>
        <Caption text="خيمة السلطان قبالة باب القديس رومانوس" from={split2 + 30} to={L - 10} y={930} size={38} />
      </Seg>
      <ActCard name="الفصل الثاني" title="الحصار" from={0} to={96} />
    </SceneShell>
  );
};

/* =================================================================== S14 — the walls */
export const S14: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S14');
  const cMoat = cue('S14', 'خندق', 0, 100);
  const cOuter = cue('S14', 'خارجي', 0, 180);
  const cInner = cue('S14', 'داخلي', 0, 260);
  const cChain = cue('S14', 'سلسلة', 0, 430);
  const split = cChain - 20;
  const lab = (x: number, y: number, t: string, at: number) => {
    const o = ramp(f, at, at + 14);
    return o > 0 ? (
      <text x={x} y={y} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={44} fill={C.redDeep} stroke={C.parchmentLight} strokeWidth={8} paintOrder="stroke" opacity={o}>
        {t}
      </text>
    ) : null;
  };
  return (
    <SceneShell id="S14">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Parchment />
        <Camera keys={[{f: 0, x: 960, y: 600, z: 1.1}, {f: split, x: 960, y: 520, z: 0.92}]}>
          <Layer depth={1}>
            <Svg>
              <g transform="translate(0 40)">
                <TheodosianWalls x={-200} y={760} w={2400} />
              </g>
              {lab(960, 950, 'الخندق', cMoat)}
              {lab(560, 600, 'السور الخارجي', cOuter)}
              {lab(1300, 300, 'السور الداخلي', cInner)}
            </Svg>
          </Layer>
        </Camera>
        <DateCard text="أسوار ثيودوسيوس" sub="ثلاثة خطوط دفاع" from={10} to={cMoat + 40} />
      </Seg>
      <Seg from={split} to={L} fadeOut={0}>
        <Camera keys={[{f: split, x: 1100, y: 320, z: 1.6}, {f: L, x: 1150, y: 340, z: 1.9}]} breathe={0.5}>
          <Layer depth={1}>
            <Svg>
              <rect x={-300} y={-200} width={2520} height={1500} fill={C.parchment} />
              <CityPlan chain={ramp(f, split + 10, split + 70)} />
            </Svg>
          </Layer>
        </Camera>
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S15 — bombardment */
export const S15: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S15');
  const cFirst = cue('S15', 'ولأول', 0, 90);
  const cNight = cue('S15', 'والمدافعون', 0, 330);
  const cCool = cue('S15', 'وكان', 0, 560);
  const fires = [30, cFirst + 30, cFirst + 130, cNight - 40];
  const lastFire = fires.filter((x) => x <= f).slice(-1)[0] ?? -1;
  const damage = ramp(f, 40, cNight, EASE.out);
  const split = cNight - 10;
  const split2 = cCool - 10;
  return (
    <SceneShell id="S15">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 600, y: 600, z: 1.2}, {f: split, x: 1250, y: 520, z: 1.05}]} shake={(t) => (fires.some((x) => t >= x && t < x + 14) ? 12 : 1)}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="day" clouds={4} />
            </Svg>
          </Layer>
          <Layer depth={0.6}>
            <Svg>
              <TheodosianWalls x={700} y={680} w={1800} damage={damage} />
              {fires.map((x, i) => f > x + 10 && f < x + 120 && <DustCloud key={i} x={1400} y={560} w={500} h={260} seed={'bd' + i} opacity={0.7 * (1 - ramp(f, x + 40, x + 120))} />)}
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={860} width={3000} height={400} fill={C.greenDeep} />
              <GreatCannon x={300} y={960} s={0.9} fire={lastFire} />
              {[540, 640].map((x, i) => (
                <Sprite key={x} unit="janissary" anim="stand" x={x} y={980} scale={0.5} />
              ))}
            </Svg>
          </Layer>
          {fires.map((x, i) => (
            <Flash key={i} at={x} color={C.goldLight} peak={0.35} dur={10} />
          ))}
        </Camera>
        <DateCard text="٦ أبريل ١٤٥٣" sub="بدء القصف" from={20} to={cFirst + 60} />
      </Seg>
      <Seg from={split} to={split2 + 12}>
        <Camera keys={[{f: split, x: 960, y: 560, z: 1.3}, {f: split2, x: 960, y: 520, z: 1.05}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="night" clouds={2} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <TheodosianWalls x={-300} y={800} w={2600} damage={0.85} repair={ramp(f, split + 20, split2)} torches tone="night" />
              {Array.from({length: 6}).map((_, i) => (
                <Sprite key={i} unit="byzSoldier" anim="attack" x={700 + i * 100} y={640 + (i % 2) * 12} scale={0.45} phase={f / 5 + i} facing={i % 2 ? 'left' : 'right'} />
              ))}
            </Svg>
          </Layer>
          <Wash color={C.navyDeep} opacity={0.35} />
        </Camera>
      </Seg>
      <Seg from={split2} to={L} fadeOut={0}>
        <Camera keys={[{f: split2, x: 900, y: 600, z: 1.5}, {f: L, x: 900, y: 560, z: 1.25}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="sunset" clouds={3} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={860} width={3000} height={400} fill={C.inkSoft} />
              <GreatCannon x={900} y={960} s={1.1} glow={0.6} />
              {[600, 1250].map((x, i) => (
                <Person key={x} look={LOOK.janissary} x={x} y={980} scale={0.8} facing={i ? 'left' : 'right'} prop="none" armFront={[100 + Math.sin(f / 8 + i) * 20, 120]} t={f} lod={0} />
              ))}
              <Particles kind="ash" count={40} seed="cool" />
            </Svg>
          </Layer>
          <Wash color={C.red} opacity={0.15} />
        </Camera>
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S16 — the sea battle */
export const S16: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S16');
  const cFleet = cue('S16', 'فانقض', 0, 220);
  const cIn = cue('S16', 'ودخلت', 0, 420);
  const cHorse = cue('S16', 'فرسه', 0, 600);
  const split = cHorse - 50;
  return (
    <SceneShell id="S16">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 1400, y: 520, z: 1.2}, {f: cFleet, x: 960, y: 560, z: 1.0}, {f: split, x: 700, y: 540, z: 1.1}]} shake={(t) => (t > cFleet && t < cIn ? 3 : 0)}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="day" clouds={6} />
            </Svg>
          </Layer>
          <Layer depth={0.4}>
            <Svg>
              <path d="M-400 520 C200 500 1000 530 2400 510 L2400 600 L-400 600 Z" fill={C.parchmentDark} />
              <g transform="translate(0 -230) scale(1)"><HagiaSophia x={300} y={760} s={0.35} /></g>
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={560} width={3000} height={800} fill={C.turqDeep} />
              {Array.from({length: 4}).map((_, i) => (
                <Ship key={i} x={kf(f, [[0, 2300 + i * 200], [cIn, 600 + i * 220]], EASE.inOut)} y={760 + (i % 2) * 70} s={0.9} kind="carrack" facing="left" sail={C.white} flag={i === 3 ? C.purple : C.red} t={f} />
              ))}
              {Array.from({length: 12}).map((_, i) => (
                <Ship key={'o' + i} x={kf(f, [[0, 300 + i * 120], [cFleet + 60, 900 + i * 90 + Math.sin(i) * 60]], EASE.soft) + Math.sin(f / 15 + i) * 20} y={900 + (i % 3) * 50} s={0.45} kind="galley" facing={i % 2 ? 'left' : 'right'} flag={C.red} sail={C.parchmentLight} t={f} />
              ))}
              <ArrowVolley from={cFleet} dur={34} count={30} x0={900} x1={1400} y0={900} y1={700} waves={5} waveGap={30} seed="sea" arc={120} />
              <DustCloud x={600} y={820} w={1400} h={180} seed="smk" opacity={0.4 * ramp(f, cFleet, cFleet + 30)} color={C.parchmentDark} />
              <path d="M-400 960 C300 950 1200 970 2400 960 L2400 1300 L-400 1300 Z" fill={C.turqDeep} opacity={0.5} />
            </Svg>
          </Layer>
        </Camera>
        <DateCard text="٢٠ أبريل ١٤٥٣" sub="معركة بحرية" from={20} to={cFleet} />
      </Seg>
      <Seg from={split} to={L} fadeOut={0}>
        <Camera keys={[{f: split, x: 960, y: 600, z: 1.05}, {f: L, x: 900, y: 600, z: 1.35}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="sunset" clouds={4} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={700} width={3000} height={600} fill={C.turqDeep} />
              <path d="M-400 700 C200 690 600 700 800 720 L800 1300 L-400 1300 Z" fill={C.parchmentDark} />
              <Rider who="mehmed2" x={kf(f, [[split, 500], [split + 80, 1000]], EASE.out)} y={kf(f, [[split + 40, 990], [split + 80, 1060]], EASE.out)} scale={0.95} gait={f < split + 80 ? 'gallop' : 'stand'} expression="anger" prop="swordDrawn" armFront={[150, 170]} t={f} />
              <path d="M-400 1010 C300 1000 1200 1020 2400 1010 L2400 1300 L-400 1300 Z" fill={C.turqDeep} opacity={0.85} />
              <Particles kind="sparks" count={30} seed="splash" x={950} y={960} w={180} h={80} color={C.turqLight} opacity={ramp(f, split + 70, split + 80) * (1 - ramp(f, split + 100, split + 130))} />
            </Svg>
          </Layer>
        </Camera>
        <Caption text="يُروى أن السلطان دفع فرسه في البحر غضباً" from={split + 30} to={L - 10} y={110} size={40} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S17 — the idea */
export const S17: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S17');
  const cLand = cue('S17', 'البر', 0, 220);
  const cMad = cue('S17', 'الجنون', 0, 360);
  return (
    <SceneShell id="S17" vignette={0.8}>
      <Camera keys={[{f: 0, x: 960, y: 560, z: 1.1}, {f: cLand, x: 960, y: 640, z: 1.6}, {f: cMad, x: 1150, y: 480, z: 1.45}, {f: L, x: 1150, y: 470, z: 1.6}]}>
        <Layer depth={1}>
          <Svg>
            <TentInterior candle={[1500, 700]} />
            <rect x={560} y={780} width={800} height={30} fill={C.horseBay} stroke={C.ink} strokeWidth={3} />
            <g transform="translate(960 700) scale(0.32)">
              <rect x={-980} y={-560} width={1960} height={1100} fill={C.parchment} stroke={C.ink} strokeWidth={6} />
              <clipPath id="s17board"><rect x={-980} y={-560} width={1960} height={1100} /></clipPath>
              <g clipPath="url(#s17board)">
                <g transform="translate(-960 -540)">
                  <CityPlan shipPath={ramp(f, cLand - 30, cLand + 60)} labels={false} />
                </g>
              </g>
            </g>
            <Mehmed2 x={760} y={940} scale={1.0} expression="confident" armFront={[60, 70]} prop="none" t={f} />
            <Person look={LOOK.ottomanCourtier} x={1300} y={940} scale={0.95} facing="left" expression="sad" lod={0} t={f} />
            <Zaganos x={1500} y={950} scale={0.95} facing="left" expression="neutral" prop="none" t={f} />
          </Svg>
        </Layer>
        <Wash color={C.ink} opacity={0.3} />
        <Wash color={C.goldLight} opacity={0.3} blend="screen" radial={[960, 700]} />
      </Camera>
      <Quote text="فلتعبرِ البرّ…" from={cLand} to={L - 4} y={110} size={70} color={C.parchmentLight} />
    </SceneShell>
  );
};

/* =================================================================== S18 — ships over land */
export const S18: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S18');
  const cDrag = cue('S18', 'وجر', 0, 220);
  const cMorning = cue('S18', 'الصباح', 0, 560);
  const cChain = cue('S18', 'السلسلة', 0, 840);
  const split = cMorning - 10;
  const split2 = cChain - 20;
  return (
    <SceneShell id="S18">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 600, y: 560, z: 1.2}, {f: cDrag, x: 960, y: 520, z: 1.0}, {f: split, x: 1300, y: 500, z: 1.15}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="night" clouds={2} moon={[1600, 160]} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <path d="M-400 1000 C0 960 500 520 960 470 C1400 520 1900 960 2300 1000 L2300 1300 L-400 1300 Z" fill={C.greenDeep} stroke={C.ink} strokeWidth={3} />
              {/* greased log track */}
              {Array.from({length: 40}).map((_, i) => {
                const t = i / 39;
                const x = -300 + t * 2500;
                const y = t < 0.5 ? 1000 - Math.sin(t * Math.PI) * 520 : 1000 - Math.sin(t * Math.PI) * 520;
                return <rect key={i} x={x - 30} y={y - 6} width={60} height={12} rx={5} fill={C.horseBay} stroke={C.ink} strokeWidth={1.5} transform={`rotate(${(t < 0.5 ? -1 : 1) * 22} ${x} ${y})`} />;
              })}
              {Array.from({length: 5}).map((_, i) => {
                const t = ((f / L) * 0.9 + i * 0.18) % 1;
                const x = -300 + t * 2500;
                const y = 1000 - Math.sin(t * Math.PI) * 520 - 30;
                const rot = Math.cos(t * Math.PI) * -25;
                return <Ship key={i} x={x} y={y} s={0.55} kind="galley" t={f} bob={false} tilt={rot} oars={false} flag={C.red} sail={C.parchmentLight} />;
              })}
              {Array.from({length: 10}).map((_, i) => (
                <Ox key={'ox' + i} x={-100 + i * 240} y={1000 - Math.sin(((-100 + i * 240 + 300) / 2500) * Math.PI) * 520 + 30} s={0.4} t={f} phase={i} />
              ))}
              {Array.from({length: 16}).map((_, i) => (
                <Flame key={'t' + i} x={-200 + i * 160} y={1050 - Math.sin(((-200 + i * 160 + 300) / 2500) * Math.PI) * 520} scale={0.35} seed={'tr' + i} />
              ))}
            </Svg>
          </Layer>
          <Wash color={C.navyDeep} opacity={0.35} />
        </Camera>
        <DateCard text="ليلة ٢٢ أبريل ١٤٥٣" sub="تلال غلطة" from={20} to={cDrag + 60} />
      </Seg>
      <Seg from={split} to={split2 + 12}>
        <Camera keys={[{f: split, x: 960, y: 560, z: 1.25}, {f: split2, x: 960, y: 540, z: 1.0}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="dawn" clouds={4} />
            </Svg>
          </Layer>
          <Layer depth={0.5}>
            <Svg>
              <rect x={-400} y={620} width={3000} height={700} fill={C.turq} />
              {Array.from({length: 10}).map((_, i) => (
                <Ship key={i} x={-100 + i * 230} y={700 + (i % 2) * 30} s={0.45} kind="galley" facing="right" t={f} flag={C.red} sail={C.parchmentLight} />
              ))}
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={820} width={3000} height={260} fill={C.parchmentDark} stroke={C.ink} strokeWidth={3} />
              {Array.from({length: 7}).map((_, i) => (
                <rect key={i} x={-300 + i * 380} y={760} width={170} height={60} fill={C.parchmentDark} stroke={C.ink} strokeWidth={2} />
              ))}
              {[400, 900, 1400].map((x, i) => (
                <Sprite key={x} unit="byzSoldier" anim="stand" x={x} y={840} scale={0.6} facing="left" />
              ))}
            </Svg>
          </Layer>
        </Camera>
      </Seg>
      <Seg from={split2} to={L} fadeOut={0}>
        <Camera keys={[{f: split2, x: 900, y: 320, z: 1.5}, {f: L, x: 880, y: 340, z: 1.7}]} breathe={0.5}>
          <Layer depth={1}>
            <Svg>
              <rect x={-300} y={-200} width={2520} height={1500} fill={C.parchment} />
              <CityPlan chain={1} shipPath={1} shipsInHorn={ramp(f, split2, split2 + 40)} />
            </Svg>
          </Layer>
        </Camera>
        <Caption text="عبر السلسلة دون أن يلمسها" from={split2 + 10} to={L - 6} y={930} size={44} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S19 — tunnels */
export const S19: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S19');
  const cMeet = cue('S19', 'فالتقى', 0, 300);
  const cTower = cue('S19', 'برجا', 0, 420);
  const cBurn = cue('S19', 'فأحرقه', 0, 520);
  const split = cTower - 10;
  return (
    <SceneShell id="S19">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 960, y: 520, z: 1.0}, {f: cMeet, x: 1150, y: 600, z: 1.35}, {f: split, x: 1150, y: 600, z: 1.45}]}>
          <Layer depth={1}>
            <Svg>
              <TunnelSection progA={ramp(f, 30, cMeet)} progB={ramp(f, 100, cMeet)} t={f} />
              <text x={560} y={780} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={46} fill={C.parchmentLight} stroke={C.ink} strokeWidth={6} paintOrder="stroke" opacity={ramp(f, 40, 60)}>نفق عثماني</text>
              <text x={1560} y={780} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={46} fill={C.parchmentLight} stroke={C.ink} strokeWidth={6} paintOrder="stroke" opacity={ramp(f, 110, 130)}>نفق مضاد</text>
              {[0, 20, 40, 60].map((d) => <ClashSparks key={d} x={1200 + d} y={650} at={cMeet + d} seed={"tun" + d} />)}
            </Svg>
          </Layer>
        </Camera>
        <DateCard text="مايو ١٤٥٣" sub="حرب الأنفاق" from={20} to={cMeet - 20} />
      </Seg>
      <Seg from={split} to={L} fadeOut={0}>
        <Camera keys={[{f: split, x: 960, y: 560, z: 1.05}, {f: cBurn, x: 900, y: 480, z: 1.3}, {f: L, x: 900, y: 520, z: 1.1}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="night" clouds={3} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <TheodosianWalls x={-300} y={860} w={2600} torches tone="night" />
              <SiegeTower x={900} y={980} s={1} burn={ramp(f, cBurn, cBurn + 90)} />
              <Particles kind="embers" count={80} seed="tb" x={700} y={300} w={400} h={700} opacity={ramp(f, cBurn, cBurn + 30)} />
            </Svg>
          </Layer>
          <Wash color={C.navyDeep} opacity={0.35} />
          <Wash color={C.redLight} opacity={0.35 * ramp(f, cBurn, cBurn + 60)} blend="screen" radial={[900, 600]} />
        </Camera>
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S20 — omens */
export const S20: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S20');
  const cIcon = cue('S20', 'أيقونة', 0, 200);
  const cFog = cue('S20', 'ضبابا', 0, 360);
  const eclipse = ramp(f, 30, cIcon - 20);
  const split = cIcon - 20;
  return (
    <SceneShell id="S20">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 1400, y: 300, z: 1.6}, {f: split, x: 1100, y: 420, z: 1.15}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="night" clouds={1} />
              <circle cx={1400} cy={260} r={90} fill={C.parchmentLight} />
              <circle cx={1400 + 180 - eclipse * 180} cy={260 - eclipse * 20} r={92} fill={C.navyDeep} opacity={0.85} />
              <circle cx={1400} cy={260} r={90} fill={C.redLight} opacity={0.3 * eclipse} />
            </Svg>
          </Layer>
          <Layer depth={0.6}>
            <Svg>
              <HagiaSophia x={700} y={900} s={0.8} tone={C.inkSoft} />
            </Svg>
          </Layer>
        </Camera>
        <DateCard text="٢٤ مايو ١٤٥٣" sub="خسوف القمر" from={20} to={split - 10} />
      </Seg>
      <Seg from={split} to={L} fadeOut={0}>
        <Camera keys={[{f: split, x: 960, y: 560, z: 1.1}, {f: L, x: 960, y: 600, z: 1.3}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="storm" clouds={5} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={850} width={3000} height={400} fill={C.inkSoft} />
              {Array.from({length: 9}).map((_, i) => (
                <g key={i}>
                  <Person look={{...LOOK.byzSoldier, name: 'mourner', headgear: 'none', robe: C.inkFade, armor: null, prop: 'none', shield: undefined}} x={300 + i * 160} y={930} scale={0.6} facing="right" expression="sad" t={f + i * 9} lod={1} />
                  <Flame x={330 + i * 160} y={760} scale={0.25} seed={'pc' + i} glow={false} />
                </g>
              ))}
              {/* the icon falls */}
              <g transform={`translate(1000 ${700 + ramp(f, cIcon, cIcon + 30, EASE.in) * 220}) rotate(${ramp(f, cIcon, cIcon + 30) * 70})`}>
                <rect x={-60} y={-80} width={120} height={160} fill={C.gold} stroke={C.ink} strokeWidth={3} />
                <rect x={-46} y={-66} width={92} height={132} fill={C.navy} />
                <circle cx={0} cy={-20} r={26} fill={C.goldLight} opacity={0.8} />
              </g>
              {Array.from({length: 8}).map((_, i) => (
                <ellipse key={'fog' + i} cx={rr('fg' + i, -200, 2200) + f * (0.5 + i * 0.1)} cy={rr('fgy' + i, 300, 1000)} rx={500} ry={120} fill={C.silverLight} opacity={0.3 * ramp(f, cFog, cFog + 80)} />
              ))}
            </Svg>
          </Layer>
          <Wash color={C.silverLight} opacity={0.35 * ramp(f, cFog, L)} blend="screen" />
        </Camera>
        <Caption text="تروي المصادر الرومية…" from={split + 10} to={cFog} y={100} size={40} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S21 — the last offer */
export const S21: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S21');
  const cReply = cue('S21', 'فجاء', 0, 260);
  const lines = ['ليس تسليم المدينة لي،', 'ولا لأحد من أهلها؛', 'فقد عزمنا جميعاً', 'على أن نموت دونها.'];
  const chars = lines.join('').length;
  const cps = (chars / Math.max(60, L - cReply - 40)) * 30;
  return (
    <SceneShell id="S21">
      <Parchment dark drift={1} />
      <Camera keys={[{f: 0, x: 960, y: 520, z: 0.95}, {f: L, x: 1000, y: 600, z: 1.1}]}>
        <Layer depth={1}>
          <Letter lines={lines} heading="من قسطنطين، إمبراطور الروم" from={6} unroll={40} writeFrom={cReply + 10} cps={cps} ink={C.purpleDeep} accent={C.purple} seal={C.purple} sealAt={L - 50} fontSize={56} note="(بتصرّف عن المصادر)" />
        </Layer>
      </Camera>
    </SceneShell>
  );
};

/* =================================================================== S22 — council of war */
export const S22: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S22');
  const cHalil = cue('S22', 'خليل', 0, 60);
  const cZag = cue('S22', 'زاغانوس', 0, 230);
  const cSilent = cue('S22', 'وصمت', 0, 380);
  const cDecide = cue('S22', 'الهجوم', 0, 500);
  return (
    <SceneShell id="S22" vignette={0.8}>
      <Camera
        keys={[
          {f: 0, x: 960, y: 560, z: 1.05},
          {f: cHalil, x: 620, y: 500, z: 1.6},
          {f: cZag - 15, x: 640, y: 500, z: 1.65},
          {f: cZag + 5, x: 1320, y: 500, z: 1.6},
          {f: cSilent - 15, x: 1300, y: 500, z: 1.65},
          {f: cSilent + 5, x: 960, y: 470, z: 2.0},
          {f: cDecide - 5, x: 960, y: 470, z: 2.1},
          {f: cDecide + 10, x: 960, y: 560, z: 1.2},
          {f: L, x: 960, y: 560, z: 1.3},
        ]}
        shake={(t) => (t > cDecide && t < cDecide + 12 ? 10 : 0)}
      >
        <Layer depth={1}>
          <Svg>
            <TentInterior candle={[960, 760]} />
            <Halil x={520} y={900} scale={1.0} expression={f > cHalil && f < cZag ? 'sad' : 'neutral'} talk={f > cHalil && f < cZag - 10} t={f} />
            <Mehmed2 x={960} y={900} scale={1.05} expression={f > cDecide - 10 ? 'anger' : 'confident'} talk={f > cDecide - 6 && f < cDecide + 50} armFront={f > cDecide ? [90, 120] : undefined} prop="none" t={f} />
            <Zaganos x={1420} y={900} scale={1.0} facing="left" expression="anger" talk={f > cZag && f < cSilent - 10} armFront={f > cZag && f < cSilent ? [80, 90] : undefined} t={f} />
          </Svg>
        </Layer>
        <Wash color={C.ink} opacity={0.3} />
        <Wash color={C.goldLight} opacity={0.3} blend="screen" radial={[960, 700]} />
      </Camera>
      <NameTag text="خليل باشا: ارفع الحصار" x={960} y={150} from={cHalil + 6} to={cZag - 6} color={C.inkSoft} size={36} />
      <NameTag text="زاغانوس باشا: نهجم الآن" x={960} y={150} from={cZag + 6} to={cSilent - 6} color={C.redDeep} size={36} />
      <DateCard text="القرار" sub="الهجوم العام فجر ٢٩ مايو" from={cDecide + 10} to={L - 6} />
    </SceneShell>
  );
};

/* =================================================================== S23 — the last day */
export const S23: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S23');
  const cCity = cue('S23', 'المدينة', 0, 300);
  const cTwo = cue('S23', 'مدينتان', 0, 440);
  return (
    <SceneShell id="S23" vignette={0.8}>
      <Svg>
        <defs>
          <clipPath id="s23l"><rect x={0} y={0} width={958} height={1080} /></clipPath>
          <clipPath id="s23r"><rect x={962} y={0} width={958} height={1080} /></clipPath>
        </defs>
      </Svg>
      <AbsoluteFill style={{clipPath: `inset(0 ${f > cCity - 30 ? 50 : 0}% 0 0)`}}>
        <Camera keys={[{f: 0, x: 960, y: 560, z: 1.1}, {f: L, x: 760, y: 580, z: 1.25}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="night" clouds={2} moon={[300, 180]} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={780} width={3000} height={500} fill={C.ink} />
              <TentRow x={-300} y={780} n={12} gap={220} color={C.red} s={0.7} seed="ld" fires />
              {Array.from({length: 12}).map((_, i) => (
                <g key={i} style={{filter: 'brightness(0.3)'}}>
                  <Person look={LOOK.janissary} x={150 + i * 70} y={960} scale={0.5} pose="kneel" prop="none" t={f} lod={1} />
                </g>
              ))}
            </Svg>
          </Layer>
          <Wash color={C.navyDeep} opacity={0.3} />
        </Camera>
      </AbsoluteFill>
      <AbsoluteFill style={{clipPath: `inset(0 0 0 50%)`, opacity: ramp(f, cCity - 30, cCity)}}>
        <Camera keys={[{f: cCity - 30, x: 1300, y: 500, z: 1.2}, {f: L, x: 1350, y: 560, z: 1.05}]}>
          <Layer depth={1}>
            <Svg>
              <SophiaInterior candles light={0.6} />
              {Array.from({length: 10}).map((_, i) => (
                <g key={i} style={{filter: 'brightness(0.25)'}}>
                  <Person look={{...LOOK.byzSoldier, name: 'faith' + i, headgear: 'none', robe: C.inkFade, armor: null, prop: 'none', shield: undefined}} x={1050 + i * 80} y={1050} scale={0.55} expression="sad" t={f + i * 5} lod={1} />
                </g>
              ))}
            </Svg>
          </Layer>
          <Wash color={C.ink} opacity={0.3} />
        </Camera>
      </AbsoluteFill>
      <AbsoluteFill style={{opacity: ramp(f, cCity - 30, cCity)}}>
        <Svg>
          <path d="M960 0 L960 1080" stroke={C.gold} strokeWidth={5} />
        </Svg>
      </AbsoluteFill>
      <DateCard text="٢٨ مايو ١٤٥٣" sub="اليوم الأخير" from={20} to={cCity - 20} />
      <Quote text="مدينتان تدعوان في ليلة واحدة…" from={cTwo} to={L - 6} y={120} size={60} color={C.parchmentLight} />
    </SceneShell>
  );
};
