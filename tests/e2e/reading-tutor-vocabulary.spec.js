const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

test.describe('Reading Tutor vocabulary', () => {
  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  test('renders and sorts vocabulary rows', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/reading-tutor-mutation.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    await page.waitForFunction(
      () => document.querySelectorAll('.ʁ-reading-tutor').length > 0,
      { timeout: 20000 }
    );

    const vocabButton = sidePanelPage.locator('.sub-tab-button[data-subtab="vocabulary"]');
    await vocabButton.click();

    await expect.poll(async () => {
      return sidePanelPage.locator('#vocabulary-table tbody tr').count();
    }, { timeout: 20000 }).toBeGreaterThan(0);

    const summary = sidePanelPage.locator('#vocabulary-summary');
    await expect(summary).toContainText('Document length');

    const frequencyHeader = sidePanelPage.locator('th[data-sort-key="count"]');
    const frequencyButton = frequencyHeader.locator('.vocab-sort-button');

    await frequencyButton.click();
    await expect(frequencyHeader).toHaveAttribute('aria-sort', 'descending');

    await frequencyButton.click();
    await expect(frequencyHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  test('filters out numerals and punctuation tokens', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/reading-tutor-mutation.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    await page.waitForFunction(
      () => document.querySelectorAll('.ʁ-reading-tutor').length > 0,
      { timeout: 20000 }
    );

    await page.evaluate(() => {
      const addSpan = (text, lemma) => {
        const span = document.createElement('span');
        span.className = 'ʁ ʁ-reading-tutor';
        span.textContent = text;
        span.setAttribute('data-readings', JSON.stringify([{ l: lemma }]));
        document.body.appendChild(span);
      };
      addSpan('123', '123');
      addSpan('!!!', '!!!');
      addSpan('тест', 'тест');
    });

    const vocabButton = sidePanelPage.locator('.sub-tab-button[data-subtab="vocabulary"]');
    await vocabButton.click();

    const table = sidePanelPage.locator('#vocabulary-table');
    await expect(table).toBeVisible();

    await expect.poll(async () => {
      return sidePanelPage.locator('#vocabulary-table tbody').innerText();
    }, { timeout: 15000 }).toContain('тест');

    const rowsText = await sidePanelPage.locator('#vocabulary-table tbody').innerText();
    expect(rowsText).toContain('тест');
    expect(rowsText).not.toContain('123');
    expect(rowsText).not.toContain('!!!');
  });
});
