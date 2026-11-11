import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {EASE, kf, ramp, rr} from '../lib/anim';
import {cue, sceneLen} from '../lib/cue';
import {SceneShell} from '../components/SceneShell';
import {Camera, Layer} from '../components/Camera';
import {Parchment, Svg} from '../components/Stage';
import {Flame, Flash, Particles, SunRays, Wash} from '../components/FX';
import {ActCard, Caption, DateCard, NameTag, Quote, Reveal} from '../components/Cards';
import {Cypress, Sky, TentInterior} from '../components/Sets';
import {ArrowVolley, Banner, ClashSparks, DustCloud} from '../components/Battle';
import {Seg} from '../components/Seg';
import {Sprite} from '../components/Sprite';
import {OrnateFrame, Rosette, StarLattice} from '../components/Ornament';
import {City, MapArrow, MapLabel, OldMap, Territory, viewAt} from '../components/OldMap';
import {OTTOMAN_1400} from '../data/mapData';
import {HagiaSophia, RumeliHisari, Ship, SophiaInterior, TheodosianWalls} from '../components/FatihSets';
import {Constantine, Gennadios, Giustiniani, LOOK, Mehmed2, Rider} from '../characters/cast';
import {Person} from '../characters/Person';

/* =================================================================== S24 — dawn assault */
export const S24: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S24');
  const cFirst = cue('S24', 'الأولى', 0, 300);
  const cSecond = cue('S24', 'الثانية', 0, 420);
  const cThird = cue('S24', 'الثالثة', 0, 560);
  const cSultan = cue('S24', 'والسلطان', 0, 860);
  const split = cThird - 10;
  const split2 = cSultan - 10;
  const wave = (from: number, unit: string, n: number, seed: string) =>
    Array.from({length: n}).map((_, i) => {
      const p = ramp(f, from + i * 3, from + 110 + i * 3, EASE.inOut);
      const x = -300 + rr(seed + i, 0, 2400);
      const y = 1080 - p * 230 + rr(seed + 'y' + i, -20, 40);
      return p > 0 && p < 1 ? <Sprite key={seed + i} unit={unit} anim="walk" x={x} y={y} scale={0.45} phase={f / 4 + i} /> : null;
    });
  return (
    <SceneShell id="S24" fadeIn={0}>
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 90, x: 960, y: 500, z: 1.0}, {f: split, x: 960, y: 620, z: 1.2}]} shake={(t) => (t > cFirst ? 3 : 0)}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="dawn" clouds={3} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <TheodosianWalls x={-300} y={820} w={2600} damage={0.7} repair={0.6} torches />
              {Array.from({length: 7}).map((_, i) => (
                <Sprite key={'d' + i} unit="byzSoldier" anim="attack" x={-100 + i * 330} y={520 + (i % 2) * 10} scale={0.4} phase={f / 5 + i} facing="left" />
              ))}
              {/* ladders */}
              {[200, 700, 1300, 1800].map((x, i) => (
                <g key={x} opacity={ramp(f, cFirst + i * 10, cFirst + 20 + i * 10)}>
                  <path d={`M${x} 1000 L${x + 60} 560 M${x + 50} 1000 L${x + 110} 560`} stroke={C.horseBay} strokeWidth={8} />
                  {Array.from({length: 8}).map((_, k) => (
                    <path key={k} d={`M${x + 7 * k + 3} ${980 - k * 55} L${x + 7 * k + 53} ${980 - k * 55}`} stroke={C.horseBay} strokeWidth={6} />
                  ))}
                </g>
              ))}
              {wave(cFirst - 20, 'bashibozuk', 22, 'w1')}
              {wave(cSecond - 20, 'bashibozuk', 22, 'w2')}
              <ArrowVolley from={cFirst} dur={34} count={30} x0={300} x1={1600} y0={560} y1={1000} waves={6} waveGap={40} seed="dw" arc={90} />
              <DustCloud x={-200} y={900} w={2400} h={200} seed="dwd" opacity={0.5 * ramp(f, cFirst, cFirst + 60)} />
            </Svg>
          </Layer>
          <Wash color={C.navyDeep} opacity={0.3} />
        </Camera>
        <DateCard text="فجر ٢٩ مايو ١٤٥٣" sub="الهجوم العام" from={100} to={cFirst + 40} />
        <Caption text="الموجة الأولى" from={cFirst} to={cSecond - 6} y={110} size={40} />
        <Caption text="الموجة الثانية" from={cSecond} to={split} y={110} size={40} />
      </Seg>
      <Seg from={split} to={split2 + 12}>
        <Camera keys={[{f: split, x: 960, y: 600, z: 1.3}, {f: split2, x: 960, y: 560, z: 1.05}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="dawn" clouds={3} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={760} width={3000} height={600} fill={C.inkSoft} />
              {Array.from({length: 4}).map((_, r) =>
                Array.from({length: 14}).map((_, i) => <Sprite key={r + '-' + i} unit="janissary" anim="walk" x={-200 + i * 170 + (r % 2) * 80} y={820 + r * 70} scale={0.45 + r * 0.06} phase={f / 5 + i} />),
              )}
              {[200, 900, 1600].map((x, i) => (
                <Banner key={x} x={x} y={880} h={360} w={150} color={C.red} accent={C.gold} seed={'jb' + i} />
              ))}
            </Svg>
          </Layer>
          <Wash color={C.navyDeep} opacity={0.2} />
        </Camera>
        <Caption text="الموجة الثالثة: الإنكشارية" from={split + 10} to={split2} y={110} size={44} />
      </Seg>
      <Seg from={split2} to={L} fadeOut={0}>
        <Camera keys={[{f: split2, x: 900, y: 600, z: 1.3}, {f: L, x: 1000, y: 560, z: 1.1}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="dawn" clouds={2} />
            </Svg>
          </Layer>
          <Layer depth={0.5}>
            <Svg>
              <TheodosianWalls x={-300} y={700} w={2600} damage={0.8} torches />
              <DustCloud x={600} y={500} w={800} h={300} seed="br" opacity={0.6} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={900} width={3000} height={400} fill={C.ink} />
              <Rider who="mehmed2" x={500} y={1040} scale={1.0} gait="stand" expression="confident" prop="none" t={f} />
            </Svg>
          </Layer>
        </Camera>
        <NameTag text="باب القديس رومانوس" x={1150} y={250} from={split2 + 20} to={L - 10} color={C.purple} size={36} />
      </Seg>
      <ActCard name="الفصل الثالث" title="الفتح" from={0} to={96} />
    </SceneShell>
  );
};

/* =================================================================== S25 — Giustiniani wounded */
export const S25: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S25');
  const cMoment = cue('S25', 'اللحظة', 0, 260);
  const cHit = cue('S25', 'أصيب', 0, 300);
  const cPanic = cue('S25', 'دب', 0, 520);
  const split = cMoment - 20;
  return (
    <SceneShell id="S25">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 1100, y: 600, z: 1.2}, {f: split, x: 800, y: 600, z: 1.0}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="dawn" clouds={3} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={800} width={3000} height={500} fill={C.inkSoft} />
              <path d="M-400 840 L2400 840" stroke={C.turqDeep} strokeWidth={26} />
              {Array.from({length: 3}).map((_, r) =>
                Array.from({length: 12}).map((_, i) => {
                  const beat = Math.floor(f / 15) % 2;
                  return <Sprite key={r + '-' + i} unit="janissary" anim="walk" x={(f * 1.2) % 200 - 200 + i * 200 + r * 60} y={900 + r * 70} scale={0.5 + r * 0.08} phase={beat * Math.PI} />;
                }),
              )}
              <Rider who="mehmed2" x={1500} y={1060} scale={1.0} gait="stand" expression="anger" prop="swordDrawn" armFront={[140, 160]} facing="left" t={f} />
            </Svg>
          </Layer>
        </Camera>
      </Seg>
      <Seg from={split} to={L} fadeOut={0}>
        <Camera keys={[{f: split, x: 960, y: 520, z: 1.4}, {f: cHit + 20, x: 900, y: 560, z: 1.6}, {f: L, x: 960, y: 540, z: 1.1}]} shake={(t) => (t > cHit && t < cHit + 10 ? 14 : t > cPanic ? 4 : 0)}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="dawn" clouds={2} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-300} y={760} width={2520} height={600} fill={C.parchmentDark} stroke={C.ink} strokeWidth={3} />
              {Array.from({length: 8}).map((_, i) => (
                <rect key={i} x={-300 + i * 340} y={690} width={180} height={70} fill={C.parchmentDark} stroke={C.ink} strokeWidth={2} />
              ))}
              {(() => {
                const fall = ramp(f, cHit, cHit + 20, EASE.out);
                const carry = ramp(f, cHit + 60, L - 40, EASE.inOut);
                return (
                  <g transform={`translate(${-carry * 900} 0)`}>
                    <Giustiniani x={900} y={920 + fall * 30} scale={1.05} expression={f > cHit ? 'sad' : 'confident'} prop="sword" lean={fall * 18} headTilt={fall * 14} limp={f > cHit} t={f} />
                    {f > cHit + 30 && [760, 1060].map((x) => <Sprite key={x} unit="genoese" anim="stand" x={x} y={930} scale={0.7} facing="left" />)}
                  </g>
                );
              })()}
              {[1300, 1450, 1600, 1750].map((x, i) => (
                <Sprite key={x} unit={i % 2 ? 'genoese' : 'byzSoldier'} anim="attack" x={x + (f > cPanic ? Math.sin(f / 4 + i) * 30 : 0)} y={930} scale={0.65} phase={f / 4 + i} facing={f > cPanic && i % 2 ? 'right' : 'left'} />
              ))}
              {f > cHit - 4 && f < cHit + 12 && <ClashSparks x={900} y={720} at={cHit - 4} seed="gh" />}
              <DustCloud x={-200} y={700} w={2400} h={300} seed="gd" opacity={0.45 * ramp(f, cPanic, cPanic + 60)} />
            </Svg>
          </Layer>
          <Flash at={cHit} color={C.redLight} peak={0.25} dur={10} />
        </Camera>
        <Caption text="جُرح جوستينياني" from={cHit + 10} to={cPanic} y={110} size={44} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S26 — the banner */
export const S26: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S26');
  const cHasan = cue('S26', 'حسن', 0, 260);
  const cMoments = cue('S26', 'لحظات', 0, 470);
  const split = cHasan - 50;
  const split2 = cMoments - 10;
  return (
    <SceneShell id="S26">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 960, y: 560, z: 1.0}, {f: split, x: 980, y: 600, z: 1.5}]}>
          <Layer depth={1}>
            <Svg>
              <rect x={-300} y={-200} width={2520} height={1500} fill={C.inkSoft} />
              <rect x={-300} y={200} width={2520} height={900} fill={C.parchmentShadow} stroke={C.ink} strokeWidth={4} />
              {Array.from({length: 12}).map((_, r) =>
                Array.from({length: 14}).map((_, i) => <rect key={r + '-' + i} x={-300 + i * 190 + (r % 2) * 95} y={200 + r * 75} width={190} height={75} fill="none" stroke={C.ink} strokeWidth={1.5} opacity={0.35} />),
              )}
              {/* the small door */}
              <path d="M880 1000 L880 640 Q980 560 1080 640 L1080 1000 Z" fill={C.goldLight} opacity={0.3 + 0.7 * ramp(f, 40, 120)} />
              <g transform={`translate(880 0) scale(${1 - ramp(f, 40, 120, EASE.out) * 0.85} 1)`}>
                <path d="M0 1000 L0 640 Q100 560 200 640 L200 1000 Z" fill={C.horseBay} stroke={C.ink} strokeWidth={4} />
              </g>
              <path d="M880 1000 L880 640 Q980 560 1080 640 L1080 1000" fill="none" stroke={C.ink} strokeWidth={6} />
              <SunRays x={980} y={800} n={10} color={C.goldLight} opacity={0.3 * ramp(f, 60, 140)} />
              {Array.from({length: 4}).map((_, i) => (
                <Sprite key={i} unit="janissary" anim="walk" x={600 + i * 70} y={1000} scale={0.5} phase={f / 4 + i} opacity={0.4} />
              ))}
            </Svg>
          </Layer>
          <Wash color={C.ink} opacity={0.25} />
        </Camera>
        <Caption text="يُروى… «الكِركابورتا»" from={30} to={split - 6} y={110} size={44} />
      </Seg>
      <Seg from={split} to={split2 + 12}>
        <Camera keys={[{f: split, x: 960, y: 640, z: 1.2}, {f: split2, x: 1000, y: 360, z: 1.35}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="dawn" clouds={3} />
              <circle cx={300} cy={760} r={140} fill={C.goldLight} opacity={0.7} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={760} y={260} width={480} height={900} fill={C.parchmentDark} stroke={C.ink} strokeWidth={4} />
              {Array.from({length: 5}).map((_, i) => (
                <rect key={i} x={760 + i * 100} y={200} width={70} height={60} fill={C.parchmentDark} stroke={C.ink} strokeWidth={3} />
              ))}
              {(() => {
                const climb = ramp(f, split + 10, cHasan + 60, EASE.inOut);
                const plant = ramp(f, cHasan + 60, cHasan + 90, EASE.out);
                const y = 1100 - climb * 900;
                return (
                  <g>
                    <Person look={LOOK.janissary} x={1000} y={y} scale={1.1} prop="none" armFront={[160 - plant * 20, 170]} expression="confident" t={f} lod={0} />
                    <g transform={`translate(${1060} ${y - 180 - plant * 60}) rotate(${(1 - plant) * 30})`}>
                      <Banner x={0} y={0} h={360} w={200} color={C.red} accent={C.gold} seed="hasan" emblem="crescent" />
                    </g>
                  </g>
                );
              })()}
            </Svg>
          </Layer>
        </Camera>
        <NameTag text="حسن الأولوبادلي" x={1450} y={160} from={cHasan} to={split2} color={C.red} size={42} />
      </Seg>
      <Seg from={split2} to={L} fadeOut={0}>
        <Camera keys={[{f: split2, x: 960, y: 540, z: 1.25}, {f: L, x: 960, y: 520, z: 1.0}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="dawn" clouds={3} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <TheodosianWalls x={-300} y={860} w={2600} damage={0.8} flags="ott" flagRise={ramp(f, split2, split2 + 120)} />
            </Svg>
          </Layer>
          <Wash color={C.goldLight} opacity={0.2} blend="screen" />
        </Camera>
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S27 — the emperor's end */
export const S27: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S27');
  const cOff = cue('S27', 'خلع', 0, 90);
  const cRush = cue('S27', 'واندفع', 0, 160);
  const cGone = cue('S27', 'بعدها', 0, 260);
  const cEmp = cue('S27', 'لإمبراطورية', 0, 360);
  const off = ramp(f, cOff, cOff + 40, EASE.inOut);
  const walk = ramp(f, cRush, cGone + 20, EASE.in);
  const split = cGone + 30;
  return (
    <SceneShell id="S27" vignette={0.85}>
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 900, y: 560, z: 1.6}, {f: cRush, x: 960, y: 560, z: 1.3}, {f: split, x: 1300, y: 560, z: 1.15}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="storm" clouds={4} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-300} y={760} width={2520} height={600} fill={C.parchmentShadow} stroke={C.ink} strokeWidth={3} />
              <Constantine
                x={900 + walk * 900}
                y={920}
                scale={1.1}
                facing="right"
                expression="sad"
                prop={f > cRush ? 'swordDrawn' : 'none'}
                opacity={1 - ramp(f, cGone, cGone + 30)}
                walkPhase={walk > 0 ? f / 5 : undefined}
                pose={walk > 0 ? 'walk' : 'stand'}
                t={f}
              />
              {/* the crown laid on the stone */}
              <g transform={`translate(${kf(f, [[cOff, 900], [cOff + 40, 760]], EASE.inOut)} ${kf(f, [[cOff, 600], [cOff + 40, 900]], EASE.inOut)})`} opacity={off}>
                <path d="M-40 0 L-40 -40 L-20 -20 L0 -50 L20 -20 L40 -40 L40 0 Z" fill={C.gold} stroke={C.ink} strokeWidth={3} />
                <circle cx={0} cy={-14} r={6} fill={C.redLight} />
              </g>
              <DustCloud x={1300} y={600} w={900} h={500} seed="cg" opacity={0.7 * ramp(f, cRush, cGone)} color={C.inkFade} />
            </Svg>
          </Layer>
          <Wash color={C.ink} opacity={0.25} />
        </Camera>
        <DateCard text="٢٩ مايو ١٤٥٣" sub="آخر أباطرة الروم" from={10} to={cOff + 20} />
      </Seg>
      <Seg from={split} to={L} fadeOut={0}>
        <Camera keys={[{f: split, x: 960, y: 700, z: 2.4}, {f: L, x: 960, y: 700, z: 2.8}]}>
          <Layer depth={1}>
            <Svg>
              <rect x={-300} y={-200} width={2520} height={1500} fill={C.parchmentShadow} />
              <g transform="translate(960 760)">
                <path d="M-40 0 L-40 -40 L-20 -20 L0 -50 L20 -20 L40 -40 L40 0 Z" fill={C.gold} stroke={C.ink} strokeWidth={3} />
                <circle cx={0} cy={-14} r={6} fill={C.redLight} />
              </g>
              <Particles kind="dust" count={60} seed="cd" x={700} y={500} w={520} h={300} />
              <rect x={-300} y={-200} width={2520} height={1500} fill={C.parchmentShadow} opacity={0.5 * ramp(f, split, L)} />
            </Svg>
          </Layer>
        </Camera>
        <Quote text="ألف عام… انتهت" from={cEmp} to={L - 4} y={120} size={60} color={C.parchmentLight} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S28 — Hagia Sophia */
export const S28: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S28');
  const cDust = cue('S28', 'حفنة', 0, 300);
  const cMosque = cue('S28', 'مسجدا', 0, 440);
  const cFatih = cue('S28', 'الفاتح', 0, 640);
  const split = cDust - 60;
  const split2 = cMosque + 30;
  return (
    <SceneShell id="S28">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 960, y: 600, z: 1.0}, {f: split, x: 960, y: 520, z: 1.25}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="day" clouds={4} />
            </Svg>
          </Layer>
          <Layer depth={0.5}>
            <Svg>
              <HagiaSophia x={960} y={760} s={1.1} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <path d="M-400 1300 L700 760 L1220 760 L2320 1300 Z" fill={C.parchmentDark} stroke={C.ink} strokeWidth={3} />
              {[-1, 1].map((sd) => (
                <g key={sd}>
                  <Cypress x={960 + sd * 480} y={880} s={1.0} />
                  <Cypress x={960 + sd * 800} y={1080} s={1.5} />
                </g>
              ))}
              <Rider who="mehmed2" x={960} y={kf(f, [[0, 1250], [split, 950]], EASE.out)} scale={kf(f, [[0, 1.1], [split, 0.8]])} gait={f < split - 20 ? 'walk' : 'stand'} expression="confident" prop="none" t={f} />
            </Svg>
          </Layer>
        </Camera>
        <DateCard text="ظهر ٢٩ مايو" sub="السلطان يدخل المدينة" from={20} to={split - 10} />
      </Seg>
      <Seg from={split} to={split2 + 12}>
        <Camera keys={[{f: split, x: 960, y: 520, z: 1.3}, {f: split2, x: 960, y: 480, z: 1.5}]}>
          <Layer depth={1}>
            <Svg>
              <SophiaInterior light={0.6 + 0.4 * ramp(f, split, split2)} />
              <Mehmed2 x={960} y={980} scale={1.1} expression="neutral" headTilt={ramp(f, cDust - 20, cDust + 10) * 12} armFront={[170 - ramp(f, cDust, cDust + 30) * 120, 40]} prop="none" t={f} />
              <Particles kind="motes" count={50} seed="sd" x={860} y={480} w={200} h={200} opacity={ramp(f, cDust + 20, cDust + 40) * (1 - ramp(f, cDust + 80, cDust + 120))} />
            </Svg>
          </Layer>
        </Camera>
        <Caption text="يُروى أنه نثر التراب على عمامته تواضعاً" from={cDust - 10} to={split2} y={110} size={40} />
      </Seg>
      <Seg from={split2} to={L} fadeOut={0}>
        <Camera keys={[{f: split2, x: 960, y: 560, z: 1.25}, {f: L, x: 960, y: 520, z: 0.95}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="day" clouds={3} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <HagiaSophia x={960} y={900} s={1.4} minarets={ramp(f, split2 + 20, split2 + 140, EASE.out)} />
              <rect x={-400} y={900} width={3000} height={400} fill={C.parchmentDark} />
            </Svg>
          </Layer>
          <Wash color={C.goldLight} opacity={0.2} blend="screen" />
        </Camera>
        <AbsoluteFill style={{alignItems: 'center'}}>
          <div style={{position: 'absolute', top: 120, fontFamily: FONT.title, fontSize: 150, color: C.goldLight, direction: 'rtl', opacity: ramp(f, cFatih - 6, cFatih + 14), textShadow: `0 0 30px ${C.redDeep}, 0 4px 0 ${C.ink}`}}>
            الفاتح
          </div>
        </AbsoluteFill>
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S29 — Istanbul */
export const S29: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S29');
  const cPatr = cue('S29', 'بطريركهم', 0, 300);
  const cIst = cue('S29', 'إسطنبول', 0, 520);
  const split = cPatr - 20;
  const split2 = cIst - 30;
  const grow = ramp(f, split2, L, EASE.out);
  return (
    <SceneShell id="S29">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 960, y: 560, z: 1.1}, {f: split, x: 960, y: 540, z: 1.0}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="day" clouds={5} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={800} width={3000} height={500} fill={C.parchmentDark} />
              {Array.from({length: 7}).map((_, i) => {
                const h = ramp(f, 20 + i * 25, 120 + i * 25, EASE.out);
                const x = -100 + i * 330;
                return (
                  <g key={i}>
                    <rect x={x} y={800 - 260 * h} width={200} height={260 * h} fill={C.parchment} stroke={C.ink} strokeWidth={3} />
                    {h > 0.9 && <path d={`M${x - 10} ${540} Q${x + 100} ${430} ${x + 210} ${540} Z`} fill={i % 2 ? C.silverLight : C.red} stroke={C.ink} strokeWidth={3} />}
                    {/* scaffolding */}
                    <path d={`M${x - 20} 800 L${x - 20} ${560} M${x + 220} 800 L${x + 220} ${560} M${x - 20} 700 L${x + 220} 700 M${x - 20} 620 L${x + 220} 620`} stroke={C.horseBay} strokeWidth={5} opacity={1 - h * 0.8} />
                  </g>
                );
              })}
              {Array.from({length: 16}).map((_, i) => (
                <Person key={i} look={i % 3 === 0 ? LOOK.ottomanCourtier : {...LOOK.byzSoldier, name: 'cit' + i, headgear: i % 2 ? 'none' : 'smallTurban', robe: [C.turq, C.red, C.purpleLight, C.horseBay][i % 4], armor: null, prop: 'none', shield: undefined}} x={(rr('cw' + i, -200, 2200) + f * (i % 2 ? 1.4 : -1.2) + 2400) % 2400 - 200} y={930 + (i % 3) * 40} scale={0.5} facing={i % 2 ? 'right' : 'left'} pose="walk" walkPhase={f / 6 + i} t={f} lod={1} />
              ))}
            </Svg>
          </Layer>
        </Camera>
      </Seg>
      <Seg from={split} to={split2 + 12}>
        <Camera keys={[{f: split, x: 960, y: 540, z: 1.1}, {f: split2, x: 960, y: 520, z: 1.3}]}>
          <Layer depth={1}>
            <Svg>
              <TentInterior candle={[1500, 700]} />
              <Mehmed2 x={760} y={930} scale={1.05} expression="neutral" armFront={[90 - ramp(f, split + 30, split + 70) * 10, 10]} prop="none" t={f} />
              <Gennadios x={1160} y={940} scale={1.0} facing="left" expression="neutral" prop="staff" t={f} />
            </Svg>
          </Layer>
          <Wash color={C.goldLight} opacity={0.2} blend="screen" radial={[960, 600]} />
        </Camera>
        <NameTag text="البطريرك جناديوس ١٤٥٤" x={960} y={150} from={split + 20} to={split2} color={C.inkSoft} size={40} />
      </Seg>
      <Seg from={split2} to={L} fadeOut={0}>
        <Camera keys={[{f: split2, x: 960, y: 520, z: 1.2}, {f: L, x: 960, y: 520, z: 1.0}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="sunset" clouds={3} />
            </Svg>
          </Layer>
          <Layer depth={0.6}>
            <Svg>
              <HagiaSophia x={960} y={760} s={0.9} minarets={1} />
              {[300, 1600].map((x, i) => (
                <g key={x} transform={`translate(${x} 760) scale(${0.5 * grow})`}>
                  <HagiaSophia x={0} y={0} s={1} minarets={1} tone={C.parchment} />
                </g>
              ))}
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={760} width={3000} height={600} fill={C.turqDeep} />
              {Array.from({length: 6}).map((_, i) => (
                <Ship key={i} x={(-200 + i * 420 + f * 0.8) % 2400 - 100} y={860 + (i % 2) * 70} s={0.6} kind="galley" facing="right" flag={C.red} sail={C.parchmentLight} t={f} />
              ))}
            </Svg>
          </Layer>
        </Camera>
        <AbsoluteFill style={{alignItems: 'center'}}>
          <div style={{position: 'absolute', top: 110, fontFamily: FONT.title, fontSize: 130, color: C.goldLight, direction: 'rtl', opacity: ramp(f, cIst - 6, cIst + 14), textShadow: `0 0 26px ${C.redDeep}, 0 4px 0 ${C.ink}`}}>
            إسطنبول
          </div>
        </AbsoluteFill>
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S30 — after the conquest */
export const S30: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S30');
  const cSerb = cue('S30', 'صربيا', 0, 60);
  const cMorea = cue('S30', 'والموره', 0, 100);
  const cTreb = cue('S30', 'وطرابزون', 0, 140);
  const cBos = cue('S30', 'والبوسنة', 0, 180);
  const cOtr = cue('S30', 'أوترانتو', 0, 260);
  const cDied = cue('S30', 'مات', 0, 480);
  const split = cDied - 60;
  const ist: [number, number] = [28.98, 41.01];
  return (
    <SceneShell id="S30">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <OldMap views={[viewAt(0, [28, 41], 1100), viewAt(cTreb, [29, 41.5], 1700), viewAt(cOtr, [24, 41.5], 1900), viewAt(split, [24, 41.5], 1950)]} cities={['constantinople']} cityFrom={0}>
          <Territory d={OTTOMAN_1400} color={C.red} from={0} dur={1} origin="constantinople" id="ott30" />
          <City id="constantinople" glow={0} color={C.red} size={1.4} />
          <MapArrow via={[ist, [24, 43], [20.93, 44.66]]} from={cSerb - 10} dur={40} color={C.red} />
          <MapLabel at={[20.93, 45.3]} text="صربيا ١٤٥٩" from={cSerb + 20} color={C.redDeep} size={38} />
          <MapArrow via={[ist, [25, 39], [22.4, 37.1]]} from={cMorea - 10} dur={40} color={C.red} />
          <MapLabel at={[22.4, 36.4]} text="الموره ١٤٦٠" from={cMorea + 20} color={C.redDeep} size={38} />
          <MapArrow via={[ist, [34, 42], [39.72, 41.0]]} from={cTreb - 10} dur={45} color={C.red} />
          <MapLabel at={[39.72, 41.7]} text="طرابزون ١٤٦١" from={cTreb + 25} color={C.redDeep} size={38} />
          <MapArrow via={[ist, [21, 44], [17.9, 44.0]]} from={cBos - 10} dur={45} color={C.red} />
          <MapLabel at={[17.4, 44.7]} text="البوسنة ١٤٦٣" from={cBos + 25} color={C.redDeep} size={38} />
          <MapArrow via={[ist, [24, 39.5], [20.5, 39.5], [18.49, 40.15]]} from={cOtr - 10} dur={50} color={C.red} dashed />
          <MapLabel at={[18.0, 40.8]} text="أوترانتو ١٤٨٠" from={cOtr + 30} color={C.redDeep} size={38} />
        </OldMap>
      </Seg>
      <Seg from={split} to={L} fadeOut={0}>
        <Camera keys={[{f: split, x: 960, y: 600, z: 1.0}, {f: L, x: 1100, y: 640, z: 1.35}]}>
          <Layer depth={1}>
            <Svg>
              <TentInterior candle={[1100, 720]} />
              <rect x={1060} y={720} width={80} height={140} fill={C.parchmentLight} stroke={C.ink} strokeWidth={3} />
              {f < cDied + 40 && <Flame x={1100} y={720} scale={0.6 * (1 - ramp(f, cDied, cDied + 40))} seed="lastc" />}
              {f > cDied + 30 && <path d={`M1100 715 C1090 ${680 - (f - cDied) * 0.6} 1115 ${640 - (f - cDied) * 0.8} 1100 ${580 - (f - cDied)}`} stroke={C.silverLight} strokeWidth={4} fill="none" opacity={Math.max(0, 0.7 - (f - cDied - 30) / 120)} />}
            </Svg>
          </Layer>
          <Wash color={C.ink} opacity={0.3 + 0.4 * ramp(f, cDied, cDied + 60)} />
        </Camera>
        <DateCard text="٣ مايو ١٤٨١" sub="رحيل الفاتح في التاسعة والأربعين" from={cDied - 10} to={L - 6} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S31 — end of an era */
export const S31: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S31');
  const cGun = cue('S31', 'البارود', 0, 150);
  const cSchol = cue('S31', 'وهاجر', 0, 260);
  const cNew = cue('S31', 'عالم', 0, 560);
  const cTrade = cue('S31', 'التجارة', 0, 700);
  const split = cSchol - 10;
  const split2 = cNew - 70;
  return (
    <SceneShell id="S31">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Parchment />
        <Camera keys={[{f: 0, x: 960, y: 540, z: 1.0}, {f: split, x: 960, y: 560, z: 1.2}]}>
          <Layer depth={1}>
            <Svg>
              <g opacity={1 - 0.7 * ramp(f, cGun, cGun + 90)} style={{filter: `grayscale(${ramp(f, cGun, cGun + 90)})`}}>
                <TheodosianWalls x={-300} y={820} w={2600} damage={ramp(f, cGun, cGun + 60) * 0.9} />
              </g>
              <text x={960} y={980} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={52} fill={C.redDeep} opacity={ramp(f, 30, 50)}>
                نهاية العصور الوسطى
              </text>
            </Svg>
          </Layer>
        </Camera>
      </Seg>
      <Seg from={split} to={split2 + 12}>
        <Camera keys={[{f: split, x: 960, y: 560, z: 1.15}, {f: split2, x: 960, y: 540, z: 1.0}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="dusk" clouds={4} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={760} width={3000} height={600} fill={C.turqDeep} />
              {Array.from({length: 3}).map((_, i) => (
                <g key={i}>
                  <Ship x={kf(f, [[split, 300 + i * 200], [split2, 1500 + i * 200]], EASE.inOut)} y={850 + i * 60} s={0.7} kind="carrack" facing="right" flag={C.purple} sail={C.parchmentLight} t={f} />
                </g>
              ))}
              {Array.from({length: 8}).map((_, i) => {
                const x = kf(f, [[split, 250 + i * 60], [split2, 1450 + i * 60]], EASE.inOut);
                return (
                  <g key={'b' + i} transform={`translate(${x} ${640 + Math.sin(f / 10 + i) * 14}) rotate(${Math.sin(f / 13 + i) * 10})`} opacity={0.85}>
                    <rect x={-24} y={-32} width={48} height={64} fill={C.redDeep} stroke={C.ink} strokeWidth={2} />
                    <rect x={-18} y={-26} width={36} height={52} fill={C.parchmentLight} />
                  </g>
                );
              })}
            </Svg>
          </Layer>
        </Camera>
        <Caption text="علماء الروم يحملون كتبهم إلى إيطاليا" from={split + 10} to={split2} y={110} size={40} />
      </Seg>
      <Seg from={split2} to={L} fadeOut={0}>
        <Camera keys={[{f: split2, x: 960, y: 560, z: 1.2}, {f: L, x: 960, y: 520, z: 1.0}]}>
          <Layer depth={0.05}>
            <Svg>
              <Sky mode="dawn" clouds={3} />
              <circle cx={960} cy={kf(f, [[split2, 1000], [L, 700]], EASE.out)} r={150} fill={C.goldLight} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <SunRays x={960} y={800} n={16} color={C.goldLight} opacity={0.35 * ramp(f, split2 + 30, cNew + 40)} />
              <rect x={-400} y={760} width={3000} height={600} fill={C.turqDeep} />
              <g transform={`translate(960 520) rotate(${ramp(f, split2 + 10, split2 + 60, EASE.inOut) * 180})`}>
                <path d="M-90 -140 L90 -140 L0 0 L90 140 L-90 140 L0 0 Z" fill={C.parchmentLight} stroke={C.gold} strokeWidth={8} opacity={0.9} />
                <path d="M-70 -120 L70 -120 L0 -10 Z" fill={C.gold} opacity={1 - ramp(f, split2 + 60, L)} />
                <path d="M0 10 L60 120 L-60 120 Z" fill={C.gold} opacity={ramp(f, split2 + 60, L)} />
              </g>
              {Array.from({length: 3}).map((_, i) => (
                <Ship key={i} x={kf(f, [[cTrade, 1400 + i * 150], [L, 1900 + i * 150]], EASE.inOut)} y={850 + i * 50} s={0.5} kind="carrack" facing="right" flag={C.gold} sail={C.parchmentLight} t={f} />
              ))}
            </Svg>
          </Layer>
        </Camera>
        <Quote text="سقطت مدينة… وبدأ عالم جديد" from={cNew - 30} to={L - 4} y={120} size={60} color={C.parchmentLight} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S32 — the lesson */
export const S32: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S32');
  const cNot = cue('S32', 'بالقوة', 0, 200);
  const cWall = cue('S32', 'جدارا', 0, 450);
  return (
    <SceneShell id="S32" vignette={0.8}>
      <Camera keys={[{f: 0, x: 700, y: 640, z: 1.6}, {f: cNot, x: 960, y: 520, z: 1.0}, {f: L, x: 960, y: 500, z: 0.95}]}>
        <Layer depth={0.05}>
          <Svg>
            <Sky mode="dawn" clouds={3} />
          </Svg>
        </Layer>
        <Layer depth={0.55}>
          <Svg>
            <TheodosianWalls x={-300} y={700} w={2600} flags="ott" flagRise={1} />
            {/* ghost of the ships over the hills */}
            <g opacity={0.25 * ramp(f, cNot, cNot + 60)}>
              <path d="M-200 520 C400 360 800 200 1200 300" stroke={C.parchmentLight} strokeWidth={6} fill="none" strokeDasharray="20 16" />
              {[0.2, 0.45, 0.7].map((t, i) => (
                <Ship key={i} x={-200 + t * 1400} y={520 - Math.sin(t * Math.PI) * 280} s={0.4} kind="galley" t={f} oars={false} flag={C.red} sail={C.parchmentLight} />
              ))}
            </g>
          </Svg>
        </Layer>
        <Layer depth={1}>
          <Svg>
            <rect x={-400} y={900} width={2800} height={400} fill={C.inkSoft} />
            <Rider who="mehmed2" x={720} y={1040} scale={0.95} gait="stand" t={f} expression="confident" prop="none" />
          </Svg>
        </Layer>
        <Wash color={C.goldLight} opacity={0.15} blend="screen" />
      </Camera>
      <Quote text="«رأى طريقاً حيث رأى غيره جداراً»" from={cWall - 20} to={L - 4} y={120} size={62} color={C.parchmentLight} />
    </SceneShell>
  );
};

/* =================================================================== S33 — closing */
export const S33: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S33');
  const cFall = cue('S33', 'تسقط', 0, 330);
  return (
    <SceneShell id="S33" fadeOut={20}>
      <Camera keys={[{f: 0, x: 1100, y: 540, z: 1.25}, {f: L, x: 960, y: 520, z: 1.0}]}>
        <Layer depth={0.05}>
          <Svg>
            <Sky mode="sunset" clouds={4} />
            <circle cx={1500} cy={560} r={120} fill={C.goldLight} opacity={0.9} />
          </Svg>
        </Layer>
        <Layer depth={0.35}>
          <Svg>
            <g>
              <HagiaSophia x={1400} y={720} s={0.55} minarets={1} tone={C.inkSoft} />
              <HagiaSophia x={1750} y={730} s={0.35} minarets={1} tone={C.inkSoft} />
            </g>
          </Svg>
        </Layer>
        <Layer depth={0.7}>
          <Svg>
            <rect x={-400} y={720} width={3000} height={600} fill={C.turqDeep} />
            <path d="M-400 760 C0 700 300 560 600 600 C800 640 900 760 1000 800 L-400 800 Z" fill={C.greenDeep} stroke={C.ink} strokeWidth={3} />
            <RumeliHisari x={350} y={720} s={0.7} />
          </Svg>
        </Layer>
        <Layer depth={1}>
          <Svg>
            {Array.from({length: 7}).map((_, i) => {
              const x = (rr('gl' + i, 0, 2000) + f * (1.5 + i * 0.2)) % 2300 - 200;
              const y = rr('gly' + i, 200, 500) + Math.sin(f / 12 + i) * 20;
              const w = Math.sin(f / 4 + i) * 10;
              return <path key={i} d={`M${x - 24} ${y + w} Q${x - 10} ${y - 8} ${x} ${y} Q${x + 10} ${y - 8} ${x + 24} ${y + w}`} stroke={C.ink} strokeWidth={3} fill="none" />;
            })}
          </Svg>
        </Layer>
        <Wash color={C.goldLight} opacity={0.2 + 0.2 * ramp(f, cFall, L)} blend="screen" />
      </Camera>
      <Quote text="الأسوار تسقط… أما الأحلام العظيمة فتبقى" from={cFall - 20} to={L - 4} y={130} size={60} color={C.parchmentLight} />
    </SceneShell>
  );
};

/* =================================================================== S34 — end card */
export const S34: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S34');
  const p = ramp(f, 0, 90, EASE.out);
  return (
    <SceneShell id="S34" fadeIn={14} fadeOut={40}>
      <Parchment dark drift={1} />
      <Camera keys={[{f: 0, z: 1.06}, {f: L, z: 1.0}]}>
        <Layer depth={0.4}>
          <Svg>
            <StarLattice w={1920} h={1080} cell={180} color={C.gold} opacity={0.07} offset={-f * 0.2} />
          </Svg>
        </Layer>
        <Layer depth={1}>
          <Svg>
            <Rosette x={960} y={165} r={70} progress={p} color={C.gold} width={2} rot={-f * 0.06} dot={false} />
            <OrnateFrame x={160} y={80} w={1600} h={920} progress={p} color={C.gold} inner={C.redDeep} />
          </Svg>
          <AbsoluteFill style={{alignItems: 'center'}}>
            <div style={{position: 'absolute', top: 245, fontFamily: FONT.title, fontSize: 120, color: C.goldLight, direction: 'rtl', opacity: p, textShadow: `0 0 24px ${C.red}`}}>
              الفاتح
            </div>
            <div style={{position: 'absolute', top: 480, width: 1400, textAlign: 'center', direction: 'rtl'}}>
              <Reveal from={60} dur={40}>
                <div style={{fontFamily: FONT.display, fontSize: 36, color: C.parchment, lineHeight: 1.7}}>
                  المصادر: سفرانتزيس — دوكاس — كريتوفولوس — يوميات باربارو — طورسون بك
                  <br />
                  ودراسات ستيفن رنسيمان وفرانز بابينغر وخليل إينالجيك
                </div>
              </Reveal>
              <Reveal from={140} dur={40}>
                <div style={{fontFamily: FONT.body, fontSize: 30, color: C.gold, marginTop: 40}}>
                  رسوم وحركة وموسيقى ومؤثرات مولّدة بالكامل بالكود: Remotion · Python · FFmpeg
                </div>
              </Reveal>
              <Reveal from={200} dur={40}>
                <div style={{fontFamily: FONT.body, fontSize: 26, color: C.parchmentDark, marginTop: 24}}>
                  ما قُدّم بصيغة «يُروى» محل خلاف بين المؤرخين
                </div>
              </Reveal>
            </div>
          </AbsoluteFill>
        </Layer>
      </Camera>
    </SceneShell>
  );
};
