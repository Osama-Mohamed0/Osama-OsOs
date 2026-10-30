import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {EASE, fadeInOut, kf, noise1, ramp, rr} from '../lib/anim';
import {cue, narrEnd as narrEndOf, narrStart, sceneLen} from '../lib/cue';
import {SceneShell} from '../components/SceneShell';
import {Camera, Layer} from '../components/Camera';
import {Parchment, Svg} from '../components/Stage';
import {Banner} from '../components/Battle';
import {Flame, Flash, Lightning, Particles, SunRays, Wash} from '../components/FX';
import {ActCard, Caption, DateCard, NameTag, Quote, Reveal} from '../components/Cards';
import {Divider, OrnateFrame, Rosette, StarLattice} from '../components/Ornament';
import {Hills, Sky, Skyline, TentInterior} from '../components/Sets';
import {City, MapArrow, MapLabel, OldMap, Territory, viewAt} from '../components/OldMap';
import {Seg} from '../components/Seg';
import {Bayezid, Horse, LOOK, Mehmed, Musa, Rider, Timur} from '../characters/cast';
import {Person} from '../characters/Person';
import {SPLIT_BEYLIKS, SPLIT_ISA, SPLIT_MEHMED, SPLIT_SULEYMAN, TIMURID_1400} from '../data/mapData';

/* =================================================================== S28 — face to face */
export const S28: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S28');
  const cRise = cue('S28', 'قام', 0, 200);
  const cSeat = cue('S28', 'وأجلسه', 0, 260);
  const cBlame = cue('S28', 'عاتبه', 0, 330);
  const cFace = cue('S28', 'وجها', 0, 560);
  const risen = f > cRise;
  const seated = ramp(f, cSeat + 20, cSeat + 40);
  return (
    <SceneShell id="S28" fadeIn={0} vignette={0.85}>
      <Camera
        keys={[
          {f: 90, x: 960, y: 600, z: 1.0},
          {f: cRise, x: 1180, y: 520, z: 1.35},
          {f: cBlame, x: 1050, y: 560, z: 1.25},
          {f: cFace, x: 1000, y: 560, z: 1.5},
          {f: L, x: 1000, y: 540, z: 1.7},
        ]}
      >
        <Layer depth={1}>
          <Svg>
            <TentInterior candle={[1000, 700]} />
            <path d="M560 810 L1560 810 L1580 840 L540 840 Z" fill={C.gold} stroke={C.ink} strokeWidth={3} />
            <path d="M580 790 C580 770 1540 770 1540 790 L1540 812 L580 812 Z" fill={C.green} stroke={C.ink} strokeWidth={2.5} />
            {risen ? (
              <Timur x={1300} y={800} scale={1.1} facing="left" expression="neutral" talk={f > cBlame && f < cFace} t={f} pose={seated > 0.5 ? 'throne' : 'stand'} prop={seated > 0.5 ? 'none' : 'staff'} />
            ) : (
              <Timur x={1300} y={800} scale={1.1} pose="throne" facing="left" expression="confident" prop="none" t={f} />
            )}
            {seated < 1 && <Bayezid x={kf(f, [[0, 520], [cSeat + 20, 700]])} y={812} scale={1.1} pose="broken" expression="sad" prop="none" t={f} opacity={1 - seated} />}
            {seated > 0 && <Bayezid x={720} y={800} scale={1.1} pose="throne" expression="sad" prop="none" headTilt={10} t={f} opacity={seated} />}
          </Svg>
        </Layer>
        <Wash color={C.ink} opacity={0.45} />
        <Wash color={C.goldLight} opacity={0.42 + noise1('c28', f / 4) * 0.05} blend="screen" radial={[1000, 640]} />
      </Camera>
      <ActCard name="الفصل الثالث" title="السقوط والعبرة" from={0} to={96} />
    </SceneShell>
  );
};

