import { validatedLessons } from '../src/lesson-catalog.ts';
import { validatePracticeAndReferenceContent } from '../src/practice-content-validation.ts';

validatePracticeAndReferenceContent();

console.log(`Validated ${validatedLessons.length} authored lesson(s).`);
console.log('Validated practice and reference content.');
