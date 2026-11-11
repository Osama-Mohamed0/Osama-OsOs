import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Finish} from './Stage';
import {SceneFade} from './FX';
import {sceneLen} from '../lib/cue';

/** Common wrapper: finish layer (vignette/grain) + dip at head and tail. */
export const SceneShell: React.FC<{
  id: string;
  children: React.ReactNode;
  fadeIn?: number;
  fadeOut?: number;
  vignette?: number;
  grain?: number;
  warm?: number;
  fadeColor?: string;
}> = ({id, children, fadeIn = 10, fadeOut = 10, vignette, grain, warm, fadeColor}) => (
  <AbsoluteFill style={{backgroundColor: '#1B1512', overflow: 'hidden'}}>
    {children}
    <Finish vignette={vignette} grain={grain} warm={warm} />
    <SceneFade len={sceneLen(id)} inDur={fadeIn} outDur={fadeOut} color={fadeColor} />
  </AbsoluteFill>
);
