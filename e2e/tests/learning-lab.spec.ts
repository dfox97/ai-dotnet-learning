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
