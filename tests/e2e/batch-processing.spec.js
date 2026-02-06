// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const server = require('./server');
const { launchPersistentContext, ensureExtensionReady, closeNonKeepAlivePages } = require('./launch-context');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

// Run serially to share a single fixture server.
test.describe.configure({ mode: 'serial', timeout: 180000 });

/**
 * Tests for batch processing of long pages.
 * The batch-processing.html fixture contains ~67KB of Russian text,
 * which exceeds the 50KB threshold and triggers multi-batch processing.
 */
test.describe('Batch Processing for Long Pages', () => {
    /** @type {import('@playwright/test').BrowserContext} */
    let browserContext;
    /** @type {import('@playwright/test').Page} */
    let page;
    /** @type {string} */
    let extensionId;
    /** @type {import('http').Server} */
    let serverInstance;
    /** @type {number} */
    let port;

    test.beforeAll(async () => {
        // Start local server on an available port
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
        const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
        await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));

        await closeNonKeepAlivePages(browserContext);
        page = await browserContext.newPage();
    });

    test.afterEach(async () => {
        await closeNonKeepAlivePages(browserContext);
    });

    async function openSidePanelForActivity(tabId, activityValue) {
        const sidePanelPage = await browserContext.newPage();
        await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);
        await waitForSidePanelReady(sidePanelPage, { waitForReadingTutor: false });

        await sidePanelPage.click('.tab-button[data-tab="reading-activities"]');
        await sidePanelPage.selectOption('#topic-menu', 'word-stress');
        await sidePanelPage.waitForFunction(() => {
            const select = document.querySelector('#activity-menu');
            return select && select.options.length > 1;
        }, { timeout: 5000 });
        await sidePanelPage.selectOption('#activity-menu', activityValue);
        await sidePanelPage.click('#enhance-button');
        return sidePanelPage;
    }

    async function seedLongStressContent(pageToSeed, { sections = 120 } = {}) {
        await pageToSeed.evaluate((sectionCount) => {
            const main = document.querySelector('main');
            if (!main) return;
            main.innerHTML = '';
            for (let i = 0; i < sectionCount; i++) {
                const section = document.createElement('section');
                section.id = `section-${i + 1}`;
                section.innerHTML = `
                    <h2>Раздел ${i + 1}</h2>
                    <p>Это мой дом. Я вижу книгу. У нас нет тела. Я плачу за муку.</p>
                    <p>Это мой дом. Я вижу книгу. У нас нет тела. Я плачу за муку.</p>
                `;
                main.appendChild(section);
            }
        }, sections);
    }

    async function waitForBatchProgress(pageToCheck, { timeout = 150000 } = {}) {
        await expect
            .poll(async () => pageToCheck.evaluate(() => Number(document.documentElement.dataset.rltkBatchProcessed || 0)), { timeout })
            .toBeGreaterThan(0);

        const progress = await pageToCheck.evaluate(() => ({
            total: Number(document.documentElement.dataset.rltkBatchTotal || 0),
            processed: Number(document.documentElement.dataset.rltkBatchProcessed || 0),
            failed: Number(document.documentElement.dataset.rltkBatchFailed || 0),
            completed: document.documentElement.dataset.rltkBatchCompleted === 'true',
            lastError: document.documentElement.dataset.rltkBatchLastError || ''
        }));
        expect(progress.processed).toBeGreaterThan(0);
        expect(progress.failed).toBe(0);
        return progress;
    }

    test('can load long fixture page', async () => {
        const fixtureUrl = `http://localhost:${port}/tests/fixtures/batch-processing.html`;
        await page.goto(fixtureUrl);

        await seedLongStressContent(page);

        // Verify the page has multiple sections
        const sections = page.locator('section');
        const sectionCount = await sections.count();
        expect(sectionCount).toBeGreaterThan(100);

        // Verify it has substantial Russian content
        const mainContent = await page.locator('main').textContent();
        expect(mainContent.length).toBeGreaterThan(20000);
    });

    test('enhances long page without crashing', async () => {
        const fixtureUrl = `http://localhost:${port}/tests/fixtures/batch-processing.html`;
        await page.goto(fixtureUrl);

        await seedLongStressContent(page);

        const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
        expect(tabId).not.toBeNull();

        // First verify the page content exceeds threshold
        const textLength = await page.evaluate(() => document.body.textContent.length);
        expect(textLength).toBeGreaterThan(20000);

        // This is the main test - ensure batch processing starts and progresses
        await openSidePanelForActivity(tabId, 'color');

        await waitForBatchProgress(page, { timeout: 150000 });
    });
});
