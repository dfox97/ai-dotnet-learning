import { validatedLessons } from '../src/lesson-catalog.ts';
import {
  bridgePatterns,
  resources,
  translationChallenges,
} from '../src/practice-catalog.ts';

console.log(`Validated ${validatedLessons.length} authored lesson(s).`);
console.log(`Validated ${bridgePatterns.length} Pattern Bridge comparison(s).`);
console.log(`Validated ${translationChallenges.length} Translation Review challenge(s).`);
console.log(`Validated ${resources.length} learning resource(s).`);
