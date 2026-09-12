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

  test('can complete a structured review using the keyboard', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /Start first review/i }).click();
    await expect(page.getByRole('heading', { name: 'C# without the ceremony' })).toBeVisible();

    const firstLine = page.getByRole('button', { name: /Line 1:/ });
    await firstLine.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('1 line flagged')).toBeVisible();

    const reasoning = 'The generated declaration weakens the intended contract and can hide a production failure.';
    await page.getByLabel('Risk for line 1').fill(reasoning);
    await page.getByLabel('Correction for line 1').fill('Use the explicit C# contract described by the module rather than relying on the generated shortcut.');

    await page.getByRole('button', { name: /Submit review/i }).click();
    await expect(page.getByText('REVIEW FEEDBACK')).toBeVisible();
    await expect(page.getByText(/You caught this/i).first()).toBeVisible();
    await expect(page.getByText(/Rubric risk criterion/i).first()).toBeVisible();

    const meetsRubric = page.getByRole('button', { name: 'Meets rubric' }).first();
    await meetsRubric.focus();
    await page.keyboard.press('Enter');
    await expect(meetsRubric).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await expect(page.getByText('REVIEW FEEDBACK')).toBeVisible();
    await expect(page.getByLabel('Risk for line 1')).toHaveValue(reasoning);
    await expect(page.getByText(`Your reasoning: ${reasoning}`, { exact: false })).toBeVisible();

    await page.screenshot({
      path: 'test-results/review-feedback-success.png',
      fullPage: true,
    });
  });
});
