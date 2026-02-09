/**
 * Offscreen Document Script for RLTK Extension
 *
 * This script runs in an offscreen document to handle heavy computational tasks
 * that are not allowed or are inefficient in the service worker.
 * It handles:
 * 1. Loading and initializing WASM modules for HFST (Helsinki Finite-State Technology) and CG3 (Constraint Grammar).
 * 2. Loading linguistic models (transducers, grammars, JSON maps).
 * 3. Performing morphological analysis and disambiguation of text.
 * 4. Generating word forms (inflection) and stress patterns.
 */

let hfst = null;
let cg3 = null;
let cg3GrammarString = null;
const cg3GrammarPath = '/disambiguator.cg3'; // wasm FS path for default CG3 grammar
let tokenizer = null;  // Tokenizer for HFST (also provides morphological analysis)
let generator = null;
let stressGenerator = null;
let g2p = null;
let l2Analyser = null;
let tokenizeSettings;
let initializationPromise = null; // Track initialization state

function normalizeCohortArray(cohorts) {
    if (!Array.isArray(cohorts)) return [];
    return cohorts.map((cohort) => {
        if (!cohort || typeof cohort !== 'object') return cohort;
        if (!cohort.rs && Array.isArray(cohort.r)) {
            return { ...cohort, rs: cohort.r };
        }
        return cohort;
    });
}

/**
 * Creates a detailed error object with context for WASM failures.
 * Logs full context to console while returning a user-friendly message.
 */
function createWasmError(operation, error, context = {}) {
    const inputPreview = context.input
        ? (context.input.length > 200 ? context.input.substring(0, 200) + '...' : context.input)
        : 'N/A';
    const fullInput = context.input || 'N/A';

    // Log detailed info to console for developers
    console.error(`WASM Error during ${operation}:`, {
        error: error.message || error,
        stack: error.stack,
        sourceUrl: context.sourceUrl || 'unknown',
        inputLength: context.input ? context.input.length : 0,
        inputPreview: inputPreview,
        fullInput: fullInput,
        timestamp: new Date().toISOString()
    });

    // Return a user-friendly error that hints at where to look
    const isMemoryError = error.message && error.message.includes('memory');
    const userMessage = isMemoryError
        ? `Processing failed: WASM memory error during ${operation}. The text may be too long or contain problematic content. Check the offscreen console (chrome-extension://[id]/rltk/offscreen.html) for details.`
        : `Processing failed during ${operation}: ${error.message || error}. Check the offscreen console for details.`;

    return new Error(userMessage);
}

const models = {
    imperfectiveToPerfectiveVerbMap: null,
    perfectiveToImperfectiveVerbMap: null,
    lemmaToExemplarMap: null,
    'openrussian-translations-eng': null,
    adjectivesToExcludeFromParticiples: null,
    Sharoff_lem_freq_dict: null
};

/**
 * Loads a JSON model file from the extension resources.
 * Caches the result in the `models` object.
 */
async function loadJson(modelName) {
    if (models[modelName]) return models[modelName];

    console.log(`Loading JSON: ${modelName}...`);
    try {
        const url = chrome.runtime.getURL(`rltk/resources/models/${modelName}.json`);

        let response;
        try {
            response = await fetch(url);
        } catch (e) {
            throw new Error(`Failed to fetch ${modelName} from ${url}`);
        }

        if (!response.ok) throw new Error(`Failed to fetch ${modelName} (${response.status}) from ${url}`);
        models[modelName] = await response.json();
        console.log(`JSON ${modelName} loaded.`);
        return models[modelName];
    } catch (error) {
        console.error(`Error loading JSON ${modelName}:`, error);
        throw error;
    }
}

/**
 * Initializes the HFST WASM module and loads necessary transducers.
 */
