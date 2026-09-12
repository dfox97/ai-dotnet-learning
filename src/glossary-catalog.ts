import { glossary as authoredGlossary } from './authored-lessons.ts';
import { validateGlossary, type GlossaryEntry } from './decision-glossary-validation.ts';

export const glossary = validateGlossary(authoredGlossary);
export type { GlossaryEntry };
