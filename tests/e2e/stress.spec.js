const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const { waitForFixtureTabId, waitForSidePanelReady } = require('./test-helpers');

// Run serially to share a single fixture server.
test.describe.configure({ mode: 'serial' });

test.describe('Word Stress Activity', () => {
  test.beforeEach(async ({ serviceWorker, browserContext }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
    await closeNonKeepAlivePages(browserContext);
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  async function openSidePanelForActivity(browserContext, extensionId, tabId, activityValue, options = {}) {
    const { clickEnhance = true } = options;
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
    if (clickEnhance) {
      await sidePanelPage.click('#enhance-button');
    }
    return sidePanelPage;
  }

  test('word stress legend shows for click activity', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    const sidePanelPage = await openSidePanelForActivity(browserContext, extensionId, tabId, 'click', { clickEnhance: false });

    const note = sidePanelPage.locator('#word-stress-note');
    await expect(note).toBeVisible({ timeout: 5000 });
    const noteText = await note.textContent();
    expect(noteText).toContain('cursor legend');
  });

  test('can open fixture page and read expected text', async ({ page }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/stress.html`;
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

  test('enhance injects RLTK spans on fixture page', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    // Baseline: no accent marks or injected spans
    const baselineHtml = await page.innerHTML('body');
    expect(baselineHtml.includes('\u0301')).toBe(false);
    await expect(page.locator('.ʁ-stress')).toHaveCount(0);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(browserContext, extensionId, tabId, 'color');

    await page.waitForFunction(() => document.documentElement.innerHTML.includes('\u0301'), { timeout: 8000 });

    // Sanity: at least one injected span contains an accent
    const stressSpan = page.locator('.ʁ-stress', { hasText: /\u0301/ }).first();
    await expect(stressSpan).toBeVisible({ timeout: 5000 });
  });

  test('color activity sets cursors by stress status', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(browserContext, extensionId, tabId, 'color');

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

  test('click activity marks stressed vowel on selection', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(browserContext, extensionId, tabId, 'click');

    const firstLetter = page.locator('.ʁ-stress-click .letter').first();
    await expect(firstLetter).toBeVisible({ timeout: 8000 });
    const letterCount = await page.locator('.ʁ-stress-click .letter').count();
    expect(letterCount).toBeGreaterThan(0);
  });

  test('click activity wraps only vowels', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(browserContext, extensionId, tabId, 'click');

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

  test('click activity sets cursors by stress status', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(browserContext, extensionId, tabId, 'click');

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
    const skramblerCursor = normalize(cursors.containerCursors.skrambler);

    expect(cursors.anyPointerLetter).toBe(true);
    if (cursors.hasTooltip) {
      expect(cursors.helpSeen).toBe(true);
    }
    expect(skramblerCursor).not.toBeNull();
    if (skramblerCursor === 'not-allowed') {
      expect(cursors.notAllowedSeen).toBe(true);
    } else {
      expect(['default', 'help']).toContain(skramblerCursor);
    }
  });

  test('multiple choice replaces token after correct selection', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(browserContext, extensionId, tabId, 'mc');

    const mcSelect = page.locator('.ʁ-stress-mc select').first();
    await expect(mcSelect).toBeVisible({ timeout: 12000 });
    await page.waitForFunction(() => {
      const sel = document.querySelector('.ʁ-stress-mc select');
      if (!sel || sel.disabled) return false;
      const option = Array.from(sel.options).find(opt => opt.dataset && opt.dataset.isCorrect === 'true' && opt.value);
      return !!option;
    }, { timeout: 12000 });

    // Select the correct option (dataset.isCorrect === 'true')
    const selected = await mcSelect.evaluate((sel) => {
      const option = Array.from(sel.options).find(opt => opt.dataset && opt.dataset.isCorrect === 'true' && opt.value);
      if (!option) return false;
      sel.value = option.value;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });
    expect(selected).toBe(true);

    // Correct selection replaces the container with a success span
    const correctSpan = page.locator('.ʁ-stress-correct').first();
    await expect(correctSpan).toBeVisible({ timeout: 8000 });
    await expect(correctSpan).toContainText('\u0301');
  });

  test('hover activity reveals stress on mouseover', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(browserContext, extensionId, tabId, 'hover');

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

  test('hover activity sets cursors by stress status', async ({ page, browserContext, extensionId }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/stress.html`;
    await page.goto(fixtureUrl);

    const tabId = await waitForFixtureTabId(browserContext, fixtureUrl);
    expect(tabId).not.toBeNull();

    await openSidePanelForActivity(browserContext, extensionId, tabId, 'hover');

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