async function initHfst() {
    const moduleConfig = {
        locateFile: function(path, scriptDirectory) {
            if (path.endsWith('.wasm')) {
                return chrome.runtime.getURL('rltk/resources/js/' + path);
            }
            return scriptDirectory + path;
        }
    };

    // Initialize HFST module
    hfst = await createHfstModule(moduleConfig);
    console.log('    ...HFST module loaded as `hfst`');

    tokenizeSettings = hfst.getDefaultTokenizeSettings();
    tokenizeSettings.output_format = 5;  // 5 = GIELLACG format which includes morphological analysis
    tokenizeSettings.print_all = true;
    tokenizeSettings.print_weights = true;
    tokenizeSettings.dedupe = true;
    tokenizeSettings.hack_uncompose = true;
    console.log('Tokenize settings:', tokenizeSettings);

    // Load transducers in parallel
    const loadPromises = [
        loadTransducer("rltk/resources/models/generator-gt-norm.hfstol", `generator`).then(res => generator = res),
        loadTransducer("rltk/resources/models/generator-gt-norm.accented.hfstol", `stressGenerator`).then(res => stressGenerator = res),
        loadTransducer("rltk/resources/models/g2p.hfstol", `g2p`).then(res => g2p = res),
        loadTransducer("rltk/resources/models/analyser-gt-desc-L2.hfstol", `l2Analyser`).then(res => l2Analyser = res),
        loadTokenizer("rltk/resources/models/tokeniser-disamb-gt-desc.pmhfst").then(res => tokenizer = res)
    ];

    await Promise.all(loadPromises);
}

/**
 * Initializes the CG3 WASM module and loads the grammar.
 */
async function initCg3() {
    const moduleConfig = {
        locateFile: function(path, scriptDirectory) {
            if (path.endsWith('.wasm')) {
                return chrome.runtime.getURL('rltk/resources/js/' + path);
            }
            return scriptDirectory + path;
        }
    };

    // Initialize CG3 module
    cg3 = await createCG3Module(moduleConfig);
    console.log('    ...CG3 module loaded as `cg3`');

    try {
        console.log('testing vislcg3()...');
        console.log(await test_vislcg3()); // Ensure vislcg3 works
    } catch (error) {
        console.error('Error in vislcg3 test:', error);
    }

    try {
        console.log('testing cgConv()...');
        console.log(await testCgConv()); // Ensure cgConv works
    } catch (error) {
        console.error('Error in cgConv test:', error);
    }

    // Retrieve the CG3 grammar string
    const response = await fetch(chrome.runtime.getURL('rltk/resources/models/disambiguator.cg3'));
    cg3GrammarString = await response.text();
    cg3.FS.writeFile(cg3GrammarPath, cg3GrammarString, { encoding: 'utf8' });
    console.log('CG3 grammar loaded successfully');
}

