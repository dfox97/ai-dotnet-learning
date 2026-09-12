import { validateDecisionLabs } from '../src/decision-glossary-validation.ts';
import { glossary } from '../src/glossary-catalog.ts';
import { validatedLessons } from '../src/lesson-catalog.ts';
import {
  bridgePatterns,
  resources,
  translationChallenges,
} from '../src/practice-catalog.ts';

const decisionLabs = validateDecisionLabs(validatedLessons);

console.log(`Validated ${validatedLessons.length} authored lesson(s).`);
console.log(`Validated ${decisionLabs.length} decision lab(s).`);
console.log(`Validated ${glossary.length} glossary entr${glossary.length === 1 ? 'y' : 'ies'}.`);
console.log(`Validated ${bridgePatterns.length} Pattern Bridge comparison(s).`);
console.log(`Validated ${translationChallenges.length} Translation Review challenge(s).`);
console.log(`Validated ${resources.length} learning resource(s).`);
