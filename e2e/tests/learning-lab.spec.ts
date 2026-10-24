import { test, expect } from '@playwright/test';

test('Lab grades a session, preserves Markdown evidence, and handles unconfigured AI honestly', async ({ page, request }) => {
  test.skip(!process.env.LAB_E2E, 'Requires the local ASP.NET learning server.');
  await page.goto('/learning-lab');
  await expect(page.getByRole('heading', { name: 'DotNet Learning Lab' })).toBeVisible();
  await expect(page.getByText('Practice mode ·', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Start learning session' }).click();
  for (let i = 0; i < 4; i++) {
    if (await page.getByLabel('Your explanation').count()) {
      await page.getByLabel('Your explanation').fill('Class assignment copies the reference, while a struct copies its value.');
      await page.getByRole('button', { name: 'Compare with reference' }).click();
      await expect(page.getByRole('heading', { name: 'Compare your reasoning' })).toBeVisible();
      await page.getByRole('checkbox').first().check();
      await page.getByRole('button', { name: 'Save written reflection' }).click();
      await expect(page.getByRole('heading', { name: 'Written reflection saved · unscored' })).toBeVisible();
      await page.getByLabel('Your follow-up').fill('Why does parameter reassignment not replace the caller variable?');
      await page.getByRole('button', { name: 'Ask mentor' }).click();
      await expect(page.getByText('Practice guide:', { exact: false })).toBeVisible();
      await page.getByRole('button', { name: i === 3 ? 'Finish session' : 'Next question' }).click();
    } else {
      for (const answer of ['A reference to the same object', '1', 'The reference is passed by value']) {
        const radio = page.getByRole('radio', { name: answer, exact: true });
        if (await radio.count()) { await radio.check(); break; }
      }
      await page.getByRole('button', { name: 'Review my answer' }).click();
      await expect(page.getByRole('heading', { name: '100/100 · Answer-key assessment' })).toBeVisible();
      await page.getByRole('button', { name: i === 3 ? 'Finish session' : 'Next question' }).click();
    }
  }
  await expect(page.getByText('4/4', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('4/4', { exact: true })).toBeVisible();
  const markdown = await request.get('/api/lab/progress.md');
  expect(markdown.ok()).toBeTruthy();
  expect(await markdown.text()).toContain('Score: 100/100 (answer-key)');
  expect(await markdown.text()).toContain('Unscored reflection (self-review)');
  expect(await markdown.text()).toContain('Areas to revisit:');
  const invalid = await request.post('/api/lab/grade', { data: { questionId: 'missing', answer: 'anything' } });
  expect(invalid.status()).toBe(400);
});

test('adaptive sessions explain their focus, handle generation failures, and resume unseen questions', async ({ page }) => {
  const foundation = ['copy', 'struct', 'parameter', 'explain'].map(id => ({ id, conceptId: id, kind: 'multiple-choice', prompt: `Foundation ${id}`, code: '', options: ['A', 'B', 'C'], hint: 'Hint', bridge: 'TypeScript comparison' }));
  const progress = foundation.map(q => ({ id: `baseline-${q.id}`, questionId: q.id, conceptId: q.id, answer: 'A', score: q.id === 'copy' ? 20 : 90, feedback: 'Saved baseline feedback', source: 'answer-key', at: new Date().toISOString() }));
  const generated = {
    id: 'adaptive-one', createdAt: new Date().toISOString(), rationale: 'More practice on aliasing after a low copy score.',
    questions: ['multiple-choice', 'prediction', 'bug', 'explanation'].map((kind, i) => ({ id: `generated-one-${i}`, conceptId: 'copy', kind, difficulty: 'applied', generated: true, prompt: `Unseen aliasing scenario ${i}`, code: 'var second = first;', options: kind === 'explanation' ? [] : ['Shared object', 'Deep copy', 'Compiler error'], hint: 'Track the reference.', bridge: 'Like a shared Angular model.', reviewCriteria: ['Explain aliasing', 'Explain mutation'] })),
  };
  let savedSession: typeof generated | null = null;
  let generationCalls = 0;
  await page.route('**/api/lab**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/lab') return route.fulfill({ json: { aiEnabled: true, questions: foundation, adaptiveSession: savedSession } });
    if (url.pathname === '/api/lab/progress') return route.fulfill({ json: progress });
    if (url.pathname === '/api/lab/sessions') {
      generationCalls++;
      if (generationCalls === 1) return route.fulfill({ status: 503, json: { error: 'Could not generate a valid adaptive session. Your progress is safe; retry or continue authored practice.' } });
      savedSession = generated;
      return route.fulfill({ json: savedSession });
    }
    if (url.pathname === '/api/lab/grade') {
      const submitted = route.request().postDataJSON();
      const attempt = { id: `attempt-${submitted.questionId}`, questionId: submitted.questionId, conceptId: 'copy', answer: submitted.answer, score: 100, feedback: 'A copied reference reaches the same object.', source: 'generated-answer-key', at: new Date().toISOString() };
      progress.push(attempt);
      return route.fulfill({ json: attempt });
    }
    return route.fulfill({ status: 404, json: { error: 'Unexpected test request' } });
  });
  await page.goto('/learning-lab');
  await page.getByRole('button', { name: 'Generate next session' }).click();
  await expect(page.getByRole('alert')).toContainText('Your progress is safe');
  await expect(page.getByText('4/4', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Generate next session' }).click();
  await expect(page.getByRole('heading', { name: 'Unseen aliasing scenario 0' })).toBeVisible();
  await expect(page.getByText('AI-generated practice', { exact: false })).toBeVisible();
  for (let i = 0; i < 2; i++) {
    await page.getByRole('radio', { name: 'Shared object' }).check();
    await page.getByRole('button', { name: 'Review my answer' }).click();
    await expect(page.getByRole('heading', { name: '100/100 · AI-authored answer key' })).toBeVisible();
    await page.getByRole('button', { name: 'Next question' }).click();
  }
  await page.reload();
  await expect(page.getByText('More practice on aliasing after a low copy score.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Resume adaptive session' }).click();
  await expect(page.getByRole('heading', { name: 'Unseen aliasing scenario 2' })).toBeVisible();
  expect(generationCalls).toBe(2);
});
