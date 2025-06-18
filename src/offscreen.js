let hfst = null;
let cg3 = null;
let cg3GrammarString = null;
const cg3GrammarPath = '/disambiguator.cg3'; // wasm FS path for default CG3 grammar
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
    tokenizeSettings.output_format = 5; // CG=3, GIELLACG=5, VISL=7, JSONL=8
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

    // Retrieve the CG3 grammar string from src/resources/models/disambiguator.cg3
    const response = await fetch(chrome.runtime.getURL('src/resources/models/disambiguator.cg3'));
    cg3GrammarString = await response.text();
    cg3.FS.writeFile(cg3GrammarPath, cg3GrammarString, { encoding: 'utf8' });
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
        const ambigOutput = tokenizer.tokenize(text, tokenizeSettings);
        const ambigJsonl = await cgConv(ambigOutput, {
            input_format: 'cg',
            output_format: 'jsonl'
        });
        const ambigArray = await jsonlToJsonArray(ambigJsonl);

        const disambigOutput = await vislcg3(ambigOutput);
        const disambigJsonl = await cgConv(disambigOutput, {
            input_format: 'cg',
            output_format: 'jsonl'
        });
        const disambigArray = await jsonlToJsonArray(disambigJsonl);

        return {
            "ambigArray": ambigArray,
            "disambigArray": disambigArray
        };
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
    console.log(`Handling generation request with...\n\tinput=${input}\n\tuseStress=${useStress}`);

    const transducer = useStress ? stressGenerator : generator;
    if (!transducer) {
        throw new Error(`${useStress ? 'Stress generator' : 'Generator'} not initialized`);
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
