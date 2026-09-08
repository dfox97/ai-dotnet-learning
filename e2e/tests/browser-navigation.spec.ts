import { expect, test } from '@playwright/test';

test('lesson deep links survive refresh and browser history navigation', async ({ page }) => {
  await page.goto('/lessons/async-reliability');
  await expect(page.getByRole('heading', { name: 'Async that can stop safely' })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/lessons\/async-reliability$/);
  await expect(page.getByRole('heading', { name: 'Async that can stop safely' })).toBeVisible();

  await page.getByRole('button', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Good morning, reviewer.' })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/lessons\/async-reliability$/);
  await expect(page.getByRole('heading', { name: 'Async that can stop safely' })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Good morning, reviewer.' })).toBeVisible();
});

test('removed learning links recover to the dashboard with useful context', async ({ page }) => {
  await page.goto('/lessons/removed-lesson');

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'That learning link is no longer available.' })).toBeVisible();
  await expect(page.getByText('/lessons/removed-lesson')).toBeVisible();
});
