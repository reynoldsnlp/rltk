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

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'tokenize') {
        console.log('=== BACKGROUND: Tokenize request ===');
        console.log('Text length:', request.text ? request.text.length : 'null/undefined');

        (async () => {
            try {
                await createOffscreenDocument();
                console.log('BACKGROUND: Forwarding to offscreen...');

                // Forward the request to the offscreen document
                const response = await chrome.runtime.sendMessage({
                    target: 'offscreen',
                    action: 'tokenize',
                    text: request.text
                });

                console.log('BACKGROUND: Response success:', response.success);
                if (response.success) {
                    console.log('Response segments count:', response.data ? response.data.length : 'null/undefined');
                } else {
                    console.log('Response error:', response.error);
                }

                sendResponse(response);
            } catch (error) {
                console.error('BACKGROUND: Error:', error.message);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Keep the message channel open for async response
    }

    // CSS injection handler removed - now handled directly in content script
});
