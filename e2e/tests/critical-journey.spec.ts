import { expect, test } from '@playwright/test';

test.describe('ReviewLab critical journey', () => {
  test('loads the dashboard and key learning surfaces', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Good morning, reviewer.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your review path' })).toBeVisible();

    await page.getByRole('button', { name: 'Pattern bridge', exact: true }).click();
    await expect(page.getByText(/Pattern bridge/i).first()).toBeVisible();

    await page.getByRole('button', { name: 'Dashboard' }).click();
    await page.getByRole('button', { name: 'Translation review', exact: true }).click();
    await expect(page.getByText(/Translation review/i).first()).toBeVisible();
  });

  test('can open a lesson, flag code, and submit a review', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /Start first review/i }).click();
    await expect(page.getByRole('heading', { name: 'C# without the ceremony' })).toBeVisible();

    await page.getByRole('button', { name: /Line 1:/ }).click();
    await expect(page.getByText('1 line flagged')).toBeVisible();

    await page.getByRole('button', { name: /Submit review/i }).click();
    await expect(page.getByText('REVIEW FEEDBACK')).toBeVisible();
    await expect(page.getByText(/You caught this/i).first()).toBeVisible();

    await page.screenshot({
      path: 'test-results/review-feedback-success.png',
      fullPage: true,
    });
  });
});
