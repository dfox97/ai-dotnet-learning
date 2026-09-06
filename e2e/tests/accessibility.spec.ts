import { expect, test } from '@playwright/test';

async function expectNoUnnamedInteractiveControls(page: import('@playwright/test').Page) {
  const unnamed = await page.locator('button, a[href], input, select, textarea').evaluateAll((elements) =>
    elements
      .filter((element) => {
        const ariaLabel = element.getAttribute('aria-label')?.trim();
        const labelledBy = element.getAttribute('aria-labelledby')?.trim();
        const text = element.textContent?.trim();
        const title = element.getAttribute('title')?.trim();
        const input = element instanceof HTMLInputElement ? element : null;
        const label = input?.labels?.[0]?.textContent?.trim();
        return !ariaLabel && !labelledBy && !text && !title && !label;
      })
      .map((element) => element.outerHTML),
  );

  expect(unnamed).toEqual([]);
}

test.describe('ReviewLab accessibility regressions', () => {
  test('dashboard exposes semantic structure and named controls', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoUnnamedInteractiveControls(page);

    const duplicateIds = await page.locator('[id]').evaluateAll((elements) => {
      const counts = new Map<string, number>();
      for (const element of elements) {
        const id = element.id;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      return [...counts.entries()].filter(([, count]) => count > 1);
    });
    expect(duplicateIds).toEqual([]);
  });

  test('primary learning journey works from the keyboard', async ({ page }) => {
    await page.goto('/');

    const start = page.getByRole('button', { name: /Start first review/i });
    await start.focus();
    await expect(start).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { name: 'C# without the ceremony' })).toBeVisible();
    const line = page.getByRole('button', { name: /Line 1:/ });
    await line.focus();
    await expect(line).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.getByText('1 line flagged')).toBeVisible();

    const submit = page.getByRole('button', { name: /Submit review/i });
    await submit.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('REVIEW FEEDBACK')).toBeVisible();
  });

  test('focus never disappears onto the document body during core navigation', async ({ page }) => {
    await page.goto('/');

    for (let index = 0; index < 12; index++) {
      await page.keyboard.press('Tab');
      const active = await page.evaluate(() => ({
        tag: document.activeElement?.tagName,
        visible: document.activeElement instanceof HTMLElement
          ? Boolean(document.activeElement.offsetWidth || document.activeElement.offsetHeight || document.activeElement.getClientRects().length)
          : false,
      }));
      expect(active.tag).not.toBe('BODY');
      expect(active.visible).toBe(true);
    }
  });
});
