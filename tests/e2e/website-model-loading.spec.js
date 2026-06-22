// E2E for the companion website's model-loading status UI (docs/web/bootstrap.js
// + docs/rltk/offscreen.js). These tests don't load the extension — they drive
// the plain web build and intercept model downloads with page.route() so the
// notification behavior is deterministic and fast (no real ~570MB download).
//
// See ./README.md for conventions and ./website-helpers.js for the shared setup.
const { test, expect } = require('@playwright/test');
const { MODEL_RE, modelBasename, openWebsite, analyze, failAllModels } = require('./website-helpers');

const SAMPLE = 'Москва — столица России.';

test.describe('Website model-loading notifications', () => {
  test('status row is hidden until analysis is requested', async ({ page, baseURL }) => {
    await openWebsite(page, baseURL);
    await expect(page.locator('#rltk-status-row')).toBeHidden();
  });

  test('shows immediate feedback the instant Analyze is clicked', async ({ page, baseURL }) => {
    await openWebsite(page, baseURL);
    await page.fill('#rltk-paste', SAMPLE);

    // Click and read the status in the SAME JS turn: the handler sets the
    // "Preparing…" text synchronously, before any async model work runs — so
    // this captures the immediate feedback deterministically, regardless of how
    // fast (or slow) the subsequent download succeeds or fails.
    const text = await page.evaluate(() => {
      document.getElementById('rltk-analyze').click();
      return document.getElementById('rltk-model-status').textContent;
    });
    expect(text).toContain('Preparing language models');
    await expect(page.locator('#rltk-status-row')).toBeVisible();
  });

  test('surfaces an error — pointing to the extension — only after every candidate URL fails', async ({ page, baseURL }) => {
    await failAllModels(page);
    await openWebsite(page, baseURL);
    await analyze(page, SAMPLE);

    const status = page.locator('#rltk-model-status');
    // The error only appears once the full fallback chain is exhausted.
    await expect(status).toHaveClass(/rltk-status-error/, { timeout: 60000 });
    await expect(status).toContainText('RLTK browser extension');

    const link = status.locator('a');
    await expect(link).toHaveAttribute(
      'href',
      /chromewebstore\.google\.com\/detail\/hofbpcgdhdaihhlcjegbfdnmaplnjnco/
    );
  });

  test('a failed candidate does NOT surface an error when a fallback succeeds', async ({ page, baseURL }) => {
    // First remote candidate (Giella) fails; the backup host "succeeds" with a
    // tiny synthetic body. The download completes, so the UI reports ready and
    // never shows the failure message — even though a candidate did fail.
    // (Synthetic bytes aren't a valid transducer, so WASM init fails afterward
    // in the console, but that's orthogonal to the download-status UI here.)
    await page.route(MODEL_RE, async (route) => {
      const url = route.request().url();
      if (url.includes('pkg.pjj.cc')) {
        await route.abort('failed'); // primary remote host down
      } else {
        const name = modelBasename(url) || 'model';
        await route.fulfill({
          status: 200,
          contentType: 'application/octet-stream',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: Buffer.alloc(2048, 7), // small, finite -> progress completes
        });
        void name;
      }
    });

    await openWebsite(page, baseURL);
    await analyze(page, SAMPLE);

    const status = page.locator('#rltk-model-status');
    // The fallback download completes and the UI declares the models ready.
    await expect(status).toContainText('ready', { timeout: 60000 });
    await expect(status).not.toHaveClass(/rltk-status-error/);
  });
});
