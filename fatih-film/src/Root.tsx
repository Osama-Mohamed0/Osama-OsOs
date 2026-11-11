import React from 'react';
import {Composition, continueRender, delayRender} from 'remotion';
import {fontsReady} from './fonts';
import {CharacterSheet} from './scenes/CharacterSheet';
import {SCENES} from './scenes/registry';
import {TIMING, TOTAL_FRAMES} from './data/timing';
import {Main} from './Main';
import {Prof} from './scenes/Prof';
import {SpriteGen} from './scenes/SpriteGen';
import {Thumbnail} from './scenes/Thumbnail';

const h = delayRender('fonts');
fontsReady.then(() => continueRender(h));

export const Root: React.FC = () => (
  <>
    <Composition id="CharacterSheet" component={CharacterSheet} durationInFrames={60} fps={30} width={3200} height={2400} />
    <Composition id="Prof" component={Prof} durationInFrames={300} fps={30} width={1920} height={1080} />
    <Composition id="SpriteFoot" component={SpriteGen} durationInFrames={1} fps={30} width={300} height={560} />
    <Composition id="SpriteRider" component={SpriteGen} durationInFrames={1} fps={30} width={520} height={600} />
    <Composition id="SpriteElephant" component={SpriteGen} durationInFrames={1} fps={30} width={560} height={560} />
    <Composition id="Thumbnail" component={Thumbnail} durationInFrames={1} fps={30} width={1920} height={1080} />
    <Composition id="Main" component={Main} durationInFrames={TOTAL_FRAMES} fps={30} width={1920} height={1080} />
    {Object.entries(SCENES).map(([id, C]) => (
      <Composition key={id} id={id} component={C} durationInFrames={TIMING[id]?.frames ?? 300} fps={30} width={1920} height={1080} />
    ))}
  </>
);
