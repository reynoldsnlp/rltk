let hfst = null;
let tokenizer = null;
let tokenizeSettings;
let initializationPromise = null; // Track initialization state

async function initHfst() {
    if (hfst !== null) return;

    // If initialization is already in progress, wait for it
    if (initializationPromise !== null) {
        return await initializationPromise;
    }

    console.log('Loading HFST module...');

    // Create and store the initialization promise
    initializationPromise = (async () => {
        try {
            // Configure module to use extension resources
            const moduleConfig = {
                locateFile: function(path, scriptDirectory) {
                    // For WASM files, use the extension's resource path
                    if (path.endsWith('.wasm')) {
                        return chrome.runtime.getURL('resources/js/' + path);
                    }
                    // For other files, use default behavior
                    return scriptDirectory + path;
                }
            };

            hfst = await createHfstModule(moduleConfig);
            console.log('    ...HFST module loaded as `hfst`');

            // Initialize tokenize settings once
            tokenizeSettings = hfst.getDefaultTokenizeSettings();
            tokenizeSettings.output_format = 8; // JSONL
            tokenizeSettings.print_all = true;
            tokenizeSettings.print_weights = true;
            tokenizeSettings.dedupe = true;
            tokenizeSettings.hack_uncompose = true;
            console.log('Tokenize settings:', tokenizeSettings);

            tokenizer = await loadTokenizer("resources/models/old-tokeniser-disamb-gt-desc.pmhfst");
        } catch (error) {
            console.error('Failed to initialize HFST:', error);
            // Reset the promise so initialization can be retried
            initializationPromise = null;
            throw error;
        }
    })();

    return await initializationPromise;
}

async function loadTokenizer(tokPath) {
    console.log(`Loading tokenizer from ${tokPath}...`);
    try {
        const response = await fetch(chrome.runtime.getURL(tokPath));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        const tokenizerFilePath = "/tokenizer.pmhfst";
        hfst.FS.writeFile(tokenizerFilePath, data);
        console.log(`Tokenizer file written to HFST FS at ${tokenizerFilePath}`);

        const pmatchContainer = hfst.createPmatchContainer(tokenizerFilePath);
        console.log('    ...Tokenizer loaded.');
        return pmatchContainer;
    } catch (error) {
        console.error('Error loading tokenizer:', error);
        return null;
    }
}

async function handleTokenizeRequest(text) {
    if (!tokenizer) {
        throw new Error('Tokenizer not initialized');
    }

    try {
        console.log('=== TOKENIZATION REQUEST ===');
        console.log('Input text length:', text.length);
        const escapedPreview = text.substring(0, 100).replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/ /g, '·');
        console.log('Input text preview:', escapedPreview + (text.length > 100 ? '...' : ''));

        const results = tokenizer.tokenize(text, tokenizeSettings);
        console.log('Raw results length:', results ? results.length : 'null/undefined');

        const resultsObj = await jsonlToJsonArray(results);
        console.log('=== PARSED TOKENIZATION RESULTS ===');
        console.log('Number of segments:', resultsObj.length);
        console.log('First 10 segment types:', resultsObj.slice(0, 10).map(s => s.w ? `w:"${s.w.replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/ /g, '·')}"` : `t:"${s.t.replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/ /g, '·')}"`));
        console.log('Sample segment keys:', resultsObj[0] ? Object.keys(resultsObj[0]) : 'no segments');
        console.log('=== END TOKENIZATION RESULTS ===');

        return resultsObj;
    } catch (error) {
        console.error('Error in tokenization:', error);
        throw error;
    }
}

async function jsonlToJsonArray(jsonlString) {
    console.log('Converting JSONL to array...');
    console.log('JSONL string length:', jsonlString ? jsonlString.length : 'null/undefined');

    if (!jsonlString) {
        console.warn('Empty or null JSONL string received');
        return [];
    }

    const lines = jsonlString.trim().split('\n');
    console.log('Number of JSONL lines:', lines.length);
    console.log('First 3 lines preview:', lines.slice(0, 3).map(line => {
        const escaped = line.substring(0, 50).replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/ /g, '·');
        return escaped + (line.length > 50 ? '...' : '');
    }));

    const jsonArray = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        try {
            const jsonObject = JSON.parse(line);
            jsonArray.push(jsonObject);
            if (i < 3) {
                console.log(`Parsed line ${i} keys:`, Object.keys(jsonObject));
            }
        } catch (error) {
            console.error(`Error parsing JSON line ${i}: ${line.substring(0, 50)}...`, error);
        }
    }

    console.log('Final JSON array length:', jsonArray.length);
    return jsonArray;
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.target === 'offscreen' && request.action === 'tokenize') {
        (async () => {
            try {
                // Initialize HFST if needed (this will wait if already in progress)
                await initHfst();
                const result = await handleTokenizeRequest(request.text);
                sendResponse({ success: true, data: result });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Keep the message channel open for async response
    }
});

// Initialize HFST on load
initHfst();
