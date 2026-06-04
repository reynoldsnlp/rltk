const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

test.describe('Reading Tutor refresh observer', () => {
  test.beforeEach(async ({ serviceWorker }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('changes detected highlights refresh button with tooltip, manual click re-analyzes', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/reading-tutor-mutation.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    const refreshButton = sidePanelPage.locator('#reading-tutor-refresh');
    const refreshWrapper = sidePanelPage.locator('#reading-tutor-refresh-wrapper');
    await expect(refreshButton).toBeVisible({ timeout: 20000 });
    await expect(refreshButton).toHaveAttribute('title', 'Force re-analysis of page');

    await page.waitForFunction(() => document.querySelectorAll('.ʁ-reading-tutor').length > 0, { timeout: 60000 });
    // The wrapper is hidden during processing and visible when done — a reliable completion signal.
    await expect(refreshWrapper).toBeVisible({ timeout: 10000 });
    await expect(refreshButton).not.toHaveAttribute('data-dirty');

    await page.evaluate(() => {
      const target = document.getElementById('target');
      if (target) target.textContent = 'Это обновленный текст.';
    });

    await expect(refreshButton).toHaveAttribute('data-dirty', 'true', { timeout: 20000 });
    await expect(refreshButton).toHaveAttribute('title', 'Changes detected. Click to refresh the analysis.');

    // Verify no auto-refresh occurs (dirty state persists)
    await sidePanelPage.waitForTimeout(2000);
    await expect(refreshButton).toHaveAttribute('data-dirty', 'true');

    // Manually click refresh and verify re-analysis
    await refreshButton.click();
    await expect(refreshButton).not.toHaveAttribute('data-dirty', { timeout: 5000 });

    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('.ʁ-reading-tutor'))
        .some((el) => {
          // dataset.originalText is always the un-stressed original; fall back to
          // normalized textContent to strip combining stress marks (U+0300-U+036F).
          const orig = el.dataset.originalText;
          if (orig !== undefined) return orig.includes('обновленный');
          return (el.textContent || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('обновленный');
        });
    }, { timeout: 60000 });
  });

  test('pause shows resume during analysis', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/reading-tutor-mutation.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    await page.evaluate(() => {
      document.documentElement.dataset.rltkTestSlowEnhance = '2000';
      const target = document.getElementById('target');
      if (!target) return;
      target.textContent = 'Это тестовый текст. '.repeat(800);
    });

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    const pauseButton = sidePanelPage.locator('#reading-tutor-pause');
    const resumeButton = sidePanelPage.locator('#reading-tutor-resume');
    const spinner = sidePanelPage.locator('#reading-tutor-spinner');
    const refreshButton = sidePanelPage.locator('#reading-tutor-refresh');

    await refreshButton.click();
    await expect(pauseButton).toBeVisible({ timeout: 30000 });
    await expect(refreshButton).toBeHidden();
    await pauseButton.click();

    await expect(resumeButton).toBeVisible();
    await expect(spinner).toBeHidden();
    await expect(refreshButton).toBeHidden();

    await resumeButton.click();
    await expect(spinner).toBeVisible({ timeout: 30000 });

    await page.waitForFunction(() => document.querySelectorAll('.ʁ-reading-tutor').length > 0, { timeout: 60000 });
  });

  test('spinner reserves space when hidden', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/reading-tutor-mutation.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    await page.evaluate(() => {
      document.documentElement.dataset.rltkTestSlowEnhance = '1500';
      const target = document.getElementById('target');
      if (!target) return;
      const paragraph = 'Это очень длинный текст. '.repeat(80);
      target.innerHTML = Array.from({ length: 12 }, () => `<p>${paragraph}</p>`).join('');
    });

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    const refreshButton = sidePanelPage.locator('#reading-tutor-refresh');
    const pauseButton = sidePanelPage.locator('#reading-tutor-pause');
    const resumeButton = sidePanelPage.locator('#reading-tutor-resume');
    const spinner = sidePanelPage.locator('#reading-tutor-spinner');
    const progressLabel = sidePanelPage.locator('#reading-tutor-batch-progress');

    await refreshButton.click();
    await expect(progressLabel).toBeVisible({ timeout: 15000 });
    await expect(spinner).toBeVisible({ timeout: 15000 });
    await expect(pauseButton).toBeVisible({ timeout: 15000 });

    // Anchor the pause to batch 2 beginning, so there are still batches left to
    // pause regardless of runner speed. The multi-batch path has no artificial
    // per-batch delay, so on a fast runner the whole job would otherwise finish
    // before the pause click lands.
    await expect(progressLabel).toHaveText(/^[2-9]\d*\/\d+$/, { timeout: 15000 });
    const beforeBox = await progressLabel.boundingBox();
    expect(beforeBox).not.toBeNull();

    await pauseButton.click();
    await expect(resumeButton).toBeVisible();
    await expect(spinner).toBeHidden();
    await expect(progressLabel).toBeVisible();

    const afterBox = await progressLabel.boundingBox();
    expect(afterBox).not.toBeNull();

    const deltaX = Math.abs((afterBox?.x ?? 0) - (beforeBox?.x ?? 0));
    expect(deltaX).toBeLessThanOrEqual(1);
  });

  test('non-cyrillic or analyzed changes do not trigger auto refresh', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/reading-tutor-mutation.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    const refreshButton = sidePanelPage.locator('#reading-tutor-refresh');

    await page.waitForFunction(() => document.querySelectorAll('.ʁ-reading-tutor').length > 0, { timeout: 60000 });
    await expect(refreshButton).not.toHaveAttribute('data-dirty');

    await page.evaluate(() => {
      const first = document.querySelector('.ʁ-reading-tutor');
      if (first) first.textContent = 'тест';
    });

    await expect(refreshButton).not.toHaveAttribute('data-dirty', { timeout: 3000 });

    await page.evaluate(() => {
      const target = document.getElementById('target');
      if (target) target.textContent = 'Plain English text only.';
    });

    await expect(refreshButton).not.toHaveAttribute('data-dirty', { timeout: 3000 });
  });

  test('batch progress indicator appears for large pages', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/reading-tutor-mutation.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    await page.evaluate(() => {
      document.documentElement.dataset.rltkTestSlowEnhance = '1500';
      const target = document.getElementById('target');
      if (!target) return;
      const paragraph = 'Это очень длинный текст. '.repeat(80);
      target.innerHTML = Array.from({ length: 12 }, () => `<p>${paragraph}</p>`).join('');
    });

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    const refreshButton = sidePanelPage.locator('#reading-tutor-refresh');
    const progressLabel = sidePanelPage.locator('#reading-tutor-batch-progress');

    await refreshButton.click();
    await expect(progressLabel).toBeVisible({ timeout: 15000 });
    await expect(progressLabel).toHaveText(/\d+\/\d+/);
  });

  test('analysis warning icon opens modal', async ({ page, browserContext, extensionId, serviceWorker }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/reading-tutor-mutation.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    const warningButton = sidePanelPage.locator('#reading-tutor-analysis-warning');
    await expect(warningButton).toBeHidden();

    await serviceWorker.evaluate(() => {
      chrome.runtime.sendMessage({
        action: 'analysis_error',
        details: {
          errorType: 'cg3',
          stage: 'disambiguation (CG3)',
          message: 'Processing failed during disambiguation (CG3): mock error',
          sourceUrl: 'https://example.com',
          timestamp: '2026-02-08T00:00:00Z'
        }
      });
    });

    await expect(warningButton).toBeVisible({ timeout: 5000 });
    await warningButton.click();

    const modal = sidePanelPage.locator('#analysis-error-modal');
    await expect(modal).toBeVisible();
    await expect(sidePanelPage.locator('#analysis-error-summary')).toContainText('disambiguating');
    await expect(sidePanelPage.locator('#analysis-error-email')).toHaveAttribute('href', /mailto:robert_reynolds@byu.edu\?subject=RLTK%20analysis%20error/);
  });
});
