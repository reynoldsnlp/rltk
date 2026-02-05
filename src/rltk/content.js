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

            // In the future, some activities may use ambigArray, but for now
            // we assume disambigArray
            const cohortArray = cohortArrays.disambigArray;

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
                try {
                    const selectionOnly = request.selectionOnly === true;
                    const selectionRange = selectionOnly ? getSelectionRangeIfAny() : null;
                    const rangeForUse = selectionOnly ? selectionRange : null;

                    const bodyText = extractPlainText(document.body, rangeForUse);

                    chrome.runtime.sendMessage({
                        action: 'morph_analysis',
                        text: bodyText
                    }).then(async response => {
                        if (response.success) {
                            const { selections } = request;

                            // Check if the requested topic is implemented
                            if (!window.FilterFuncs || !window.FilterFuncs[selections.topic]) {
                                alert(`Topic "${selections.topic}" is not implemented yet.`);
                                sendResponse({ success: false, error: `Topic "${selections.topic}" not implemented` });
                                return;
                            }

                            // Check if the requested filter is implemented
                            if (!window.SubFilterFuncs || !window.SubFilterFuncs[selections.filter]) {
                                alert(`Filter "${selections.filter}" is not implemented yet.`);
                                sendResponse({ success: false, error: `Filter "${selections.filter}" not implemented` });
                                return;
                            }

                            try {
                                // Create the appropriate activity using the factory
                                const activity = window.ActivityFactory.createActivity(selections);

                                // Initialize any resources needed by the activity
                                await activity.prepare();

                                // Use the unified highlighting function
                                highlightTextNodesWithActivity(document.body, response.data, activity, rangeForUse);
                                sendResponse({ success: true });
                            } catch (error) {
                                console.error('Error creating activity:', error);
                                sendResponse({ success: false, error: error.message });
                            }
                        } else {
                            console.error('Morphological analysis failed:', response.error);
                            sendResponse({ success: false, error: response.error });
                        }
                    }).catch(error => {
                        console.error('Error:', error.message);
                        sendResponse({ success: false, error: error.message });
                    });
                } catch (error) {
                    console.error('Error:', error.message);
                    sendResponse({ success: false, error: error.message });
                }
                return true; // Keep message channel open for async response

            case 'abort':
                // Handle abort functionality if needed
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

})();
