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
 * Places spans around text based on an array of segments in visible text nodes
 * under the given root, using DOM TreeWalker.
 * Each segment in segmentsArray is an object like {w: "word"} or {t: "text"}.
 * 'w' segments are wrapped in spans with class "ʁ<index>".
 * 't' segments are included as plain text.
 *
 * This function handles tokens that are interrupted by HTML tags by tracking partial
 * matches across text nodes and applying the same class to all parts of a split token.
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
    let partialMatch = null; // Track partial matches across text nodes

    // Process each text node
    textNodes.forEach((textNode) => {
        const originalNodeValue = textNode.nodeValue;
        const parent = textNode.parentNode;
        if (!parent) {
            console.warn("Text node has no parent, skipping:", textNode);
            return;
        }

        const newContentFragment = document.createDocumentFragment();
        let currentPosInNodeText = 0;
        let nodeWasModified = false;

        // Process this text node
        while (currentPosInNodeText < originalNodeValue.length) {
            // If we've processed all segments, append remaining text and exit
            if (segmentArrIdx >= segmentsArray.length) {
                newContentFragment.appendChild(
                    document.createTextNode(originalNodeValue.substring(currentPosInNodeText))
                );
                nodeWasModified = true;
                break;
            }

            // If we have a partial match in progress from a previous text node
            if (partialMatch) {
                const remainingToMatch = partialMatch.segmentStr.substring(partialMatch.matchedLength);
                const availableText = originalNodeValue.substring(currentPosInNodeText);

                // Calculate how much of the remaining segment matches in this text node
                let matchLength = 0;
                while (matchLength < remainingToMatch.length &&
                       matchLength < availableText.length &&
                       remainingToMatch[matchLength] === availableText[matchLength]) {
                    matchLength++;
                }

                // If we matched something in this text node
                if (matchLength > 0) {
                    const matchedText = availableText.substring(0, matchLength);

                    // Create a span for this part of the token if it's a word segment
                    if (partialMatch.isWordSegment) {
                        const span = document.createElement("span");
                        span.textContent = matchedText;
                        span.className = `ʁ${partialMatch.segmentIdx}`;
                        newContentFragment.appendChild(span);
                    } else {
                        newContentFragment.appendChild(document.createTextNode(matchedText));
                    }

                    // Update our position and the partial match state
                    currentPosInNodeText += matchLength;
                    partialMatch.matchedLength += matchLength;
                    nodeWasModified = true;

                    // If we've completed matching this segment
                    if (partialMatch.matchedLength === partialMatch.segmentStr.length) {
                        segmentArrIdx = partialMatch.segmentIdx + 1; // Move to next segment
                        partialMatch = null; // Reset partial match
                    }

                    // Continue to the next iteration (either next segment or more partial matching)
                    continue;
                } else {
                    // Failed to continue the partial match - reset and try normal matching
                    partialMatch = null;
                    // Don't advance currentPosInNodeText, we'll try to match this character normally
                }
            }

            // Try to match a new segment from the beginning
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
                // Invalid segment object, skip it
                console.warn("Invalid segment object:", segment);
                segmentArrIdx++;
                continue;
            }

            // Skip empty segments
            if (segmentStr === "") {
                segmentArrIdx++;
                continue;
            }

            const availableText = originalNodeValue.substring(currentPosInNodeText);

            // Try to match the segment with the available text
            // First, determine how much of the segment can be matched in this text node
            let matchLength = 0;
            while (matchLength < segmentStr.length &&
                   matchLength < availableText.length &&
                   segmentStr[matchLength] === availableText[matchLength]) {
                matchLength++;
            }

            // If we matched something
            if (matchLength > 0) {
                const matchedText = availableText.substring(0, matchLength);

                if (isWordSegment) {
                    const span = document.createElement("span");
                    span.textContent = matchedText;
                    span.className = `ʁ${segmentArrIdx}`;
                    newContentFragment.appendChild(span);
                } else {
                    newContentFragment.appendChild(document.createTextNode(matchedText));
                }

                currentPosInNodeText += matchLength;
                nodeWasModified = true;

                // If we matched the entire segment
                if (matchLength === segmentStr.length) {
                    segmentArrIdx++; // Move to next segment
                } else {
                    // Partial match - save state to continue in next text node
                    partialMatch = {
                        segmentIdx: segmentArrIdx,
                        segmentStr: segmentStr,
                        matchedLength: matchLength,
                        isWordSegment: isWordSegment
                    };
                }
            } else {
                // No match for this segment at current position
                // Output the current character as unsegmented text and advance
                newContentFragment.appendChild(
                    document.createTextNode(originalNodeValue[currentPosInNodeText])
                );
                currentPosInNodeText++;
                nodeWasModified = true;
            }
        }

        // Replace the original text node with our processed content
        if (nodeWasModified && newContentFragment.childNodes.length > 0) {
            parent.replaceChild(newContentFragment, textNode);
        }
    });
}


initHfst();
document.getElementById('btn-load-iframe').addEventListener('click', loadIframe);
document.getElementById('btn-process-iframe').addEventListener('click', processIframe);
