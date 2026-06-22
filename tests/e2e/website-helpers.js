// Helpers for the companion-website E2E specs (docs/index.html + docs/web/*).
//
// Unlike the rest of the suite — which loads src/ as an unpacked extension and
// drives chrome-extension:// pages — these tests exercise the plain web build:
// a normal page at the fixture server's baseURL, with the large language-model
// binaries intercepted via page.route(). The real models are gitignored and not
// served from GitHub Pages, so production fetches them from remote hosts; here
// we either serve the on-disk copies (functional test) or simulate failures
// (notification test) so the tests are deterministic and offline.
//
// See ./README.md for general E2E conventions.
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.resolve(__dirname, '../../docs/rltk/resources/models');

// Matches any model-candidate URL by basename, regardless of host (the published
// extension, Giella, or the BYU backup all end in the same filename).
const MODEL_RE = /\/([^/?#]+\.(?:hfstol|pmhfst|cg3))(?:[?#]|$)/;

// The model basenames the website knows about, with the approximate sizes the
// status UI shows (mirrors docs/web/config.js MODEL_SIZES).
const MODEL_SIZES = {
  'generator-gt-norm.hfstol': 7 * 1024 * 1024,
  'generator-gt-norm.accented.hfstol': 7 * 1024 * 1024,
  'g2p.hfstol': 4 * 1024 * 1024,
  'analyser-gt-desc-L2.hfstol': 148 * 1024 * 1024,
  'tokeniser-disamb-gt-desc.pmhfst': 396 * 1024 * 1024,
  'disambiguator.cg3': 131 * 1024,
};

function modelBasename(url) {
  const m = MODEL_RE.exec(url);
  return m ? m[1] : null;
}

// Open the website entry point and wait for the bootstrap UI to be wired up.
async function openWebsite(page, baseURL) {
  await page.goto(`${baseURL}/index.html`);
  await page.waitForSelector('#rltk-analyze');
}

// Paste text and request analysis — the real user flow that lazily creates the
// offscreen frame, loads the side panel, and triggers model loading.
async function analyze(page, text) {
  await page.fill('#rltk-paste', text);
  await page.click('#rltk-analyze');
}

// Make the site load models from the same-origin test server (which serves
// docs/ — including the on-disk model binaries — natively and fast) instead of
// the remote hosts. We do this by intercepting the tiny web/config.js and
// rewriting MODEL_URLS to local, root-relative paths, so the large binaries
// stream over plain HTTP rather than being piped through Playwright (fulfilling
// a 396MB body over CDP is far too slow). The models must exist on disk.
async function serveLocalModels(page) {
  const missing = Object.keys(MODEL_SIZES).filter(
    (n) => !fs.existsSync(path.join(MODELS_DIR, n))
  );
  if (missing.length) {
    throw new Error(`Missing local model files for functional test: ${missing.join(', ')}`);
  }
  await page.route(/\/web\/config\.js(\?|$)/, async (route) => {
    const urls = {};
    Object.keys(MODEL_SIZES).forEach((n) => {
      urls[n] = ['/rltk/resources/models/' + n];
    });
    const body =
      'window.RLTK_WEB_CONFIG = ' +
      JSON.stringify({ MODEL_URLS: urls, MODEL_SIZES }) +
      ';';
    await route.fulfill({ status: 200, contentType: 'text/javascript', body });
  });
}

// Abort every model request, simulating unreachable hosts / CORS failures for
// the full fallback chain. Used to assert the "all candidates failed" error UI.
async function failAllModels(page) {
  await page.route(MODEL_RE, (route) => route.abort('failed'));
}

module.exports = {
  MODELS_DIR,
  MODEL_RE,
  modelBasename,
  openWebsite,
  analyze,
  serveLocalModels,
  failAllModels,
};
