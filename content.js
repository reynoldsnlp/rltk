(function () {
    const TOOLBAR_HEIGHT = "50px";

    if (document.getElementById("rltk-toolbar")) {
        const toolbar = document.getElementById("rltk-toolbar");
        if (toolbar.style.display === "none") {
            toolbar.style.display = "block";
            document.body.style.marginTop = TOOLBAR_HEIGHT;
        } else {
            toolbar.style.display = "none";
            document.body.style.marginTop = "";
        }
        return;
    }

    // Inject CSS directly into the page
    const style = document.createElement('style');
    style.textContent = `
        .ʁ {
            background-color: rgba(255, 255, 0, 0.3);
            border-radius: 2px;
            padding: 1px;
        }
    `;
    document.head.appendChild(style);

    const toolbar = document.createElement("div");
    toolbar.id = "rltk-toolbar";
    toolbar.style.position = "fixed";
    toolbar.style.top = "0";
    toolbar.style.left = "0";
    toolbar.style.width = "100%";
    toolbar.style.height = TOOLBAR_HEIGHT;
    toolbar.style.backgroundColor = "#f9f9f9";
    toolbar.style.borderBottom = "1px solid #ccc";
    toolbar.style.display = "flex";
    toolbar.style.alignItems = "center";
    toolbar.style.padding = "0 10px";
    toolbar.style.zIndex = "999999"; // Ensure it sits on top of everything

    const highlightButton = document.createElement("button");
    highlightButton.id = "highlight-button";
    highlightButton.textContent = "Highlight";
    highlightButton.style.marginRight = "10px";
    toolbar.appendChild(highlightButton);

    document.body.insertBefore(toolbar, document.body.firstChild);

    // Add top margin to body to prevent content from being hidden behind toolbar
    document.body.style.marginTop = TOOLBAR_HEIGHT;

    /**
     * Shared function to determine if a node should be skipped during text processing
     */
    function shouldSkipNode(node) {
        if (!node) return true;

        // Skip the rltk-toolbar and its descendants
        let currentNode = node;
        while (currentNode) {
            if (currentNode.id === 'rltk-toolbar') {
                return true;
            }
            currentNode = currentNode.parentElement;
        }

        // Skip script and style elements
        const parent = node.parentElement;
        if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
            return true;
        }

        return false;
    }

    /**
     * Helper function to determine if an element should add a newline
     */
    function shouldAddNewline(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

        if (element.tagName === 'BR') return true;

        // Don't add newlines for certain elements that are typically inline or shouldn't break flow
        const noNewlineElements = new Set([
            'SPAN', 'A', 'STRONG', 'EM', 'B', 'I', 'CODE', 'SMALL', 'SUB', 'SUP'
        ]);

        if (noNewlineElements.has(element.tagName)) return false;

        // Add newlines for most block elements, but be selective
        const blockElements = new Set([
            'DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI',
            'BLOCKQUOTE', 'PRE', 'HR', 'TABLE', 'TR', 'TD', 'TH',
            'ARTICLE', 'SECTION', 'HEADER', 'FOOTER', 'NAV', 'ASIDE',
            'MAIN', 'FIGURE', 'FIGCAPTION', 'ADDRESS', 'DETAILS', 'SUMMARY',
            'OPTION', 'OPTGROUP'
        ]);

        return blockElements.has(element.tagName);
    }

    /**
     * Helper function to determine if we should add a newline before an element
     * based on its context and preceding content
     */
    function shouldAddNewlineBefore(element, plainText) {
        if (!shouldAddNewline(element)) return false;

        // Don't add newline if the last character is already whitespace
        if (plainText.length > 0 && /\s$/.test(plainText)) return false;

        // Special case: UL elements that contain headers might not need extra newlines
        if (element.tagName === 'UL') {
            const hasHeaderChild = element.querySelector('h1, h2, h3, h4, h5, h6');
            if (hasHeaderChild) return false;
        }

        return true;
    }

    /**
     * Two-phase highlighting implementation with position mapping
     * Phase 1: Extract plain text and build position maps
     * Phase 2: Use tokenization results with position maps to place spans
     */
    function highlightTextNodes(root, segmentsArray) {

        // Phase 1: Extract plain text and build position mappings
        const analysisResult = extractTextWithPositionMapping(root);
        const { plainText, positionMap, textNodes } = analysisResult;

        // Phase 2: Build token position mappings
        const tokenPositions = buildTokenPositions(segmentsArray, plainText);

        // Phase 3: Apply highlighting using position mappings
        applyHighlightingWithPositions(tokenPositions, positionMap, textNodes);

    }

    /**
     * Phase 1: Extract plain text while building position mappings
     * Returns: {plainText, positionMap, textNodes}
     */
    function extractTextWithPositionMapping(root) {
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            {
                acceptNode(node) {
                    if (shouldSkipNode(node)) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    // Accept text nodes and block elements that should add newlines
                    if (node.nodeType === Node.TEXT_NODE) {
                        return NodeFilter.FILTER_ACCEPT;
                    } else if (node.nodeType === Node.ELEMENT_NODE && shouldAddNewline(node)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }

                    return NodeFilter.FILTER_SKIP;
                }
            },
            false
        );

        let plainText = '';
        const positionMap = []; // Array of {plainTextStart, plainTextEnd, node, nodeStart, nodeEnd}
        const textNodes = [];

        let plainTextOffset = 0;

        while (walker.nextNode()) {
            const currentNode = walker.currentNode;

            if (currentNode.nodeType === Node.TEXT_NODE) {
                const nodeText = currentNode.nodeValue;

                textNodes.push(currentNode);

                positionMap.push({
                    plainTextStart: plainTextOffset,
                    plainTextEnd: plainTextOffset + nodeText.length,
                    node: currentNode,
                    nodeStart: 0,
                    nodeEnd: nodeText.length
                });

                plainText += nodeText;
                plainTextOffset += nodeText.length;
            } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
                // Add newline for block elements based on context
                if (shouldAddNewlineBefore(currentNode, plainText)) {
                    const newlineText = '\n';
                    plainText += newlineText;
                    plainTextOffset += newlineText.length;
                }
            }
        }

        return { plainText, positionMap, textNodes };
    }

    /**
     * Extract text using the same method as position mapping for consistency
     */
    function extractPlainText(root) {
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            {
                acceptNode(node) {
                    if (shouldSkipNode(node)) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    // Accept text nodes and block elements that should add newlines
                    if (node.nodeType === Node.TEXT_NODE) {
                        return NodeFilter.FILTER_ACCEPT;
                    } else if (node.nodeType === Node.ELEMENT_NODE && shouldAddNewline(node)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }

                    return NodeFilter.FILTER_SKIP;
                }
            },
            false
        );

        let plainText = '';
        while (walker.nextNode()) {
            const currentNode = walker.currentNode;

            if (currentNode.nodeType === Node.TEXT_NODE) {
                plainText += currentNode.nodeValue;
            } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
                // Add newline for block elements based on context
                if (shouldAddNewlineBefore(currentNode, plainText)) {
                    plainText += '\n';
                }
            }
        }
        return plainText;
    }

    /**
     * Phase 2: Build token positions from segments and plain text
     */
    function buildTokenPositions(segmentsArray, plainText) {
        const tokenPositions = [];
        let currentOffset = 0;

        for (let i = 0; i < segmentsArray.length; i++) {
            const segment = segmentsArray[i];
            let segmentText = '';
            let isWordSegment = false;

            if (segment.w !== undefined) {
                segmentText = segment.w;
                isWordSegment = true;
            } else if (segment.t !== undefined) {
                // Remove tPrefix if present
                segmentText = segment.t.startsWith(':') ? segment.t.substring(1) : segment.t;
                isWordSegment = false;
            } else {
                console.warn('Invalid segment at index', i);
                continue;
            }

            if (segmentText === '') {
                continue;
            }

            const segmentStart = plainText.indexOf(segmentText, currentOffset);

            if (segmentStart === -1) {
                console.warn(`Could not find segment "${segmentText}" at offset ${currentOffset}`);
                // Try to recover by searching from the beginning
                const fallbackStart = plainText.indexOf(segmentText, 0);
                if (fallbackStart !== -1 && fallbackStart >= currentOffset) {
                    currentOffset = fallbackStart;
                } else {
                    continue; // Skip this segment
                }
            } else {
                currentOffset = segmentStart;
            }

            const segmentEnd = currentOffset + segmentText.length;

            if (isWordSegment) {
                tokenPositions.push({
                    start: currentOffset,
                    end: segmentEnd,
                    text: segmentText,
                    segmentIndex: i
                });
            }

            currentOffset = segmentEnd;
        }

        return tokenPositions;
    }

    /**
     * Phase 3: Apply highlighting using position mappings
     */
    function applyHighlightingWithPositions(tokenPositions, positionMap, textNodes) {
        // Group tokens by the text nodes they span
        const nodeModifications = new Map(); // node -> array of modifications

        for (const token of tokenPositions) {
            const affectedMappings = positionMap.filter(mapping =>
                mapping.plainTextStart < token.end && mapping.plainTextEnd > token.start
            );

            for (const mapping of affectedMappings) {
                // Calculate the portion of the token that falls within this text node
                const tokenStartInNode = Math.max(0, token.start - mapping.plainTextStart);
                const tokenEndInNode = Math.min(mapping.nodeEnd, token.end - mapping.plainTextStart);

                if (tokenEndInNode > tokenStartInNode) {
                    if (!nodeModifications.has(mapping.node)) {
                        nodeModifications.set(mapping.node, []);
                    }

                    nodeModifications.get(mapping.node).push({
                        start: tokenStartInNode,
                        end: tokenEndInNode,
                        segmentIndex: token.segmentIndex
                    });
                }
            }
        }

        for (const [textNode, modifications] of nodeModifications) {
            // Sort modifications by start position (descending) to apply from end to beginning
            modifications.sort((a, b) => b.start - a.start);

            const parent = textNode.parentNode;
            if (!parent) continue;

            const originalText = textNode.nodeValue;
            const fragment = document.createDocumentFragment();
            let lastPos = originalText.length;

            // Apply modifications from end to beginning
            for (const mod of modifications) {
                if (lastPos > mod.end) {
                    fragment.insertBefore(
                        document.createTextNode(originalText.substring(mod.end, lastPos)),
                        fragment.firstChild
                    );
                }

                const span = document.createElement('span');
                span.className = `ʁ ʁ${mod.segmentIndex}`;
                span.textContent = originalText.substring(mod.start, mod.end);
                fragment.insertBefore(span, fragment.firstChild);

                lastPos = mod.start;
            }

            if (lastPos > 0) {
                fragment.insertBefore(
                    document.createTextNode(originalText.substring(0, lastPos)),
                    fragment.firstChild
                );
            }

            parent.replaceChild(fragment, textNode);
        }
    }

    highlightButton.onclick = async function () {
        try {
            // Use document.body directly with skip function to avoid toolbar
            const bodyText = extractPlainText(document.body);

            const response = await chrome.runtime.sendMessage({
                action: 'tokenize',
                text: bodyText
            });

            if (response.success) {
                // Use the new robust implementation
                highlightTextNodes(document.body, response.data);
                // To test the old implementation instead, uncomment the line below:
                // highlightTextNodes(document.body, response.data);
            } else {
                console.error('Tokenization failed:', response.error);
            }
        } catch (error) {
            console.error('Error:', error.message);
        }
    }

})();
