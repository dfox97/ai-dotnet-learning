import assert from 'node:assert/strict';
import test from 'node:test';
import { nextQuestion, topicStatus, moduleStatus, normalizeTrack, buildVisualGuidePrompt, chatGptUrl, type LabAttempt, type LabModule, type LabQuestion } from '../src/learning-lab.ts';
const questions = ['copy', 'struct'].map(id => ({ id } as LabQuestion));
function attempt(questionId: string, score: number, at: string): LabAttempt { return { id: `${questionId}-${at}`, questionId, score, at, answer: 'answer', feedback: 'feedback', source: 'answer-key' }; }
test('unanswered and weak concepts come before stronger answers', () => {
  const history = [attempt('copy', 100, '2026-10-20T10:00:00Z')];
  assert.equal(nextQuestion(questions, history, [])?.id, 'struct');
  assert.equal(nextQuestion(questions, [...history, attempt('struct', 0, '2026-10-20T10:00:00Z')], [])?.id, 'struct');
  assert.equal(nextQuestion(questions, history, ['struct'])?.id, 'copy');
});
test('a high partial score cannot establish mastery; spaced evidence is required', () => {
  const now = Date.parse('2026-10-23T12:00:00Z');
  const history = questions.flatMap(q => [attempt(q.id, 100, '2026-10-23T09:00:00Z'), attempt(q.id, 100, '2026-10-23T10:00:00Z')]);
  assert.equal(topicStatus(questions, history, now).mastered, false);
  history.push(...questions.map(q => attempt(q.id, 90, '2026-10-24T10:00:00Z')));
  assert.equal(topicStatus(questions, history, now).mastered, true);
  history.push(attempt('copy', 0, '2026-10-25T10:00:00Z'));
  assert.equal(topicStatus(questions, history, now).mastered, false);
});
test('missed concepts return sooner and streaks use distinct consecutive UTC dates', () => {
  const now = Date.parse('2026-10-23T12:00:00Z');
  const history = [attempt('copy', 0, '2026-10-22T10:00:00Z'), attempt('struct', 100, '2026-10-23T10:00:00Z')];
  const status = topicStatus(questions, history, now);
  assert.deepEqual(status.due.map(q => q.id), ['copy']);
  assert.equal(status.streak, 2);
  assert.equal(status.average, 50);
});
test('unscored written reflections preserve evidence without changing average or mastery', () => {
  const now = Date.parse('2026-10-23T12:00:00Z');
  const reflection = { ...attempt('struct', 0, '2026-10-22T10:00:00Z'), score: null, source: 'self-review' };
  const status = topicStatus(questions, [attempt('copy', 100, '2026-10-23T10:00:00Z'), reflection], now);
  assert.equal(status.answered, 2);
  assert.equal(status.scored, 1);
  assert.equal(status.average, 100);
  assert.equal(status.mastered, false);
  assert.deepEqual(status.due.map(q => q.id), ['struct']);
  assert.equal(topicStatus(questions, [reflection], now).average, null);
});
test('a due question takes priority over a lower score that is not yet due', () => {
  const now = Date.parse('2026-10-23T12:00:00Z');
  const history = [attempt('copy', 100, '2026-10-19T10:00:00Z'), attempt('struct', 0, '2026-10-23T10:00:00Z')];
  assert.equal(nextQuestion(questions, history, [], now)?.id, 'copy');
});
test('fresh generated questions contribute to their underlying concept rather than new mastery buckets', () => {
  const history = [attempt('copy', 100, '2026-10-22T10:00:00Z'), { ...attempt('generated-copy', 20, '2026-10-23T10:00:00Z'), conceptId: 'copy' }];
  const status = topicStatus(questions, history, Date.parse('2026-10-23T12:00:00Z'));
  assert.equal(status.answered, 1);
  assert.equal(status.average, 20);
  assert.equal(status.mastered, false);
});
const perfectScore = 100;
const partialPercent = 33;
const legacyQuestionCount = 2;
const maxPromptLength = 6000;
function module(id: string, ids: string[]): LabModule {
  return { id, title: id, summary: '', outcome: '', minutes: 20, tsComparison: '', bookReference: '', docs: [], sections: [], appliesToday: '', historical: '', checkpoint: '', questions: ids.map(questionId => ({ id: questionId } as LabQuestion)), adaptiveSession: null };
}
test('module status reports completion and percent from concept evidence', () => {
  const subject = module('value-types', ['copy', 'struct', 'boxing']);
  assert.equal(moduleStatus(subject, []).percent, 0);
  assert.equal(moduleStatus(subject, []).completed, false);
  const partial = [attempt('copy', perfectScore, '2026-10-23T10:00:00Z')];
  assert.equal(moduleStatus(subject, partial, Date.parse('2026-10-23T12:00:00Z')).percent, partialPercent);
  const complete = ['copy', 'struct', 'boxing'].map(id => attempt(id, perfectScore, '2026-10-23T10:00:00Z'));
  const status = moduleStatus(subject, complete, Date.parse('2026-10-23T12:00:00Z'));
  assert.equal(status.completed, true);
  assert.equal(status.percent, perfectScore);
});
test('normalizeTrack wraps legacy responses and keeps a real track unchanged', () => {
  const legacy = normalizeTrack(undefined, questions, null);
  assert.equal(legacy.modules.length, 1);
  assert.equal(legacy.modules[0].questions.length, legacyQuestionCount);
  const real = { id: 'dotnet-under-the-hood', title: '.NET Under the Hood', description: '', modules: [module('clr', ['clr-emit'])] };
  assert.equal(normalizeTrack(real, questions, null), real);
});
test('visual-guide prompt carries the lesson content and asks for diagrams', () => {
  const subject: LabModule = {
    ...module('value-types', ['copy']),
    title: 'Value Types',
    summary: 'Copy semantics',
    outcome: 'Predict what is copied',
    tsComparison: 'Objects share references.',
    appliesToday: 'Still true on .NET 10.',
    historical: 'NGen is gone.',
    bookReference: 'CLR via C#, 4th Edition - Chapter 5',
    sections: [{ title: 'Copying', minutes: 7, body: 'A struct copies its value.', code: 'var b = a;' }],
  };
  const prompt = buildVisualGuidePrompt(subject);
  assert.match(prompt, /visual guide/i);
  assert.match(prompt, /Value Types/);
  assert.match(prompt, /Copying/);
  assert.match(prompt, /CLR via C#, 4th Edition/);
  assert.match(prompt, /diagram/i);
  assert.match(prompt, /TypeScript/);
  assert.ok(prompt.length <= maxPromptLength);
});
test('chatgpt link encodes the prompt for the composer', () => {
  const url = chatGptUrl('a b\nc');
  assert.ok(url.startsWith('https://chatgpt.com/?q='));
  assert.ok(url.includes('a%20b%0Ac'));
});