async function initWasmTools() {
    const hfstToolsReady = hfst !== null && generator !== null && stressGenerator !== null && g2p !== null && tokenizer !== null;
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


async function vislcg3(input_stream, grammar = cg3GrammarString) {
    if (!cg3) {
        throw new Error('CG3 module not initialized');
    }

    const timestamp = Date.now();
    const randomFloat = Math.random();
    const tmpFilename = `/tmp/vislcg3-${timestamp}-${randomFloat}`;
    const grammarFile = `${tmpFilename}.cg3`;
    cg3.FS.writeFile(grammarFile, grammar, { encoding: 'utf8' });
    const inputFile = `${tmpFilename}.in`;
    const outputFile = `${tmpFilename}.out`;
    cg3.FS.writeFile(inputFile, input_stream, { encoding: 'utf8' });

    const cg3_grammar_load = cg3.cwrap('cg3_grammar_load', 'number', ['string']);
    const cg3_applicator_create = cg3.cwrap('cg3_applicator_create', 'number', ['number']);
    const cg3_run_grammar_on_text_fns = cg3.cwrap('cg3_run_grammar_on_text_fns', null, ['number', 'string', 'string']);

    const grammar_ptr = cg3_grammar_load(grammarFile);
    if (grammar_ptr === 0) throw new Error('Failed to load CG3 grammar');

    const applicator_ptr = cg3_applicator_create(grammar_ptr);
    if (applicator_ptr === 0) throw new Error('Failed to create CG3 applicator');


    cg3_run_grammar_on_text_fns(applicator_ptr, inputFile, outputFile);
    const output_stream = cg3.FS.readFile(outputFile, { encoding: 'utf8' });

    cg3.FS.unlink(grammarFile);
    cg3.FS.unlink(inputFile);
    cg3.FS.unlink(outputFile);

    return output_stream;
}


async function test_vislcg3() {
    const testInput = '"<woærd>"\n\t"woørd" tag\n\t"woård" nottag\n';
    const testGrammar = 'DELIMITERS = "<.>"; SELECT (tag) ;';
    return await vislcg3(testInput, testGrammar);
}


async function cgConv(input_stream, options = {}) {
    if (!cg3) {
        throw new Error('CG3 module not initialized');
    }

    // Default options
    const {
        input_format = 'auto',   // 'auto', 'cg', 'niceline', 'apertium', 'fst', 'plain', 'jsonl'
        output_format = 'cg',    // 'cg', 'niceline', 'apertium', 'fst', 'plain', 'jsonl'
        unicode_tags = false,
        pipe_deleted = false,
        no_break = false,
        parse_dep = false,
        add_tags = false,
        sub_ltr = false,
        mapping_prefix = null,
        sub_delimiter = null,
        fst_wtag = null,
        fst_wfactor = null
    } = options;

    const formatMap = {
        'cg': 1,
        'niceline': 2,
        'apertium': 3,
        'fst': 5,
        'plain': 6,
        'jsonl': 7
    };

    const cg3_detect_sformat_buffer = cg3.cwrap('cg3_detect_sformat_buffer', 'number', ['string', 'number']);
    const cg3_sconverter_create = cg3.cwrap('cg3_sconverter_create', 'number', ['number', 'number']);
    const cg3_sconverter_run_fns = cg3.cwrap('cg3_sconverter_run_fns', null, ['number', 'string', 'string']);
    const cg3_sconverter_free = cg3.cwrap('cg3_sconverter_free', null, ['number']);

    let input_fmt;
    if (input_format === 'auto') {
        input_fmt = cg3_detect_sformat_buffer(input_stream, input_stream.length);
        if (input_fmt === 0) { // CG3SF_INVALID
            throw new Error('Could not detect input format');
        }
    } else {
        input_fmt = formatMap[input_format];
        if (!input_fmt) {
            throw new Error(`Unknown input format: ${input_format}`);
        }
    }

    const output_fmt = formatMap[output_format];
    if (!output_fmt) {
        throw new Error(`Unknown output format: ${output_format}`);
    }

    const converter = cg3_sconverter_create(input_fmt, output_fmt);
    if (converter === 0) {
        throw new Error('Failed to create format converter');
    }

    try {
        // Set converter options if needed
        // Note: The libcg3 API doesn't expose all the FormatConverter options directly,
        // so some advanced options from cg-conv might not be available through the C API

        const timestamp = Date.now();
        const randomFloat = Math.random();
        const tmpFilename = `/tmp/cgconv-${timestamp}-${randomFloat}`;
        const inputFile = `${tmpFilename}.in`;
        const outputFile = `${tmpFilename}.out`;

        cg3.FS.writeFile(inputFile, input_stream, { encoding: 'utf8' });
        cg3_sconverter_run_fns(converter, inputFile, outputFile);
        const output_stream = cg3.FS.readFile(outputFile, { encoding: 'utf8' });

        cg3.FS.unlink(inputFile);
        cg3.FS.unlink(outputFile);

        return output_stream;

    } finally {
        cg3_sconverter_free(converter);
    }
}


async function testCgConv() {
    const testInput = '"<woærd>"\n\t"woørd" tag\n\t"woård" nottag\n';
    return await cgConv(testInput, {input_format: "cg", output_format: 'jsonl'});
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

        // Test: demonstrate the transducer is functioning
        try {
            let input = null;
            let testResults = null;
            if (transducerName.match(/[Gg]enerator/)) {
                input = "работа+N+Fem+Inan+Sg+Nom";
                testResults = transducer.lookup(input)[0][0].join('');
            } else if (transducerName === 'g2p') {
                input = "рабо́та";
                testResults = transducer.lookup(input)[0][0].join('');
            }
            console.log(`Test lookup for "${transducerName}" with input "${input}":`, testResults);
        } catch (e) {
            console.warn(`Test lookup failed for transducer "${transducerName}":`, e);
        }

        return transducer;
    } catch (error) {
        console.error(`Error loading transducer ${transducerName}:`, error);
        return null;
    }
}

