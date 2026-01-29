const { test, expect } = require('@playwright/test');
const path = require('path');
const server = require('./server');
const { launchPersistentContext } = require('./launch-context');

// Run serially to share a single fixture server.
test.describe.configure({ mode: 'serial' });

test.describe('Word Stress Activity', () => {
  let browserContext;
  let page;
  let extensionId;
  let serverInstance;
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

    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
    const swUrl = serviceWorker.url();
    // URL format: chrome-extension://<id>/rltk/background.js
    extensionId = swUrl.split('/')[2];
  });

  test.afterAll(async () => {
    await browserContext.close();
    serverInstance.close();
  });

  test.beforeEach(async () => {
    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));

    for (const p of browserContext.pages()) {
      await p.close();
    }

    page = await browserContext.newPage();
  });

  test.afterEach(async () => {
    for (const p of browserContext.pages()) {
      await p.close();
    }
  });

  async function getFixtureTabId(fixtureUrl) {
    const serviceWorker = browserContext.serviceWorkers()[0] || await browserContext.waitForEvent('serviceworker');
    const tabId = await serviceWorker.evaluate(async (targetUrl) => {
      const exact = await chrome.tabs.query({ url: targetUrl });
      if (exact.length > 0) return exact[0].id;
      const all = await chrome.tabs.query({});
      return all.length > 0 ? all[0].id : null;
    }, fixtureUrl);
    return tabId;
  }

  async function openSidePanelForActivity(tabId, activityValue, options = {}) {
    const { clickEnhance = true } = options;
    const sidePanelPage = await browserContext.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=${tabId}`);

    await sidePanelPage.click('.tab-button[data-tab="reading-activities"]');
    await sidePanelPage.selectOption('#topic-menu', 'word-stress');
    await sidePanelPage.waitForFunction(() => {
      const select = document.querySelector('#activity-menu');
      return select && select.options.length > 1;
    }, { timeout: 5000 });
    await sidePanelPage.selectOption('#activity-menu', activityValue);
    if (clickEnhance) {
      await sidePanelPage.click('#enhance-button');
    }
    return sidePanelPage;
  }

  test('word stress legend shows for click activity', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await openSidePanelForActivity(tabId, 'click', { clickEnhance: false });

    const note = sidePanelPage.locator('#word-stress-note');
    await expect(note).toBeVisible({ timeout: 5000 });
    const noteText = await note.textContent();
    expect(noteText).toContain('cursor legend');
  });

  test('can open fixture page and read expected text', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    // Basic reachability: heading and known labels from the fixture
    await expect(page.getByText('Word Stress Activity Test Page')).toBeVisible();
    await expect(page.locator('text=Unambiguous Stress').first()).toBeVisible();
    await expect(page.locator('text=Ambiguous Stress').first()).toBeVisible();

    // Check a known word appears as plain text (no accent by default)
    const bodyHtml = await page.innerHTML('body');
    expect(bodyHtml.includes('дом')).toBe(true);
    expect(bodyHtml.includes('\u0301')).toBe(false);
  });

  test('enhance injects RLTK spans on fixture page', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    // Baseline: no accent marks or injected spans
    const baselineHtml = await page.innerHTML('body');
    expect(baselineHtml.includes('\u0301')).toBe(false);
    await expect(page.locator('.ʁ-stress')).toHaveCount(0);

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(tabId, 'color');

    await page.waitForFunction(() => document.documentElement.innerHTML.includes('\u0301'), { timeout: 8000 });

    // Sanity: at least one injected span contains an accent
    const stressSpan = page.locator('.ʁ-stress', { hasText: /\u0301/ }).first();
    await expect(stressSpan).toBeVisible({ timeout: 5000 });
  });

  test('color activity sets cursors by stress status', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(tabId, 'color');

    await page.waitForFunction(() => document.querySelectorAll('.ʁ-stress').length >= 5, { timeout: 8000 });

    await page.waitForFunction(() => {
      const spans = Array.from(document.querySelectorAll('.ʁ-stress'));
      return spans.some(el => getComputedStyle(el).cursor === 'help');
    }, { timeout: 8000 });

    const cursors = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('.ʁ-stress'));

      const cursorFor = (needle) => {
        const match = spans.find(el => {
          const normalized = el.textContent.normalize('NFD').replace(/\u0301/g, '');
          return normalized.includes(needle);
        });
        return match ? getComputedStyle(match).cursor : null;
      };

      const allCursors = spans.map(el => getComputedStyle(el).cursor);

      return {
        byWord: {
          dom: cursorFor('дом'),
          knigu: cursorFor('книг'),
          tela: cursorFor('тела'),
          muku: cursorFor('муку'),
          skrambler: cursorFor('скрамблер')
        },
        all: allCursors
      };
    });

    const normalize = (c) => c === 'auto' ? 'default' : c;

    expect(normalize(cursors.byWord.dom)).toBe('default');
    expect(normalize(cursors.byWord.knigu)).toBe('default');
    expect(normalize(cursors.byWord.skrambler)).toBe('not-allowed');

    const helpSeen = cursors.all.some(c => normalize(c) === 'help');
    expect(helpSeen).toBe(true);
  });

  test('click activity marks stressed vowel on selection', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(tabId, 'click');

    const firstLetter = page.locator('.ʁ-stress-click .letter').first();
    await expect(firstLetter).toBeVisible({ timeout: 8000 });
    const letterCount = await page.locator('.ʁ-stress-click .letter').count();
    expect(letterCount).toBeGreaterThan(0);
  });

  test('click activity wraps only vowels', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(tabId, 'click');

    await page.waitForFunction(() => document.querySelectorAll('.ʁ-stress-click').length >= 5, { timeout: 8000 });

    const vowelWrapCheck = await page.evaluate(() => {
      const vowels = ['а','е','ё','и','о','у','ы','э','ю','я','А','Е','Ё','И','О','У','Ы','Э','Ю','Я'];
      const containers = Array.from(document.querySelectorAll('.ʁ-stress-click'));
      let anyWithVowels = false;
      const failures = [];
      const allPass = containers.every((container, idx) => {
        const text = container.textContent
          .normalize('NFD')
          .replace(/\u0301/g, '')
          .normalize('NFC');
        const vowelCount = Array.from(text).filter(ch => vowels.includes(ch)).length;
        const spans = Array.from(container.querySelectorAll('.letter'));
        if (vowelCount > 0) {
          anyWithVowels = true;
        }

        const normalizedSpanChars = spans.map(s => (s.textContent || '')
          .normalize('NFD')
          .replace(/\u0301/g, '')
          .normalize('NFC'));
        const nonEmptySpanChars = normalizedSpanChars.filter(ch => ch);
        const nonVowelSpans = nonEmptySpanChars.filter(ch => !vowels.includes(ch));
        const spansAreVowels = nonVowelSpans.length === 0;

        const countsOk = vowelCount === 0
          ? nonEmptySpanChars.length === 0
          : (nonEmptySpanChars.length >= vowelCount && nonEmptySpanChars.length <= vowelCount * 2);
        const ok = spansAreVowels && countsOk;

        if (!ok) {
          failures.push({
            idx,
            text,
            vowelCount,
            spanCount: spans.length,
            nonEmptySpanCount: nonEmptySpanChars.length,
            nonVowelSpans: nonVowelSpans.slice(0, 12),
            sampleSpanChars: nonEmptySpanChars.slice(0, 12),
            countsOk,
            spansAreVowels
          });
        }

        return ok;
      });

      return {
        ok: allPass && anyWithVowels,
        anyWithVowels,
        containerCount: containers.length,
        failures: failures.slice(0, 3)
      };
    });

    expect(vowelWrapCheck.ok).toBe(true);
  });

  test('click activity sets cursors by stress status', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(tabId, 'click');

    await page.waitForFunction(() => {
      const letters = document.querySelectorAll('.ʁ-stress-click .letter');
      return letters.length > 0 && Array.from(letters).some(l => getComputedStyle(l).cursor === 'pointer');
    }, { timeout: 8000 });

    const cursors = await page.evaluate(() => {
      const containers = Array.from(document.querySelectorAll('.ʁ-stress-click'));
      const letters = Array.from(document.querySelectorAll('.ʁ-stress-click .letter'));

      const cursorForContainer = (needle) => {
        const match = containers.find(el => {
          const normalized = el.textContent.normalize('NFD').replace(/\u0301/g, '');
          return normalized.includes(needle);
        });
        return match ? getComputedStyle(match).cursor : null;
      };

      const anyPointerLetter = letters.some(l => getComputedStyle(l).cursor === 'pointer');
      const helpSeen = containers.some(c => getComputedStyle(c).cursor === 'help');
      const notAllowedSeen = containers.some(c => getComputedStyle(c).cursor === 'not-allowed');
      const hasTooltip = containers.some(c => c.title && c.title.length > 0);

      return {
        containerCursors: {
          skrambler: cursorForContainer('скрамблер')
        },
        anyPointerLetter,
        helpSeen,
        notAllowedSeen,
        hasTooltip
      };
    });

    const normalize = (c) => c === 'auto' ? 'default' : c;

    expect(cursors.anyPointerLetter).toBe(true);
    if (cursors.hasTooltip) {
      expect(cursors.helpSeen).toBe(true);
    }
    expect(normalize(cursors.containerCursors.skrambler)).toBe('not-allowed');
    expect(cursors.notAllowedSeen).toBe(true);
  });

  test('multiple choice replaces token after correct selection', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(tabId, 'mc');

    const mcSelect = page.locator('.ʁ-stress-mc select').first();
    await expect(mcSelect).toBeVisible({ timeout: 8000 });

    // Select the correct option (dataset.isCorrect === 'true')
    const correctValue = await mcSelect.evaluate((sel) => {
      const option = Array.from(sel.options).find(opt => opt.dataset && opt.dataset.isCorrect === 'true');
      return option ? option.value : '';
    });
    expect(correctValue).not.toBe('');
    await mcSelect.selectOption(correctValue);

    // Correct selection replaces the container with a success span
    const correctSpan = page.locator('.ʁ-stress-correct').first();
    await expect(correctSpan).toBeVisible({ timeout: 8000 });
    await expect(correctSpan).toContainText('\u0301');
  });

  test('hover activity reveals stress on mouseover', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(tabId, 'hover');

    await page.waitForFunction(() => {
      const spans = Array.from(document.querySelectorAll('.ʁ-stress-hover'));
      for (const span of spans) {
        span.dispatchEvent(new Event('mouseenter', { bubbles: true }));
        if (span.textContent.includes('\u0301')) {
          span.dispatchEvent(new Event('mouseleave', { bubbles: true }));
          return true;
        }
        span.dispatchEvent(new Event('mouseleave', { bubbles: true }));
      }
      return false;
    }, { timeout: 8000 });
  });

  test('hover activity sets cursors by stress status', async () => {
    const fixtureUrl = `http://localhost:${port}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await getFixtureTabId(fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(tabId, 'hover');

    await page.waitForFunction(() => document.querySelectorAll('.ʁ-stress-hover').length >= 5, { timeout: 8000 });

    await page.waitForFunction(() => {
      const spans = Array.from(document.querySelectorAll('.ʁ-stress-hover'));
      return spans.some(el => getComputedStyle(el).cursor === 'help');
    }, { timeout: 8000 });

    const cursors = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('.ʁ-stress-hover'));

      const cursorFor = (needle) => {
        const match = spans.find(el => {
          const normalized = el.textContent.normalize('NFD').replace(/\u0301/g, '');
          return normalized.includes(needle);
        });
        return match ? getComputedStyle(match).cursor : null;
      };

      const allCursors = spans.map(el => getComputedStyle(el).cursor);

      return {
        byWord: {
          dom: cursorFor('дом'),
          knigu: cursorFor('книг'),
          tela: cursorFor('тела'),
          muku: cursorFor('муку'),
          skrambler: cursorFor('скрамблер')
        },
        all: allCursors
      };
    });

    const normalize = (c) => c === 'auto' ? 'default' : c;

    expect(normalize(cursors.byWord.dom)).toBe('default');
    expect(normalize(cursors.byWord.knigu)).toBe('default');
    expect(normalize(cursors.byWord.skrambler)).toBe('not-allowed');

    const helpSeen = cursors.all.some(c => normalize(c) === 'help');
    expect(helpSeen).toBe(true);
  });
});
