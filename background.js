let offscreenCreated = false;

async function createOffscreenDocument() {
  if (offscreenCreated) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['DOM_SCRAPING'],
    justification: 'HFST WASM processing requires relaxed CSP'
  });
  offscreenCreated = true;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'tokenize') {
        (async () => {
            try {
                await createOffscreenDocument();
                // Forward the request to the offscreen document
                const response = await chrome.runtime.sendMessage({
                    target: 'offscreen',
                    action: 'tokenize',
                    text: request.text
                });

                sendResponse(response);
            } catch (error) {
                console.error('BACKGROUND: Error:', error.message);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Keep the message channel open for async response
    }

});

// Initialize default state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ toolbarVisible: true });
  updateIcon(true);
});

chrome.action.onClicked.addListener(async (tab) => {
  // Get current state
  const result = await chrome.storage.local.get('toolbarVisible');
  const newState = !result.toolbarVisible;

  // Update stored state
  await chrome.storage.local.set({ toolbarVisible: newState });

  // Update icon
  updateIcon(newState);

  // Send toggle message to current tab
  chrome.tabs.sendMessage(tab.id, { action: 'toggleToolbar', visible: newState });
});

function updateIcon(visible) {
  const iconPath = visible ? 'icon.png' : 'bw-icon.png';
  chrome.action.setIcon({
    path: {
      "16": iconPath,
      "48": iconPath,
      "128": iconPath
    }
  });
}
