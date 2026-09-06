import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLearningPath,
  isKnownLearningLocation,
  parseLearningLocation,
} from '../src/locations.ts';

test('parses stable top-level learning locations', () => {
  assert.deepEqual(parseLearningLocation('/'), { kind: 'dashboard' });
  assert.deepEqual(parseLearningLocation('/report'), { kind: 'report' });
  assert.deepEqual(parseLearningLocation('/capstone/'), { kind: 'capstone' });
});

test('parses identifier-based lesson, diagnostic and practice deep links', () => {
  assert.deepEqual(parseLearningLocation('/lessons/csharp-foundations'), {
    kind: 'lesson',
    lessonId: 'csharp-foundations',
  });
  assert.deepEqual(parseLearningLocation('/diagnostics/baseline-v1'), {
    kind: 'diagnostic',
    diagnosticId: 'baseline-v1',
  });
  assert.deepEqual(parseLearningLocation('/practice/translation%20review'), {
    kind: 'practice',
    activityId: 'translation review',
  });
});

test('builds paths that round-trip through the parser', () => {
  const locations = [
    { kind: 'dashboard' as const },
    { kind: 'lesson' as const, lessonId: 'async & cancellation' },
    { kind: 'diagnostic' as const, diagnosticId: 'baseline-v1' },
    { kind: 'practice' as const, activityId: 'di-lifetimes' },
    { kind: 'report' as const },
    { kind: 'capstone' as const },
  ];

  for (const location of locations) {
    assert.deepEqual(parseLearningLocation(buildLearningPath(location)), location);
  }
});

test('returns a recovery location for malformed or unknown paths', () => {
  assert.deepEqual(parseLearningLocation('/lessons/'), { kind: 'not-found', path: '/lessons/' });
  assert.deepEqual(parseLearningLocation('/unknown/example'), { kind: 'not-found', path: '/unknown/example' });
  assert.deepEqual(parseLearningLocation('/lessons/%E0%A4%A'), { kind: 'not-found', path: '/lessons/%E0%A4%A' });
});

test('checks identifier routes against validated content identifiers', () => {
  const known = {
    lessonIds: new Set(['csharp-foundations']),
    diagnosticIds: new Set(['baseline-v1']),
    practiceIds: new Set(['di-lifetimes']),
  };

  assert.equal(isKnownLearningLocation(parseLearningLocation('/lessons/csharp-foundations'), known), true);
  assert.equal(isKnownLearningLocation(parseLearningLocation('/lessons/removed-lesson'), known), false);
  assert.equal(isKnownLearningLocation(parseLearningLocation('/report'), known), true);
});