/* =================================================================== S29 — the cage */
const Litter: React.FC<{x: number; y: number; s?: number; t: number}> = ({x, y, s = 1, t}) => (
  <g transform={`translate(${x} ${y + Math.sin(t / 6) * 4}) scale(${s})`}>
    <path d="M-260 -40 L260 -40" stroke={C.inkSoft} strokeWidth={14} strokeLinecap="round" />
    <rect x={-150} y={-260} width={300} height={220} fill={C.goldDeep} stroke={C.ink} strokeWidth={4} />
    <path d="M-170 -260 C-100 -340 100 -340 170 -260 Z" fill={C.red} stroke={C.ink} strokeWidth={4} />
    <rect x={-120} y={-230} width={240} height={150} fill={C.ink} opacity={0.8} />
    {Array.from({length: 7}).map((_, i) => (
      <path key={i} d={`M${-120 + i * 40} -230 L${-120 + i * 40} -80`} stroke={C.gold} strokeWidth={4} />
    ))}
    {Array.from({length: 4}).map((_, i) => (
      <path key={'h' + i} d={`M-120 ${-230 + i * 50} L120 ${-230 + i * 50}`} stroke={C.gold} strokeWidth={4} />
    ))}
  </g>
);

export const S29: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S29');
  const cAsk = cue('S29', 'سأله', 0, 100);
  const cAns = cue('S29', 'فقال', 0, 230);
  const cCage = cue('S29', 'جزاؤك', 0, 380);
  const cOther = cue('S29', 'ويرى', 0, 450);
  const cFact = cue('S29', 'الثابت', 0, 700);
  const cBursa = cue('S29', 'بورصة', 0, 880);
  const bars = ramp(f, cCage - 30, cCage + 20, EASE.in);
  const split = cOther - 8;
  const split2 = cFact - 10;
  return (
    <SceneShell id="S29">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 1000, y: 560, z: 1.3}, {f: cAsk, x: 1250, y: 520, z: 1.9}, {f: cAns, x: 760, y: 520, z: 1.9}, {f: cCage, x: 760, y: 560, z: 1.5}, {f: split, x: 760, y: 560, z: 1.35}]}>
          <Layer depth={1}>
            <Svg>
              <TentInterior candle={[1000, 700]} />
              <path d="M560 810 L1560 810 L1580 840 L540 840 Z" fill={C.gold} stroke={C.ink} strokeWidth={3} />
              <Timur x={1300} y={800} scale={1.1} pose="throne" facing="left" expression={f > cCage - 20 ? 'anger' : 'neutral'} talk={(f > cAsk && f < cAns) || (f > cCage - 10 && f < cCage + 30)} prop="none" t={f} />
              <Bayezid x={720} y={800} scale={1.1} pose="throne" expression={f > cAns && f < cCage ? 'anger' : 'sad'} talk={f > cAns + 10 && f < cCage - 15} prop="none" t={f} />
              {/* iron bars come down */}
              <g transform={`translate(0 ${(1 - bars) * -700})`}>
                <rect x={480} y={200} width={480} height={20} fill={C.inkSoft} stroke={C.ink} strokeWidth={3} />
                {Array.from({length: 9}).map((_, i) => (
                  <rect key={i} x={490 + i * 56} y={210} width={12} height={620} fill={C.inkSoft} stroke={C.ink} strokeWidth={2} />
                ))}
                <rect x={480} y={520} width={480} height={14} fill={C.inkSoft} stroke={C.ink} strokeWidth={2} />
              </g>
            </Svg>
          </Layer>
          <Wash color={C.ink} opacity={0.4} />
          <Wash color={C.goldLight} opacity={0.38} blend="screen" radial={[1000, 640]} />
        </Camera>
        <Caption text="تقول الروايات…" from={10} to={split} y={80} size={44} />
      </Seg>
      <Seg from={split} to={split2 + 12}>
        <Camera keys={[{f: split, x: 800, y: 560, z: 1.0}, {f: split2, x: 1100, y: 560, z: 1.08}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="dusk" clouds={4} />
            </Svg>
          </Layer>
          <Layer depth={0.5}>
            <Svg>
              <Hills y={720} color={C.inkFade} seed="lt0" amp={60} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={880} width={2800} height={400} fill={C.inkSoft} />
              {(() => {
                const lx = kf(f, [[split, 500], [split2, 1300]], (t) => t);
                return (
                  <g>
                    <Person look={LOOK.timuridSoldier} x={lx - 300} y={960} scale={0.75} pose="walk" walkPhase={f / 7} prop="none" armFront={[150, 175]} t={f} />
                    <Litter x={lx} y={780} s={0.9} t={f} />
                    <Person look={LOOK.timuridSoldier} x={lx + 300} y={960} scale={0.75} pose="walk" walkPhase={f / 7 + 2} prop="none" armFront={[150, 175]} t={f} />
                  </g>
                );
              })()}
            </Svg>
          </Layer>
        </Camera>
        <Caption text="ويرى مؤرخون آخرون: محفّة مشبّكة لا قفص" from={split + 10} to={split2} y={80} size={42} />
      </Seg>
      <Seg from={split2} to={L} fadeOut={0}>
        <OldMap views={[viewAt(split2, [31, 39.3], 1400), viewAt(1061, [29.5, 39.6], 1000)]} cities={['ankara', 'bursa', 'smyrna', 'aksehir']} cityFrom={split2}>
          <MapArrow via={['ankara', [31, 40.1], 'bursa']} from={split2 + 20} dur={cBursa - split2 - 10} color={C.turq} width={12} />
          <MapArrow via={['ankara', [30, 38.7], 'smyrna']} from={split2 + 60} dur={cBursa - split2} color={C.turq} width={10} dashed />
          <City id="bursa" burn={cBursa} />
          <MapLabel at="smyrna" text="إزمير — ديسمبر ١٤٠٢" from={cBursa + 30} dy={60} color={C.turqDeep} size={30} />
        </OldMap>
        <Caption text="الثابت" from={split2 + 4} to={L - 11} y={80} size={46} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S30 — Akşehir */
export const S30: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S30');
  const cDied = cue('S30', 'مات', 0, 200);
  const cSaid = cue('S30', 'قيل', 0, 360);
  const cMusa = cue('S30', 'وأطلق', 0, 560);
  const out = ramp(f, cDied - 10, cDied + 20);
  const split = cMusa - 10;
  return (
    <SceneShell id="S30" fadeOut={20}>
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 960, y: 560, z: 1.1}, {f: cDied, x: 960, y: 600, z: 1.45}, {f: split, x: 960, y: 620, z: 1.6}]}>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={-300} width={2800} height={1600} fill={C.inkSoft} />
              <path d="M700 200 L1220 200 L1220 600 L700 600 Z" fill={C.silverDeep} stroke={C.ink} strokeWidth={6} />
              <path d="M960 200 L960 600 M700 400 L1220 400" stroke={C.ink} strokeWidth={6} />
              <Particles kind="snow" count={40} seed="akw" x={700} y={200} w={520} h={400} />
              <rect x={-400} y={820} width={2800} height={500} fill={C.ink} />
              <rect x={940} y={740} width={40} height={120} fill={C.parchmentLight} stroke={C.ink} strokeWidth={3} />
              {out < 1 && (
                <g opacity={1 - out}>
                  <Flame x={960} y={740} scale={1.1} seed="akc" />
                </g>
              )}
              {/* smoke rising after the flame dies */}
              {out > 0 &&
                Array.from({length: 6}).map((_, i) => {
                  const life = Math.max(0, f - cDied - i * 10);
                  return <circle key={i} cx={960 + noise1('aks' + i, f / 20) * 30} cy={730 - life * 1.4} r={8 + life * 0.25} fill={C.silver} opacity={Math.max(0, 0.4 - life / 300)} />;
                })}
            </Svg>
          </Layer>
          <Wash color={C.goldLight} opacity={0.3 * (1 - out)} blend="screen" radial={[960, 700]} />
        </Camera>
        <DateCard text="آق شهر" sub="٨ مارس ١٤٠٣" from={cDied - 20} to={split - 10} />
        <Caption text="مرض؟ قهر؟ سمّ؟ — اختلفت الروايات" from={cSaid} to={split} y={930} size={40} />
      </Seg>
      <Seg from={split} to={L} fadeOut={0}>
        <Camera keys={[{f: split, x: 600, y: 560, z: 1.2}, {f: L, x: 1100, y: 540, z: 1.0}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="winter" clouds={5} />
            </Svg>
          </Layer>
          <Layer depth={0.35}>
            <Svg>
              <Hills y={640} color={C.silverLight} seed="bw0" amp={90} stroke={C.silverDeep} />
              <g opacity={0.6}>
                <Skyline kind="bursa" x={1500} y={650} s={0.4} />
              </g>
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={880} width={2800} height={400} fill={C.white} />
              {(() => {
                const x = kf(f, [[split, 100], [L, 1200]], (t) => t);
                return (
                  <g>
                    <Horse x={x} y={990} scale={0.75} gait="walk" t={f} coat={C.horseBlack} cloth={C.green} clothTrim={C.gold} />
                    {/* coffin draped in green */}
                    <g transform={`translate(${x - 10} ${990 - 0.75 * 205})`}>
                      <rect x={-90} y={-36} width={180} height={40} rx={6} fill={C.green} stroke={C.ink} strokeWidth={3} />
                      <path d="M-90 -16 L90 -16" stroke={C.gold} strokeWidth={3} />
                    </g>
                    <Musa x={x + 190} y={1000} scale={0.8} pose="walk" walkPhase={f / 9} expression="sad" armBack={[-60, -40]} prop="none" t={f} />
                  </g>
                );
              })()}
              <Particles kind="snow" count={120} seed="bws" wind={0.4} />
            </Svg>
          </Layer>
          <Wash color={C.silverDeep} opacity={0.15} />
        </Camera>
        <NameTag text="موسى يحمل جثمان أبيه إلى بورصة" x={960} y={140} above={false} from={split + 20} to={L - 17} color={C.inkSoft} size={36} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S31 — war of brothers */
export const S31: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S31');
  const cSplit = cue('S31', 'انقسمت', 0, 160);
  const cSul = cue('S31', 'سليمان', 0, 210);
  const cIsa = cue('S31', 'وعيسى', 0, 250);
  const cMeh = cue('S31', 'ومحمد', 0, 300);
  const cMusa = cue('S31', 'موسى', 0, 350);
  const cFetret = cue('S31', 'الفترة', 0, 520);
  const fIsa = cue('S31', 'عيسى', 1, 600);
  const fSul = cue('S31', 'سليمان', 1, 640);
  const fMusa = cue('S31', 'موسى', 1, 690);
  const cUnite = cue('S31', 'فأعاد', 0, 820);
  const mix = (a: string, b: string, t: number) => (t > 0.5 ? b : a);
  const isaColor = mix(C.goldDeep, C.green, ramp(f, fIsa, fIsa + 20));
  const sulColor = f > fMusa ? C.green : f > fSul ? C.redDeep : C.redLight;
  const split = cUnite + 30;
  return (
    <SceneShell id="S31">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <OldMap views={[viewAt(0, [30.5, 40.5], 1500), viewAt(cFetret, [31, 40.2], 1450), viewAt(split, [30.5, 40.5], 1600)]} cities={['edirne', 'bursa', 'amasya', 'ankara']} cityFrom={0}>
          <Territory d={SPLIT_BEYLIKS} color={C.inkFade} from={cSplit} dur={30} origin="ankara" id="sb" opacity={0.25} pattern={false} />
          <Territory d={SPLIT_SULEYMAN} color={sulColor} from={cSul} dur={30} origin="edirne" id="ss" />
          <Territory d={SPLIT_ISA} color={isaColor} from={cIsa} dur={30} origin="bursa" id="si" />
          <Territory d={SPLIT_MEHMED} color={C.green} from={cMeh} dur={30} origin="amasya" id="sm" />
          <MapLabel at={[25.5, 42.6]} text={f > fMusa ? 'محمد' : f > fSul ? 'موسى' : 'سليمان'} from={cSul} color={f > fMusa ? C.greenDeep : C.redDeep} size={44} />
          <MapLabel at={[28.6, 39.4]} text={f > fIsa ? 'محمد' : 'عيسى'} from={cIsa} color={f > fIsa ? C.greenDeep : C.goldDeep} size={40} />
          <MapLabel at={[36, 41.7]} text="محمد" from={cMeh} color={C.greenDeep} size={40} />
          <MapLabel at={[27.5, 41.0]} text="موسى" from={cMusa} to={fSul} color={C.redDeep} size={34} />
          <MapArrow via={['bursa', [27.5, 40.9], 'edirne']} from={cMusa} dur={40} color={C.redDeep} width={8} dashed fadeAt={fSul + 20} />
          {[fIsa, fSul, fMusa].map((t, i) => (
            <Flash key={i} at={t} peak={0} />
          ))}
        </OldMap>
        <Caption text="عهد الفترة ١٤٠٢ – ١٤١٣" from={cFetret - 10} to={cUnite} y={80} size={46} />
        <Flash at={fIsa} color={C.redLight} peak={0.25} />
        <Flash at={fSul} color={C.redLight} peak={0.25} />
        <Flash at={fMusa} color={C.redLight} peak={0.25} />
      </Seg>
      <Seg from={split} to={L} fadeOut={0}>
        <Camera keys={[{f: split, x: 960, y: 520, z: 1.3}, {f: L, x: 960, y: 540, z: 1.05}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="dawn" clouds={3} />
              <SunRays x={960} y={600} opacity={0.4} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <Hills y={860} color={C.green} seed="mu0" amp={40} />
              <Banner x={760} y={900} h={420} w={180} color={C.green} accent={C.gold} seed="mub" />
              <Mehmed x={960} y={940} scale={1.05} expression="confident" t={f} />
            </Svg>
          </Layer>
        </Camera>
        <DateCard text="محمد الأول" sub="توحيد الدولة ١٤١٣" from={split + 10} to={L - 13} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S32 — fate of the lame one */
export const S32: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S32');
  const cChina = cue('S32', 'الصين', 0, 120);
  const cDied = cue('S32', 'فمات', 0, 170);
  const cTore = cue('S32', 'وتمزقت', 0, 280);
  const cHalf = cue('S32', 'وبعد', 0, 520);
  const split = cTore - 10;
  const split2 = cHalf - 10;
  const fade = ramp(f, cDied, cDied + 60);
  const crack = ramp(f, cTore + 20, split2 - 20);
  return (
    <SceneShell id="S32">
      <Seg from={0} to={split + 12} fadeIn={0}>
        <Camera keys={[{f: 0, x: 900, y: 560, z: 1.2}, {f: split, x: 1250, y: 540, z: 1.05}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="winter" clouds={6} />
            </Svg>
          </Layer>
          <Layer depth={0.4}>
            <Svg>
              <Hills y={660} color={C.silverLight} seed="ot0" amp={70} stroke={C.silverDeep} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <rect x={-400} y={880} width={2800} height={400} fill={C.white} />
              <g opacity={1 - fade}>
                <Rider who="timur" x={kf(f, [[0, 500], [split, 1500]], (t) => t)} y={1000} scale={0.8} gait="walk" t={f} prop="none" expression="sad" />
              </g>
              <Particles kind="snow" count={200} seed="ots" wind={-0.8} speed={1.5} />
            </Svg>
          </Layer>
          <Wash color={C.parchmentLight} opacity={0.25 * fade} blend="screen" />
        </Camera>
        <DateCard text="أترار" sub="فبراير ١٤٠٥ — في الطريق إلى الصين" from={cChina - 10} to={split - 6} />
      </Seg>
      <Seg from={split} to={split2 + 12}>
        <OldMap views={[viewAt(split, [55, 37], 2700), viewAt(split2, [55, 37], 2900)]} cities={['samarkand', 'herat', 'tabriz', 'baghdad']} cityFrom={split}>
          <Territory d={TIMURID_1400} color={C.turq} from={split - 30} dur={10} origin="samarkand" id="tz" opacity={0.42 * (1 - crack * 0.7)} />
          <g stroke={C.ink} strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray={1400} strokeDashoffset={1400 * (1 - crack)}>
            <path d="M2000 300 L1900 700 L2050 1100 L1950 1500" />
            <path d="M1500 900 L1900 700 L2400 800 L2900 600" />
            <path d="M1300 1200 L1700 1300 L2050 1100" />
          </g>
          <MapLabel at={[57, 40]} text="تمزّق الإمبراطورية التيمورية" from={cTore + 30} color={C.turqDeep} size={50} />
        </OldMap>
      </Seg>
      <Seg from={split2} to={L} fadeOut={0}>
        <Camera keys={[{f: split2, x: 960, y: 600, z: 1.25}, {f: L, x: 960, y: 520, z: 1.0}]}>
          <Layer depth={0.1}>
            <Svg>
              <Sky mode="dawn" clouds={4} />
              <SunRays x={960} y={700} opacity={0.45} />
            </Svg>
          </Layer>
          <Layer depth={0.6}>
            <Svg>
              <path d="M-400 760 C200 740 900 780 2400 750 L2400 1300 L-400 1300 Z" fill={C.turqDeep} />
              <Skyline kind="constantinople" x={960} y={770} s={0.9} />
            </Svg>
          </Layer>
          <Layer depth={1}>
            <Svg>
              <Banner x={1450} y={kf(f, [[split2 + 40, 1300], [split2 + 140, 800]], EASE.out)} h={520} w={230} color={C.red} accent={C.gold} seed="cb53" />
              <Particles kind="motes" count={50} seed="cm53" />
            </Svg>
          </Layer>
        </Camera>
        <DateCard text="القسطنطينية ١٤٥٣" sub="محمد الفاتح، حفيد محمد الأول" from={split2 + 30} to={L - 16} />
      </Seg>
    </SceneShell>
  );
};

/* =================================================================== S33 — the lesson */
const Tomb: React.FC<{x: number; y: number; s?: number; kind: 'bursa' | 'samarkand'}> = ({x, y, s = 1, kind}) =>
  kind === 'bursa' ? (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-220} y={-260} width={440} height={260} fill={C.parchmentLight} stroke={C.ink} strokeWidth={4} />
      {[-150, -50, 50, 150].map((dx) => (
        <path key={dx} d={`M${dx - 34} 0 L${dx - 34} -150 C${dx - 34} -200 ${dx + 34} -200 ${dx + 34} -150 L${dx + 34} 0 Z`} fill={C.green} stroke={C.ink} strokeWidth={3} />
      ))}
      <path d="M-200 -260 C-200 -480 200 -480 200 -260 Z" fill={C.greenDeep} stroke={C.ink} strokeWidth={4} />
      <path d="M0 -430 L0 -480" stroke={C.gold} strokeWidth={6} />
      <circle cx={0} cy={-490} r={10} fill={C.gold} />
    </g>
  ) : (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Skyline kind="samarkand" x={0} y={0} s={0.85} />
    </g>
  );

export const S33: React.FC = () => {
  const f = useCurrentFrame();
  const L = sceneLen('S33');
  const cBursa = cue('S33', 'بورصة', 0, 180);
  const cSam = cue('S33', 'سمرقند', 0, 230);
  const cBolt = cue('S33', 'الصاعقة', 0, 470);
  const cDawn = cue('S33', 'الفجر', 0, 620);
  const dawn = ramp(f, cDawn - 40, 674);
  return (
    <SceneShell id="S33" fadeOut={8}>
      <Camera keys={[{f: 0, x: 960, y: 560, z: 1.15}, {f: cBolt, x: 960, y: 540, z: 1.0}, {f: L, x: 960, y: 500, z: 1.08}]}>
        <Layer depth={0.08}>
          <Svg>
            <Sky mode="dusk" clouds={4} />
            <g opacity={dawn}>
              <Sky mode="dawn" clouds={0} />
            </g>
            <Lightning x1={1100} y1={-30} x2={980} y2={420} at={cBolt} seed="s33b" />
            <g opacity={dawn}>
              <SunRays x={960} y={880} opacity={0.7} color={C.goldLight} n={20} />
            </g>
          </Svg>
        </Layer>
        <Layer depth={0.5}>
          <Svg>
            <Hills y={820} color={C.inkSoft} seed="ls33" amp={40} />
          </Svg>
        </Layer>
        <Layer depth={1}>
          <Svg>
            <g opacity={ramp(f, cBursa - 20, cBursa + 10)}>
              <Tomb x={500} y={900} s={0.95} kind="bursa" />
            </g>
            <g opacity={ramp(f, cSam - 20, cSam + 10)}>
              <Tomb x={1430} y={900} s={0.95} kind="samarkand" />
            </g>
            <rect x={-400} y={900} width={2800} height={400} fill={C.ink} />
            <Particles kind="motes" count={50} seed="s33m" />
          </Svg>
        </Layer>
        <Wash color={C.goldLight} opacity={0.45 * dawn} blend="screen" radial={[960, 880]} />
      </Camera>
      <NameTag text="بورصة" x={500} y={960} above={false} from={cBursa} to={cBolt - 10} color={C.greenDeep} size={40} />
      <NameTag text="سمرقند" x={1430} y={960} above={false} from={cSam} to={cBolt - 10} color={C.turqDeep} size={40} />
      <Quote text="الصاعقة تضيء السماء لحظة… لكنها لا تصنع الفجر" from={cBolt + 10} to={L} y={140} size={64} color={C.parchmentLight} />
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
            <div style={{position: 'absolute', top: 245, fontFamily: FONT.title, fontSize: 110, color: C.goldLight, direction: 'rtl', opacity: p, textShadow: `0 0 24px ${C.red}`}}>
              الصاعقة والأعرج
            </div>
            <div style={{position: 'absolute', top: 480, width: 1400, textAlign: 'center', direction: 'rtl'}}>
              <Reveal from={60} dur={40}>
                <div style={{fontFamily: FONT.display, fontSize: 38, color: C.parchment, lineHeight: 1.7}}>
                  المصادر: «ظفرنامه» لشرف الدين يزدي — «عجائب المقدور» لابن عربشاه — مذكرات شيلتبرغر — رحلة كلافيخو
                  <br />
                  ودراسات خليل إينالجيك وبياتريس مانز وديميتريس كاستريتسيس
                </div>
              </Reveal>
              <Reveal from={140} dur={40}>
                <div style={{fontFamily: FONT.body, fontSize: 30, color: C.gold, marginTop: 40}}>
                  رسوم وحركة وصوت مولّدة بالكامل بالكود: Remotion · Piper TTS · Python · FFmpeg
                </div>
              </Reveal>
              <Reveal from={200} dur={40}>
                <div style={{fontFamily: FONT.body, fontSize: 26, color: C.parchmentDark, marginTop: 24}}>
                  ما قُدّم بصيغة «تقول الروايات» محل خلاف بين المؤرخين
                </div>
              </Reveal>
            </div>
          </AbsoluteFill>
        </Layer>
      </Camera>
    </SceneShell>
  );
};
