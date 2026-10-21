// Companion website: `?dev=true` turns on dev mode in the side panel, which the
// extension otherwise controls from its options page. Models are failed on
// purpose — the side panel loads either way, and this keeps the test fast.
//
// See ./README.md for conventions and ./website-helpers.js for the shared setup.
const { test, expect } = require('@playwright/test');
const { openWebsite, analyze, failAllModels } = require('./website-helpers');

const SAMPLE = 'Москва — столица России.';

async function devOnlyDisplay(page, baseURL, query) {
  await failAllModels(page);
  await openWebsite(page, baseURL, query);
  await analyze(page, SAMPLE);
  const label = page.frameLocator('#rltk-sidepanel-frame').locator('label:has(#highlight-ambiguity)');
  await expect(label).toHaveCount(1, { timeout: 15000 });
  return label.evaluate(el => getComputedStyle(el).display);
}

test.describe('Website dev mode', () => {
  test('?dev=true shows dev-only side panel features', async ({ page, baseURL }) => {
    expect(await devOnlyDisplay(page, baseURL, '?dev=true')).toBe('block');
  });

  test('dev-only features stay hidden without the flag', async ({ page, baseURL }) => {
    expect(await devOnlyDisplay(page, baseURL, '')).toBe('none');
  });
});
