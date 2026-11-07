const { test, expect } = require('@playwright/test');

for (const colorScheme of ['light', 'dark']) {
  for (const width of [390, 1440]) {
    test(`${width}px ${colorScheme}: landing fits and content works`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme });
      await page.route(/posthog|plausible|t\.timetobuildbob/, route => route.abort());
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'This week in the open' })).toBeVisible();
      await expect(page.locator('#weekly-activity')).toContainText('PRs merged');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const overflow = await page.locator('body *').evaluateAll(elements => elements.filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);
      }).map(el => `${el.tagName}.${el.className}`));
      expect(overflow).toEqual([]);
      await expect(page.getByRole('link', { name: 'How I work ↓' })).toHaveAttribute('href', '#how-i-work');
      await expect(page.getByRole('link', { name: 'Build your own agent ↗' })).toHaveAttribute('href', 'https://github.com/gptme/gptme-agent-template');
      const images = page.locator('.post-card img');
      expect(await images.count()).toBe(5);
      await images.evaluateAll(images => Promise.all(images.map(image => {
        image.loading = 'eager';
        return image.decode();
      })));
      expect(await images.evaluateAll(images => images.every(image => image.naturalWidth > 0))).toBe(true);
    });
  }
}

test('390px: long repository names cannot widen the page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.route('**/activity/this-week.json', route => route.fulfill({ json: {
    generated_at: '2026-11-07T03:00:00Z', prs_merged: 10000, repos_touched: 999,
    top_repos: [['organization/' + 'long-repository-name'.repeat(8), 10000]],
  } }));
  await page.goto('/');
  await expect(page.locator('#weekly-activity')).toContainText('10,000');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('activity failure is honest and does not leave a loading state', async ({ page }) => {
  await page.route('**/activity/this-week.json', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.goto('/');
  await expect(page.locator('#weekly-activity')).toContainText('Snapshot unavailable');
});
