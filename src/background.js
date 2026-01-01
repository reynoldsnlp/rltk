/**
 * Background Service Worker for RLTK Extension
 *
 * This file acts as the central hub for the extension, handling:
 * 1. Extension lifecycle events (installation).
 * 2. Side panel interactions (opening the panel).
 * 3. Content script injection (managing activeTab permissions).
 * 4. Message routing between the side panel, content scripts, and offscreen document.
 * 5. Offscreen document management for WASM processing.
 */

let offscreenCreated = false;
const annotatedTabs = new Set();
const activeSidePanelPorts = new Set();

/**
 * Creates the offscreen document if it doesn't exist.
 * The offscreen document is used for heavy WASM processing (HFST/CG3).
 */
async function createOffscreenDocument() {
  if (offscreenCreated) return;

  try {
    // Check if an offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (existingContexts.length > 0) {
      offscreenCreated = true;
      return;
    }

    await chrome.offscreen.createDocument({
      url: 'src/offscreen.html',
      reasons: ['DOM_SCRAPING'],
      justification: 'HFST WASM processing requires relaxed CSP'
    });
    offscreenCreated = true;
  } catch (error) {
    if (error.message.includes('Only a single offscreen document may be created')) {
      // Document already exists, just mark as created
      offscreenCreated = true;
    } else {
      throw error;
    }
  }
}

// Set up side panel on installation
chrome.runtime.onInstalled.addListener(() => {
  // We handle the click manually to ensure script injection happens while activeTab is fresh
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
    .catch((error) => console.error(error));
});

// Handle action click to open side panel and inject scripts
chrome.action.onClicked.addListener(async (tab) => {
  // 1. Open the side panel immediately to provide feedback
  try {
    // Open in the current window
    await chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
  } catch (error) {
    console.error('Background: Failed to open side panel:', error);
  }

  // 2. Attempt to inject scripts using the activeTab permission from the click
  try {
    await ensureContentScriptLoaded(tab.id);
    // Notify side panel that access has been granted
    chrome.runtime.sendMessage({ action: 'access_granted', tabId: tab.id })
        .catch(() => {}); // Ignore error if side panel is not open/listening
  } catch (error) {
    console.warn('Background: Script injection on click failed (non-fatal):', error);
  }
});

/**
 * Helper function to inject content scripts into a tab.
 * This is necessary because we don't use automatic content script injection
 * to avoid requesting broad host permissions.
 */
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
          'src/utils/misc.js',
          'src/utils/tokenSelector.js',
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
      // Provide more specific error for permission issues
      if (injectionError.message.includes("Extension manifest must request permission")) {
        try {
          const tab = await chrome.tabs.get(tabId);
          if (tab.url && (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:") || tab.url.startsWith("chrome-extension://"))) {
             throw new Error("Cannot run on this system page.");
          }
        } catch (e) {
          // Ignore error checking tab
        }
      }

      throw new Error(`Cannot access this page. Script injection failed: ${injectionError.message}`);
    }
  }
}

// Message listener for communication between components
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle morphological analysis request (forward to offscreen)
    if (request.action === 'morph_analysis') {
        (async () => {
            try {
                await createOffscreenDocument();
                // Forward the request to the offscreen document
                const response = await chrome.runtime.sendMessage({
                    target: 'offscreen',
                    action: 'morph_analysis',
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

    // Handle generation request (forward to offscreen)
    if (request.action === 'generate') {
        (async () => {
            try {
                await createOffscreenDocument();
                // Forward the request to the offscreen document
                const response = await chrome.runtime.sendMessage({
                    target: 'offscreen',
                    action: 'generate',
                    input: request.input,
                    useStress: request.useStress
                });

                sendResponse(response);
            } catch (error) {
                console.error('BACKGROUND: Error:', error.message);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Keep the message channel open for async response
    }

    // Handle model data request (forward to offscreen)
    if (request.action === 'get_model_data') {
        (async () => {
            try {
                await createOffscreenDocument();
                // Forward the request to the offscreen document
                const response = await chrome.runtime.sendMessage({
                    target: 'offscreen',
                    action: 'get_model_data',
                    modelName: request.modelName,
                    key: request.key
                });

                sendResponse(response);
            } catch (error) {
                console.error('BACKGROUND: Error:', error.message);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Keep the message channel open for async response
    }

    // Handle L2 analysis request (forward to offscreen)
    if (request.action === 'analyze_l2') {
        (async () => {
            try {
                await createOffscreenDocument();
                // Forward the request to the offscreen document
                const response = await chrome.runtime.sendMessage({
                    target: 'offscreen',
                    action: 'analyze_l2',
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

    // Handle side panel requests to communicate with content script
    if (request.action === 'enhance' || request.action === 'abort' || request.action === 'restore' || request.action === 'get_status') {
        (async () => {
            try {
                let tabId;
                if (request.tabId) {
                    tabId = request.tabId;
                } else {
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (tabs.length === 0) {
                        throw new Error('No active tab found');
                    }
                    tabId = tabs[0].id;
                }

                // Track annotated tabs
                if (request.action === 'enhance') {
                    annotatedTabs.add(tabId);
                } else if (request.action === 'restore') {
                    annotatedTabs.delete(tabId);
                }

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

    // Handle request to inject content script (e.g. from side panel)
    if (request.action === 'inject_content_script') {
        (async () => {
            try {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs.length > 0) {
                    await ensureContentScriptLoaded(tabs[0].id);
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: "No active tab" });
                }
            } catch (error) {
                // Don't log as error if it's just a permission issue on a system page
                if (error.message.includes("Cannot run on this system page") ||
                    error.message.includes("Extension manifest must request permission") ||
                    error.message.includes("Cannot access this page")) {
                    // Silently fail for expected permission issues
                } else {
                    console.error('Auto-injection failed:', error);
                }
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }
});

// Listen for connections from the side panel to track its lifecycle
chrome.runtime.onConnect.addListener((port) => {
    if (port.name.startsWith('sidepanel')) {
        activeSidePanelPorts.add(port);

        port.onDisconnect.addListener(() => {
            activeSidePanelPorts.delete(port);

            // If no more side panels are open, clean up all annotated tabs
            if (activeSidePanelPorts.size === 0) {
                for (const tabId of annotatedTabs) {
                    chrome.tabs.sendMessage(tabId, { action: 'restore' })
                        .catch(() => {
                            // Tab might be closed or not accessible
                            annotatedTabs.delete(tabId);
                        });
                }
                annotatedTabs.clear();
            }
        });
    }
});

// Clean up tracked tabs when they are closed
chrome.tabs.onRemoved.addListener((tabId) => {
    annotatedTabs.delete(tabId);
});
