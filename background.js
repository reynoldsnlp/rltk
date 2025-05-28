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

// Set up side panel on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Handle action click to open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

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
