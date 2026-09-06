import assert from 'node:assert/strict';
import test from 'node:test';
import {
  navigateToLearningLocation,
  replaceWithResolvedLocation,
  resolveBrowserLocation,
} from '../src/browser-navigation.ts';

const known = {
  lessonIds: new Set(['async-reliability']),
  diagnosticIds: new Set(['baseline-production-review']),
  practiceIds: new Set(['di-lifetimes']),
};

test('resolves known deep links without recovery', () => {
  assert.deepEqual(resolveBrowserLocation('/lessons/async-reliability', known), {
    location: { kind: 'lesson', lessonId: 'async-reliability' },
    recoveredFrom: null,
  });
});

test('recovers removed and malformed locations to the dashboard without losing the original path', () => {
  assert.deepEqual(resolveBrowserLocation('/lessons/removed', known), {
    location: { kind: 'dashboard' },
    recoveredFrom: '/lessons/removed',
  });
  assert.deepEqual(resolveBrowserLocation('/totally/unknown/path', known), {
    location: { kind: 'dashboard' },
    recoveredFrom: '/totally/unknown/path',
  });
});

test('pushes canonical learning paths for in-app navigation', () => {
  const pushed: string[] = [];
  navigateToLearningLocation({ push: (path) => pushed.push(path) }, {
    kind: 'diagnostic', diagnosticId: 'baseline-production-review',
  });
  navigateToLearningLocation({ push: (path) => pushed.push(path) }, {
    kind: 'practice', activityId: 'di lifetimes',
  });

  assert.deepEqual(pushed, [
    '/diagnostics/baseline-production-review',
    '/practice/di%20lifetimes',
  ]);
});

test('uses replaceState semantics when recovering an invalid direct link', () => {
  const replaced: string[] = [];
  const resolved = resolveBrowserLocation('/lessons/removed', known);
  replaceWithResolvedLocation({ replace: (path) => replaced.push(path) }, resolved);

  assert.deepEqual(replaced, ['/']);
});
