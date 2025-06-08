let hfst = null;
let cg3 = null;
let cg3GrammarString = null;
let tokenizer = null;
let generator = null;
let stressGenerator = null;
let tokenizeSettings;
let initializationPromise = null; // Track initialization state

async function initHfst() {
    const moduleConfig = {
        locateFile: function(path, scriptDirectory) {
            if (path.endsWith('.wasm')) {
                return chrome.runtime.getURL('src/resources/js/' + path);
            }
            return scriptDirectory + path;
        }
    };

    // Initialize HFST module
    hfst = await createHfstModule(moduleConfig);
    console.log('    ...HFST module loaded as `hfst`');

    tokenizeSettings = hfst.getDefaultTokenizeSettings();
    tokenizeSettings.output_format = 8; // JSONL
    tokenizeSettings.print_all = true;
    tokenizeSettings.print_weights = true;
    tokenizeSettings.dedupe = true;
    tokenizeSettings.hack_uncompose = true;
    console.log('Tokenize settings:', tokenizeSettings);

    generator = await loadTransducer("src/resources/models/generator-gt-norm.hfstol", `generator`);
    stressGenerator = await loadTransducer("src/resources/models/generator-gt-norm.accented.hfstol", `stressGenerator`);
    tokenizer = await loadTokenizer("src/resources/models/old-tokeniser-disamb-gt-desc.pmhfst");
}

async function initCg3() {
    const moduleConfig = {
        locateFile: function(path, scriptDirectory) {
            if (path.endsWith('.wasm')) {
                return chrome.runtime.getURL('src/resources/js/' + path);
            }
            return scriptDirectory + path;
        }
    };

    // Initialize CG3 module
    cg3 = await createCG3Module(moduleConfig);
    console.log('    ...CG3 module loaded as `cg3`');

    // Retrieve the CG3 grammar string from src/resources/models/disambiguator.cg3
    const response = await fetch(chrome.runtime.getURL('src/resources/models/disambiguator.cg3'));
    cg3GrammarString = await response.text();
    console.log('CG3 grammar loaded successfully');
}

async function initWasmTools() {
    const hfstToolsReady = hfst !== null && generator !== null && stressGenerator !== null && tokenizer !== null;
    const cg3Ready = cg3 !== null;

    if (hfstToolsReady && cg3Ready) return;

    // If initialization is already in progress, wait for it
    if (initializationPromise !== null) {
        return await initializationPromise;
    }

    console.log('Loading WASM modules...');

    // Create and store the initialization promise
    initializationPromise = (async () => {
        try {
            if (!hfstToolsReady) {
                await initHfst();
            }

            if (!cg3Ready) {
                await initCg3();
            }
        } catch (error) {
            console.error('Failed to initialize WASM modules:', error);
            initializationPromise = null;
            throw error;
        }
    })();

    return await initializationPromise;
}


async function vislcg3(input_stream, grammar = null) {
    if (!cg3) {
        throw new Error('CG3 module not initialized');
    }
    if (!grammar) {
        grammar = cg3GrammarString;
    }

    const cglb = cg3.cwrap('cg3_grammar_load_buffer', 'number', ['string', 'number']);
    const cac = cg3.cwrap('cg3_applicator_create', 'number', ['number']);
    const crgotf = cg3.cwrap('cg3_run_grammar_on_text_fns', null, ['number', 'string', 'string']);

    const g = cglb(grammar, grammar.length);
    if (g === 0) throw new Error('Failed to load CG3 grammar');

    const a = cac(g);
    if (a === 0) throw new Error('Failed to create CG3 applicator');

    const timestamp = Date.now();
    const randomFloat = Math.random();
    const inputFile = `/tmp/${timestamp}-${randomFloat}.in`;
    const outputFile = `/tmp/${timestamp}-${randomFloat}.out`;
    cg3.FS.writeFile(inputFile, input_stream, { encoding: 'utf8' });

    crgotf(a, inputFile, outputFile);
    const output_stream = cg3.FS.readFile(outputFile, { encoding: 'utf8' });

    cg3.FS.unlink(inputFile);
    cg3.FS.unlink(outputFile);

    return output_stream;
}


async function test_vislcg3() {
    const testInput = '"<woærd>"\n\t"woørd" tag\n\t"woård" nottag\n';
    const testGrammar = 'DELIMITERS = "<.>"; SELECT (tag) ;';
    return await vislcg3(testInput, testGrammar);
}


async function loadTransducer(transducerPath, transducerName) {
    try {
        const response = await fetch(chrome.runtime.getURL(transducerPath));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        const transducerFilePath = `/${transducerName}.hfstol`;
        hfst.FS.writeFile(transducerFilePath, data);

        let instream = new hfst.HfstInputStream(transducerFilePath);
        let transducer = instream.read();
        if (!instream.is_eof()) {  // If stream has not reached end-of-file
            console.warn(`The given transducer file (${transducerPath}) contains more than one transducer. Only the first one is loaded.`);
        }
        instream.close();
        console.log(`    ...Transducer ${transducerName} loaded successfully.`);
        return transducer;
    } catch (error) {
        console.error(`Error loading transducer ${transducerName}:`, error);
        return null;
    }
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

async function handleGenerateRequest(input, useStress = false) {
    const transducer = useStress ? stressGenerator : generator;

    if (!transducer) {
        throw new Error(`${useStress ? 'Stress generator' : 'Generator'} not initialized`);
    }

    try {
        const results = transducer.lookup(input);

        // Convert HFST results to array of strings
        const forms = [];
        for (const result of results) {
            let form = result[0].join('');
            forms.push(form);
        }
        return forms;
    } catch (error) {
        console.error('Error in generation:', error);
        throw error;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.target === 'offscreen' && request.action === 'tokenize') {
        (async () => {
            try {
                await initWasmTools();
                const result = await handleTokenizeRequest(request.text);
                sendResponse({ success: true, data: result });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Keep the message channel open for async response
    } else if (request.target === 'offscreen' && request.action === 'generate') {
        (async () => {
            try {
                await initWasmTools();
                const result = await handleGenerateRequest(request.input, request.useStress);
                sendResponse({ success: true, data: result });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Keep the message channel open for async response
    }
});

initWasmTools();
