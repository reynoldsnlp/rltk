// E2E conventions, shared helpers, and flakiness notes: see ./README.md
// (tests/e2e/README.md). Read it before adding or changing tests.
const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

test.describe.configure({ timeout: 180000 });

/**
 * Tests for batch processing of long pages.
 * The batch-processing.html fixture contains ~67KB of Russian text,
 * which exceeds the 50KB threshold and triggers multi-batch processing.
 */
test.describe('Batch Processing for Long Pages', () => {
    test.beforeEach(async ({ serviceWorker, browserContext }) => {
        await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
        await closeNonKeepAlivePages(browserContext);
    });

    test.afterEach(async ({ browserContext }) => {
        await closeNonKeepAlivePages(browserContext);
    });

    async function openSidePanelForActivity(browserContext, extensionId, tabId, activityValue) {
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
        // Capture the full progress snapshot inside the poll. A separate re-read
        // after polling can land on a moment where rltkBatchProcessed was just
        // republished as 0 at the start of a (re)processing cycle, so the value
        // we assert on must be the same atomic read the poll succeeded on.
        let progress = { total: 0, processed: 0, failed: 0, completed: false, lastError: '' };
        await expect
            .poll(async () => {
                progress = await pageToCheck.evaluate(() => ({
                    total: Number(document.documentElement.dataset.rltkBatchTotal || 0),
                    processed: Number(document.documentElement.dataset.rltkBatchProcessed || 0),
                    failed: Number(document.documentElement.dataset.rltkBatchFailed || 0),
                    completed: document.documentElement.dataset.rltkBatchCompleted === 'true',
                    lastError: document.documentElement.dataset.rltkBatchLastError || ''
                }));
                return progress.processed;
            }, { timeout })
            .toBeGreaterThan(0);

        expect(progress.failed).toBe(0);
        return progress;
    }

    test('can load long fixture page', async ({ page }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL;
        const fixtureUrl = `${baseURL}/tests/fixtures/batch-processing.html`;
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

    test('enhances long page without crashing', async ({ page, browserContext, extensionId }, testInfo) => {
        const baseURL = testInfo.project.use.baseURL;
        const fixtureUrl = `${baseURL}/tests/fixtures/batch-processing.html`;
        await page.goto(fixtureUrl);

        await seedLongStressContent(page);

        const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
        expect(tabId).not.toBeNull();

        // First verify the page content exceeds threshold
        const textLength = await page.evaluate(() => document.body.textContent.length);
        expect(textLength).toBeGreaterThan(20000);

        // This is the main test - ensure batch processing starts and progresses
        await openSidePanelForActivity(browserContext, extensionId, tabId, 'color');

        await waitForBatchProgress(page, { timeout: 150000 });
    });
});
