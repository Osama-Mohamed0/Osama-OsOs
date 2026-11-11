import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FONT} from '../theme';
import {Parchment} from '../components/Stage';
import {Aksemseddin, Constantine, Gennadios, Giustiniani, Halil, LOOK, Mehmed2, MehmedBoy, Murad2, Orban, Rider, Throne, Zaganos} from '../characters/cast';
import {Person} from '../characters/Person';

const Label: React.FC<{x: number; y: number; children: React.ReactNode; size?: number; color?: string}> = ({x, y, children, size = 30, color = C.ink}) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={FONT.body} fontSize={size} fill={color}>{children}</text>
);
const Face: React.FC<{x: number; y: number; id: string; children: React.ReactNode}> = ({x, y, id, children}) => (
  <g transform={`translate(${x} ${y})`}>
    <clipPath id={id}><circle r={95} /></clipPath>
    <circle r={98} fill={C.parchmentLight} stroke={C.gold} strokeWidth={5} />
    <g clipPath={`url(#${id})`}>{children}</g>
  </g>
);

export const CharacterSheet: React.FC = () => {
  const t = useCurrentFrame();
  const R = [480, 1060, 1640, 2200];
  return (
    <AbsoluteFill>
      <Parchment />
      <svg width={3200} height={2400} viewBox="0 0 3200 2400" style={{position: 'absolute'}}>
        <text x={1600} y={100} textAnchor="middle" fontFamily={FONT.title} fontSize={80} fill={C.greenDeep}>لوحة الشخصيات — الفاتح</text>
        <Label x={600} y={R[0] - 390} size={44} color={C.green}>محمد الثاني «الفاتح»</Label>
        <Mehmed2 x={160} y={R[0]} expression="confident" t={t} />
        <Label x={160} y={R[0] + 50}>وقفة / ثقة</Label>
        <Mehmed2 x={420} y={R[0]} expression="anger" prop="swordDrawn" armFront={[150, 175]} t={t} />
        <Label x={420} y={R[0] + 50}>غضب</Label>
        <Throne x={760} y={R[0]} scale={0.8} color={C.green} />
        <Mehmed2 x={760} y={R[0] - 80} pose="throne" expression="confident" scale={0.8} t={t} />
        <Label x={760} y={R[0] + 50}>على العرش</Label>
        <Rider who="mehmed2" x={1120} y={R[0]} scale={0.95} t={t} expression="confident" />
        <Label x={1140} y={R[0] + 50}>على الفرس الأبيض</Label>
        <Mehmed2 x={1430} y={R[0]} pose="kneel" expression="sad" prop="none" t={t} />
        <Label x={1430} y={R[0] + 50}>خشوع / تعب</Label>
        <Face x={1720} y={R[0] - 190} id="m1"><Mehmed2 x={-10} y={890} scale={2.5} expression="confident" t={t} /></Face>
        <Face x={1930} y={R[0] - 190} id="m2"><Mehmed2 x={-10} y={890} scale={2.5} expression="anger" t={t} /></Face>
        <Face x={2140} y={R[0] - 190} id="m3"><Mehmed2 x={-10} y={890} scale={2.5} expression="sad" headTilt={0} t={t} /></Face>
        <Label x={1930} y={R[0] - 50}>ثقة — غضب — حزن</Label>
        <MehmedBoy x={2420} y={R[0]} expression="neutral" t={t} scale={0.82} />
        <Label x={2420} y={R[0] + 50}>محمد صبياً</Label>
        <Murad2 x={2700} y={R[0]} expression="confident" t={t} />
        <Label x={2700} y={R[0] + 50}>مراد الثاني</Label>
        <Halil x={2980} y={R[0]} expression="neutral" t={t} />
        <Label x={2980} y={R[0] + 50}>خليل باشا</Label>

        <Label x={600} y={R[1] - 390} size={44} color={C.purple}>قسطنطين الحادي عشر — آخر الأباطرة</Label>
        <Constantine x={160} y={R[1]} expression="confident" t={t} />
        <Constantine x={420} y={R[1]} expression="sad" t={t} prop="swordDrawn" armFront={[40, -20]} />
        <Throne x={760} y={R[1]} scale={0.8} color={C.purple} />
        <Constantine x={760} y={R[1] - 80} pose="throne" expression="neutral" scale={0.8} t={t} />
        <Rider who="constantine" x={1120} y={R[1]} scale={0.95} t={t} prop="swordDrawn" armFront={[40, -30]} />
        <Face x={1720} y={R[1] - 190} id="c1"><Constantine x={-10} y={890} scale={2.5} expression="confident" t={t} /></Face>
        <Face x={1930} y={R[1] - 190} id="c2"><Constantine x={-10} y={890} scale={2.5} expression="anger" t={t} /></Face>
        <Face x={2140} y={R[1] - 190} id="c3"><Constantine x={-10} y={890} scale={2.5} expression="sad" headTilt={0} t={t} /></Face>
        <Giustiniani x={2420} y={R[1]} expression="confident" prop="swordDrawn" armFront={[40, -20]} t={t} />
        <Label x={2420} y={R[1] + 50}>جوستينياني</Label>
        <Gennadios x={2720} y={R[1]} expression="neutral" t={t} />
        <Label x={2720} y={R[1] + 50}>البطريرك جناديوس</Label>
        <Orban x={2990} y={R[1]} expression="confident" armFront={[60, 20]} t={t} />
        <Label x={2990} y={R[1] + 50}>أوربان</Label>

        <Label x={500} y={R[2] - 390} size={44} color={C.red}>القادة والعلماء</Label>
        <Zaganos x={160} y={R[2]} expression="anger" t={t} />
        <Label x={160} y={R[2] + 50}>زاغانوس باشا</Label>
        <Aksemseddin x={430} y={R[2]} expression="confident" armFront={[70, 40]} t={t} />
        <Label x={430} y={R[2] + 50}>آق شمس الدين</Label>
        <Label x={1900} y={R[2] - 390} size={44}>وحدات الجيوش</Label>
        {(['janissary', 'bashibozuk', 'byzSoldier', 'genoese'] as const).map((k, i) => (
          <g key={k}>
            <Person look={LOOK[k]} x={900 + i * 300} y={R[2]} t={t} />
            <Label x={900 + i * 300} y={R[2] + 50}>{['إنكشارية', 'باشي بوزق', 'جندي بيزنطي', 'جنوي'][i]}</Label>
          </g>
        ))}
        <Rider who="sipahi" x={2200} y={R[2]} scale={0.8} t={t} />
        <Label x={2210} y={R[2] + 50}>سباهية</Label>
        <Rider who="giustiniani" x={2600} y={R[2]} scale={0.8} t={t} prop="lance" />
      </svg>
    </AbsoluteFill>
  );
};
