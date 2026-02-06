const { test, expect } = require('@playwright/test');
const path = require('path');
const server = require('./server');
const { launchPersistentContext, ensureExtensionReady, closeNonKeepAlivePages } = require('./launch-context');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

test.describe.configure({ mode: 'serial', timeout: 120000 });

test.describe('Paradigm Generation - Numerals', () => {
  let browserContext;
  let page;
  let extensionId;
  let serverInstance;
  let port;

  test.beforeAll(async () => {
    await new Promise(resolve => {
      serverInstance = server.listen(0, resolve);
    });
    port = serverInstance.address().port;

    const pathToExtension = path.resolve(__dirname, '../../src/');
    const userDataDir = '/tmp/test-user-data-dir-' + Math.random();

    browserContext = await launchPersistentContext(userDataDir, {
      extensionPath: pathToExtension,
    });

    const extension = await ensureExtensionReady(browserContext);
    extensionId = extension.extensionId;
  });

  test.afterAll(async () => {
    await browserContext?.close();
    serverInstance?.close();
  });

  test.beforeEach(async () => {
    page = await browserContext.newPage();
  });

  test.afterEach(async () => {
    await closeNonKeepAlivePages(browserContext);
  });

  async function openSidePanelAndActivateReadingTutor(tabId) {
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

  async function clickAndWaitForSelection(sidePanelPage, span, id, serviceWorker) {
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

  async function openNumeralParadigm(sidePanelPage, serviceWorker, id) {
    const element = page.locator(`#${id}`);
    const clickableSpan = element.locator('.ʁ-reading-tutor').first();
    await expect(clickableSpan).toBeVisible();

    await clickAndWaitForSelection(sidePanelPage, clickableSpan, id, serviceWorker);

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
    await expect(table).toBeVisible({ timeout: 90000 });
    return table;
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

  test('generates numeral paradigms for один', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/comprehensive-pos.html`;
    await page.goto(fixtureUrl);

    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openSidePanelAndActivateReadingTutor(tabId);

    const warmupSpan = page.locator('#adj-big .ʁ-reading-tutor').first();
    await clickAndWaitForSelection(sidePanelPage, warmupSpan, 'adj-big', serviceWorker);

    const adjectivalIds = ['num-adj-odnou', 'num-adj-odnim'];
    for (const id of adjectivalIds) {
      const table = await openNumeralParadigm(sidePanelPage, serviceWorker, id);
      await expectTableShape(table, { rows: 6, formCols: 4 });
    }
  });

  test('generates numeral paradigms for два', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/comprehensive-pos.html`;
    await page.goto(fixtureUrl);

    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openSidePanelAndActivateReadingTutor(tabId);

    const warmupSpan = page.locator('#adj-big .ʁ-reading-tutor').first();
    await clickAndWaitForSelection(sidePanelPage, warmupSpan, 'adj-big', serviceWorker);

    const twoIds = ['num-two-dva', 'num-two-dve'];
    for (const id of twoIds) {
      const table = await openNumeralParadigm(sidePanelPage, serviceWorker, id);
      await expectTableShape(table, { rows: 6, formCols: 3 });
    }
  });

  test('generates numeral paradigms for оба', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/comprehensive-pos.html`;
    await page.goto(fixtureUrl);

    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openSidePanelAndActivateReadingTutor(tabId);

    const warmupSpan = page.locator('#adj-big .ʁ-reading-tutor').first();
    await clickAndWaitForSelection(sidePanelPage, warmupSpan, 'adj-big', serviceWorker);

    const paucalIds = ['num-paucal-obe', 'num-paucal-oboih'];
    for (const id of paucalIds) {
      const table = await openNumeralParadigm(sidePanelPage, serviceWorker, id);
      await expectTableShape(table, { rows: 6, formCols: 3 });
    }
  });

  test('generates numeral paradigms for others', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/comprehensive-pos.html`;
    await page.goto(fixtureUrl);

    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);

    const sidePanelPage = await openSidePanelAndActivateReadingTutor(tabId);

    const warmupSpan = page.locator('#adj-big .ʁ-reading-tutor').first();
    await clickAndWaitForSelection(sidePanelPage, warmupSpan, 'adj-big', serviceWorker);

    const numeralIds = ['num-card-vosemyu', 'num-card-pyatidesyati', 'num-card-sta'];
    for (const id of numeralIds) {
      const table = await openNumeralParadigm(sidePanelPage, serviceWorker, id);
      await expectTableShape(table, { rows: 6, formCols: 1 });
    }
  });
});
