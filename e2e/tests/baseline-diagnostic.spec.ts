import { expect, test } from '@playwright/test';

test('baseline diagnostic invites first-time learners and resumes after refresh', async ({ page }) => {
  await page.goto('/');

  const start = page.getByRole('button', { name: /Start baseline/i });
  await expect(start).toBeVisible();
  await start.click();

  await expect(page.getByRole('heading', { name: 'Production .NET review baseline' })).toBeVisible();
  await expect(page.getByText('0 of 8 answered')).toBeVisible();

  const firstQuestion = page.locator('article.lesson-row').first();
  await firstQuestion.getByRole('radio').nth(1).check();
  await expect(page.getByText('1 of 8 answered')).toBeVisible();

  await page.reload();

  await expect(page.getByRole('heading', { name: 'Production .NET review baseline' })).toBeVisible();
  await expect(page.getByText('1 of 8 answered')).toBeVisible();
  await expect(page.locator('article.lesson-row').first().getByRole('radio').nth(1)).toBeChecked();

  const questions = page.locator('article.lesson-row');
  for (let index = 1; index < 8; index++) {
    await questions.nth(index).getByRole('radio').first().check();
  }

  await expect(page.getByRole('button', { name: /Submit diagnostic/i })).toBeEnabled();
  await page.getByRole('button', { name: /Submit diagnostic/i }).click();

  await expect(page.getByText('COMPETENCY PROFILE')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Critical risks still need attention|No critical-risk misses/i })).toBeVisible();
  await expect(page.getByText('This result reports competency evidence only. It does not reveal the authored answer key.')).toBeVisible();
});
