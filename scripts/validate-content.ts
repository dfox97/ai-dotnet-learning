import { glossary } from '../src/content.ts';
import {
  validateDecisionLabs,
  validateGlossary,
} from '../src/decision-glossary-validation.ts';
import { validatedLessons } from '../src/lesson-catalog.ts';
import {
  bridgePatterns,
  resources,
  translationChallenges,
} from '../src/practice-catalog.ts';

const decisionLabs = validateDecisionLabs(validatedLessons);
const validatedGlossary = validateGlossary(glossary);

console.log(`Validated ${validatedLessons.length} authored lesson(s).`);
console.log(`Validated ${decisionLabs.length} decision lab(s).`);
console.log(`Validated ${validatedGlossary.length} glossary entr${validatedGlossary.length === 1 ? 'y' : 'ies'}.`);
console.log(`Validated ${bridgePatterns.length} Pattern Bridge comparison(s).`);
console.log(`Validated ${translationChallenges.length} Translation Review challenge(s).`);
console.log(`Validated ${resources.length} learning resource(s).`);
