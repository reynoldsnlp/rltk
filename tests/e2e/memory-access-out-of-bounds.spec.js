const { test, expect, closeNonKeepAlivePages } = require('./fixtures');
const fs = require('fs');
const path = require('path');

test.describe.configure({ mode: 'serial' });

test.describe('Memory access out of bounds fixture', () => {
  test.setTimeout(300000);

  test.beforeEach(async ({ serviceWorker }) => {
    await serviceWorker.evaluate(() => new Promise(resolve => chrome.storage.local.clear(resolve)));
  });

  test.afterEach(async ({ browserContext }) => {
    await closeNonKeepAlivePages(browserContext);
  });

  const MEMORY_ERROR_RE = /memory access out of bounds|WASM memory error|memory/i;
  const MAX_FAILURES = 10;
  const MAX_DEPTH = 18;
  const MINIMIZE_MAX_STEPS = 200;
  const SINGLE_REMOVAL_MAX_STEPS = 60;
  const MEMORY_ERROR_ATTEMPTS = 3;
  const MINIMIZE_ATTEMPTS = 5;
  const MINIMIZE_THRESHOLD = 1;
  const VERIFY_ATTEMPTS = 12;
  const VERIFY_THRESHOLD = 2;
  const TEXT_ATTEMPTS = 20;
  const TEXT_THRESHOLD = 1;
  const FIXTURE_OUTPUT = path.resolve(__dirname, '../../docs/tests/fixtures/memory-access-out-of-bounds.cg3');
  const FIXTURE_CONTIGUOUS_OUTPUT = path.resolve(__dirname, '../../docs/tests/fixtures/memory-access-out-of-bounds-contiguous.cg3');
  const HTML_FIXTURE_OUTPUT = path.resolve(__dirname, '../../docs/tests/fixtures/memory-access-out-of-bounds.html');
  const TEXT_FIXTURE_OUTPUT = path.resolve(__dirname, '../../docs/tests/fixtures/memory-access-out-of-bounds.txt');
  const SOURCE_URL = 'https://www.biblegateway.com/passage/?search=%D0%91%D1%8B%D1%82%D0%B8%D0%B5%204&version=RUSV';

  function splitCg3IntoCohorts(input) {
    const lines = input.split('\n');
    const cohorts = [];
    let current = [];
    const tokenLineRe = /^"<.*>"$/;

    for (const line of lines) {
      if (tokenLineRe.test(line)) {
        if (current.length) cohorts.push(current.join('\n'));
        current = [line];
      } else if (current.length || line.trim().length > 0) {
        current.push(line);
      }
    }

    if (current.length) cohorts.push(current.join('\n'));
    return cohorts;
  }

  function joinCohorts(cohorts) {
    if (!cohorts.length) return '';
    return `${cohorts.join('\n')}\n`;
  }

  async function runCg3(extensionPage, input, sourceUrl) {
    const response = await extensionPage.evaluate(async ({ input, sourceUrl }) => {
      return await chrome.runtime.sendMessage({
        action: 'diagnostic_cg3_disambiguate',
        input,
        sourceUrl
      });
    }, { input, sourceUrl });

    const success = response && response.success;
    const error = response && response.error ? response.error : '';
    const isMemoryError = !success && MEMORY_ERROR_RE.test(error);

    return { success, error, isMemoryError };
  }

  async function memoryErrorCountForInput(extensionPage, input, sourceUrl, attempts) {
    let count = 0;
    for (let i = 0; i < attempts; i++) {
      const result = await runCg3(extensionPage, input, sourceUrl);
      if (result.isMemoryError) count += 1;
    }
    return count;
  }

  async function isMemoryErrorForInput(extensionPage, input, sourceUrl, attempts = MEMORY_ERROR_ATTEMPTS, threshold = 1) {
    const count = await memoryErrorCountForInput(extensionPage, input, sourceUrl, attempts);
    return count >= threshold;
  }

  async function bisectFailures(extensionPage, cohorts, start, end, sourceUrl, results, depth = 0) {
    if (results.length >= MAX_FAILURES || depth >= MAX_DEPTH) {
      results.push({ start, end, reason: 'limit reached' });
      return;
    }

    const slice = cohorts.slice(start, end);
    const input = joinCohorts(slice);
    const result = await runCg3(extensionPage, input, sourceUrl);

    if (!result.isMemoryError) {
      return;
    }

    if (end - start <= 1) {
      results.push({ start, end, cohort: slice[0] });
      return;
    }

    const mid = start + Math.floor((end - start) / 2);
    const leftSlice = cohorts.slice(start, mid);
    const rightSlice = cohorts.slice(mid, end);

    const leftResult = await runCg3(extensionPage, joinCohorts(leftSlice), sourceUrl);
    const rightResult = await runCg3(extensionPage, joinCohorts(rightSlice), sourceUrl);

    if (leftResult.isMemoryError) {
      await bisectFailures(extensionPage, cohorts, start, mid, sourceUrl, results, depth + 1);
    }
    if (rightResult.isMemoryError) {
      await bisectFailures(extensionPage, cohorts, mid, end, sourceUrl, results, depth + 1);
    }

    if (!leftResult.isMemoryError && !rightResult.isMemoryError) {
      results.push({ start, end, reason: 'fails only when combined' });
    }
  }

  function makeRangeKey(start, end) {
    return `${start}:${end}`;
  }

  async function minimizeContiguousRange(extensionPage, cohorts, start, end, sourceUrl) {
    const cache = new Map();
    let currentStart = start;
    let currentEnd = end;
    let steps = 0;

    async function testRange(s, e) {
      const key = makeRangeKey(s, e);
      if (cache.has(key)) return cache.get(key);
      const isMemoryError = await isMemoryErrorForInput(extensionPage, joinCohorts(cohorts.slice(s, e)), sourceUrl, MINIMIZE_ATTEMPTS, MINIMIZE_THRESHOLD);
      cache.set(key, isMemoryError);
      return isMemoryError;
    }

    let changed = true;
    while (changed && steps < MINIMIZE_MAX_STEPS && currentEnd - currentStart > 1) {
      changed = false;
      steps += 1;

      const length = currentEnd - currentStart;
      const mid = currentStart + Math.floor(length / 2);

      if (await testRange(currentStart, mid)) {
        currentEnd = mid;
        changed = true;
        continue;
      }

      if (await testRange(mid, currentEnd)) {
        currentStart = mid;
        changed = true;
        continue;
      }

      const stepSizes = [
        Math.max(1, Math.floor(length / 4)),
        Math.max(1, Math.floor(length / 8)),
        1
      ];

      for (const step of stepSizes) {
        if (changed || currentEnd - currentStart <= 1) break;

        const newStart = Math.min(currentEnd - 1, currentStart + step);
        if (newStart < currentEnd && await testRange(newStart, currentEnd)) {
          currentStart = newStart;
          changed = true;
          break;
        }

        const newEnd = Math.max(currentStart + 1, currentEnd - step);
        if (newEnd > currentStart && await testRange(currentStart, newEnd)) {
          currentEnd = newEnd;
          changed = true;
          break;
        }
      }
    }

    return {
      start: currentStart,
      end: currentEnd,
      steps,
      length: currentEnd - currentStart
    };
  }

  async function expandToFailingWindow(extensionPage, cohorts, start, end, sourceUrl) {
    let windowStart = start;
    let windowEnd = end;
    let step = Math.max(1, end - start);

    const testWindow = async (s, e) => {
      return await isMemoryErrorForInput(extensionPage, joinCohorts(cohorts.slice(s, e)), sourceUrl, MINIMIZE_ATTEMPTS, MINIMIZE_THRESHOLD);
    };

    if (await testWindow(windowStart, windowEnd)) {
      return { start: windowStart, end: windowEnd, expanded: false };
    }

    while ((windowStart > 0 || windowEnd < cohorts.length) && step < cohorts.length) {
      windowStart = Math.max(0, windowStart - step);
      windowEnd = Math.min(cohorts.length, windowEnd + step);

      if (await testWindow(windowStart, windowEnd)) {
        return { start: windowStart, end: windowEnd, expanded: true };
      }

      step = Math.min(cohorts.length, step * 2);
    }

    return { start: 0, end: cohorts.length, expanded: true };
  }

  function buildInputFromIndices(cohorts, indices) {
    if (!indices.length) return '';
    const chunks = indices.map(i => cohorts[i]);
    return `${chunks.join('\n')}\n`;
  }

  function extractTokensFromCg3(cg3Input) {
    const matches = Array.from(cg3Input.matchAll(/^"<(.+?)>"$/gm));
    return matches.map(m => m[1]);
  }

  function extractTextSliceFromTokens(pageText, tokens) {
    if (!tokens.length) return '';
    const firstToken = tokens[0];
    const candidates = [];
    let fromIndex = 0;

    while (candidates.length < 200) {
      const idx = pageText.indexOf(firstToken, fromIndex);
      if (idx === -1) break;
      candidates.push(idx);
      fromIndex = idx + firstToken.length;
    }

    for (const start of candidates) {
      let cursor = start + firstToken.length;
      let end = cursor;
      let matched = true;

      for (let i = 1; i < tokens.length; i++) {
        const token = tokens[i];
        const index = pageText.indexOf(token, cursor);
        if (index === -1) {
          matched = false;
          break;
        }
        end = index + token.length;
        cursor = end;
      }

      if (matched) {
        return pageText.slice(start, end);
      }
    }

    return '';
  }

  function extractTextSliceRangeFromTokens(pageText, tokens) {
    if (!tokens.length) return null;
    const firstToken = tokens[0];
    const candidates = [];
    let fromIndex = 0;

    while (candidates.length < 200) {
      const idx = pageText.indexOf(firstToken, fromIndex);
      if (idx === -1) break;
      candidates.push(idx);
      fromIndex = idx + firstToken.length;
    }

    for (const start of candidates) {
      let cursor = start + firstToken.length;
      let end = cursor;
      let matched = true;

      for (let i = 1; i < tokens.length; i++) {
        const token = tokens[i];
        const index = pageText.indexOf(token, cursor);
        if (index === -1) {
          matched = false;
          break;
        }
        end = index + token.length;
        cursor = end;
      }

      if (matched) {
        return { start, end };
      }
    }

    return null;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function isMemoryErrorForText(extensionPage, text, sourceUrl) {
    const tokenizedResponse = await extensionPage.evaluate(async ({ text, sourceUrl }) => {
      return await chrome.runtime.sendMessage({
        action: 'diagnostic_tokenize',
        text,
        sourceUrl
      });
    }, { text, sourceUrl });

    if (!tokenizedResponse || !tokenizedResponse.success) {
      return false;
    }

    const cg3Input = tokenizedResponse.data;
    return await isMemoryErrorForInput(extensionPage, cg3Input, sourceUrl, TEXT_ATTEMPTS, TEXT_THRESHOLD);
  }

  async function expandTextSliceUntilFailure(extensionPage, pageText, start, end, sourceUrl) {
    let windowStart = start;
    let windowEnd = end;
    let step = Math.max(2000, end - start);
    let attempts = 0;

    while (attempts < 6) {
      const slice = pageText.slice(windowStart, windowEnd);
      if (await isMemoryErrorForText(extensionPage, slice, sourceUrl)) {
        return { start: windowStart, end: windowEnd, attempts };
      }

      attempts += 1;
      windowStart = Math.max(0, windowStart - step);
      windowEnd = Math.min(pageText.length, windowEnd + step);
      step = Math.min(pageText.length, step * 2);

      if (windowStart === 0 && windowEnd === pageText.length) {
        break;
      }
    }

    return { start: 0, end: pageText.length, attempts, expandedToFull: true };
  }

  async function minimizeTextSliceByEdges(extensionPage, pageText, start, end, sourceUrl) {
    let windowStart = start;
    let windowEnd = end;
    let steps = 0;

    while (windowEnd - windowStart > 1 && steps < 12) {
      steps += 1;
      const length = windowEnd - windowStart;
      const step = Math.max(1, Math.floor(length / 4));

      const trimStart = Math.min(windowEnd - 1, windowStart + step);
      const trimEnd = Math.max(windowStart + 1, windowEnd - step);

      const leftSlice = pageText.slice(trimStart, windowEnd);
      if (await isMemoryErrorForText(extensionPage, leftSlice, sourceUrl)) {
        windowStart = trimStart;
        continue;
      }

      const rightSlice = pageText.slice(windowStart, trimEnd);
      if (await isMemoryErrorForText(extensionPage, rightSlice, sourceUrl)) {
        windowEnd = trimEnd;
        continue;
      }

      break;
    }

    return { start: windowStart, end: windowEnd, steps, length: windowEnd - windowStart };
  }

  async function ddminIndices(extensionPage, cohorts, indices, sourceUrl) {
    let n = 2;
    let current = indices.slice();
    let steps = 0;

    const cache = new Map();
    const testSubset = async (subset) => {
      const key = subset.join(',');
      if (cache.has(key)) return cache.get(key);
      const input = buildInputFromIndices(cohorts, subset);
      const isMemoryError = await isMemoryErrorForInput(extensionPage, input, sourceUrl, MINIMIZE_ATTEMPTS, MINIMIZE_THRESHOLD);
      cache.set(key, isMemoryError);
      return isMemoryError;
    };

    while (current.length >= 2 && steps < MINIMIZE_MAX_STEPS) {
      steps += 1;
      const chunkSize = Math.ceil(current.length / n);
      const chunks = [];
      for (let i = 0; i < current.length; i += chunkSize) {
        chunks.push(current.slice(i, i + chunkSize));
      }

      let reduced = false;
      for (const chunk of chunks) {
        if (chunk.length === 0) continue;
        if (await testSubset(chunk)) {
          current = chunk;
          n = 2;
          reduced = true;
          break;
        }
      }

      if (reduced) {
        continue;
      }

      for (const chunk of chunks) {
        if (chunk.length === 0) continue;
        const complement = current.filter(idx => !chunk.includes(idx));
        if (complement.length === 0) continue;
        if (await testSubset(complement)) {
          current = complement;
          n = Math.max(2, n - 1);
          reduced = true;
          break;
        }
      }

      if (!reduced) {
        if (n >= current.length) break;
        n = Math.min(current.length, n * 2);
      }
    }

    return { indices: current, steps };
  }

  async function minimizeBySingleRemoval(extensionPage, cohorts, indices, sourceUrl) {
    let current = indices.slice();
    let changed = true;
    let steps = 0;

    while (changed && current.length > 1 && steps < SINGLE_REMOVAL_MAX_STEPS) {
      changed = false;
      steps += 1;

      for (let i = 0; i < current.length; i++) {
        const candidate = current.slice(0, i).concat(current.slice(i + 1));
        if (!candidate.length) continue;
        const isMemoryError = await isMemoryErrorForInput(extensionPage, buildInputFromIndices(cohorts, candidate), sourceUrl, MINIMIZE_ATTEMPTS, MINIMIZE_THRESHOLD);
        if (isMemoryError) {
          current = candidate;
          changed = true;
          break;
        }
      }
    }

    return { indices: current, steps };
  }

  test.fixme('memory-access-out-of-bounds', async ({ page, browserContext, extensionId }, testInfo) => {
    // Expected failure reminder: CG3 WASM can still hit memory access errors.
    // Keep this test as a placeholder for future fixes/refactors.
    const baseURL = testInfo.project.use.baseURL;
    const fixtureUrl = `${baseURL}/tests/fixtures/memory-access-out-of-bounds.html`;
    await page.goto(fixtureUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const extensionPage = await browserContext.newPage();
    await extensionPage.goto(`chrome-extension://${extensionId}/rltk/sidepanel.html?debugTabId=0`);
    await extensionPage.waitForLoadState('domcontentloaded');

    // TODO: restore a minimal CG3 input and verify memory access error once diagnostics are refactored.
    await extensionPage.close();
  });
});