async function loadTokenizer(tokPath) {
    console.log(`Loading tokenizer/analyzer from ${tokPath}...`);
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
        console.log('    ...Tokenizer/analyzer loaded.');

        // Test: demonstrate the tokenizer/analyzer is functioning
        try {
            const testText = "работа";
            const testOutput = pmatchContainer.tokenize(testText, tokenizeSettings);
            console.log(`Test tokenize for tokenizer with input "работа":`, testOutput);
        } catch (e) {
            console.warn(`Test tokenize failed for tokenizer:`, e);
        }

        return pmatchContainer;
    } catch (error) {
        console.error('Error loading tokenizer/analyzer:', error);
        return null;
    }
}

async function handleMorphAnalysisRequest(text, context = {}) {
    if (!tokenizer) {
        throw new Error('Tokenizer/analyzer not initialized');
    }

    const requestContext = { ...context, input: text };
    const warnings = [];

    try {
        let ambigOutput;
        try {
            ambigOutput = tokenizer.tokenize(text, tokenizeSettings);
        } catch (error) {
            throw createWasmError('tokenization (HFST)', error, requestContext);
        }

        let ambigJsonl;
        try {
            ambigJsonl = await cgConv(ambigOutput, {
                input_format: 'cg',
                output_format: 'jsonl'
            });
        } catch (error) {
            throw createWasmError('format conversion (ambiguous)', error, { ...requestContext, input: ambigOutput });
        }
        const ambigArray = normalizeCohortArray(await jsonlToJsonArray(ambigJsonl));

        let disambigArray = ambigArray;
        try {
            const disambigOutput = await vislcg3(ambigOutput);
            const disambigJsonl = await cgConv(disambigOutput, {
                input_format: 'cg',
                output_format: 'jsonl'
            });
            disambigArray = normalizeCohortArray(await jsonlToJsonArray(disambigJsonl));
        } catch (error) {
            const cg3Error = createWasmError('disambiguation (CG3)', error, { ...requestContext, input: ambigOutput });
            warnings.push({
                type: 'cg3',
                stage: 'disambiguation (CG3)',
                message: cg3Error.message,
                sourceUrl: requestContext.sourceUrl || 'unknown',
                inputLength: ambigOutput.length
            });

        }

        return {
            "ambigArray": ambigArray,
            "disambigArray": disambigArray,
            ...(warnings.length ? { warnings } : {})
        };
    } catch (error) {
        // Re-throw if already a processed WASM error, otherwise wrap it
        if (error.message && error.message.includes('Check the offscreen console')) {
            throw error;
        }
        console.error('Error in tokenization/morphological analysis:', error);
        throw createWasmError('morphological analysis', error, requestContext);
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

// TODO: Compile a separate L2 tokenizer instead of using the standard one + L2 analyser.
function formatForCg3(token, analyses) {
    let output = `"<${token}>"\n`;
    const seen = new Set();

    for (const analysis of analyses) {
        const analysisString = analysis[0].join('');
        // analysisString is like "lemma+Tag+Tag"

        // Simple heuristic: split by '+'
        const parts = analysisString.split('+');
        const lemma = parts[0];
        const tags = parts.slice(1).map(t => t.replace(/^Err\/L2_/, 'Err/L2_')); // Ensure Err tags are preserved

        // Construct line: 	"lemma" Tag Tag
        const line = `\t"${lemma}" ${tags.join(' ')}`;

        if (!seen.has(line)) {
            output += line + '\n';
            seen.add(line);
        }
    }

    // If no analyses, add unknown tag?
    if (analyses.length === 0) {
        output += `\t"${token}"\n`;
    }

    return output;
}

async function analyzeL2(text) {
    if (!tokenizer || !l2Analyser || !generator || !cg3) {
        throw new Error('Tools not initialized');
    }

    // 1. Tokenize
    const tokenizedOutput = tokenizer.tokenize(text, tokenizeSettings);

    // Parse tokens from GiellaCG output
    const tokens = [];
    const lines = tokenizedOutput.split('\n');

    for (const line of lines) {
        const match = line.match(/^"<(.+)>"$/);
        if (match) {
            tokens.push(match[1]);
        }
    }

    // 2. Analyze each token with L2 analyzer and prepare CG3 input
    let cg3Input = '';

    for (const tokenText of tokens) {
        if (!tokenText) continue;

        const analyses = l2Analyser.lookup(tokenText);
        cg3Input += formatForCg3(tokenText, analyses);
    }

    // 3. Disambiguate with CG3
    let cg3Output = '';
    try {
        cg3Output = await vislcg3(cg3Input);
    } catch (e) {
        console.error("CG3 failed, falling back to raw analyses", e);
        cg3Output = cg3Input;
    }

    // 4. Parse CG3 output and generate corrections
    const results = [];
    const cg3Lines = cg3Output.split('\n');

    let currentToken = null;
    let currentReadings = [];

    for (const line of cg3Lines) {
        const tokenMatch = line.match(/^"<(.+)>"$/);
        if (tokenMatch) {
            if (currentToken) {
                results.push(await processTokenReadings(currentToken, currentReadings));
            }
            currentToken = tokenMatch[1];
            currentReadings = [];
        } else if (line.trim().startsWith('"')) {
            const readingMatch = line.match(/^\s*"([^"]+)"\s+(.*)$/);
            if (readingMatch) {
                const lemma = readingMatch[1];
                let tagsStr = readingMatch[2];
                tagsStr = tagsStr.replace(/<W:[^>]+>/g, '').trim();
                const tags = tagsStr.split(/\s+/);
                currentReadings.push({ lemma, tags });
            }
        }
    }
    if (currentToken) {
        results.push(await processTokenReadings(currentToken, currentReadings));
    }

    return results;
}

async function processTokenReadings(tokenText, readings) {
    // If any reading is valid (no error tags), then the word is considered correct.
    const hasValidReading = readings.some(r => !r.tags.some(t => t.startsWith('Err/')));
    if (hasValidReading) {
        return {
            text: tokenText,
            isError: false,
            errorData: null
        };
    }

    let isError = false;
    const errorData = [];
    const seenSignatures = new Set();

    // Load frequency dict
    const freqDict = await loadJson('Sharoff_lem_freq_dict');

    // Sort readings by frequency
    readings.sort((a, b) => {
        const freqA = freqDict[a.lemma] || 0;
        const freqB = freqDict[b.lemma] || 0;
        return freqB - freqA;
    });

    for (const reading of readings) {
        const l2ErrorTags = reading.tags.filter(t => t.startsWith('Err/'));

        if (l2ErrorTags.length > 0) {
            isError = true;

            const cleanTags = reading.tags.filter(t => !t.startsWith('Err/'));
            const cleanAnalysisString = `${reading.lemma}+${cleanTags.join('+')}`;

            let corrected = '???';
            try {
                const correctionResults = generator.lookup(cleanAnalysisString);
                if (correctionResults.length > 0) {
                    corrected = correctionResults[0][0].join('');
                }
            } catch (e) {
                console.error("Generation failed for", cleanAnalysisString);
            }

            // Deduplication signature: lemma + errorTags + corrected
            const sortedErrorTags = l2ErrorTags.slice().sort();
            const signature = `${reading.lemma}:${sortedErrorTags.join('+')}:${corrected}`;

            if (!seenSignatures.has(signature)) {
                seenSignatures.add(signature);
                errorData.push({
                    lemma: reading.lemma,
                    tags: cleanTags,
                    L2_error_tags: l2ErrorTags.map(t => t.replace('Err/L2_', '')),
                    corrected: corrected
                });
            }
        }
    }

    return {
        text: tokenText,
        isError: isError,
        errorData: isError ? errorData : null
    };
}

async function handleGenerateRequest(input, mode = 'default') {
    console.log(`Handling generation request with...\n\tinput=${input}\n\tmode=${mode}`);

    let transducer;
    switch (mode) {
        case 'stress':
            transducer = stressGenerator;
            break;
        case 'g2p':
            transducer = g2p;
            break;
        default:
            transducer = generator;
    }

    if (!transducer) {
        throw new Error(`Generator for mode '${mode}' not initialized`);
    }

    // Strip weight tags from input
    input = input.replace(/\+<W:[^>]+>/g, '').trim();

    try {
        const results = transducer.lookup(input);

        // Convert HFST results to array of strings
        const forms = [];
        for (const result of results) {
            let form = result[0].join('');
            forms.push(form);
        }
        console.log(`Generated forms:`, forms);
        return forms;
    } catch (error) {
        console.error('Error in generation:', error);
        throw error;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.target === 'offscreen' && request.action === 'morph_analysis') {
        (async () => {
            try {
                await initWasmTools();
                const context = { sourceUrl: request.sourceUrl || 'unknown' };
                const result = await handleMorphAnalysisRequest(request.text, context);
                sendResponse({ success: true, data: result });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Keep the message channel open for async response
    } else if (request.target === 'offscreen' && request.action === 'analyze_l2') {
        (async () => {
            try {
                await initWasmTools();
                const result = await analyzeL2(request.text);
                sendResponse({ success: true, data: result });
            } catch (error) {
                const context = { sourceUrl: request.sourceUrl || 'unknown', input: request.text };
                const wrappedError = createWasmError('L2 analysis', error, context);
                sendResponse({ success: false, error: wrappedError.message });
            }
        })();
        return true;
    } else if (request.target === 'offscreen' && request.action === 'generate') {
        (async () => {
            try {
                await initWasmTools();
                // Support legacy useStress param for backward compatibility
                const mode = request.mode || (request.useStress ? 'stress' : 'default');
                const result = await handleGenerateRequest(request.input, mode);
                sendResponse({ success: true, data: result });
            } catch (error) {
                const context = { sourceUrl: request.sourceUrl || 'unknown', input: request.input };
                const wrappedError = createWasmError('generation', error, context);
                sendResponse({ success: false, error: wrappedError.message });
            }
        })();
        return true; // Keep the message channel open for async response
    } else if (request.target === 'offscreen' && request.action === 'ping') {
        sendResponse({ success: true });
        return true;
    } else if (request.target === 'offscreen' && request.action === 'get_model_data') {
        (async () => {
            try {
                const model = await loadJson(request.modelName);
                if (request.key === 'all' || request.key === undefined) {
                    sendResponse({ success: true, data: model });
                } else {
                    const key = request.key;
                    const data = model[key];
                    sendResponse({ success: true, data: data });
                }
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }
});

initWasmTools();
