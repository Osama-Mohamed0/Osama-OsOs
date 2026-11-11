import React from 'react';
import * as A1 from './act1';
import * as A2 from './act2';
import * as A3 from './act3';

const pick = (m: Record<string, unknown>) => Object.fromEntries(Object.entries(m).filter(([k]) => /^S\d\d$/.test(k))) as Record<string, React.FC>;
export const SCENES: Record<string, React.FC> = {...pick(A1), ...pick(A2), ...pick(A3)};
