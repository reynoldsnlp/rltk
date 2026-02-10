/**
 * Content Script for RLTK Extension
 *
 * This script is injected into web pages to perform text analysis and enhancement.
 * It handles:
 * 1. Extracting text from the DOM while preserving structure.
 * 2. Communicating with the background script to request morphological analysis.
 * 3. Applying highlighting and interactive elements to the text based on analysis results.
 * 4. Managing user interactions with enhanced text (clicks, tooltips).
 */

(function () {
    // Reading Tutor State
    let isReadingTutorActive = false;
    let selectionDebounceTimer = null;
    let enhanceAbortToken = 0;
    let readingTutorBatchState = {
        cohortCounts: [],
        totalBatches: 0
    };
    let analysisIssueToken = 0;
    let analysisIssueSent = false;

    function isEnhanceAborted(token) {
        return token !== enhanceAbortToken;
    }

    function getCohortArray(cohortArrays) {
        if (!cohortArrays) return [];
        const normalizeArray = (arr) => arr.map((cohort) => {
            if (cohort && cohort.rs === undefined) {
                if (Array.isArray(cohort.r)) {
                    cohort.rs = cohort.r;
                } else if (Array.isArray(cohort.readings)) {
                    cohort.rs = cohort.readings;
                }
            }
            if (cohort && cohort.w === undefined) {
                if (typeof cohort.t === 'string') {
                    cohort.w = cohort.t;
                } else if (typeof cohort.word === 'string') {
                    cohort.w = cohort.word;
                }
            }
            return cohort;
        });

        if (Array.isArray(cohortArrays.disambigArray) && cohortArrays.disambigArray.length > 0) {
            return normalizeArray(cohortArrays.disambigArray);
        }
        if (Array.isArray(cohortArrays.ambigArray) && cohortArrays.ambigArray.length > 0) {
            return normalizeArray(cohortArrays.ambigArray);
        }
        if (Array.isArray(cohortArrays)) {
            return normalizeArray(cohortArrays);
        }
        return [];
    }

    function resetAnalysisIssueState() {
        analysisIssueToken = Date.now();
        analysisIssueSent = false;
        return analysisIssueToken;
    }

    function inferAnalysisIssueType(message) {
        if (!message) return 'unknown';
        const lower = String(message).toLowerCase();
        if (lower.includes('cg3') || lower.includes('disambiguation')) return 'cg3';
        if (lower.includes('hfst') || lower.includes('tokenization')) return 'hfst';
        return 'pipeline';
    }

    function notifyAnalysisIssue(details, token = analysisIssueToken) {
        if (!chrome.runtime?.id) return;
        if (analysisIssueSent && token === analysisIssueToken) return;
        analysisIssueSent = true;

        const payload = {
            action: 'analysis_error',
            details: {
                sourceUrl: details.sourceUrl || window.location.href || 'unknown',
                errorType: details.errorType || details.type || inferAnalysisIssueType(details.message || details.errorMessage),
                stage: details.stage || 'morphological analysis',
                message: details.message || details.errorMessage || 'Analysis failed',
                errorMessage: details.errorMessage || details.message || 'Analysis failed',
                timestamp: details.timestamp || new Date().toISOString()
            }
        };

        try {
            chrome.runtime.sendMessage(payload).catch(() => {});
        } catch (e) {
            // Ignore messaging errors
        }
    }

    function hasNonEmptySelection() {
        try {
            const selection = window.getSelection();
            return !!selection && !selection.isCollapsed && selection.toString().trim().length > 0;
        } catch (e) {
            return false;
        }
    }

    function notifySelectionState() {
        if (!chrome.runtime?.id) return;
        const hasSelection = hasNonEmptySelection();
        try {
            chrome.runtime.sendMessage({ action: 'selection_state', hasSelection }).catch(() => {});
        } catch (e) {
            // Ignore extension context invalidated errors
        }
    }

    /**
     * Shared function to determine if a node should be skipped during text processing
     */
    function shouldSkipNode(node) {
        if (!node) return true;

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
     * Regex to match Cyrillic characters (Russian and extended Cyrillic)
     */
    const CYRILLIC_REGEX = /[\u0400-\u04FF]/;

    /**
     * Maximum text length per batch for WASM processing.
     * This helps prevent memory errors on very long pages.
     * Set conservatively to avoid WASM crashes.
     */
    const BATCH_TEXT_THRESHOLD = 10000; // ~10KB of text per batch

    /**
     * Block elements that serve as safe batch boundaries.
     * CG3 rules virtually never cross these boundaries.
     */
    const BATCH_BOUNDARY_TAGS = new Set([
        'DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
        'ARTICLE', 'SECTION', 'MAIN', 'ASIDE',
        'BLOCKQUOTE', 'PRE', 'LI', 'TR',
        'FIGURE', 'FIGCAPTION', 'DETAILS'
    ]);

    /**
     * Find the lowest common ancestor (LCA) of all text nodes containing Cyrillic characters.
     * This optimizes text extraction by focusing only on the relevant portion of the DOM.
     *
     * @param {Element} root - The root element to search within
     * @returns {Element} - The LCA element, or root if no Cyrillic text found
     */
    function findCyrillicLCA(root) {
        // Collect all text nodes containing Cyrillic characters
        const cyrillicTextNodes = [];
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
                    if (CYRILLIC_REGEX.test(node.nodeValue)) return NodeFilter.FILTER_ACCEPT;
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        while (walker.nextNode()) {
            cyrillicTextNodes.push(walker.currentNode);
        }

        // No Cyrillic text found - return root as fallback
        if (cyrillicTextNodes.length === 0) {
            return root;
        }

        // Single text node - return its parent element
        if (cyrillicTextNodes.length === 1) {
            return cyrillicTextNodes[0].parentElement || root;
        }

        // Find LCA of all Cyrillic text nodes
        // Start with the parent of the first text node as the candidate LCA
        let lca = cyrillicTextNodes[0].parentElement;
        if (!lca) return root;

        for (let i = 1; i < cyrillicTextNodes.length; i++) {
            const node = cyrillicTextNodes[i];
            // Walk up from node until we find an ancestor that contains the current LCA
            // or walk up from LCA until it contains the node
            while (lca && !lca.contains(node)) {
                lca = lca.parentElement;
            }
            if (!lca) return root;
        }

        return lca || root;
    }

    /**
     * Find the nearest ancestor that is a batch boundary element.
     */
    function findBatchBoundaryAncestor(node) {
        let current = node.parentElement;
        while (current && current !== document.body) {
            if (BATCH_BOUNDARY_TAGS.has(current.tagName)) {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    }

    /**
     * Extract text in batches based on block element boundaries.
     * Each batch contains text from consecutive block elements up to the threshold.
     *
     * @param {Element} root - The root element to extract from
     * @param {Range|null} selectionRange - Optional selection range to limit extraction
     * @returns {Array<{elements: Element[], text: string, positionMap: Array, textNodes: Array}>}
     */
    function extractTextInBatches(root, selectionRange) {
        const batches = [];
        let currentBatch = {
            elements: [],
            text: '',
            positionMap: [],
            textNodes: [],
            plainTextOffset: 0
        };
        // Walk through all text nodes and group them by batch boundary ancestors
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            {
                acceptNode(node) {
                    if (shouldSkipNode(node)) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    if (selectionRange) {
                        try {
                            if (!selectionRange.intersectsNode(node)) {
                                return node.nodeType === Node.TEXT_NODE ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
                            }
                        } catch (e) {
                            // If intersectsNode fails, fall back to including the node.
                        }
                    }

                    if (node.nodeType === Node.TEXT_NODE) {
                        return NodeFilter.FILTER_ACCEPT;
                    } else if (node.nodeType === Node.ELEMENT_NODE && shouldAddNewline(node)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }

                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        let lastBoundaryElement = null;

        while (walker.nextNode()) {
            const currentNode = walker.currentNode;

            if (currentNode.nodeType === Node.TEXT_NODE) {
                const nodeText = currentNode.nodeValue;

                let sliceStart = 0;
                let sliceEnd = nodeText.length;

                if (selectionRange) {
                    if (currentNode === selectionRange.startContainer) {
                        sliceStart = selectionRange.startOffset;
                    }
                    if (currentNode === selectionRange.endContainer) {
                        sliceEnd = Math.min(sliceEnd, selectionRange.endOffset);
                    }
                }

                if (sliceEnd <= sliceStart) continue;

                const clippedText = nodeText.substring(sliceStart, sliceEnd);

                // Check if we should start a new batch
                const boundaryElement = findBatchBoundaryAncestor(currentNode);
                const boundaryChanged = boundaryElement && boundaryElement !== lastBoundaryElement;
                const wouldExceedThreshold = currentBatch.text.length + clippedText.length > BATCH_TEXT_THRESHOLD;

                // Start new batch if we've crossed ANY boundary and have enough content,
                // OR if we're about to exceed threshold at a boundary
                const shouldStartNewBatch = currentBatch.text.length > 0 && boundaryChanged && wouldExceedThreshold;

                if (shouldStartNewBatch) {
                    // Finalize current batch if it has Cyrillic content
                    if (CYRILLIC_REGEX.test(currentBatch.text)) {
                        batches.push({
                            elements: currentBatch.elements,
                            text: currentBatch.text,
                            positionMap: currentBatch.positionMap,
                            textNodes: currentBatch.textNodes
                        });
                    }

                    // Start new batch
                    currentBatch = {
                        elements: [],
                        text: '',
                        positionMap: [],
                        textNodes: [],
                        plainTextOffset: 0
                    };
                }

                if (boundaryElement && !currentBatch.elements.includes(boundaryElement)) {
                    currentBatch.elements.push(boundaryElement);
                }
                lastBoundaryElement = boundaryElement;

                // Add to current batch
                currentBatch.textNodes.push(currentNode);
                currentBatch.positionMap.push({
                    plainTextStart: currentBatch.plainTextOffset,
                    plainTextEnd: currentBatch.plainTextOffset + clippedText.length,
                    node: currentNode,
                    nodeStart: sliceStart,
                    nodeEnd: sliceEnd - sliceStart
                });

                currentBatch.text += clippedText;
                currentBatch.plainTextOffset += clippedText.length;

            } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
                // Add newline for block elements
                if (shouldAddNewlineBefore(currentNode, currentBatch.text)) {
                    currentBatch.text += '\n';
                    currentBatch.plainTextOffset += 1;
                }
            }
        }

        // Add final batch if it has content
        if (currentBatch.text.length > 0 && CYRILLIC_REGEX.test(currentBatch.text)) {
            batches.push({
                elements: currentBatch.elements,
                text: currentBatch.text,
                positionMap: currentBatch.positionMap,
                textNodes: currentBatch.textNodes
            });
        }

        return batches;
    }

    /**
     * Highlight a single batch with pre-extracted position mapping.
     * Used by batch processing to apply highlights incrementally.
     *
     * @param {Object} batch - Batch object with text, positionMap, textNodes
     * @param {Object} cohortArrays - Analysis results from WASM
     * @param {Object} activity - Activity instance for highlighting logic
     * @param {number} cohortIndexOffset - Offset to add to cohort indices for global tracking
     * @returns {number} - Number of cohorts processed in this batch
     */
    function highlightBatch(batch, cohortArrays, activity, cohortIndexOffset = 0) {
        const { text: plainText, positionMap, textNodes } = batch;

        const cohortArray = getCohortArray(cohortArrays);

        // Build token positions using the batch's position map
        const tokenPositions = buildTokenPositionsForBatch(
            cohortArrays,
            plainText,
            positionMap,
            activity,
            cohortIndexOffset
        );

        // Apply highlighting
        applyHighlightingWithPositions(tokenPositions, positionMap, textNodes, activity);

        // Return the number of cohorts in this batch for index tracking
        return cohortArray.length;
    }

    /**
     * Build token positions for a batch, similar to buildTokenPositionsWithActivity
     * but without the allowed-roots logic (batches are pre-filtered).
     */
    function buildTokenPositionsForBatch(cohortArrays, plainText, positionMap, activity, cohortIndexOffset) {
        const tokenPositions = [];
        let currentOffset = 0;

        const cohortArray = getCohortArray(cohortArrays);
        if (!cohortArray.length) return tokenPositions;

        for (let i = 0; i < cohortArray.length; i++) {
            const cohort = cohortArray[i];

            if (cohort.w === undefined) continue;

            const cohortToken = cohort.w;
            if (cohortToken === '') continue;

            const cohortStart = plainText.indexOf(cohortToken, currentOffset);
            if (cohortStart === -1) continue;

            currentOffset = cohortStart;
            const cohortEnd = currentOffset + cohortToken.length;

            // Global cohort index for consistent tracking across batches
            const globalCohortIndex = cohortIndexOffset + i;

            if (activity.shouldHighlightToken(cohort, globalCohortIndex)) {
                tokenPositions.push({
                    start: currentOffset,
                    end: cohortEnd,
                    text: cohortToken,
                    cohortIndex: globalCohortIndex,
                    cohort: cohort
                });
            }

            currentOffset = cohortEnd;
        }

        return tokenPositions;
    }

    /**
     * Two-phase highlighting implementation with position mapping
     * Phase 1: Extract plain text and build position maps
     * Phase 2: Use morph analysis results with position maps to place spans
     */
    function highlightTextNodesWithActivity(root, cohortArrays, activity, selectionRange) {
        // Phase 1: Extract plain text and build position mappings
        const analysisResult = extractTextWithPositionMapping(root, selectionRange);
        const { plainText, positionMap, textNodes } = analysisResult;

        // Phase 2: Build token position mappings using activity logic
        const tokenPositions = buildTokenPositionsWithActivity(cohortArrays, plainText, positionMap, activity, selectionRange);

        // Phase 3: Apply highlighting using position mappings
        applyHighlightingWithPositions(tokenPositions, positionMap, textNodes, activity);
    }

    /**
     * Phase 1: Extract plain text while building position mappings
     * Returns: {plainText, positionMap, textNodes}
     */
    function extractTextWithPositionMapping(root, selectionRange) {
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            {
                acceptNode(node) {
                    if (shouldSkipNode(node)) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    if (selectionRange) {
                        try {
                            if (!selectionRange.intersectsNode(node)) {
                                return node.nodeType === Node.TEXT_NODE ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
                            }
                        } catch (e) {
                            // If intersectsNode fails for some reason, fall back to including the node.
                        }
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

                let sliceStart = 0;
                let sliceEnd = nodeText.length;

                if (selectionRange) {
                    if (currentNode === selectionRange.startContainer) {
                        sliceStart = selectionRange.startOffset;
                    }
                    if (currentNode === selectionRange.endContainer) {
                        sliceEnd = Math.min(sliceEnd, selectionRange.endOffset);
                    }
                }

                if (sliceEnd <= sliceStart) continue;

                const clippedText = nodeText.substring(sliceStart, sliceEnd);

                textNodes.push(currentNode);

                positionMap.push({
                    plainTextStart: plainTextOffset,
                    plainTextEnd: plainTextOffset + clippedText.length,
                    node: currentNode,
                    nodeStart: sliceStart,
                    nodeEnd: sliceEnd - sliceStart
                });

                plainText += clippedText;
                plainTextOffset += clippedText.length;
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
    function extractPlainText(root, selectionRange) {
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            {
                acceptNode(node) {
                    if (shouldSkipNode(node)) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    if (selectionRange) {
                        try {
                            if (!selectionRange.intersectsNode(node)) {
                                return node.nodeType === Node.TEXT_NODE ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
                            }
                        } catch (e) {}
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
                const nodeText = currentNode.nodeValue;
                let sliceStart = 0;
                let sliceEnd = nodeText.length;

                if (selectionRange) {
                    if (currentNode === selectionRange.startContainer) {
                        sliceStart = selectionRange.startOffset;
                    }
                    if (currentNode === selectionRange.endContainer) {
                        sliceEnd = Math.min(sliceEnd, selectionRange.endOffset);
                    }
                }

                if (sliceEnd > sliceStart) {
                    plainText += nodeText.substring(sliceStart, sliceEnd);
                }
            } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
                // Add newline for block elements based on context
                if (shouldAddNewlineBefore(currentNode, plainText)) {
                    plainText += '\n';
                }
            }
        }
        return plainText;
    }

    function computeTextHash(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash |= 0;
        }
        return `${hash >>> 0}:${text.length}`;
    }

    /**
     * Phase 2: Build token positions from cohorts and plain text
     */
    function buildTokenPositionsWithActivity(cohortArrays, plainText, positionMap, activity, selectionRange) {
        // Precompute allowed roots for targeting heuristics.
        //
        // READING TUTOR vs READING ACTIVITIES:
        // - Reading Tutor always processes the ENTIRE page (including header/nav/footer)
        //   so users can click on any word to see translations and grammar tables.
        // - Reading Activities focus annotations within <main>/<article> to avoid
        //   distracting users with exercises in navigation chrome.
        //
        // FALLBACK BEHAVIOR for Reading Activities:
        // If <main>/<article> contains less than 1/3 of the page's text, we assume the
        // page doesn't use semantic markup properly and fall back to the whole document
        // (still excluding obvious chrome like header/nav/footer).
        const allowedRoots = Array.from(document.querySelectorAll('main, article'));
        const hasAllowedRoots = allowedRoots.length > 0;
        const blacklistRe = /(header|footer|nav|menu|sidebar|toolbar|masthead|breadcrumb)/i;
        // 1/3 threshold: if main/article has less than a third of the text, assume poor semantic markup
        const FALLBACK_MIN_TEXT_RATIO = 1 / 3;
        // Reading Tutor and Explore activity intentionally process the whole page
        const applyChromeBlacklist = !(activity && (activity.topic === 'reading-tutor' || activity.activity === 'explore'));

        function isNodeAllowed(textNode, enforceAllowedRoots) {
            if (selectionRange) return true;
            const el = textNode && textNode.parentElement;
            if (!el) return true;

            if (applyChromeBlacklist) {
                let cur = el;
                while (cur && cur !== document.body) {
                    if (cur.tagName === 'HEADER' || cur.tagName === 'FOOTER' || cur.tagName === 'NAV') {
                        return false;
                    }
                    const idClass = `${cur.id || ''} ${cur.className || ''}`;
                    if (blacklistRe.test(idClass)) {
                        return false;
                    }
                    cur = cur.parentElement;
                }
            }

            if (hasAllowedRoots && enforceAllowedRoots) {
                return allowedRoots.some(root => root.contains(el));
            }
            return true;
        }

        function getTextLength(enforceAllowedRoots) {
            let total = 0;
            for (const mapping of positionMap) {
                if (isNodeAllowed(mapping.node, enforceAllowedRoots)) {
                    total += (mapping.plainTextEnd - mapping.plainTextStart);
                }
            }
            return total;
        }

        function buildTokenPositions(enforceAllowedRoots) {
            const tokenPositions = [];
            let currentOffset = 0;

            // Reset TokenSelector so selection starts fresh for this run
            window.RLTKUtils.TokenSelector.reset();

            const cohortArray = getCohortArray(cohortArrays);
            if (!cohortArray.length) return tokenPositions;

            for (let i = 0; i < cohortArray.length; i++) {
                const cohort = cohortArray[i];

                // Only process word cohorts
                if (cohort.w === undefined) continue;

                const cohortToken = cohort.w;
                if (cohortToken === '') continue;

                const cohortStart = plainText.indexOf(cohortToken, currentOffset);
                if (cohortStart === -1) continue;

                currentOffset = cohortStart;
                const cohortEnd = currentOffset + cohortToken.length;

                // Find the text-node mapping that covers this token start to apply DOM heuristics
                const coveringMap = positionMap.find(m => cohortStart >= m.plainTextStart && cohortStart < m.plainTextEnd);
                if (coveringMap && !isNodeAllowed(coveringMap.node, enforceAllowedRoots)) {
                    currentOffset = cohortEnd;
                    continue;
                }

                // Use the activity's logic to determine if this token should be highlighted
                // Pass cohort index so activities can use TokenSelector
                if (activity.shouldHighlightToken(cohort, i)) {
                    tokenPositions.push({
                        start: currentOffset,
                        end: cohortEnd,
                        text: cohortToken,
                        cohortIndex: i,
                        cohort: cohort
                    });
                }

                currentOffset = cohortEnd;
            }

            return tokenPositions;
        }

        const primaryEnforceAllowedRoots = !(activity && (activity.topic === 'reading-tutor' || activity.activity === 'explore'));
        const primary = buildTokenPositions(primaryEnforceAllowedRoots);

        if (hasAllowedRoots && !selectionRange && primaryEnforceAllowedRoots) {
            const totalTextLength = Math.max(1, positionMap.reduce((sum, m) => sum + (m.plainTextEnd - m.plainTextStart), 0));
            const primaryTextLength = getTextLength(true);
            const coverageRatio = primaryTextLength / totalTextLength;

            if (coverageRatio < FALLBACK_MIN_TEXT_RATIO) {
                const fallback = buildTokenPositions(false);
                return fallback.length > primary.length ? fallback : primary;
            }
        }

        return primary;
    }

    /**
     * Phase 3: Apply highlighting using position mappings
     */
    function applyHighlightingWithPositions(tokenPositions, positionMap, textNodes, activity) {
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
                        start: tokenStartInNode + (mapping.nodeStart || 0),
                        end: tokenEndInNode + (mapping.nodeStart || 0),
                        cohortIndex: token.cohortIndex,
                        cohort: token.cohort
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

                const originalTokenText = originalText.substring(mod.start, mod.end);

                // Use the activity's createSpan method
                const span = activity.createSpan(originalTokenText, mod.cohort, mod.cohortIndex);

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

    /**
     * Cleans up all extension-injected elements and styles.
     */
    function cleanup() {
        // Remove injected styles
        const mainStyles = document.getElementById('rltk-main-styles');
        if (mainStyles) mainStyles.remove();

        const explorerStyles = document.getElementById('rltk-reading-tutor-styles');
        if (explorerStyles) explorerStyles.remove();

        // Remove all highlighting by removing spans with ʁ class
        document.querySelectorAll('.ʁ').forEach(span => {
            const parent = span.parentNode;
            if (parent) {
                // Use stored original text if available, otherwise fall back to textContent
                const originalText = span.dataset.originalText || span.textContent;
                parent.replaceChild(document.createTextNode(originalText), span);
                parent.normalize();
            }
        });

        if (window.RootsSummaryUtils && typeof window.RootsSummaryUtils.reset === 'function') {
            window.RootsSummaryUtils.reset();
        }
    }

    // Check for extension context invalidation (orphan state)
    const orphanCheckInterval = setInterval(() => {
        try {
            // Accessing runtime.id throws if the extension context is invalidated
            if (!chrome.runtime?.id) {
                throw new Error("Extension context invalidated");
            }
        } catch (e) {
            clearInterval(orphanCheckInterval);
            cleanup();
        }
    }, 1000);

    function getSelectionRangeIfAny() {
        try {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
            const rangeText = selection.toString();
            if (!rangeText || !rangeText.trim()) return null;
            return selection.getRangeAt(0).cloneRange();
        } catch (e) {
            return null;
        }
    }

        function sendRootsSummaryIfReady(selections) {
            if (!selections || selections.topic !== 'roots' || selections.activity !== 'color') return;
            if (!window.RootsSummaryUtils || typeof window.RootsSummaryUtils.getSummary !== 'function') return;
            const summary = window.RootsSummaryUtils.getSummary();
            try {
                chrome.runtime.sendMessage({ action: 'roots_summary', summary });
            } catch (e) {
                // Ignore messaging errors
            }
        }

    // Listen for messages from side panel or other extension components
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case 'ping':
                sendResponse({ loaded: true });
                break;

            case 'get_status':
                // Check if the page is currently enhanced
                const isEnhanced = document.querySelectorAll('.ʁ').length > 0;
                sendResponse({ success: true, isEnhanced: isEnhanced });
                break;

            case 'get_reading_tutor_status': {
                const count = document.querySelectorAll('.ʁ-reading-tutor').length;
                sendResponse({ success: true, count: count });
                break;
            }

            case 'get_reading_tutor_vocabulary': {
                const spans = Array.from(document.querySelectorAll('.ʁ-reading-tutor'));
                const lemmaMap = new Map();
                const hasCyrillic = /[\u0400-\u04FF]/;
                const hasNonLetters = /[^\p{L}\p{M}]/u;
                let includedTokens = 0;

                spans.forEach((span) => {
                    let lemma = null;
                    const readingsRaw = span.getAttribute('data-readings');
                    if (readingsRaw) {
                        try {
                            const readings = JSON.parse(readingsRaw);
                            if (Array.isArray(readings) && readings.length > 0) {
                                const best = readings.find(r => r && r.l) || readings[0];
                                lemma = best && (best.l || best.lemma);
                            }
                        } catch (e) {
                            // ignore parse errors
                        }
                    }

                    if (!lemma) {
                        lemma = (span.textContent || '').trim();
                    }

                    if (!lemma) return;

                    if (!hasCyrillic.test(lemma) || hasNonLetters.test(lemma)) {
                        return;
                    }

                    includedTokens += 1;

                    const key = lemma.toLowerCase();
                    const existing = lemmaMap.get(key);
                    if (existing) {
                        existing.count += 1;
                    } else {
                        lemmaMap.set(key, { lemma, count: 1 });
                    }
                });

                sendResponse({
                    success: true,
                    totalTokens: includedTokens,
                    items: Array.from(lemmaMap.values())
                });
                break;
            }

            case 'get_text_hash': {
                try {
                    const text = extractPlainText(document.body, null);
                    const hash = computeTextHash(text || '');
                    sendResponse({ success: true, hash: hash });
                } catch (e) {
                    sendResponse({ success: false, error: e.message });
                }
                break;
            }

            case 'enhance':
                {
                    const abortToken = enhanceAbortToken;
                    const analysisIssueId = resetAnalysisIssueState();
                    const { selections } = request;
                    window.RLTKAnalysisContext = window.RLTKAnalysisContext || {};
                    window.RLTKAnalysisContext.cg3Failed = false;
                    const testWarningType = document.documentElement?.dataset?.rltkTestAnalysisWarning;
                    if (testWarningType) {
                        if (testWarningType === 'cg3') {
                            window.RLTKAnalysisContext.cg3Failed = true;
                        }
                        notifyAnalysisIssue({
                            type: testWarningType,
                            stage: 'diagnostic warning',
                            message: document.documentElement?.dataset?.rltkTestAnalysisWarningMessage || 'Diagnostic warning injected for tests.',
                            sourceUrl: window.location.href,
                            errorType: testWarningType
                        }, analysisIssueId);
                    }
                    const selectionOnly = request.selectionOnly === true;
                    const selectionRange = selectionOnly ? getSelectionRangeIfAny() : null;
                    const rangeForUse = selectionOnly ? selectionRange : null;

                    // Validate topic and filter before any processing
                    if (!window.FilterFuncs || !window.FilterFuncs[selections.topic]) {
                        alert(`Topic "${selections.topic}" is not implemented yet.`);
                        sendResponse({ success: false, error: `Topic "${selections.topic}" not implemented` });
                        return false;
                    }
                    if (!window.SubFilterFuncs || !window.SubFilterFuncs[selections.filter]) {
                        alert(`Filter "${selections.filter}" is not implemented yet.`);
                        sendResponse({ success: false, error: `Filter "${selections.filter}" not implemented` });
                        return false;
                    }

                    // Find the lowest common ancestor of all Cyrillic text to reduce processing scope
                    const cyrillicRoot = rangeForUse ? document.body : findCyrillicLCA(document.body);

                    // Extract plain text first to determine if we need batching
                    const bodyText = extractPlainText(cyrillicRoot, rangeForUse);
                    const isLargePage = bodyText.length > BATCH_TEXT_THRESHOLD;

                    if (isLargePage) {
                        // Send immediate response to avoid message channel timeout, then process in background
                        sendResponse({ success: true, batching: true });

                        (async () => {
                            try {
                                if (isEnhanceAborted(abortToken)) return;
                                // Create and prepare the activity upfront
                                const activity = window.ActivityFactory.createActivity(selections);
                                await activity.prepare();

                                if (isEnhanceAborted(abortToken)) return;

                                if (window.RLTKUtils && window.RLTKUtils.TokenSelector) {
                                    window.RLTKUtils.TokenSelector.reset();
                                }

                                const batches = extractTextInBatches(cyrillicRoot, rangeForUse);
                                const isReadingTutor = selections && selections.topic === 'reading-tutor';
                                let resumeFromBatch = Number(request.resumeFromBatch || 0);
                                if (!isReadingTutor || !resumeFromBatch) {
                                    readingTutorBatchState = {
                                        cohortCounts: [],
                                        totalBatches: batches.length
                                    };
                                    resumeFromBatch = 0;
                                } else if (readingTutorBatchState.totalBatches !== batches.length) {
                                    readingTutorBatchState = {
                                        cohortCounts: [],
                                        totalBatches: batches.length
                                    };
                                    resumeFromBatch = 0;
                                }

                                const updateBatchProgressAttributes = (progress) => {
                                    if (!document || !document.documentElement) return;
                                    const root = document.documentElement;
                                    root.dataset.rltkBatchTotal = String(progress.total ?? 0);
                                    root.dataset.rltkBatchProcessed = String(progress.processed ?? 0);
                                    root.dataset.rltkBatchFailed = String(progress.failed ?? 0);
                                    root.dataset.rltkBatchCompleted = String(!!progress.completed);
                                    notifyReadingTutorBatchProgress({
                                        total: progress.total ?? 0,
                                        processed: progress.processed ?? 0,
                                        failed: progress.failed ?? 0,
                                        completed: !!progress.completed,
                                        aborted: !!progress.aborted
                                    });
                                };

                                const batchProgress = {
                                    total: batches.length,
                                    processed: resumeFromBatch,
                                    failed: 0,
                                    completed: false,
                                    startedAt: Date.now()
                                };
                                updateBatchProgressAttributes(batchProgress);

                                // Process batches sequentially with error recovery
                                let cohortIndexOffset = 0;
                                const cohortCounts = Array.isArray(readingTutorBatchState.cohortCounts)
                                    ? readingTutorBatchState.cohortCounts
                                    : [];
                                if (resumeFromBatch > 0 && cohortCounts.length >= resumeFromBatch) {
                                    cohortIndexOffset = cohortCounts.slice(0, resumeFromBatch)
                                        .reduce((sum, count) => sum + Number(count || 0), 0);
                                }
                                let successfulBatches = 0;
                                let failedBatches = 0;

                                for (let batchIndex = resumeFromBatch; batchIndex < batches.length; batchIndex++) {
                                    if (isEnhanceAborted(abortToken)) break;
                                    const batch = batches[batchIndex];

                                    try {
                                        const response = await chrome.runtime.sendMessage({
                                            action: 'morph_analysis',
                                            text: batch.text,
                                            sourceUrl: window.location.href
                                        });

                                        if (isEnhanceAborted(abortToken)) break;

                                        if (response.success) {
                                            if (response.data && Array.isArray(response.data.warnings) && response.data.warnings.length > 0) {
                                                const warning = response.data.warnings[0];
                                                if (warning.type === 'cg3') {
                                                    window.RLTKAnalysisContext.cg3Failed = true;
                                                }
                                                notifyAnalysisIssue({
                                                    ...warning,
                                                    sourceUrl: window.location.href,
                                                    errorType: warning.type || 'cg3'
                                                }, analysisIssueId);
                                            }
                                            try {
                                                if (isEnhanceAborted(abortToken)) break;
                                                const cohortsProcessed = highlightBatch(batch, response.data, activity, cohortIndexOffset);
                                                cohortIndexOffset += cohortsProcessed;
                                                if (isReadingTutor) {
                                                    cohortCounts[batchIndex] = cohortsProcessed;
                                                }
                                                successfulBatches++;
                                                batchProgress.processed = resumeFromBatch + successfulBatches + failedBatches;
                                                updateBatchProgressAttributes(batchProgress);
                                            } catch (highlightError) {
                                                console.error(`[RLTK] Batch ${batchIndex + 1}/${batches.length} highlight error:`, highlightError.message);
                                                failedBatches++;
                                                batchProgress.failed = failedBatches;
                                                batchProgress.processed = resumeFromBatch + successfulBatches + failedBatches;
                                                updateBatchProgressAttributes(batchProgress);
                                                cohortIndexOffset += Math.floor(batch.text.length / 5);
                                            }
                                        } else {
                                            console.error(`[RLTK] Batch ${batchIndex + 1}/${batches.length} analysis failed:`, response.error);
                                            notifyAnalysisIssue({
                                                errorMessage: response.error,
                                                message: response.error,
                                                sourceUrl: window.location.href,
                                                errorType: inferAnalysisIssueType(response.error)
                                            }, analysisIssueId);
                                            failedBatches++;
                                            batchProgress.failed = failedBatches;
                                            batchProgress.processed = resumeFromBatch + successfulBatches + failedBatches;
                                            updateBatchProgressAttributes(batchProgress);
                                            cohortIndexOffset += Math.floor(batch.text.length / 5);
                                        }
                                    } catch (batchError) {
                                        console.error(`[RLTK] Batch ${batchIndex + 1}/${batches.length} unexpected error:`, batchError.message);
                                        failedBatches++;
                                        batchProgress.failed = failedBatches;
                                        batchProgress.processed = resumeFromBatch + successfulBatches + failedBatches;
                                        updateBatchProgressAttributes(batchProgress);
                                        cohortIndexOffset += Math.floor(batch.text.length / 5);
                                    }

                                }

                                const wasAborted = isEnhanceAborted(abortToken);

                                if (isReadingTutor) {
                                    readingTutorBatchState.cohortCounts = cohortCounts;
                                    readingTutorBatchState.totalBatches = batches.length;
                                }

                                batchProgress.processed = resumeFromBatch + successfulBatches + failedBatches;
                                batchProgress.failed = failedBatches;
                                batchProgress.completed = true;
                                batchProgress.aborted = wasAborted;
                                batchProgress.completedAt = Date.now();
                                updateBatchProgressAttributes(batchProgress);
                                sendRootsSummaryIfReady(selections);
                            } catch (error) {
                                console.error('Batch processing error:', error.message);
                                const failedProgress = {
                                    total: 0,
                                    processed: 0,
                                    failed: 1,
                                    completed: true,
                                    startedAt: Date.now(),
                                    completedAt: Date.now()
                                };
                                updateBatchProgressAttributes(failedProgress);
                            }
                        })();

                        return false;
                    }

                    (async () => {
                        try {
                            if (isEnhanceAborted(abortToken)) {
                                sendResponse({ success: false, error: 'aborted' });
                                return;
                            }
                            const slowEnhanceMs = Number(document.documentElement?.dataset?.rltkTestSlowEnhance || 0);
                            if (slowEnhanceMs > 0) {
                                await new Promise(resolve => setTimeout(resolve, slowEnhanceMs));
                            }
                            // Create and prepare the activity upfront
                            const activity = window.ActivityFactory.createActivity(selections);
                            await activity.prepare();

                            if (isEnhanceAborted(abortToken)) {
                                sendResponse({ success: false, error: 'aborted' });
                                return;
                            }

                            const response = await chrome.runtime.sendMessage({
                                action: 'morph_analysis',
                                text: bodyText,
                                sourceUrl: window.location.href
                            });

                            if (isEnhanceAborted(abortToken)) {
                                sendResponse({ success: false, error: 'aborted' });
                                return;
                            }

                            if (response.success) {
                                if (response.data && Array.isArray(response.data.warnings) && response.data.warnings.length > 0) {
                                    const warning = response.data.warnings[0];
                                    if (warning.type === 'cg3') {
                                        window.RLTKAnalysisContext.cg3Failed = true;
                                    }
                                    notifyAnalysisIssue({
                                        ...warning,
                                        sourceUrl: window.location.href,
                                        errorType: warning.type || 'cg3'
                                    }, analysisIssueId);
                                }
                                highlightTextNodesWithActivity(cyrillicRoot, response.data, activity, rangeForUse);
                                sendRootsSummaryIfReady(selections);
                                sendResponse({ success: true });
                            } else {
                                console.error('Morphological analysis failed:', response.error);
                                notifyAnalysisIssue({
                                    errorMessage: response.error,
                                    message: response.error,
                                    sourceUrl: window.location.href,
                                    errorType: inferAnalysisIssueType(response.error)
                                }, analysisIssueId);
                                sendResponse({ success: false, error: response.error });
                            }
                        } catch (error) {
                            console.error('Error:', error.message);
                            notifyAnalysisIssue({
                                errorMessage: error.message,
                                message: error.message,
                                sourceUrl: window.location.href,
                                errorType: inferAnalysisIssueType(error.message)
                            }, analysisIssueId);
                            sendResponse({ success: false, error: error.message });
                        }
                    })();

                    return true; // Keep message channel open for async response
                }

            case 'abort':
                enhanceAbortToken += 1;
                sendResponse({ success: true });
                break;

            case 'restore':
                cleanup();
                sendResponse({ success: true });
                break;

            case 'get_selection_state':
                sendResponse({ success: true, hasSelection: hasNonEmptySelection() });
                break;

            case 'update_grammar_highlighter_styles':
                let style = document.getElementById('rltk-grammar-highlighter-styles');
                if (!style) {
                    style = document.createElement('style');
                    style.id = 'rltk-grammar-highlighter-styles';
                    document.head.appendChild(style);
                }
                style.textContent = request.css;
                sendResponse({ success: true });
                break;

            case 'clear_reading_tutor_selection':
                document.querySelectorAll('.ʁ-reading-tutor').forEach(el => el.classList.remove('ʁ-highlighted'));
                sendResponse({ success: true });
                break;

            case 'restore_reading_tutor_selection':
                if (request.index !== undefined && request.index !== null) {
                    const el = document.querySelector(`.ʁ${request.index}`);
                    if (el) {
                        el.classList.add('ʁ-highlighted');
                    }
                }
                sendResponse({ success: true });
                break;

            case 'set_token_selector_min_distance':
                if (window.RLTKUtils && window.RLTKUtils.TokenSelector && request.value !== undefined) {
                    window.RLTKUtils.TokenSelector.setMinDistance(Number(request.value));
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: 'TokenSelector unavailable' });
                }
                break;

            case 'set_span_click_override':
                forceSpanClickOverride = !!request.enabled;
                applySpanClickGuards(document);
                if (forceSpanClickOverride) {
                    applySpanClickOverrideStyles(document);
                } else {
                    resetAllSpanClickOverrides(document);
                }
                sendResponse({ success: true });
                break;

            case 'reading_tutor_watch':
                if (request.enabled) {
                    startReadingTutorObserver();
                } else {
                    stopReadingTutorObserver();
                }
                sendResponse({ success: true });
                break;

            case 'reading_tutor_ack_refresh':
                readingTutorLastHash = computeReadingTutorHash();
                sendResponse({ success: true });
                break;

            // case 'set_grammar_explorer_active':
            //     isGrammarExplorerActive = request.active;
            //     sendResponse({ success: true });
            //     break;

            default:
                // Handle unknown actions
                console.warn('Unknown action:', request.action);
                sendResponse({ success: false, error: 'Unknown action' });
                break;
        }
    });

    /**
     * Helper function to send generation requests to offscreen
     */
    async function generateForms(input, modeOrUseStress = 'default') {
        try {
            // Handle legacy boolean argument
            let mode = modeOrUseStress;
            if (typeof modeOrUseStress === 'boolean') {
                mode = modeOrUseStress ? 'stress' : 'default';
            }

            const response = await chrome.runtime.sendMessage({
                target: 'offscreen',
                action: 'generate',
                input: input,
                mode: mode
            });

            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Error generating forms:', error);
            throw error;
        }
    }

    // Make the function globally available
    window.generateForms = generateForms;

    document.addEventListener('selectionchange', () => {
        clearTimeout(selectionDebounceTimer);
        selectionDebounceTimer = setTimeout(notifySelectionState, 150);
    });

    let readingTutorObserver = null;
    let readingTutorObserverEnabled = false;
    let readingTutorMutationTimer = null;
    let readingTutorLastHash = null;
    let readingTutorForceDirty = false;

    function isRltkElement(node) {
        if (!(node instanceof Element)) return false;
        if (node.id && node.id.startsWith('rltk-')) return true;
        if (node.classList.contains('ʁ')) return true;
        for (const className of node.classList) {
            if (className.startsWith('rltk-') || className.startsWith('ʁ-')) {
                return true;
            }
        }
        if (node.closest('.ʁ')) return true;
        if (node.closest('[id^="rltk-"]')) return true;
        return false;
    }

    function isRltkNode(node) {
        if (!node) return false;
        if (node.nodeType === Node.TEXT_NODE) {
            return isRltkElement(node.parentElement);
        }
        return isRltkElement(node);
    }

    function isRltkMutation(mutation) {
        if (!mutation) return false;
        if (mutation.type === 'attributes' || mutation.type === 'characterData') {
            return isRltkNode(mutation.target);
        }
        if (mutation.type === 'childList') {
            if (isRltkNode(mutation.target)) return true;
            const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
            if (nodes.length === 0) return false;
            return nodes.every(node => isRltkNode(node));
        }
        return false;
    }

    function hasUnanalyzedCyrillicText(node) {
        if (!node) return false;
        if (node.nodeType === Node.TEXT_NODE) {
            if (isRltkNode(node)) return false;
            return CYRILLIC_REGEX.test(node.nodeValue || '');
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return false;
        if (isRltkElement(node)) return false;
        const walker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(textNode) {
                    if (shouldSkipNode(textNode)) return NodeFilter.FILTER_REJECT;
                    const parent = textNode.parentElement;
                    if (parent && (isRltkElement(parent) || parent.closest('.ʁ'))) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (CYRILLIC_REGEX.test(textNode.nodeValue || '')) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );
        return !!walker.nextNode();
    }

    function mutationAffectsUnanalyzedCyrillic(mutation) {
        if (!mutation) return false;
        if (mutation.type === 'characterData' || mutation.type === 'attributes') {
            return hasUnanalyzedCyrillicText(mutation.target);
        }
        if (mutation.type === 'childList') {
            const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
            if (nodes.some(node => hasUnanalyzedCyrillicText(node))) return true;
            return hasUnanalyzedCyrillicText(mutation.target);
        }
        return false;
    }

    function computeReadingTutorHash() {
        const text = document.body ? (document.body.textContent || '') : '';
        const normalized = text.replace(/\s+/g, ' ').trim();
        return computeTextHash(normalized);
    }

    function notifyReadingTutorDirty(hash) {
        if (!chrome.runtime?.id) return;
        try {
            chrome.runtime.sendMessage({ action: 'reading_tutor_dirty', hash }).catch(() => {});
        } catch (e) {
            // ignore
        }
    }

    function notifyReadingTutorBatchProgress(progress) {
        if (!chrome.runtime?.id) return;
        try {
            chrome.runtime.sendMessage({ action: 'reading_tutor_batch_progress', progress }).catch(() => {});
        } catch (e) {
            // ignore
        }
    }

    function scheduleReadingTutorDirtyCheck() {
        if (!readingTutorObserverEnabled) return;
        if (readingTutorMutationTimer) {
            clearTimeout(readingTutorMutationTimer);
        }
        readingTutorMutationTimer = setTimeout(() => {
            if (!readingTutorObserverEnabled) return;
            const nextHash = computeReadingTutorHash();
            if (!readingTutorLastHash) {
                readingTutorLastHash = nextHash;
                readingTutorForceDirty = false;
                return;
            }
            if (readingTutorForceDirty) {
                readingTutorLastHash = nextHash;
                readingTutorForceDirty = false;
                notifyReadingTutorDirty(nextHash);
                return;
            }
            if (nextHash && nextHash !== readingTutorLastHash) {
                readingTutorLastHash = nextHash;
                notifyReadingTutorDirty(nextHash);
            }
        }, 600);
    }

    function startReadingTutorObserver() {
        if (readingTutorObserver) return;
        readingTutorObserverEnabled = true;
        readingTutorLastHash = computeReadingTutorHash();
        readingTutorObserver = new MutationObserver((mutations) => {
            let hasRelevantMutation = false;
            for (const mutation of mutations) {
                if (isRltkMutation(mutation)) {
                    continue;
                }
                if (!mutationAffectsUnanalyzedCyrillic(mutation)) {
                    continue;
                }
                hasRelevantMutation = true;
                if (mutation.type === 'attributes') {
                    readingTutorForceDirty = true;
                }
            }
            if (hasRelevantMutation) {
                scheduleReadingTutorDirtyCheck();
            }
        });
        readingTutorObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'hidden', 'aria-expanded']
        });
    }

    function stopReadingTutorObserver() {
        readingTutorObserverEnabled = false;
        if (readingTutorObserver) {
            readingTutorObserver.disconnect();
            readingTutorObserver = null;
        }
        if (readingTutorMutationTimer) {
            clearTimeout(readingTutorMutationTimer);
            readingTutorMutationTimer = null;
        }
    }

    let forceSpanClickOverride = false;

    function getInteractiveAncestor(span) {
        if (!(span instanceof Element)) return null;
        return span.closest('a, button, [role="button"], [role="link"]');
    }

    function applySpanClickOverride(span) {
        const ancestor = getInteractiveAncestor(span);
        if (!ancestor) return;

        if (!ancestor.__rltkOverrideCount) {
            ancestor.__rltkOverrideCount = 0;
            ancestor.__rltkPointerEventsBackup = ancestor.style.pointerEvents;
        }

        ancestor.__rltkOverrideCount += 1;
        ancestor.style.pointerEvents = 'none';
        span.style.pointerEvents = 'auto';
        span.__rltkOverrideApplied = true;
    }

    function removeSpanClickOverride(span) {
        if (!span.__rltkOverrideApplied) return;
        const ancestor = getInteractiveAncestor(span);
        if (ancestor && ancestor.__rltkOverrideCount) {
            ancestor.__rltkOverrideCount -= 1;
            if (ancestor.__rltkOverrideCount <= 0) {
                ancestor.style.pointerEvents = ancestor.__rltkPointerEventsBackup || '';
                ancestor.__rltkOverrideCount = 0;
            }
        }
        span.style.pointerEvents = '';
        span.__rltkOverrideApplied = false;
    }

    function shouldGuardSpanClick(span) {
        return forceSpanClickOverride || !!span.__rltkTranscriptSpanGuard;
    }

    function attachSpanClickGuard(span) {
        if (!(span instanceof Element)) return;
        if (span.__rltkSpanClickGuardInstalled) return;
        span.__rltkSpanClickGuardInstalled = true;
        span.addEventListener('click', (event) => {
            if (shouldGuardSpanClick(span)) {
                event.stopPropagation();
                if (forceSpanClickOverride) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }
            }
        });
    }

    function applySpanClickGuards(root = document) {
        if (!root || typeof root.querySelectorAll !== 'function') return;
        root.querySelectorAll('.ʁ').forEach(attachSpanClickGuard);
    }

    function applySpanClickOverrideStyles(root = document) {
        if (!root || typeof root.querySelectorAll !== 'function') return;
        root.querySelectorAll('.ʁ').forEach(span => {
            if (!(span instanceof Element)) return;
            if (forceSpanClickOverride) {
                applySpanClickOverride(span);
            } else {
                removeSpanClickOverride(span);
            }
        });
    }

    function resetAllSpanClickOverrides(root = document) {
        if (!root || typeof root.querySelectorAll !== 'function') return;
        const nodes = root.querySelectorAll('*');
        nodes.forEach(node => {
            if (!(node instanceof Element)) return;
            if (node.__rltkOverrideCount) {
                node.style.pointerEvents = node.__rltkPointerEventsBackup || '';
                node.__rltkOverrideCount = 0;
            }
        });
        root.querySelectorAll('.ʁ').forEach(span => {
            if (!(span instanceof Element)) return;
            span.style.pointerEvents = '';
            span.__rltkOverrideApplied = false;
        });
    }

    function installSpanClickGuardObserver() {
        if (document.__rltkSpanGuardObserver) return;
        applySpanClickGuards(document);

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                    if (!(node instanceof Element)) return;
                    if (node.classList && node.classList.contains('ʁ')) {
                        attachSpanClickGuard(node);
                        if (forceSpanClickOverride) {
                            applySpanClickOverride(node);
                        }
                        return;
                    }
                    applySpanClickGuards(node);
                    if (forceSpanClickOverride) {
                        applySpanClickOverrideStyles(node);
                    }
                });
            }
        });

        document.__rltkSpanGuardObserver = observer;
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    function findYouTubeTranscriptRoot() {
        return document.querySelector('ytd-transcript-renderer');
    }

    function installYouTubeTranscriptGuards() {
        const root = findYouTubeTranscriptRoot();
        if (!root) {
            if (!document.__rltkTranscriptRootObserver) {
                const observer = new MutationObserver(() => {
                    const found = findYouTubeTranscriptRoot();
                    if (found) {
                        observer.disconnect();
                        document.__rltkTranscriptRootObserver = null;
                        installYouTubeTranscriptGuards();
                    }
                });
                document.__rltkTranscriptRootObserver = observer;
                observer.observe(document.documentElement, { childList: true, subtree: true });
            }
            return;
        }

        if (root.__rltkTranscriptGuardInstalled) return;

        root.__rltkTranscriptGuardInstalled = true;

        const markTranscriptSpans = () => {
            const spans = root.querySelectorAll('.ʁ');
            spans.forEach(span => {
                if (!(span instanceof Element)) return;
                span.__rltkTranscriptSpanGuard = true;
                attachSpanClickGuard(span);
            });
        };

        markTranscriptSpans();

        const observer = new MutationObserver(() => markTranscriptSpans());
        observer.observe(root, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installSpanClickGuardObserver, { once: true });
        document.addEventListener('DOMContentLoaded', installYouTubeTranscriptGuards, { once: true });
    } else {
        installSpanClickGuardObserver();
        installYouTubeTranscriptGuards();
    }

})();
