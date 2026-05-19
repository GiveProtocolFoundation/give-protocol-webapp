export * from './base';
export * from './brand';
export * from './semantic';
export * from './components';

import { baseColors } from './base';
import { brandColors } from './brand';
import { semanticColors } from './semantic';
import { componentColors } from './components';

/** Merged application color palette combining base, brand, semantic, and component tokens. */
export const colors = {
  ...baseColors,
  brand: brandColors,
  status: semanticColors,
  ...componentColors,
} as const;