// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady, waitForReadingTutorSettled } = require('./test-helpers');

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

    await waitForReadingTutorSettled(page, sidePanelPage);

    const vocabButton = sidePanelPage.locator('.sub-tab-button[data-subtab="vocabulary"]');
    await vocabButton.click();

    await expect.poll(async () => {
      return sidePanelPage.locator('#vocabulary-table tbody tr').count();
    }, { timeout: 20000 }).toBeGreaterThan(0);

    const summary = sidePanelPage.locator('#vocabulary-summary');
    await expect(summary).toContainText('Document length');

    const functionWordsButton = sidePanelPage.locator('#vocab-function-filter');
    await expect(functionWordsButton).toHaveText('Hide function words');
    await functionWordsButton.click();
    await expect(functionWordsButton).toHaveText('Show function words');
    await expect(functionWordsButton).toHaveAttribute('aria-pressed', 'true');
    await functionWordsButton.click();
    await expect(functionWordsButton).toHaveText('Hide function words');
    await expect(functionWordsButton).toHaveAttribute('aria-pressed', 'false');

    await expect(sidePanelPage.locator('.vocab-sort-button[data-sort="logRatio"]')).toHaveCount(0);
    await expect(sidePanelPage.locator('#vocabulary-table thead')).not.toContainText('Keyword score');
    const significanceHeader = sidePanelPage.locator('th[data-sort-key="ll"]');
    await expect(significanceHeader.locator('.vocab-sort-label')).toHaveText('Significance');
    await expect(significanceHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(sidePanelPage.locator('.vocab-below-threshold')).toHaveCount(0);
    const significanceStars = await sidePanelPage.locator('.vocab-significance-cell').evaluateAll(cells =>
      cells.map(cell => cell.textContent.trim()));
    expect(significanceStars.length).toBeGreaterThan(0);
    significanceStars.forEach(text => {
      expect(text).toMatch(/^★{1,5}☆{0,4}$/);
      expect(text.length).toBe(5);
    });

    const significanceValues = await sidePanelPage.locator('.vocab-significance-cell').evaluateAll(cells =>
      cells.map(cell => Number(cell.dataset.ll)));
    expect(significanceValues.length).toBeGreaterThan(0);
    significanceValues.forEach(value => expect(Number.isFinite(value)).toBe(true));
    for (let i = 1; i < significanceValues.length; i++) {
      expect(significanceValues[i - 1]).toBeGreaterThanOrEqual(significanceValues[i]);
    }

    const copiedTable = await sidePanelPage.locator('#vocabulary-table').evaluate(table => {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNode(table);
      selection.removeAllRanges();
      selection.addRange(range);

      const clipboardData = new DataTransfer();
      const event = new Event('copy', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: clipboardData });
      document.dispatchEvent(event);
      selection.removeAllRanges();

      return {
        defaultPrevented: event.defaultPrevented,
        text: clipboardData.getData('text/plain')
      };
    });
    expect(copiedTable.defaultPrevented).toBe(true);
    expect(copiedTable.text).not.toMatch(/[★☆]/);
    const copiedCells = copiedTable.text.split('\n').map(line => line.split('\t'));
    expect(copiedCells.some(cells => cells[4] === String(significanceValues[0]))).toBe(true);

    const significanceButton = significanceHeader.locator('.vocab-sort-button');
    await significanceButton.click();
    await expect(significanceHeader).toHaveAttribute('aria-sort', 'ascending');
    const ascendingSignificanceValues = await sidePanelPage.locator('.vocab-significance-cell').evaluateAll(cells =>
      cells.map(cell => Number(cell.dataset.ll)));
    for (let i = 1; i < ascendingSignificanceValues.length; i++) {
      expect(ascendingSignificanceValues[i - 1]).toBeLessThanOrEqual(ascendingSignificanceValues[i]);
    }

    const frequencyHeader = sidePanelPage.locator('th[data-sort-key="count"]');
    const frequencyButton = frequencyHeader.locator('.vocab-sort-button');

    await frequencyButton.click();
    await expect(frequencyHeader).toHaveAttribute('aria-sort', 'descending');

    await frequencyButton.click();
    await expect(frequencyHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  test('hides function-word rows by part of speech', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/reading-tutor-mutation.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    await waitForReadingTutorSettled(page, sidePanelPage);

    await page.evaluate(() => {
      const addSpan = (text, lemma, pos) => {
        const span = document.createElement('span');
        span.className = 'ʁ ʁ-reading-tutor';
        span.textContent = text;
        span.setAttribute('data-readings', JSON.stringify([{ l: lemma, ts: [pos] }]));
        document.body.appendChild(span);
      };
      addSpan('книга', 'книга', 'N');
      addSpan('читать', 'читать', 'V');
      addSpan('в', 'в', 'Pr');
      addSpan('и', 'и', 'CC');
    });

    const vocabButton = sidePanelPage.locator('.sub-tab-button[data-subtab="vocabulary"]');
    await vocabButton.click();

    const readRows = async () => {
      return sidePanelPage.locator('#vocabulary-table tbody tr').evaluateAll(rows => {
        return rows.map(row => Array.from(row.cells).map(cell => cell.textContent.trim()));
      });
    };
    const hasRow = (rows, lemma, pos) => rows.some(cells => cells[0] === lemma && cells[1] === pos);

    await expect.poll(async () => {
      const rows = await readRows();
      return hasRow(rows, 'книга', 'noun')
        && hasRow(rows, 'читать', 'verb')
        && hasRow(rows, 'в', 'preposition')
        && hasRow(rows, 'и', 'conjunction');
    }, { timeout: 15000 }).toBe(true);

    const functionWordsButton = sidePanelPage.locator('#vocab-function-filter');
    await functionWordsButton.click();
    await expect(functionWordsButton).toHaveText('Show function words');

    const filteredRows = await readRows();
    expect(hasRow(filteredRows, 'книга', 'noun')).toBe(true);
    expect(hasRow(filteredRows, 'читать', 'verb')).toBe(true);
    expect(hasRow(filteredRows, 'в', 'preposition')).toBe(false);
    expect(hasRow(filteredRows, 'и', 'conjunction')).toBe(false);
  });

  test('uses larger star buckets for lower significance rows', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/reading-tutor-mutation.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    await waitForReadingTutorSettled(page, sidePanelPage);

    await page.evaluate(() => {
      const addSpan = (text, lemma) => {
        const span = document.createElement('span');
        span.className = 'ʁ ʁ-reading-tutor';
        span.textContent = text;
        span.setAttribute('data-readings', JSON.stringify([{ l: lemma, ts: ['N'] }]));
        document.body.appendChild(span);
      };
      const letters = 'абвгдежзиклмнопрстуфхцчшэюя';
      letters.split('').forEach((letter, i) => {
        const lemma = `лемма${letter}`;
        for (let j = 0; j < letters.length - i; j++) {
          addSpan(lemma, lemma);
        }
      });
    });

    const vocabButton = sidePanelPage.locator('.sub-tab-button[data-subtab="vocabulary"]');
    await vocabButton.click();

    await expect.poll(async () => {
      return sidePanelPage.locator('.vocab-significance-cell').count();
    }, { timeout: 15000 }).toBeGreaterThan(20);

    const counts = await sidePanelPage.locator('.vocab-significance-cell').evaluateAll(cells => {
      return cells.reduce((acc, cell) => {
        const stars = (cell.textContent.match(/★/g) || []).length;
        acc[stars] = (acc[stars] || 0) + 1;
        return acc;
      }, {});
    });

    expect(counts[1] || 0).toBeGreaterThanOrEqual(counts[2] || 0);
    expect(counts[2] || 0).toBeGreaterThanOrEqual(counts[3] || 0);
    expect(counts[3] || 0).toBeGreaterThanOrEqual(counts[4] || 0);
    expect(counts[4] || 0).toBeGreaterThanOrEqual(counts[5] || 0);
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

    await waitForReadingTutorSettled(page, sidePanelPage);

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
