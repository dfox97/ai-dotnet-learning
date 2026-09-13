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

async function expectAccessibleSurface(page: import('@playwright/test').Page, path: string) {
  await page.goto(path);
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoUnnamedInteractiveControls(page);
}

test.describe('ReviewLab accessibility regressions', () => {
  test('dashboard exposes semantic structure and named controls', async ({ page }) => {
    await expectAccessibleSurface(page, '/');

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

  test('diagnostic, practice, report and capstone surfaces expose named controls and headings', async ({ page }) => {
    for (const path of [
      '/diagnostics/baseline-production-review',
      '/practice/di-lifetimes',
      '/report',
      '/capstone',
    ]) {
      await expectAccessibleSurface(page, path);
    }
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

    const risk = page.getByLabel('Risk for line 1');
    await risk.focus();
    await page.keyboard.type('This line weakens the production contract.');
    const correction = page.getByLabel('Correction for line 1');
    await correction.focus();
    await page.keyboard.type('Use an explicit safe contract instead.');

    const submit = page.getByRole('button', { name: /Submit review/i });
    await submit.focus();
    await expect(submit).toBeFocused();
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

  test('focus-visible treatment is present for keyboard users', async ({ page }) => {
    await page.goto('/');
    const start = page.getByRole('button', { name: /Start first review/i });
    await start.focus();

    const focusStyle = await start.evaluate((element) => {
      const styles = getComputedStyle(element);
      return { outlineStyle: styles.outlineStyle, outlineWidth: styles.outlineWidth };
    });

    expect(focusStyle.outlineStyle).not.toBe('none');
    expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);
  });

  test('small-screen educational surfaces remain readable without page-level horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const path of ['/', '/diagnostics/baseline-production-review', '/report', '/capstone']) {
      await page.goto(path);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
      }));
      expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('reduced-motion preference disables smooth scrolling and transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const styles = await page.evaluate(() => {
      const button = document.querySelector('button');
      const transitionDuration = button ? getComputedStyle(button).transitionDuration : null;
      const transitionDurationMs = transitionDuration
        ? Number.parseFloat(transitionDuration) * (transitionDuration.endsWith('ms') ? 1 : 1000)
        : null;

      return {
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        transitionDurationMs,
      };
    });

    expect(styles.scrollBehavior).toBe('auto');
    expect(styles.transitionDurationMs).not.toBeNull();
    expect(styles.transitionDurationMs!).toBeLessThanOrEqual(0.01);
  });
});
