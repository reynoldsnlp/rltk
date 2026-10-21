/**
 * Options page: a single "Dev mode" toggle. The side panel watches this key and
 * shows elements marked `.dev-only` while it is on.
 */
const DEV_MODE_KEY = 'rltk_dev_mode';
const devModeCheckbox = document.getElementById('dev-mode');

chrome.storage.local.get([DEV_MODE_KEY], (res) => {
    devModeCheckbox.checked = !!res[DEV_MODE_KEY];
});

devModeCheckbox.addEventListener('change', () => {
    chrome.storage.local.set({ [DEV_MODE_KEY]: devModeCheckbox.checked });
});
