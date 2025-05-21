let hfst;
let tokenizer = null;
let tokenizeSettings;


async function initHfst() {
    console.log('Loading HFST module...');
    await createHfstModule().then(async (hfstModule) => {
        hfst = hfstModule;
        console.log('    ...HFST module loaded as `hfst`');

        // Initialize tokenize settings once
        tokenizeSettings = hfst.getDefaultTokenizeSettings();
        tokenizeSettings.output_format = 8; // JSONL
        tokenizeSettings.print_all = true;
        tokenizeSettings.print_weights = true;
        tokenizeSettings.dedupe = true;
        tokenizeSettings.hack_uncompose = true;
        console.log('Tokenize settings:', tokenizeSettings);

        tokenizer = await loadTokenizer("static/old-tokeniser-disamb-gt-desc.pmhfst");
    });
}


async function loadTokenizer(tokPath) {
    console.log(`Loading tokenizer from ${tokPath}...`);
    try {
        const response = await fetch(tokPath);
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


function loadIframe(){
    console.log('Loading iframe...');
    const iframe = document.getElementById('iframe');
    let url = document.getElementById('urlInput').value.trim();
    if (!url) {
        url = `index.html`;
    }
    console.log('Loading iframe with URL:', url);
    iframe.src = url;
}


async function processIframe() {
    let resultsObj = null;
    iframe = document.getElementById('iframe');
    iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const text = iframeDoc.body.innerText;;
    console.log('Processing iframe content:', text);
    const resultsDiv = document.getElementById('results');

    try {
        const results = tokenizer.tokenize(text, tokenizeSettings);
        console.log('Tokenization raw results:', results);
        // convert JSONL string to object
        resultsObj = await jsonlToJsonArray(results);
        console.log(`results (${text}):`, resultsObj);
    } catch (error) {
        console.error('Error in tokenization:', error);
    }
    highlightTextNodes(iframeDoc.body, resultsObj);
}


async function jsonlToJsonArray(jsonlString) {
  const lines = jsonlString.trim().split('\n');
  const jsonArray = [];

  for (const line of lines) {
    try {
      const jsonObject = JSON.parse(line);
      jsonArray.push(jsonObject);
    } catch (error) {
      console.error(`Error parsing JSON line: ${line}`, error);
    }
  }
  return jsonArray;
}


/**
 * Highlights text based on an array of segments in visible text nodes
 * under the given root, using DOM TreeWalker.
 * Each segment in segmentsArray is an object like {w: "word"} or {t: "text"}.
 * 'w' segments are wrapped in a span with id "ℋ<index>".
 * 't' segments are included as plain text.
 */
function highlightTextNodes(root, segmentsArray, tPrefix = ":") {
    // Create a tree walker that visits only text nodes
    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                // If it's empty or whitespace only, skip it
                if (!node.nodeValue.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            },
        },
        false
    );

    // Collect all relevant text nodes
    const textNodes = [];
    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }

    let segmentArrIdx = 0; // Current index in the segmentsArray

    textNodes.forEach((textNode) => {
        const originalNodeValue = textNode.nodeValue;
        const parent = textNode.parentNode;
        if (!parent) {
            // Should not happen for nodes from a live DOM and TreeWalker
            console.warn("Text node has no parent, skipping:", textNode);
            return;
        }

        const newContentFragment = document.createDocumentFragment();
        let currentPosInNodeText = 0;
        let nodeWasModified = false;

        while (currentPosInNodeText < originalNodeValue.length) {
            if (segmentArrIdx >= segmentsArray.length) {
                // All segments processed, append the rest of the current text node as is
                if (currentPosInNodeText < originalNodeValue.length) {
                    newContentFragment.appendChild(
                        document.createTextNode(originalNodeValue.substring(currentPosInNodeText))
                    );
                    nodeWasModified = true;
                }
                break; // Exit while loop for this text node
            }

            const segment = segmentsArray[segmentArrIdx];
            let segmentStr = "";
            let isWordSegment = false;

            if (segment.w !== undefined) {
                segmentStr = segment.w;
                isWordSegment = true;
            } else if (segment.t !== undefined) {
                const rawTValue = segment.t;
                if (tPrefix && rawTValue.startsWith(tPrefix)) {
                    segmentStr = rawTValue.substring(tPrefix.length);
                } else {
                    segmentStr = rawTValue;
                }
                isWordSegment = false;
            } else {
                // Invalid segment object, skip it and move to the next
                console.warn("Invalid segment object:", segment);
                segmentArrIdx++;
                continue;
            }

            // Skip empty segments (e.g. if segment.t was exactly tPrefix)
            if (segmentStr === "") {
                segmentArrIdx++;
                continue;
            }

            if (originalNodeValue.substring(currentPosInNodeText).startsWith(segmentStr)) {
                // Current segment matches at the current position in the text node
                if (isWordSegment) {
                    const span = document.createElement("span");
                    span.textContent = segmentStr;
                    span.id = `ℋ${segmentArrIdx}`;
                    newContentFragment.appendChild(span);
                } else {
                    newContentFragment.appendChild(document.createTextNode(segmentStr));
                }
                currentPosInNodeText += segmentStr.length;
                segmentArrIdx++;
                nodeWasModified = true;
            } else {
                // Mismatch: segmentStr is not at originalNodeValue[currentPosInNodeText...]

                // Default mismatch handling:
                // The character originalNodeValue[currentPosInNodeText] is unsegmented text
                // (i.e., not part of the current segmentStr at this position).
                // Output this character as plain text, advance currentPosInNodeText, and
                // then retry the *same* segment (segmentArrIdx is not changed here)
                // at the new position in originalNodeValue.
                newContentFragment.appendChild(
                    document.createTextNode(originalNodeValue[currentPosInNodeText])
                );
                currentPosInNodeText++;
                nodeWasModified = true;
            }
        }

        if (nodeWasModified && newContentFragment.childNodes.length > 0) {
            parent.replaceChild(newContentFragment, textNode);
        }
    });
}


initHfst();
document.getElementById('btn-load-iframe').addEventListener('click', loadIframe);
document.getElementById('btn-process-iframe').addEventListener('click', processIframe);
