// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

test.describe.configure({ timeout: 120000 });

test.describe('Paradigm Generation - Numerals', () => {
  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  async function openSidePanelAndActivateReadingTutor(browserContext, extensionId, tabId) {
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
    await waitForSidePanelReady(sidePanelPage);

    await sidePanelPage.click('.tab-button[data-tab="reading-tutor"]');
    await expect(sidePanelPage.locator('.tab-button.active[data-tab="reading-tutor"]')).toBeVisible();

    await sidePanelPage.click('.sub-tab-button[data-subtab="translations-and-tables"]');
    await expect(sidePanelPage.locator('.sub-tab-button.active[data-subtab="translations-and-tables"]')).toBeVisible();

    await sidePanelPage.waitForFunction(() => {
      const container = document.getElementById('reading-tutor-results');
      return container && !container.textContent.includes('Preparing text...');
    }, { timeout: 45000 });

    return sidePanelPage;
  }

  async function clickAndWaitForSelection(page, sidePanelPage, span, id, serviceWorker) {
    await span.scrollIntoViewIfNeeded();
    await span.evaluate((el) => el.click());

    let selectionArrived = true;
    try {
      await expect.poll(async () => {
        const lemmaCount = await sidePanelPage.locator('.lemma-group').count();
        if (lemmaCount > 0) return true;
        const container = sidePanelPage.locator('#reading-tutor-results');
        const text = await container.innerText().catch(() => '');
        return text.includes('Analyzing...');
      }, { timeout: 20000 }).toBe(true);
    } catch (error) {
      selectionArrived = false;
    }

    if (!selectionArrived && id) {
      const payload = await page.evaluate((targetId) => {
        const target = document.querySelector(`#${targetId} .ʁ-reading-tutor`);
        if (!target) return null;
        const readings = JSON.parse(target.getAttribute('data-readings') || '[]');
        const text = target.textContent || '';
        return {
          action: 'reading_tutor_selection',
          text,
          cohort: { w: text, rs: readings },
          index: 0
        };
      }, id);

      if (payload) {
        await serviceWorker.evaluate((message) => chrome.runtime.sendMessage(message), payload);
        await expect(sidePanelPage.locator('.lemma-group').first()).toBeVisible({ timeout: 20000 });
      }
    }
  }

  async function openNumeralParadigm(page, sidePanelPage, serviceWorker, id) {
    const element = page.locator(`#${id}`);
    const clickableSpan = element.locator('.ʁ-reading-tutor').first();
    await expect(clickableSpan).toBeVisible();

    await clickAndWaitForSelection(page, sidePanelPage, clickableSpan, id, serviceWorker);

    const lemma = await page.evaluate((targetId) => {
      const target = document.querySelector(`#${targetId} .ʁ-reading-tutor`);
      if (!target) return null;
      const readings = JSON.parse(target.getAttribute('data-readings') || '[]');
      const numReading = readings.find(r => (r.ts || []).includes('Num')) || readings[0];
      return numReading ? numReading.l : null;
    }, id);

    const lemmaGroup = lemma
      ? sidePanelPage.locator('.lemma-group', { hasText: lemma }).first()
      : sidePanelPage.locator('.lemma-group').first();
    await expect(lemmaGroup).toBeVisible({ timeout: 60000 });

    const toggleButton = lemmaGroup.locator('.toggle-button').first();
    if (await toggleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      const toggleText = await toggleButton.textContent();
      if (toggleText && toggleText.includes('+')) {
        await toggleButton.click();
      }
    }

    const table = lemmaGroup.locator('.paradigm-table').first();
    try {
      await expect(table).toBeVisible({ timeout: 90000 });
      return table;
    } catch (error) {
      await clickAndWaitForSelection(page, sidePanelPage, clickableSpan, id, serviceWorker);

      const retryToggle = lemmaGroup.locator('.toggle-button').first();
      if (await retryToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        const retryText = await retryToggle.textContent();
        if (retryText && retryText.includes('+')) {
          await retryToggle.click();
        }
      }

      await expect(table).toBeVisible({ timeout: 45000 });
      return table;
    }
  }

  async function expectTableShape(table, { rows, formCols }) {
    await expect(table.locator('tbody tr')).toHaveCount(rows);
    const rowCount = await table.locator('tbody tr').count();
    for (let i = 0; i < rowCount; i += 1) {
      await expect(table.locator('tbody tr').nth(i).locator('td')).toHaveCount(formCols + 1);
    }

    const tableText = await table.locator('tbody').innerText();
    expect(tableText).not.toContain('—');
    expect(/[\u0400-\u04FF]/.test(tableText)).toBe(true);
  }

  test('generates numeral paradigms for один', async ({ page, browserContext, extensionId, serviceWorker }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/comprehensive-pos.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openSidePanelAndActivateReadingTutor(browserContext, extensionId, tabId);

    const warmupSpan = page.locator('#adj-big .ʁ-reading-tutor').first();
    await clickAndWaitForSelection(page, sidePanelPage, warmupSpan, 'adj-big', serviceWorker);

    const adjectivalIds = ['num-adj-odnou', 'num-adj-odnim'];
    for (const id of adjectivalIds) {
      const table = await openNumeralParadigm(page, sidePanelPage, serviceWorker, id);
      await expectTableShape(table, { rows: 6, formCols: 4 });
    }
  });

  test('generates numeral paradigms for два', async ({ page, browserContext, extensionId, serviceWorker }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/comprehensive-pos.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openSidePanelAndActivateReadingTutor(browserContext, extensionId, tabId);

    const warmupSpan = page.locator('#adj-big .ʁ-reading-tutor').first();
    await clickAndWaitForSelection(page, sidePanelPage, warmupSpan, 'adj-big', serviceWorker);

    const twoIds = ['num-two-dva', 'num-two-dve'];
    for (const id of twoIds) {
      const table = await openNumeralParadigm(page, sidePanelPage, serviceWorker, id);
      await expectTableShape(table, { rows: 6, formCols: 3 });
    }
  });

  test('generates numeral paradigms for оба', async ({ page, browserContext, extensionId, serviceWorker }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/comprehensive-pos.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openSidePanelAndActivateReadingTutor(browserContext, extensionId, tabId);

    const warmupSpan = page.locator('#adj-big .ʁ-reading-tutor').first();
    await clickAndWaitForSelection(page, sidePanelPage, warmupSpan, 'adj-big', serviceWorker);

    const paucalIds = ['num-paucal-obe', 'num-paucal-oboih'];
    for (const id of paucalIds) {
      const table = await openNumeralParadigm(page, sidePanelPage, serviceWorker, id);
      await expectTableShape(table, { rows: 6, formCols: 3 });
    }
  });

  test('generates numeral paradigms for others', async ({ page, browserContext, extensionId, serviceWorker }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/comprehensive-pos.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openSidePanelAndActivateReadingTutor(browserContext, extensionId, tabId);

    const warmupSpan = page.locator('#adj-big .ʁ-reading-tutor').first();
    await clickAndWaitForSelection(page, sidePanelPage, warmupSpan, 'adj-big', serviceWorker);

    const numeralIds = ['num-card-vosemyu', 'num-card-pyatidesyati', 'num-card-sta'];
    for (const id of numeralIds) {
      const table = await openNumeralParadigm(page, sidePanelPage, serviceWorker, id);
      await expectTableShape(table, { rows: 6, formCols: 1 });
    }
  });

  test('ordinal paradigms omit Fac in feminine instrumental', async ({ page, browserContext, extensionId, serviceWorker }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/comprehensive-pos.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openSidePanelAndActivateReadingTutor(browserContext, extensionId, tabId);

    const warmupSpan = page.locator('#adj-big .ʁ-reading-tutor').first();
    await clickAndWaitForSelection(page, sidePanelPage, warmupSpan, 'adj-big', serviceWorker);

    const table = await openNumeralParadigm(page, sidePanelPage, serviceWorker, 'num-ord-tretiy');
    await expectTableShape(table, { rows: 6, formCols: 4 });

    const instRow = table.locator('tbody tr', { hasText: 'Inst' });
    const femCell = instRow.locator('td').nth(3);
    await expect(femCell.locator('[title*="+Fac"]')).toHaveCount(0);
  });
});
