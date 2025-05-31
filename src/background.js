let offscreenCreated = false;

async function createOffscreenDocument() {
  if (offscreenCreated) return;

  await chrome.offscreen.createDocument({
    url: 'src/offscreen.html',
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

// Helper function to inject content script if needed
// TODO is this actually needed? Doesn't manifest v3 handle this automatically?
async function ensureContentScriptLoaded(tabId) {
  try {
    // Try to ping the content script first
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
  } catch (error) {
    // Content script not loaded, inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: [
          'src/commonFilterFuncs.js',
          'src/commonEnhanceFuncs.js',
          'src/activities.js',
          'src/topics/adjectives.js',
          'src/topics/adverbs.js',
          'src/topics/aspects.js',
          'src/topics/assistive-reading.js',
          'src/topics/cases.js',
          'src/topics/conjunctions.js',
          'src/topics/gerunds.js',
          'src/topics/nouns.js',
          'src/topics/participles.js',
          'src/topics/phonetics.js',
          'src/topics/prepositions.js',
          'src/topics/pronouns.js',
          'src/topics/stress.js',
          'src/topics/verbs.js',
          'src/content.js'
        ]
      });
    } catch (injectionError) {
      console.error('Script injection failed:', injectionError);
      throw new Error(`Cannot access this page. Script injection failed: ${injectionError.message}`);
    }
  }
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
    } else if (request.action === 'enhance' || request.action === 'abort' || request.action === 'restore') {
        // Handle side panel requests to communicate with content script
        (async () => {
            try {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs.length === 0) {
                    throw new Error('No active tab found');
                }

                const tabId = tabs[0].id;

                // Ensure content script is loaded
                await ensureContentScriptLoaded(tabId);

                // Forward the message to content script
                const response = await chrome.tabs.sendMessage(tabId, request);
                sendResponse({ success: true, data: response });
            } catch (error) {
                console.error('BACKGROUND: Error forwarding message:', error.message);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Keep the message channel open for async response
    }
});
