import assert from 'node:assert/strict';
import test from 'node:test';
import { nextQuestion, topicStatus, type LabAttempt, type LabQuestion } from '../src/learning-lab.ts';
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
