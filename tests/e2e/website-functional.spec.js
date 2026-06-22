// Basic end-to-end functional check for the companion website (docs/index.html
// + docs/web/*), analogous to the extension's reading-tutor specs but driving
// the plain web build instead of the unpacked extension.
//
// It serves the real on-disk language models via page.route() (they're
// gitignored and not on GitHub Pages, so production fetches them remotely), then
// confirms the whole web pipeline works on one non-trivial example: paste
// Russian text -> Analyze -> the reading tutor tokenizes, disambiguates, and
// annotates the words in the reading frame.
//
// This loads ~570MB of WASM models through the route layer, so it is slow — the
// generous timeout matches the extension suite's model-warm-up budget.
const { test, expect } = require('@playwright/test');
const { openWebsite, analyze, serveLocalModels } = require('./website-helpers');

const SAMPLE = 'Студенты читают интересные книги в большой библиотеке.';

test.describe('Website functional smoke test', () => {
  test('annotates pasted Russian text end-to-end', async ({ page, baseURL }) => {
    test.setTimeout(240000); // real model load (incl. the 396MB tokenizer)

    await serveLocalModels(page);
    await openWebsite(page, baseURL);
    await analyze(page, SAMPLE);

    // The reading tutor annotates each word with a `.ʁ-reading-tutor` span
    // inside the reading iframe. Their presence means tokenization, CG3
    // disambiguation, morphological analysis, and annotation all succeeded.
    const reading = page.frameLocator('#rltk-reading-frame');
    const annotated = reading.locator('.ʁ-reading-tutor');
    await expect(annotated.first()).toBeVisible({ timeout: 220000 });

    const count = await annotated.count();
    expect(count).toBeGreaterThan(3); // the sentence has several content words

    // The reading tutor adds stress marks (combining acute accents, U+0301).
    // Confirm (a) the real text made it through end-to-end and (b) it was
    // actually enriched with stress — i.e. analysis ran, not just tokenization.
    const bodyText = await reading.locator('body').innerText();
    expect(bodyText).toMatch(/́/); // at least one stress mark was added
    const stripped = bodyText.normalize('NFD').replace(/[̀-ͯ]/g, '');
    expect(stripped).toContain('библиотеке');
  });
});
