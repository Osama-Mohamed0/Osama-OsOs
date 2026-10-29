import React from 'react';
import * as A1a from './act1a';
import * as A1b from './act1b';
import * as A2a from './act2a';
import * as A2b from './act2b';
import * as A3 from './act3';

const pick = (m: Record<string, unknown>) => Object.fromEntries(Object.entries(m).filter(([k]) => /^S\d\d$/.test(k))) as Record<string, React.FC>;
export const SCENES: Record<string, React.FC> = {...pick(A1a), ...pick(A1b), ...pick(A2a), ...pick(A2b), ...pick(A3)};
