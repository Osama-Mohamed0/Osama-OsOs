import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {Parchment, Finish} from '../components/Stage';
import {Bayezid, Elephant, Envoy, Isa, LOOK, Mehmed, MuhammadSultan, Musa, Rider, Stefan, Suleyman, Throne, Timur} from '../characters/cast';
import {Person} from '../characters/Person';

const Label: React.FC<{x: number; y: number; children: React.ReactNode; size?: number; color?: string}> = ({x, y, children, size = 30, color = C.ink}) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={FONT.body} fontSize={size} fill={color} direction="rtl">
    {children}
  </text>
);

const Face: React.FC<{x: number; y: number; children: React.ReactNode; id: string}> = ({x, y, children, id}) => (
  <g transform={`translate(${x} ${y})`}>
    <clipPath id={id}>
      <circle cx={0} cy={0} r={95} />
    </clipPath>
    <circle cx={0} cy={0} r={98} fill={C.parchmentLight} stroke={C.gold} strokeWidth={5} />
    <g clipPath={`url(#${id})`}>{children}</g>
  </g>
);

export const CharacterSheet: React.FC = () => {
  const t = useCurrentFrame();
  const rowY = [470, 1020, 1570, 2150];
  return (
    <AbsoluteFill>
      <Parchment />
      <svg width={3200} height={2400} viewBox="0 0 3200 2400" style={{position: 'absolute'}}>
        <text x={1600} y={110} textAnchor="middle" fontFamily={FONT.title} fontSize={84} fill={C.redDeep}>
          لوحة الشخصيات — الصاعقة والأعرج
        </text>
        {/* Row 1: Bayezid */}
        <Label x={250} y={rowY[0] - 380} size={44} color={C.red}>بايزيد الأول «الصاعقة»</Label>
        <Bayezid x={150} y={rowY[0]} expression="confident" t={t} />
        <Label x={150} y={rowY[0] + 50}>وقفة / ثقة</Label>
        <Bayezid x={420} y={rowY[0]} expression="anger" prop="swordDrawn" t={t} />
        <Label x={420} y={rowY[0] + 50}>غضب</Label>
        <Throne x={760} y={rowY[0]} scale={0.8} />
        <Bayezid x={760} y={rowY[0] - 80} pose="throne" expression="confident" t={t} scale={0.8} />
        <Label x={760} y={rowY[0] + 50}>على العرش</Label>
        <Rider who="bayezid" x={1130} y={rowY[0]} scale={0.95} gait="stand" t={t} expression="confident" />
        <Label x={1150} y={rowY[0] + 50}>على الحصان</Label>
        <Bayezid x={1440} y={rowY[0]} pose="broken" expression="sad" bound t={t} />
        <Label x={1440} y={rowY[0] + 50}>انكسار / أسر</Label>
        <Face x={1720} y={rowY[0] - 190} id="fb1"><Bayezid x={-10} y={890} scale={2.5} expression="confident" t={t} /></Face>
        <Face x={1930} y={rowY[0] - 190} id="fb2"><Bayezid x={-10} y={890} scale={2.5} expression="anger" t={t} /></Face>
        <Face x={2140} y={rowY[0] - 190} id="fb3"><Bayezid x={-10} y={890} scale={2.5} expression="sad" headTilt={0} t={t} /></Face>
        <Label x={1930} y={rowY[0] - 50}>ثقة — غضب — حزن</Label>
        {/* Stefan */}
        <Label x={2600} y={rowY[0] - 380} size={44} color={C.navy}>ستيفان لازاريفيتش</Label>
        <Stefan x={2420} y={rowY[0]} expression="confident" prop="swordDrawn" armFront={[40, -20]} t={t} />
        <Rider who="stefan" x={2840} y={rowY[0]} scale={0.95} gait="stand" t={t} prop="swordDrawn" armFront={[40, -30]} />

        {/* Row 2: Timur */}
        <Label x={250} y={rowY[1] - 380} size={44} color={C.turqDeep}>تيمورلنك «الأعرج»</Label>
        <Timur x={150} y={rowY[1]} expression="confident" t={t} />
        <Label x={150} y={rowY[1] + 50}>وقفة بالعصا</Label>
        <Timur x={400} y={rowY[1]} pose="walk" expression="neutral" t={t} walkPhase={1.6} />
        <Label x={400} y={rowY[1] + 50}>مشية عرجاء</Label>
        <Throne x={740} y={rowY[1]} scale={0.8} color={C.turqDeep} />
        <Timur x={740} y={rowY[1] - 80} pose="throne" expression="confident" prop="none" scale={0.8} t={t} />
        <Label x={740} y={rowY[1] + 50}>على العرش</Label>
        <Rider who="timur" x={1110} y={rowY[1]} scale={0.95} gait="stand" t={t} prop="none" />
        <Label x={1130} y={rowY[1] + 50}>على الحصان</Label>
        <Timur x={1430} y={rowY[1]} pose="kneel" expression="sad" prop="none" t={t} />
        <Label x={1430} y={rowY[1] + 50}>تعب / انكسار</Label>
        <Face x={1720} y={rowY[1] - 190} id="ft1"><Timur x={-10} y={890} scale={2.5} expression="confident" prop="none" t={t} /></Face>
        <Face x={1930} y={rowY[1] - 190} id="ft2"><Timur x={-10} y={890} scale={2.5} expression="anger" prop="none" t={t} /></Face>
        <Face x={2140} y={rowY[1] - 190} id="ft3"><Timur x={-10} y={890} scale={2.5} expression="sad" headTilt={0} prop="none" t={t} /></Face>
        <Label x={1930} y={rowY[1] - 50}>ثقة — غضب — حزن</Label>
        <Label x={2600} y={rowY[1] - 380} size={44} color={C.turqDeep}>محمد سلطان (الحفيد) والرسول</Label>
        <Rider who="muhammadSultan" x={2470} y={rowY[1]} scale={0.95} gait="stand" t={t} expression="confident" />
        <Envoy x={2900} y={rowY[1]} expression="neutral" armFront={[60, 20]} t={t} />

        {/* Row 3: princes */}
        <Label x={500} y={rowY[2] - 380} size={44} color={C.red}>الأمراء الأربعة</Label>
        <Suleyman x={150} y={rowY[2]} expression="confident" t={t} />
        <Label x={150} y={rowY[2] + 50}>سليمان</Label>
        <Isa x={390} y={rowY[2]} expression="neutral" t={t} />
        <Label x={390} y={rowY[2] + 50}>عيسى</Label>
        <Musa x={630} y={rowY[2]} expression="neutral" t={t} />
        <Label x={630} y={rowY[2] + 50}>موسى</Label>
        <Mehmed x={870} y={rowY[2]} expression="confident" t={t} />
        <Label x={870} y={rowY[2] + 50}>محمد جلبي</Label>
        <Rider who="suleyman" x={1180} y={rowY[2]} scale={0.85} gait="stand" t={t} />
        <Musa x={1450} y={rowY[2]} pose="broken" expression="sad" bound t={t} />
        <Label x={1450} y={rowY[2] + 50}>موسى أسيراً</Label>
        {/* units */}
        <Label x={2350} y={rowY[2] - 380} size={44} color={C.ink}>وحدات الجيوش</Label>
        <Person look={LOOK.janissary} x={1760} y={rowY[2]} t={t} armFront={[30, -60]} />
        <Label x={1760} y={rowY[2] + 50}>إنكشارية</Label>
        <Rider who="sipahi" x={2050} y={rowY[2]} scale={0.8} gait="stand" t={t} />
        <Label x={2060} y={rowY[2] + 50}>سباهية</Label>
        <Rider who="tatar" x={2380} y={rowY[2]} scale={0.8} gait="stand" t={t} prop="bow" />
        <Label x={2390} y={rowY[2] + 50}>فرسان التتار</Label>
        <Rider who="timuridArcher" x={2720} y={rowY[2]} scale={0.8} gait="stand" t={t} facing="left" prop="bow" />
        <Label x={2700} y={rowY[2] + 50}>رماة تيموريون</Label>
        <Person look={LOOK.serbKnight} x={3020} y={rowY[2]} t={t} />
        <Label x={3020} y={rowY[2] + 50}>فارس صربي</Label>
        {/* Row 4: elephants + crowd sample */}
        <Elephant x={300} y={rowY[3]} scale={0.7} t={t} walking={false} />
        <Label x={300} y={rowY[3] + 40}>فيلة الحرب</Label>
        {Array.from({length: 10}).map((_, i) => (
          <Person key={i} look={LOOK.janissary} x={700 + i * 70} y={rowY[3] - (i % 2) * 14} scale={0.55} t={t + i * 7} blinkSeed={i} />
        ))}
        <Label x={1020} y={rowY[3] + 40}>حشد (تكرار بتنويع)</Label>
        {Array.from({length: 5}).map((_, i) => (
          <Rider key={i} who="timuridSoldier" x={1600 + i * 150} y={rowY[3] - (i % 2) * 18} scale={0.55} gait="gallop" t={t} phase={i * 1.3} facing="left" />
        ))}
        <Rider who="sipahi" x={2600} y={rowY[3]} scale={0.6} gait="gallop" t={t} />
        <Rider who="crusader" x={2900} y={rowY[3]} scale={0.6} gait="gallop" t={t} phase={2} facing="left" />
      </svg>
      <Finish vignette={0.35} />
    </AbsoluteFill>
  );
};
