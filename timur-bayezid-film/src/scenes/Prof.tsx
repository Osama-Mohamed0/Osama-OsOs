import React from 'react';
import {AbsoluteFill, getInputProps, useCurrentFrame} from 'remotion';
import {Finish, Parchment, Svg} from '../components/Stage';
import {StarLattice, Rosette} from '../components/Ornament';
import {TentInterior, Sky, Hills} from '../components/Sets';
import {Person} from '../characters/Person';
import {LOOK} from '../characters/cast';
import {Particles} from '../components/FX';
import {Camera, Layer} from '../components/Camera';
import {Sprite} from '../components/Sprite';
import {Banner, DustCloud} from '../components/Battle';

export const Prof: React.FC = () => {
  const f = useCurrentFrame();
  const what = String(getInputProps().what ?? 'parchment');
  return (
    <AbsoluteFill style={{backgroundColor: '#E9D8B4'}}>
      {what === 'parchment' && <Parchment />}
      {what === 'finish' && <Finish />}
      {what === 'lattice' && <Svg><StarLattice w={1920} h={1080} cell={180} opacity={0.3} offset={f * 0.2} /></Svg>}
      {what === 'tent' && <Svg><TentInterior candle={[985, 700]} /></Svg>}
      {what === 'persons' && <Svg>{Array.from({length: 20}).map((_, i) => <Person key={i} look={LOOK.bayezid} x={100 + i * 90} y={900} scale={0.6} t={f} />)}</Svg>}
      {what === 'personsLod' && <Svg>{Array.from({length: 20}).map((_, i) => <Person key={i} look={LOOK.janissary} x={100 + i * 90} y={900} scale={0.6} t={f} lod={1} />)}</Svg>}
      {what === 'sky' && <Svg><Sky mode="day" /><Hills y={700} color="#3E8F67" seed="a" trees={5} /></Svg>}
      {what === 'camlayer' && <Camera keys={[{f: 0, z: 1}, {f: 60, z: 1.3}]}><Layer depth={1}><Svg><Sky mode="day" /><Hills y={700} color="#3E8F67" seed="a" trees={5} /></Svg></Layer></Camera>}
      {what === 'sprites' && <Svg>{Array.from({length: 50}).map((_, i) => <Sprite key={i} unit="sipahi" anim="gallop" x={100 + (i % 25) * 70} y={600 + Math.floor(i / 25) * 200} scale={0.5} phase={f * 0.42 + i} />)}</Svg>}
      {what === 'dust' && <Svg><DustCloud x={700} y={1000} w={1600} h={220} seed="nkdu" opacity={0.5} /></Svg>}
      {what === 'banners' && <Svg>{[0, 1, 2, 3].map((i) => <Banner key={i} x={200 + i * 400} y={800} color="#A3171D" seed={'b' + i} />)}</Svg>}
      {what === 'particles' && <Svg><Particles kind="dust" count={70} seed="x" /></Svg>}
    </AbsoluteFill>
  );
};
