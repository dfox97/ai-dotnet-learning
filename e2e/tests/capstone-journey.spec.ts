import { expect, test } from '@playwright/test';

test('capstone conceals expert guidance until the learner submits structured findings', async ({ page }) => {
  await page.goto('/capstone');

  await expect(page.getByRole('heading', { name: 'Review, repair, and prove the worker.' })).toBeVisible();
  await expect(page.getByText(/60–90 minute local repair/i)).toBeVisible();
  await expect(page.getByText('EXPERT COMPARISON UNLOCKED')).toHaveCount(0);

  await page.getByRole('button', { name: 'Start capstone' }).click();
  await page.getByLabel('Production risk').fill('Cancellation is dropped across an I/O boundary.');
  await page.getByLabel('Why it matters').fill('Shutdown can leave work running and produce inconsistent outcomes.');
  await page.getByLabel('Proposed correction').fill('Propagate the stopping token through supported I/O calls.');
  await page.getByRole('button', { name: 'Submit structured review' }).click();

  await expect(page.getByText('EXPERT COMPARISON UNLOCKED')).toBeVisible();
  await expect(page.getByText(/worker must propagate cancellation/i)).toBeVisible();
  await expect(page.getByText(/generate-capstone.*variant expert/i)).toBeVisible();

  await page.getByRole('button', { name: /ready to record test evidence/i }).click();
  await page.getByLabel(/Test evidence/).fill('dotnet test: 5 passed, 0 failed');
  await page.getByLabel('Repair reflection').fill('I now check lifetime and cancellation boundaries before implementation details.');
  await page.getByRole('button', { name: 'Complete capstone' }).click();

  await expect(page.getByText('CAPSTONE EVIDENCE RECORDED')).toBeVisible();
  await page.reload();
  await expect(page.getByText('CAPSTONE EVIDENCE RECORDED')).toBeVisible();
});
