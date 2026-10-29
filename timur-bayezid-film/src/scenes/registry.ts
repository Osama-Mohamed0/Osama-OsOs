import React from 'react';
import * as A1a from './act1a';

export const SCENES: Record<string, React.FC> = {
  ...(A1a as unknown as Record<string, React.FC>),
};
