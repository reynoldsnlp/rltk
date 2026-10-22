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
    const hasRow = (rows, lemma, pos) => rows.some(cells => cells[1] === lemma && cells[2] === pos);

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

    // Hidden function words stay selected but are excluded from the export.
    const exportCount = sidePanelPage.locator('#vocab-export-count');
    await functionWordsButton.click();
    await expect(functionWordsButton).toHaveText('Hide function words');
    const allCount = (await readRows()).length;
    await sidePanelPage.locator('#vocab-add-all').click();
    await expect(exportCount).toHaveText(String(allCount));

    await functionWordsButton.click();
    const contentCount = (await readRows()).length;
    expect(contentCount).toBeLessThan(allCount);
    await expect(exportCount).toHaveText(String(contentCount));
    await expect(sidePanelPage.locator('#vocab-add-all')).toHaveAttribute('aria-pressed', 'true');

    await sidePanelPage.locator('#vocab-export-button').click();
    const [download] = await Promise.all([
      sidePanelPage.waitForEvent('download'),
      sidePanelPage.locator('#vocab-export-modal [data-format="csv"]').click()
    ]);
    const csvWords = require('fs').readFileSync(await download.path(), 'utf8')
      .trim().split('\r\n').slice(1).map(line => line.split(',')[0]);
    expect(csvWords).toHaveLength(contentCount);
    expect(csvWords).toContain('книга');
    expect(csvWords).not.toContain('в');
    await sidePanelPage.locator('#vocab-export-close').click();

    await functionWordsButton.click();
    await expect(exportCount).toHaveText(String(allCount));
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

  test('adds words to an export list and exports them', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/reading-tutor-mutation.html`;

    await page.goto(fixtureUrl);
    await page.bringToFront();

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    await waitForReadingTutorSettled(page, sidePanelPage);

    await sidePanelPage.locator('.sub-tab-button[data-subtab="vocabulary"]').click();
    const rows = sidePanelPage.locator('#vocabulary-table tbody tr');
    await expect.poll(() => rows.count(), { timeout: 20000 }).toBeGreaterThan(1);

    const exportRow = sidePanelPage.locator('.vocabulary-export-row');
    const count = sidePanelPage.locator('#vocab-export-count');
    await expect(exportRow).toBeVisible();
    await expect(exportRow).toContainText('to add words to an export list');
    await expect(sidePanelPage.locator('#vocab-export-button')).toBeHidden();

    const firstAdd = rows.nth(0).locator('.vocab-add-button');
    const secondAdd = rows.nth(1).locator('.vocab-add-button');
    await expect(firstAdd).toHaveAttribute('aria-pressed', 'false');
    const firstWord = (await rows.nth(0).locator('td').nth(1).textContent()).trim();
    expect(firstWord.length).toBeGreaterThan(0);

    await firstAdd.click();
    await expect(firstAdd).toHaveAttribute('aria-pressed', 'true');
    await expect(exportRow).toBeVisible();
    await expect(exportRow).toContainText('Export 1 word');
    await expect(count).toHaveClass(/pulse/);

    await secondAdd.click();
    await expect(exportRow).toContainText('Export 2 words');
    await secondAdd.click();
    await expect(secondAdd).toHaveAttribute('aria-pressed', 'false');
    await expect(exportRow).toContainText('Export 1 word');

    // Header toggle: selects all words unless all are already selected.
    const addAll = sidePanelPage.locator('#vocab-add-all');
    const rowCount = await rows.count();
    await expect(addAll).toHaveAttribute('aria-pressed', 'false');
    await addAll.click();
    await expect(addAll).toHaveAttribute('aria-pressed', 'true');
    await expect(count).toHaveText(String(rowCount));
    await expect(secondAdd).toHaveAttribute('aria-pressed', 'true');
    await addAll.click();
    await expect(addAll).toHaveAttribute('aria-pressed', 'false');
    await expect(firstAdd).toHaveAttribute('aria-pressed', 'false');
    await expect(exportRow).toContainText('to add words to an export list');
    await firstAdd.click();
    await expect(exportRow).toContainText('Export 1 word');

    const modal = sidePanelPage.locator('#vocab-export-modal');
    await sidePanelPage.locator('#vocab-export-button').click();
    await expect(modal).toBeVisible();
    await expect(modal.locator('h3')).toHaveText('Export 1 word');

    const download = async (format) => {
      const [file] = await Promise.all([
        sidePanelPage.waitForEvent('download'),
        modal.locator(`[data-format="${format}"]`).click()
      ]);
      const fs = require('fs');
      return { name: file.suggestedFilename(), bytes: fs.readFileSync(await file.path()) };
    };

    const csv = await download('csv');
    expect(csv.name).toBe('rltk-vocabulary.csv');
    const csvText = csv.bytes.toString('utf8');
    expect(csvText.startsWith('\uFEFFWord,Part of speech,Translation,Frequency on page,Significance (stars),Log-likelihood\r\n')).toBe(true);
    expect(csvText).toContain(firstWord);

    const xlsx = await download('excel');
    expect(xlsx.name).toBe('rltk-vocabulary.xlsx');
    expect(xlsx.bytes.subarray(0, 2).toString()).toBe('PK');
    expect(xlsx.bytes.includes(Buffer.from(firstWord))).toBe(true);

    const anki = await download('anki');
    expect(anki.name).toBe('rltk-vocabulary.txt');
    const ankiLines = anki.bytes.toString('utf8').trim().split('\n');
    expect(ankiLines.slice(0, 3)).toEqual(['#separator:tab', '#html:true', '#tags column:3']);
    expect(ankiLines).toHaveLength(4);
    const [front, , tags] = ankiLines[3].split('\t');
    expect(front).toContain(`>${firstWord}</div>`);
    expect(tags.split(' ')[0]).toBe('RLTK');

    await sidePanelPage.evaluate(() => {
      navigator.clipboard.writeText = async (text) => { window.__copied = text; };
    });
    await modal.locator('[data-format="quizlet"]').click();
    await expect(modal.locator('#vocab-export-status')).toContainText('Copied');
    const copied = await sidePanelPage.evaluate(() => window.__copied);
    expect(copied.split('\t')[0]).toBe(firstWord);
    expect(copied).not.toContain('\n');

    await modal.locator('#vocab-export-close').click();
    await expect(modal).toBeHidden();

    const escaped = await sidePanelPage.evaluate(() => {
      const row = { lemma: 'да, нет', pos: 'proper noun', translation: 'say "hi"\tnow <b>', count: 3, keywordStars: 4, ll: 12.5 };
      const X = RLTK_VOCAB_EXPORT;
      return { csv: X.toCsv([row]), quizlet: X.toQuizlet([row]), anki: X.toAnki([row]) };
    });
    expect(escaped.csv.split('\r\n')[1]).toBe('"да, нет",proper noun,"say ""hi""\tnow <b>",3,4,12.5');
    expect(escaped.quizlet).toBe('да, нет\tsay "hi" now <b> (proper noun)');
    const ankiFields = escaped.anki.trim().split('\n')[3].split('\t');
    expect(ankiFields).toHaveLength(3);
    expect(ankiFields[1]).toContain('say &quot;hi&quot; now &lt;b&gt;');
    expect(ankiFields[2]).toBe('RLTK proper_noun');
  });
});
