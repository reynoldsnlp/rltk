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
                    if (path.endsWith('.wasm')) {
                        return chrome.runtime.getURL('resources/js/' + path);
                    }
                    return scriptDirectory + path;
                }
            };

            hfst = await createHfstModule(moduleConfig);
            console.log('    ...HFST module loaded as `hfst`');

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
        const escapedPreview = text.substring(0, 100).replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/ /g, '·');
        const results = tokenizer.tokenize(text, tokenizeSettings);
        const resultsObj = await jsonlToJsonArray(results);
        return resultsObj;
    } catch (error) {
        console.error('Error in tokenization:', error);
        throw error;
    }
}

async function jsonlToJsonArray(jsonlString) {
    if (!jsonlString) {
        console.warn('Empty or null JSONL string received');
        return [];
    }

    const lines = jsonlString.trim().split('\n');
    const jsonArray = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        try {
            const jsonObject = JSON.parse(line);
            jsonArray.push(jsonObject);
        } catch (error) {
            console.error(`Error parsing JSON line ${i}: ${line.substring(0, 50)}...`, error);
        }
    }
    return jsonArray;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.target === 'offscreen' && request.action === 'tokenize') {
        (async () => {
            try {
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

initHfst();
