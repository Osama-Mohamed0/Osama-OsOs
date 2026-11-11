import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {SCENES} from './scenes/registry';
import {TIMING} from './data/timing';

/** The whole film: every scene composition in order, plus the final mixed soundtrack. */
export const Main: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => (
  <AbsoluteFill style={{backgroundColor: '#1B1512'}}>
    {Object.values(TIMING).map((t) => {
      const S = SCENES[t.id];
      return (
        <Sequence key={t.id} from={t.from} durationInFrames={t.frames} name={t.id}>
          {S ? <S /> : null}
        </Sequence>
      );
    })}
    {withAudio && <Audio src={staticFile('audio/soundtrack.wav')} />}
  </AbsoluteFill>
);
