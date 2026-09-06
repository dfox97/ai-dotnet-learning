import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canRevealExpertAnswer,
  completeCapstone,
  evaluateCapstoneCriticalCompetencies,
  markCapstoneRepairReady,
  recordCapstoneFindings,
  resumeCapstoneStage,
  startCapstone,
} from '../src/capstone-journey.ts';
import { createEmptyProgress } from '../src/progress.ts';

test('moves through review, repair, evidence and completed stages without losing work', () => {
  let capstone = createEmptyProgress().capstone;
  capstone = startCapstone(capstone);
  assert.equal(capstone.stage, 'review');
  assert.equal(canRevealExpertAnswer(capstone), false);

  capstone = recordCapstoneFindings(capstone, {
    cancellation: 'Caller cancellation is dropped before I/O.',
  });
  assert.equal(capstone.stage, 'repair');
  assert.equal(canRevealExpertAnswer(capstone), true);

  capstone = markCapstoneRepairReady(capstone);
  capstone = completeCapstone(capstone, ['dotnet test: passed'], 'The repair keeps authority deterministic.');

  assert.equal(capstone.stage, 'completed');
  assert.equal(capstone.findings.cancellation, 'Caller cancellation is dropped before I/O.');
  assert.deepEqual(capstone.testEvidence, ['dotnet test: passed']);
});

test('requires learner evidence before advancing stages', () => {
  const review = startCapstone(createEmptyProgress().capstone);
  assert.throws(() => recordCapstoneFindings(review, {}), /at least one capstone finding/i);

  const repair = recordCapstoneFindings(review, { async: 'Sync-over-async blocks a thread.' });
  const evidence = markCapstoneRepairReady(repair);
  assert.throws(() => completeCapstone(evidence, [], 'reflection'), /test evidence/i);
  assert.throws(() => completeCapstone(evidence, ['dotnet test failed'], ''), /reflection/i);
});

test('resumes at the stored capstone stage', () => {
  const progress = createEmptyProgress().capstone;
  progress.stage = 'evidence';
  progress.version = 1;

  assert.equal(resumeCapstoneStage(progress), 'evidence');
});

test('critical competency evaluation cannot pass with unresolved risk', () => {
  const result = evaluateCapstoneCriticalCompetencies(
    ['cancellation', 'di-lifetime'],
    ['cancellation', 'di-lifetime', 'idempotency'],
  );

  assert.equal(result.completed, false);
  assert.deepEqual(result.criticalCompetenciesMet, ['cancellation', 'di-lifetime']);
  assert.deepEqual(result.unresolvedCriticalCompetencies, ['idempotency']);
});
