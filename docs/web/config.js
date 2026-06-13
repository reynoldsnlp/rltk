/**
 * RLTK companion-website configuration.
 *
 * This file is NOT copied from src/ — it is website-only and is the single
 * place to change where the large language-model binaries are fetched from.
 *
 * The big transducer/grammar binaries (.hfstol / .pmhfst / .cg3) are gitignored
 * and cannot be served from GitHub Pages, so the website downloads them over
 * HTTP. Each model maps to an ORDERED list of candidate URLs: the loader tries
 * them in order and falls back to the next on failure. The URLs below are
 * seeded from scripts/preflight-offscreen-resources.sh — keep them in sync.
 *
 * NOTE: the remote host(s) must send permissive CORS headers
 * (Access-Control-Allow-Origin) or the browser will block these cross-origin
 * fetches. See the plan's Risks section.
 */
(function () {
    var GIELLA = 'https://pkg.pjj.cc/f/n/gs/giella-rus/usr/share/giella/rus';
    var BACKUP = 'https://icall.byu.edu/lang-rus';
    var CG3_PRIMARY = 'https://raw.githubusercontent.com/giellalt/lang-rus/refs/heads/main/src/cg3/disambiguator.cg3';

    window.RLTK_WEB_CONFIG = {
        // basename -> ordered list of candidate URLs (first that succeeds wins)
        MODEL_URLS: {
            'generator-gt-norm.hfstol':          [GIELLA + '/generator-gt-norm.hfstol',          BACKUP + '/generator-gt-norm.hfstol'],
            'generator-gt-norm.accented.hfstol': [GIELLA + '/generator-gt-norm.accented.hfstol', BACKUP + '/generator-gt-norm.accented.hfstol'],
            'g2p.hfstol':                        [GIELLA + '/g2p.hfstol',                        BACKUP + '/g2p.hfstol'],
            'analyser-gt-desc-L2.hfstol':        [GIELLA + '/analyser-gt-desc-L2.hfstol',        BACKUP + '/analyser-gt-desc-L2.hfstol'],
            'tokeniser-disamb-gt-desc.pmhfst':   [GIELLA + '/tokeniser-disamb-gt-desc.pmhfst',   BACKUP + '/tokeniser-disamb-gt-desc.pmhfst'],
            'disambiguator.cg3':                 [CG3_PRIMARY,                                   BACKUP + '/disambiguator.cg3']
        },

        // Human-readable sizes for the loading UI (bytes are approximate).
        MODEL_SIZES: {
            'analyser-gt-desc-L2.hfstol': 148 * 1024 * 1024,
            'tokeniser-disamb-gt-desc.pmhfst': 396 * 1024 * 1024,
            'generator-gt-norm.hfstol': 7 * 1024 * 1024,
            'generator-gt-norm.accented.hfstol': 7 * 1024 * 1024,
            'g2p.hfstol': 4 * 1024 * 1024,
            'disambiguator.cg3': 131 * 1024
        }
    };
})();
