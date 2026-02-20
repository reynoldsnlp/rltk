/**
 * Side Panel UI Logic for RLTK Extension
 *
 * This script manages the user interface in the side panel.
 * It handles:
 * 1. User interactions (selecting topics, filters, activities).
 * 2. Communicating with the background script to trigger page enhancement.
 * 3. Managing the state of the UI (buttons, loading indicators).
 * 4. Persisting user selections per tab.
 * 5. Handling permission requests and access checks.
 */

class RussianToolsSidePanel {
    constructor() {
        this.activitySelectors = {};
        this.isProcessing = false;
        this.freqDict = null;
        this.pageEnhanced = false;
        this.readingTutorRestoreHash = null;
        this.readingTutorValidationHash = null;
        this.lastReadingTutorSelectionHash = null;
        this.readingTutorPollTimer = null;
        this.readingTutorInstructionsDismissed = false;
        this.lastReadingTutorSelectionIndex = null;
        this.lastReadingTutorSelectionData = null;
        this.lastEnhancement = null;
        this.minDistanceKey = 'rltk_token_selector_minDistance';
        this.defaultMinDistance = 5;
        this.lastSavedMinDistance = null;
        this.tabStateHandlers = [];
        this.tabStateHandlersInitialized = false;
        this.isApplyingTabState = false;
        this.saveStateTimer = null;
        this.grammarHighlighterState = { activeTags: [], ignoreAmbiguity: false };
        this.lastWritingInput = '';
        this.lastWritingTokens = null;
        this.lastWritingSelectedErrorIndex = null;
        this.tabAccessCache = new Map();
        this.tabSwitchToken = 0;
        this.processingContext = null;
        this.readingTutorActivationToken = 0;
        this.lastRootsSummary = null;
        this.spanClickOverride = false;
        this.readingTutorDirty = false;
        this.readingTutorProcessing = false;
        this.readingTutorPaused = false;
        this.readingTutorAutoRefreshTimer = null;
        this.readingTutorBatchInProgress = false;
        this.readingTutorBatchProgress = null;
        this.analysisWarning = null;
        this.vocabularyState = {
            rows: [],
            sortKey: 'keyness',
            sortDir: 'desc',
            totalTokens: 0
        };
        this.freqDictTotal = null;

        const urlParams = new URLSearchParams(window.location.search);
        this.debugTabId = urlParams.get('debugTabId') ? parseInt(urlParams.get('debugTabId')) : null;

        this.currentTabId = null;
        this.hasSelection = false;
        this.userHasInteracted = false;
        this.operationLock = Promise.resolve();
        this.lastReadingTutorSubTab = 'translations-and-tables';

        this.init();
    }

    async runExclusive(fn) {
        const currentLock = this.operationLock;
        let releaseLock;
        this.operationLock = new Promise(resolve => releaseLock = resolve);

        try {
            await currentLock;
            await fn();
        } finally {
            releaseLock();
        }
    }

    /**
     * Returns a user-friendly error message if the error is from the language processing pipeline,
     * otherwise returns null.
     */
    getLanguageProcessingErrorMessage(errorMessage) {
        const processingErrorPatterns = [
            'Processing failed',
            'WASM',
            'memory',
            'tokenization',
            'disambiguation',
            'vislcg3',
            'cgConv',
            'Morphological analysis failed'
        ];
        const isProcessingError = processingErrorPatterns.some(pattern =>
            errorMessage.toLowerCase().includes(pattern.toLowerCase())
        );
        if (isProcessingError) {
            return 'The language analysis failed because of a technical error. If this problem persists, and especially if it affects multiple web pages,please contact robert_reynolds@byu.edu';
        }
        return null;
    }

    inferAnalysisWarningType(message, explicitType) {
        if (explicitType) return explicitType;
        const lower = String(message || '').toLowerCase();
        if (lower.includes('cg3') || lower.includes('disambiguation')) return 'cg3';
        if (lower.includes('hfst') || lower.includes('tokenization')) return 'hfst';
        return 'pipeline';
    }

    normalizeAnalysisWarning(details = {}, sender) {
        const message = details.message || details.errorMessage || 'Analysis failed.';
        const type = this.inferAnalysisWarningType(message, details.errorType || details.type);
        return {
            errorType: type,
            stage: details.stage || 'morphological analysis',
            message,
            sourceUrl: details.sourceUrl || sender?.tab?.url || 'unknown',
            timestamp: details.timestamp || new Date().toISOString()
        };
    }

    buildAnalysisWarningSummary(details) {
        if (details.errorType === 'cg3') {
            return 'We couldn’t finish disambiguating the text. Some words may show all possible readings for parts of the page.';
        }
        return 'We couldn’t finish analyzing the text. Some features may be missing.';
    }

    buildAnalysisWarningDetail(details) {
        const parts = [];
        if (details.stage) parts.push(`Stage: ${details.stage}`);
        if (details.message) parts.push(`Error: ${details.message}`);
        return parts.join(' ');
    }

    buildAnalysisWarningMailto(details) {
        const subject = 'RLTK analysis error';
        const bodyLines = [
            'RLTK analysis error report',
            '',
            `URL: ${details.sourceUrl || 'unknown'}`,
            `Error type: ${details.errorType || 'unknown'}`,
            `Stage: ${details.stage || 'unknown'}`,
            `Error message: ${details.message || 'unknown'}`,
            `Time: ${details.timestamp || new Date().toISOString()}`,
            '',
            'Notes:'
        ];
        const body = bodyLines.join('\n');
        return `mailto:robert_reynolds@byu.edu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }

    isAccessErrorMessage(message) {
        if (!message) return false;
        return message.includes('Cannot access this page') ||
            message.includes('Cannot access a chrome:// URL') ||
            message.includes('The extensions gallery cannot be scripted') ||
            message.includes('Extension manifest must request permission') ||
            message.includes('Cannot access contents of the page') ||
            message.includes('Cannot run on this system page');
    }

    updateAnalysisWarningUI() {
        const warningButton = document.getElementById('reading-tutor-analysis-warning');
        if (!warningButton) return;

        if (this.analysisWarning) {
            warningButton.style.display = 'inline-flex';
        } else {
            warningButton.style.display = 'none';
        }

        const summary = document.getElementById('analysis-error-summary');
        const detail = document.getElementById('analysis-error-detail');
        const email = document.getElementById('analysis-error-email');

        if (this.analysisWarning) {
            if (summary) summary.textContent = this.buildAnalysisWarningSummary(this.analysisWarning);
            if (detail) detail.textContent = this.buildAnalysisWarningDetail(this.analysisWarning);
            if (email) email.href = this.buildAnalysisWarningMailto(this.analysisWarning);
        }
    }

    setAnalysisWarning(details, sender) {
        this.analysisWarning = this.normalizeAnalysisWarning(details, sender);
        this.updateAnalysisWarningUI();
        if (!this.isApplyingTabState) {
            this.saveTabState();
        }
    }

    clearAnalysisWarning() {
        if (!this.analysisWarning) return;
        this.analysisWarning = null;
        this.updateAnalysisWarningUI();
        if (!this.isApplyingTabState) {
            this.saveTabState();
        }
    }

    showAnalysisWarningModal() {
        const modal = document.getElementById('analysis-error-modal');
        if (modal) modal.style.display = 'flex';
    }

    hideAnalysisWarningModal() {
        const modal = document.getElementById('analysis-error-modal');
        if (modal) modal.style.display = 'none';
    }

    registerTabState(key, { capture, apply, defaultValue, order = 100 }) {
        this.tabStateHandlers.push({ key, capture, apply, defaultValue, order });
        this.tabStateHandlers.sort((a, b) => a.order - b.order);
    }

    registerDefaultTabStateHandlers() {
        if (this.tabStateHandlersInitialized) return;
        this.tabStateHandlersInitialized = true;

        // Add new tab-scoped UI state slices here to keep per-tab behavior consistent.
        this.registerTabState('readingTutor', {
            order: 10,
            capture: () => ({
                data: this.lastReadingTutorSelectionData || null,
                index: this.lastReadingTutorSelectionIndex ?? null,
                hash: this.lastReadingTutorSelectionHash || null,
                restoreHash: this.readingTutorRestoreHash || null,
                validationHash: this.readingTutorValidationHash || null,
                processedHash: this.readingTutorRestoreHash || null,
                instructionsDismissed: this.readingTutorInstructionsDismissed || false
            }),
            apply: (value) => {
                const next = value || {};
                this.lastReadingTutorSelectionData = next.data || null;
                this.lastReadingTutorSelectionIndex = next.index ?? null;
                this.lastReadingTutorSelectionHash = next.hash || null;
                this.readingTutorRestoreHash = next.restoreHash || next.processedHash || null;
                this.readingTutorValidationHash = next.validationHash || null;
                this.readingTutorInstructionsDismissed = !!next.instructionsDismissed;
            },
            defaultValue: { data: null, index: null, hash: null, restoreHash: null, validationHash: null, processedHash: null, instructionsDismissed: false }
        });

        this.registerTabState('access', {
            order: 15,
            capture: () => {
                if (!this.currentTabId) return null;
                const cached = this.tabAccessCache.get(this.currentTabId);
                return cached === undefined ? null : cached;
            },
            apply: (value) => {
                if (!this.currentTabId) return;
                if (value === true || value === false) {
                    this.tabAccessCache.set(this.currentTabId, value);
                } else {
                    this.tabAccessCache.delete(this.currentTabId);
                }
                this.applyCachedAccessState(this.currentTabId);
            },
            defaultValue: null
        });

        this.registerTabState('analysisWarning', {
            order: 18,
            capture: () => this.analysisWarning || null,
            apply: (value) => {
                if (value) {
                    this.analysisWarning = value;
                } else {
                    this.analysisWarning = null;
                }
                this.updateAnalysisWarningUI();
            },
            defaultValue: null
        });

        this.registerTabState('selectionState', {
            order: 25,
            capture: () => ({ hasSelection: !!this.hasSelection }),
            apply: (value) => {
                this.applySelectionState(value && value.hasSelection);
            },
            defaultValue: { hasSelection: false }
        });

        this.registerTabState('readingTutorDirty', {
            order: 26,
            capture: () => ({ dirty: !!this.readingTutorDirty }),
            apply: (value) => {
                this.setReadingTutorDirty(value && value.dirty);
            },
            defaultValue: { dirty: false }
        });

        this.registerTabState('readingTutorBatch', {
            order: 27,
            capture: () => ({
                paused: !!this.readingTutorPaused,
                batchInProgress: !!this.readingTutorBatchInProgress,
                progress: this.readingTutorBatchProgress || null
            }),
            apply: (value) => {
                const next = value || {};
                this.readingTutorPaused = !!next.paused;
                this.readingTutorBatchInProgress = !!next.batchInProgress;
                this.readingTutorBatchProgress = next.progress || null;
                this.updateReadingTutorBatchProgress(this.readingTutorBatchProgress);
                if (this.readingTutorPaused) {
                    this.readingTutorProcessing = false;
                    this.setReadingTutorPaused(true);
                } else if (this.readingTutorBatchInProgress) {
                    this.setReadingTutorProcessing(true);
                } else {
                    this.setReadingTutorPaused(false);
                }
            },
            defaultValue: { paused: false, batchInProgress: false, progress: null }
        });

        this.registerTabState('spanClickOverride', {
            order: 28,
            capture: () => ({ enabled: !!this.spanClickOverride }),
            apply: (value) => {
                const enabled = !!(value && value.enabled);
                this.applySpanClickOverrideState(enabled, { persist: false });
            },
            defaultValue: { enabled: false }
        });
        this.registerTabState('ui', {
            order: 20,
            capture: () => ({
                activeTab: this.currentTab || document.querySelector('.tab-button.active')?.dataset.tab || 'reading-tutor',
                readingTutorSubTab: this.lastReadingTutorSubTab || document.querySelector('.sub-tab-button.active')?.dataset.subtab || 'translations-and-tables'
            }),
            apply: async (value) => {
                const next = value || {};
                this.lastReadingTutorSubTab = next.readingTutorSubTab || 'translations-and-tables';
                const nextTab = next.activeTab || 'reading-tutor';
                await this.switchTab(nextTab, { persist: false, restoreOnExit: false });
            },
            defaultValue: () => ({
                activeTab: 'reading-tutor',
                readingTutorSubTab: 'translations-and-tables'
            })
        });

        this.registerTabState('selections', {
            order: 30,
            capture: () => ({
                topic: document.getElementById('topic-menu')?.value,
                filter: document.getElementById('filter-menu')?.value,
                activity: document.getElementById('activity-menu')?.value
            }),
            apply: (value) => {
                if (!value) return;
                this.applySelections(value.topic, value.filter, value.activity);
            },
            defaultValue: () => ({
                topic: document.getElementById('topic-menu')?.value,
                filter: document.getElementById('filter-menu')?.value,
                activity: document.getElementById('activity-menu')?.value
            })
        });

        this.registerTabState('enhancement', {
            order: 35,
            capture: () => ({
                pageEnhanced: !!this.pageEnhanced,
                lastEnhancement: this.lastEnhancement || null
            }),
            apply: (value) => {
                const next = value || {};
                // Only overwrite lastEnhancement if:
                // 1. We have a non-null value from storage, OR
                // 2. lastEnhancement is currently null (safe to apply default)
                // This prevents defaults from overwriting a lastEnhancement that was
                // set during async operations triggered by earlier tab-state handlers.
                if (next.lastEnhancement || this.lastEnhancement === null) {
                    this.lastEnhancement = next.lastEnhancement || null;
                }
                if (next.pageEnhanced) {
                    this.setCompletedState();
                } else {
                    this.setInitialState();
                }
            },
            defaultValue: { pageEnhanced: false, lastEnhancement: null }
        });

        this.registerTabState('density', {
            order: 40,
            capture: () => {
                const slider = document.getElementById('density-slider');
                if (slider) return Number(slider.value);
                return this.lastSavedMinDistance ?? this.defaultMinDistance;
            },
            apply: async (value) => {
                await this.applyDensityValue(value);
            },
            defaultValue: () => this.lastSavedMinDistance ?? this.defaultMinDistance
        });

        this.registerTabState('grammarHighlighter', {
            order: 50,
            capture: () => this.syncGrammarHighlighterStateFromUI(),
            apply: async (value) => {
                await this.applyGrammarHighlighterState(value);
            },
            defaultValue: { activeTags: [], ignoreAmbiguity: false }
        });

        this.registerTabState('writing', {
            order: 60,
            capture: () => ({
                input: this.lastWritingInput || '',
                tokens: this.lastWritingTokens || null,
                selectedErrorIndex: this.lastWritingSelectedErrorIndex ?? null
            }),
            apply: (value) => {
                this.applyWritingState(value);
            },
            defaultValue: { input: '', tokens: null, selectedErrorIndex: null }
        });
    }

    async captureTabState() {
        const state = {};
        for (const handler of this.tabStateHandlers) {
            try {
                state[handler.key] = await handler.capture();
            } catch (e) {
                console.warn(`Failed to capture tab state: ${handler.key}`, e);
            }
        }
        return state;
    }

    async applyTabState(state) {
        this.isApplyingTabState = true;
        try {
            for (const handler of this.tabStateHandlers) {
                const hasValue = state && Object.prototype.hasOwnProperty.call(state, handler.key);
                const rawValue = hasValue ? state[handler.key] : handler.defaultValue;
                const value = typeof rawValue === 'function' ? rawValue() : rawValue;
                await handler.apply(value);
            }
        } finally {
            this.isApplyingTabState = false;
        }
    }

    scheduleTabStateSave(delayMs = 200) {
        if (this.isApplyingTabState) return;
        if (this.saveStateTimer) {
            clearTimeout(this.saveStateTimer);
        }
        this.saveStateTimer = setTimeout(() => {
            this.saveTabState();
        }, delayMs);
    }

    async applyDensityValue(value) {
        const slider = document.getElementById('density-slider');
        if (!slider) return;
        const minDistance = Math.max(0, Math.min(10, Math.round(Number(value) || 0)));
        slider.value = String(minDistance);
        this.updateDensityDisplay(minDistance);
        this.lastSavedMinDistance = minDistance;
        await this.pushMinDistanceToContent(minDistance);
    }

    syncGrammarHighlighterStateFromUI() {
        const buttons = document.querySelectorAll('.tag-toggle');
        const activeTags = buttons.length
            ? Array.from(document.querySelectorAll('.tag-toggle.active')).map(btn => btn.dataset.tag)
            : (this.grammarHighlighterState?.activeTags || []);
        const ignoreAmbiguityCheckbox = document.getElementById('ignore-ambiguity');
        const ignoreAmbiguity = ignoreAmbiguityCheckbox ? ignoreAmbiguityCheckbox.checked : (this.grammarHighlighterState?.ignoreAmbiguity || false);
        this.grammarHighlighterState = { activeTags, ignoreAmbiguity };
        return this.grammarHighlighterState;
    }

    async applyGrammarHighlighterState(value) {
        const next = value || { activeTags: [], ignoreAmbiguity: false };
        this.grammarHighlighterState = {
            activeTags: Array.isArray(next.activeTags) ? next.activeTags : [],
            ignoreAmbiguity: !!next.ignoreAmbiguity
        };

        const ignoreAmbiguityCheckbox = document.getElementById('ignore-ambiguity');
        if (ignoreAmbiguityCheckbox) {
            ignoreAmbiguityCheckbox.checked = this.grammarHighlighterState.ignoreAmbiguity;
        }

        if (document.getElementById('grammar-highlighter-filters')) {
            this.initializeGrammarHighlighterUI();
        }

        const buttons = document.querySelectorAll('.tag-toggle');
        buttons.forEach(btn => {
            const isActive = this.grammarHighlighterState.activeTags.includes(btn.dataset.tag);
            btn.classList.toggle('active', isActive);
        });

        if (this.currentTab === 'reading-tutor' && this.lastReadingTutorSubTab === 'grammar-highlighter') {
            this.updateGrammarHighlighterHighlighting();
        }
    }

    applyWritingState(value) {
        const next = value || {};
        this.lastWritingInput = next.input || '';
        this.lastWritingTokens = Array.isArray(next.tokens) ? next.tokens : null;
        this.lastWritingSelectedErrorIndex = next.selectedErrorIndex ?? null;

        const textarea = document.getElementById('writing-input');
        if (textarea) textarea.value = this.lastWritingInput;

        const resultsContainer = document.getElementById('writing-results');
        const detailsContainer = document.getElementById('writing-details');
        const writingContainer = document.getElementById('writing-container');

        if (this.lastWritingTokens && this.lastWritingTokens.length > 0) {
            this.displayWritingResults(this.lastWritingTokens, {
                selectedIndex: this.lastWritingSelectedErrorIndex,
                skipSave: true
            });
            if (writingContainer) writingContainer.style.display = 'flex';
        } else {
            if (resultsContainer) resultsContainer.innerHTML = '';
            if (detailsContainer) detailsContainer.innerHTML = '';
            if (writingContainer) writingContainer.style.display = 'none';
        }
    }

    async loadFreqDict() {
        if (this.freqDict) {
            if (this.freqDictTotal === null) {
                this.freqDictTotal = 1_000_000;
            }
            return;
        }
        try {
            const url = chrome.runtime.getURL('rltk/resources/models/Sharoff_lem_freq_dict.json');
            const response = await fetch(url);
            this.freqDict = await response.json();
            this.freqDictTotal = 1_000_000;
        } catch (e) {
            console.error('Failed to load frequency dictionary:', e);
            this.freqDict = {};
            this.freqDictTotal = 0;
        }
    }

    async loadTranslations() {
        if (this.translations) return;
        try {
            const url = chrome.runtime.getURL('rltk/resources/models/openrussian-translations-eng.json');
            const response = await fetch(url);
            this.translations = await response.json();
        } catch (e) {
            console.error('Failed to load translations:', e);
            this.translations = {};
        }
    }

    setupVocabularySortButtons() {
        const buttons = document.querySelectorAll('.vocab-sort-button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const key = button.dataset.sort;
                if (!key) return;

                if (this.vocabularyState.sortKey === key) {
                    this.vocabularyState.sortDir = this.vocabularyState.sortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    this.vocabularyState.sortKey = key;
                    this.vocabularyState.sortDir = key === 'lemma' ? 'asc' : 'desc';
                }

                this.renderVocabularyTable();
            });
        });
    }

    computeLogLikelihood(observedDoc, observedRef, totalDoc, totalRef) {
        const total = totalDoc + totalRef;
        const observedTotal = observedDoc + observedRef;
        if (!total || !observedTotal) return 0;

        const expectedDoc = totalDoc * (observedTotal / total);
        const expectedRef = totalRef * (observedTotal / total);
        const term = (observed, expected) => {
            if (!observed || !expected) return 0;
            return observed * Math.log(observed / expected);
        };

        return 2 * (term(observedDoc, expectedDoc) + term(observedRef, expectedRef));
    }

    formatVocabularyValue(value) {
        if (!Number.isFinite(value) || value <= 0) return '0';
        if (value < 0.01) return value.toFixed(3);
        return value.toFixed(2);
    }

    sortVocabularyRows(rows) {
        const { sortKey, sortDir } = this.vocabularyState;
        const direction = sortDir === 'asc' ? 1 : -1;
        return rows.sort((a, b) => {
            let comparison = 0;
            if (sortKey === 'lemma') {
                comparison = a.lemma.localeCompare(b.lemma, 'ru');
            } else {
                comparison = (a[sortKey] || 0) - (b[sortKey] || 0);
            }
            if (comparison === 0) {
                comparison = a.lemma.localeCompare(b.lemma, 'ru');
            }
            return comparison * direction;
        });
    }

    renderVocabularyTable() {
        const tbody = document.getElementById('vocabulary-table-body');
        const empty = document.getElementById('vocabulary-empty');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (this.vocabularyState.rows.length === 0) {
            if (empty) empty.style.display = 'block';
        } else if (empty) {
            empty.style.display = 'none';
        }

        const sortedRows = this.sortVocabularyRows([...this.vocabularyState.rows]);
        sortedRows.forEach(row => {
            const tr = document.createElement('tr');

            const wordCell = document.createElement('td');
            wordCell.textContent = row.lemma;
            tr.appendChild(wordCell);

            const freqCell = document.createElement('td');
            freqCell.textContent = String(row.count);
            tr.appendChild(freqCell);

            const expectedCell = document.createElement('td');
            expectedCell.textContent = this.formatVocabularyValue(row.expected);
            tr.appendChild(expectedCell);

            const keynessCell = document.createElement('td');
            keynessCell.textContent = this.formatVocabularyValue(row.keyness);
            tr.appendChild(keynessCell);

            tbody.appendChild(tr);
        });

        document.querySelectorAll('.vocabulary-table th[data-sort-key]').forEach(th => {
            const key = th.dataset.sortKey;
            if (key === this.vocabularyState.sortKey) {
                th.setAttribute('aria-sort', this.vocabularyState.sortDir === 'asc' ? 'ascending' : 'descending');
            } else {
                th.setAttribute('aria-sort', 'none');
            }
        });
    }

    async updateVocabularyTable() {
        const summary = document.getElementById('vocabulary-summary');
        const empty = document.getElementById('vocabulary-empty');
        if (summary) summary.textContent = '';

        const tabId = await this.getTargetTabId();
        if (!tabId) {
            this.vocabularyState.rows = [];
            this.renderVocabularyTable();
            if (empty) empty.textContent = 'No vocabulary data yet.';
            return;
        }

        let response;
        try {
            response = await chrome.tabs.sendMessage(tabId, { action: 'get_reading_tutor_vocabulary' });
        } catch (e) {
            response = null;
        }

        if (!response || !response.success) {
            await new Promise(resolve => setTimeout(resolve, 200));
            try {
                response = await chrome.tabs.sendMessage(tabId, { action: 'get_reading_tutor_vocabulary' });
            } catch (e) {
                response = null;
            }
        }

        if (!response || !response.success) {
            this.vocabularyState.rows = [];
            this.renderVocabularyTable();
            if (empty) empty.textContent = 'Activate Reading tutor to see vocabulary.';
            return;
        }

        const items = Array.isArray(response.items) ? response.items : [];
        const totalTokens = Number(response.totalTokens) || 0;

        const hasFreqDict = !!this.freqDict;
        if (!hasFreqDict) {
            this.loadFreqDict();
        }
        const refTotal = Number(this.freqDictTotal) || 0;

        this.vocabularyState.totalTokens = totalTokens;
        this.vocabularyState.rows = items.map(item => {
            const lemma = item.lemma || '';
            const count = Number(item.count) || 0;
            const lemmaKey = lemma.toLowerCase();
            const refFreq = hasFreqDict ? Number(this.freqDict?.[lemmaKey]) || 0 : 0;
            const expected = (hasFreqDict && refTotal > 0 && totalTokens > 0) ? (refFreq / refTotal) * totalTokens : 0;
            const keyness = hasFreqDict ? this.computeLogLikelihood(count, refFreq, totalTokens, refTotal) : 0;
            return {
                lemma,
                count,
                expected,
                keyness
            };
        });

        if (summary) {
            summary.textContent = `Document length: ${totalTokens} words · ${this.vocabularyState.rows.length} lemmas`;
        }

        this.renderVocabularyTable();
    }

    /**
     * Connects to the background script to track side panel lifecycle.
     */
    connectToBackground(tabId) {
        // Establish a long-lived connection to the background script
        // This allows the background script to detect when the side panel is closed (port disconnects)
        // We include the tabId in the name so the background script knows which tab to clean up
        const name = tabId ? `sidepanel-${tabId}` : 'sidepanel';
        this.port = chrome.runtime.connect({ name: name });
    }

    async loadDensitySetting() {
        const slider = document.getElementById('density-slider');
        if (!slider) return;

        let minDistance = this.defaultMinDistance;

        try {
            const stored = await new Promise((resolve) => {
                chrome.storage.local.get([this.minDistanceKey], (res) => {
                    resolve(res && res[this.minDistanceKey]);
                });
            });

            if (stored !== undefined && stored !== null && !Number.isNaN(Number(stored))) {
                minDistance = Number(stored);
            } else {
                const localVal = Number(localStorage.getItem(this.minDistanceKey));
                if (!Number.isNaN(localVal)) {
                    minDistance = localVal;
                }
            }
        } catch (e) {
            const fallback = Number(localStorage.getItem(this.minDistanceKey));
            if (!Number.isNaN(fallback)) {
                minDistance = fallback;
            }
        }

        const bounded = Math.max(0, Math.min(10, Math.round(minDistance)));
        slider.value = String(bounded);
        this.lastSavedMinDistance = bounded;
        this.updateDensityDisplay(bounded);
        await this.persistMinDistance(bounded);
    }

    updateDensityDisplay(minDistance) {
        const display = document.getElementById('density-display');
        if (!display) return;

        const label = minDistance <= 0 ? 'Every token' : `Every ~${minDistance} tokens`;
        display.textContent = label;
    }

    async persistMinDistance(minDistance) {
        try {
            localStorage.setItem(this.minDistanceKey, String(minDistance));
        } catch (e) {
            // ignore storage issues
        }

        if (chrome && chrome.storage && chrome.storage.local) {
            await new Promise((resolve) => {
                chrome.storage.local.set({ [this.minDistanceKey]: minDistance }, resolve);
            });
        }
    }

    toggleDensitySection(activityValue) {
        const section = document.getElementById('density-section');
        if (!section) return;

        const activity = activityValue || document.getElementById('activity-menu')?.value;
        const shouldShow = activity === 'mc' || activity === 'cloze';
        section.style.display = shouldShow ? 'block' : 'none';
    }

    shouldHandleSelectionFromTab(senderTabId) {
        if (!senderTabId) return true;
        if (this.debugTabId) return senderTabId === this.debugTabId;
        if (this.currentTabId) return senderTabId === this.currentTabId;
        return true;
    }

    updateEnhanceButtonLabel() {
        const enhanceButton = document.getElementById('enhance-button');
        if (!enhanceButton) return;

        if (this.isProcessing) {
            enhanceButton.textContent = 'Processing...';
            return;
        }

        enhanceButton.textContent = this.hasSelection ? 'Enhance selected text' : 'Enhance';
    }

    applySelectionState(hasSelection) {
        this.hasSelection = !!hasSelection;
        this.updateEnhanceButtonLabel();
        this.scheduleTabStateSave();
    }

    async syncSelectionStateFromTab(tabId = null) {
        try {
            const targetTabId = tabId || await this.getTargetTabId();
            if (!targetTabId) return;
            const response = await chrome.tabs.sendMessage(targetTabId, { action: 'get_selection_state' });
            this.applySelectionState(response && response.hasSelection);
        } catch (e) {
            // Ignore if the content script is not available for this tab
        }
    }

    async pushMinDistanceToContent(minDistance) {
        try {
            const targetTabId = await this.getTargetTabId();
            if (targetTabId) {
                await chrome.tabs.sendMessage(targetTabId, {
                    action: 'set_token_selector_min_distance',
                    value: minDistance
                });
            }
        } catch (e) {
            // If the content script is not ready, ignore.
        }
    }

    updateSpanClickOverrideButton() {
        const checkbox = document.getElementById('span-click-override-toggle');
        if (!checkbox) return;
        checkbox.checked = this.spanClickOverride;
    }

    async pushSpanClickOverrideToContent(enabled, tabId = null) {
        try {
            const targetTabId = tabId || await this.getTargetTabId();
            if (targetTabId) {
                await chrome.tabs.sendMessage(targetTabId, {
                    action: 'set_span_click_override',
                    enabled: !!enabled
                });
            }
        } catch (e) {
            // Ignore if the content script is not ready.
        }
    }

    applySpanClickOverrideState(enabled, options = {}) {
        this.spanClickOverride = !!enabled;
        this.updateSpanClickOverrideButton();

        if (options.push !== false) {
            this.pushSpanClickOverrideToContent(this.spanClickOverride, options.tabId);
        }

        if (options.persist !== false && !this.isApplyingTabState) {
            this.saveTabState();
        }
    }

    setReadingTutorDirty(isDirty) {
        this.readingTutorDirty = !!isDirty;
        const refreshButton = document.getElementById('reading-tutor-refresh');
        if (refreshButton) {
            if (this.readingTutorDirty) {
                refreshButton.setAttribute('data-dirty', 'true');
            } else {
                refreshButton.removeAttribute('data-dirty');
            }
        }
        if (!this.isApplyingTabState) {
            this.saveTabState();
        }
    }

    setReadingTutorProcessing(isProcessing) {
        this.readingTutorProcessing = !!isProcessing;
        const refreshButton = document.getElementById('reading-tutor-refresh');
        const spinner = document.getElementById('reading-tutor-spinner');
        const pauseButton = document.getElementById('reading-tutor-pause');
        const resumeButton = document.getElementById('reading-tutor-resume');
        const progressLabel = document.getElementById('reading-tutor-batch-progress');

        if (this.readingTutorPaused) {
            return;
        }

        if (refreshButton) refreshButton.style.display = isProcessing ? 'none' : 'inline-flex';
        if (spinner) {
            spinner.style.display = 'inline-flex';
            spinner.style.visibility = isProcessing ? 'visible' : 'hidden';
        }
        if (pauseButton) pauseButton.style.display = isProcessing ? 'inline-flex' : 'none';
        if (resumeButton) resumeButton.style.display = 'none';
        if (progressLabel) {
            progressLabel.style.display = this.readingTutorBatchInProgress ? 'inline-flex' : 'none';
        }
        this.updateAnalysisWarningUI();
        if (!isProcessing && this.currentTab === 'reading-tutor' && this.lastReadingTutorSubTab === 'vocabulary') {
            this.updateVocabularyTable();
        }
    }

    setReadingTutorPaused(isPaused) {
        this.readingTutorPaused = !!isPaused;
        const refreshButton = document.getElementById('reading-tutor-refresh');
        const spinner = document.getElementById('reading-tutor-spinner');
        const pauseButton = document.getElementById('reading-tutor-pause');
        const resumeButton = document.getElementById('reading-tutor-resume');
        const progressLabel = document.getElementById('reading-tutor-batch-progress');

        if (isPaused) {
            if (spinner) {
                spinner.style.display = 'inline-flex';
                spinner.style.visibility = 'hidden';
            }
            if (pauseButton) pauseButton.style.display = 'none';
            if (resumeButton) resumeButton.style.display = 'inline-flex';
            if (refreshButton) refreshButton.style.display = 'none';
            if (progressLabel) {
                progressLabel.style.display = this.readingTutorBatchInProgress ? 'inline-flex' : 'none';
            }
            return;
        }

        if (resumeButton) resumeButton.style.display = 'none';
        const showProcessing = this.readingTutorProcessing || this.readingTutorBatchInProgress;
        if (showProcessing) {
            if (refreshButton) refreshButton.style.display = 'none';
            if (spinner) {
                spinner.style.display = 'inline-flex';
                spinner.style.visibility = 'visible';
            }
            if (pauseButton) pauseButton.style.display = 'inline-flex';
            if (progressLabel) {
                progressLabel.style.display = this.readingTutorBatchInProgress ? 'inline-flex' : 'none';
            }
        } else {
            if (refreshButton) refreshButton.style.display = 'inline-flex';
            if (spinner) {
                spinner.style.display = 'inline-flex';
                spinner.style.visibility = 'hidden';
            }
            if (pauseButton) pauseButton.style.display = 'none';
            if (progressLabel) progressLabel.style.display = 'none';
        }

        this.updateAnalysisWarningUI();

        if (!this.isApplyingTabState) {
            this.saveTabState();
        }
    }

    updateReadingTutorBatchProgress(progress) {
        const progressLabel = document.getElementById('reading-tutor-batch-progress');
        if (!progressLabel) return;

        if (!progress || !progress.total || progress.total <= 0) {
            progressLabel.textContent = '';
            progressLabel.style.display = 'none';
            return;
        }

        const total = Number(progress.total || 0);
        const processed = Number(progress.processed || 0);
        const current = Math.min(total, Math.max(1, processed + 1));
        progressLabel.textContent = `${current}/${total}`;
        progressLabel.style.display = 'inline-flex';
    }

    scheduleReadingTutorAutoRefresh() {
        if (this.readingTutorAutoRefreshTimer) {
            clearTimeout(this.readingTutorAutoRefreshTimer);
        }
        this.readingTutorAutoRefreshTimer = setTimeout(async () => {
            if (this.currentTab !== 'reading-tutor') return;
            if (this.readingTutorPaused) return;
            if (this.readingTutorProcessing) {
                this.scheduleReadingTutorAutoRefresh();
                return;
            }
            await this.activateReadingTutor({ force: true, auto: true });
        }, 800);
    }

    async pauseReadingTutorProcessing() {
        const targetTabId = await this.getTargetTabId();
        if (targetTabId) {
            try {
                await chrome.tabs.sendMessage(targetTabId, { action: 'abort' });
            } catch (e) {
                // ignore
            }
        }
        this.readingTutorActivationToken++;
        this.readingTutorProcessing = false;
        this.isProcessing = false;
        this.processingContext = null;
        this.setReadingTutorPaused(true);
        if (!this.isApplyingTabState) {
            this.saveTabState();
        }
    }

    async sendReadingTutorWatch(enabled, tabId = null) {
        try {
            const targetTabId = tabId || await this.getTargetTabId();
            if (!targetTabId) return;
            await chrome.tabs.sendMessage(targetTabId, {
                action: 'reading_tutor_watch',
                enabled: !!enabled
            });
        } catch (e) {
            // ignore if content script not ready
        }
    }

    async ackReadingTutorRefresh(tabId = null) {
        try {
            const targetTabId = tabId || await this.getTargetTabId();
            if (!targetTabId) return;
            await chrome.tabs.sendMessage(targetTabId, { action: 'reading_tutor_ack_refresh' });
        } catch (e) {
            // ignore
        }
    }

    async onDensityChange(value) {
        const minDistance = Math.max(0, Math.min(10, Math.round(Number(value) || 0)));
        this.updateDensityDisplay(minDistance);
        this.lastSavedMinDistance = minDistance;

        await this.persistMinDistance(minDistance);
        await this.pushMinDistanceToContent(minDistance);

        if (this.pageEnhanced && !this.isProcessing) {
            await this.enhancePage();
        }

        if (!this.isApplyingTabState) {
            this.saveTabState();
        }
    }

    async getActiveTabId() {
        if (this.debugTabId) return this.debugTabId;

        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return tabs.length > 0 ? tabs[0].id : null;
    }

    async getTargetTabId() {
        if (this.debugTabId) return this.debugTabId;
        if (this.currentTabId) return this.currentTabId;
        return this.getActiveTabId();
    }

    async getCurrentTabUrl(tabId = null) {
        try {
            const targetTabId = tabId || await this.getTargetTabId();
            if (!targetTabId) return 'unknown';
            const tab = await chrome.tabs.get(targetTabId);
            return tab?.url || 'unknown';
        } catch (e) {
            return 'unknown';
        }
    }

    isLatestTabSwitch(token) {
        return token === this.tabSwitchToken;
    }

    /**
     * Initializes the side panel: sets up listeners, loads state, and checks access.
     */
    async init() {
        this.setupEventListeners();
        this.initializeActivitySelectors();
        this.registerDefaultTabStateHandlers();

        const urlParams = new URLSearchParams(window.location.search);
        const debugTabIdParam = urlParams.get('debugTabId');
        this.debugTabId = debugTabIdParam ? parseInt(debugTabIdParam) : null;

        await this.loadDensitySetting();
        // Hide density controls by default; they are only shown for MC/Cloze after selection.
        this.toggleDensitySection('unselected');

        // Load state for the current tab
        let tabs;
        if (this.debugTabId) {
            tabs = [{ id: this.debugTabId }];
        } else {
            tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        }

        if (tabs.length > 0) {
            const tabId = tabs[0].id;
            this.currentTabId = tabId;
            this.connectToBackground(tabId);
            await this.loadTabState(tabId);
            await this.checkAccess(tabId);
            await this.syncSelectionStateFromTab();
        }

        // Listen for tab activation to switch state
        chrome.tabs.onActivated.addListener((activeInfo) => {
            this.handleTabActivated(activeInfo);
        });

        // Listen for tab updates (navigation)
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.active) {
                (async () => {
                    await this.checkAccess(tabId);
                    if (!this.isActiveTab(tabId)) return;
                    if (this.currentTab === 'reading-tutor') {
                        await this.activateReadingTutor();
                        return;
                    }
                    if (this.currentTab === 'reading-activities') {
                        await this.restorePage();
                    }
                })();
            }
        });

        // Listen for access granted message
        chrome.runtime.onMessage.addListener((message) => {
            if (message.action === 'access_granted') {
                if (!message.tabId) return;
                (async () => {
                    await this.checkAccess(message.tabId);
                    if (!this.isActiveTab(message.tabId)) return;
                    const hasAccess = this.tabAccessCache.get(message.tabId);
                    if (hasAccess === true) {
                        this.checkPageStatus(message.tabId);
                        if (this.currentTab === 'reading-tutor') {
                            await this.ensureReadingTutorActive();
                        }
                    }
                })();
            }
        });

        // Initialize the active tab
        if (!this.userHasInteracted) {
            const activeTabButton = document.querySelector('.tab-button.active');
            if (activeTabButton) {
                const tabName = activeTabButton.dataset.tab;
                await this.switchTab(tabName);
            }
        }
    }

    async handleTabActivated(activeInfo) {
        const token = ++this.tabSwitchToken;
        // Update modal state immediately to avoid lag during long-running work.
        this.applyCachedAccessState(activeInfo.tabId);
        // Fire-and-forget: we don't await runExclusive here because tab activation
        // events should not block the browser. State will be saved/loaded asynchronously.
        await this.runExclusive(async () => {
            if (this.currentTabId) {
                await this.saveTabState(this.currentTabId);
            }

            this.currentTabId = activeInfo.tabId;
            this.applyCachedAccessState(activeInfo.tabId);
            await this.loadTabState(activeInfo.tabId);

            if (!this.isLatestTabSwitch(token)) return;

            // Wait for access check to complete before activating Reading Tutor
            await this.checkAccess(activeInfo.tabId);
            await this.syncSelectionStateFromTab(activeInfo.tabId);

            if (!this.isLatestTabSwitch(token)) return;

            if (this.currentTab === 'reading-tutor' && this.tabAccessCache.get(activeInfo.tabId) === true) {
                await this.ensureReadingTutorActive();
            }
        });
    }

    /**
     * Checks if the extension has access to the given tab.
     * If not, shows a modal prompting the user to grant access.
     */
    async checkAccess(tabId) {
        if (!this.isActiveTab(tabId)) return;
        try {
            const tab = await chrome.tabs.get(tabId);
            if (this.isChromeRestrictedUrl(tab?.url)) {
                this.tabAccessCache.set(tabId, 'chrome');
                this.scheduleTabStateSave();
                this.showChromeAccessModal();
                if (this.currentTab === 'reading-tutor') {
                    this.clearReadingTutorSelectionState({ tabId, showInstructions: true });
                    this.stopReadingTutorPolling();
                }
                return;
            }

            // Try to ping the content script
            await chrome.tabs.sendMessage(tabId, { action: 'ping' });
            if (!this.isActiveTab(tabId)) return;
            this.tabAccessCache.set(tabId, true);
            this.scheduleTabStateSave();
            this.hideAccessModal();
            this.hideChromeAccessModal();
            this.checkPageStatus(tabId);
            this.pushSpanClickOverrideToContent(this.spanClickOverride, tabId);
        } catch (error) {
            // If ping failed, try to inject via background targeting this tab
            try {
                const response = await chrome.runtime.sendMessage({ action: 'inject_content_script', tabId });
                if (!this.isActiveTab(tabId)) return;
                if (response && response.success) {
                    this.tabAccessCache.set(tabId, true);
                    this.scheduleTabStateSave();
                    this.hideAccessModal();
                    this.hideChromeAccessModal();
                    this.checkPageStatus(tabId);
                    this.pushSpanClickOverrideToContent(this.spanClickOverride, tabId);
                } else {
                    if (response && typeof response.error === 'string' && response.error.includes('chrome://')) {
                        this.tabAccessCache.set(tabId, 'chrome');
                        this.scheduleTabStateSave();
                        this.showChromeAccessModal();
                        if (this.currentTab === 'reading-tutor') {
                            this.clearReadingTutorSelectionState({ tabId, showInstructions: true });
                            this.stopReadingTutorPolling();
                        }
                        return;
                    }

                    const tab = await chrome.tabs.get(tabId);
                    if (this.isChromeRestrictedUrl(tab?.url)) {
                        this.tabAccessCache.set(tabId, 'chrome');
                        this.scheduleTabStateSave();
                        this.showChromeAccessModal();
                        return;
                    }

                    this.tabAccessCache.set(tabId, false);
                    this.scheduleTabStateSave();
                    this.showAccessModal();
                    if (this.currentTab === 'reading-tutor') {
                        this.clearReadingTutorSelectionState({ tabId, showInstructions: true });
                        this.stopReadingTutorPolling();
                    }
                }
            } catch (injectError) {
                if (!this.isActiveTab(tabId)) return;
                if (injectError && typeof injectError.message === 'string' && injectError.message.includes('chrome://')) {
                    this.tabAccessCache.set(tabId, 'chrome');
                    this.scheduleTabStateSave();
                    this.showChromeAccessModal();
                    if (this.currentTab === 'reading-tutor') {
                        this.clearReadingTutorSelectionState({ tabId, showInstructions: true });
                        this.stopReadingTutorPolling();
                    }
                    return;
                }
                const tab = await chrome.tabs.get(tabId);
                if (this.isChromeRestrictedUrl(tab?.url)) {
                    this.tabAccessCache.set(tabId, 'chrome');
                    this.scheduleTabStateSave();
                    this.showChromeAccessModal();
                    if (this.currentTab === 'reading-tutor') {
                        this.clearReadingTutorSelectionState({ tabId, showInstructions: true });
                        this.stopReadingTutorPolling();
                    }
                    return;
                }

                this.tabAccessCache.set(tabId, false);
                this.scheduleTabStateSave();
                this.showAccessModal();
                if (this.currentTab === 'reading-tutor') {
                    this.clearReadingTutorSelectionState({ tabId, showInstructions: true });
                    this.stopReadingTutorPolling();
                }
            }
        }
    }

    showAccessModal() {
        const modal = document.getElementById('access-modal');
        if (modal) modal.style.display = 'flex';
        this.hideChromeAccessModal();
    }

    hideAccessModal() {
        const modal = document.getElementById('access-modal');
        if (modal) modal.style.display = 'none';
    }

    showChromeAccessModal() {
        const modal = document.getElementById('chrome-access-modal');
        if (modal) modal.style.display = 'flex';
        this.hideAccessModal();
    }

    hideChromeAccessModal() {
        const modal = document.getElementById('chrome-access-modal');
        if (modal) modal.style.display = 'none';
    }

    isChromeRestrictedUrl(url) {
        if (!url) return false;
        return url.startsWith('chrome://');
    }

    isActiveTab(tabId) {
        if (!tabId) return false;
        if (this.debugTabId) return tabId === this.debugTabId;
        if (!this.currentTabId) return false;
        return tabId === this.currentTabId;
    }

    applyCachedAccessState(tabId) {
        const cached = this.tabAccessCache.get(tabId);
        if (cached === true) {
            this.hideAccessModal();
            this.hideChromeAccessModal();
        } else if (cached === false) {
            this.showAccessModal();
            this.hideChromeAccessModal();
        } else if (cached === 'chrome') {
            this.showChromeAccessModal();
        } else {
            // Clear stale modal state until we confirm access for this tab.
            this.hideAccessModal();
            this.hideChromeAccessModal();
        }
    }

    /**
     * Checks if the current page is already enhanced and updates UI accordingly.
     */
    async checkPageStatus(tabId = null) {
        try {
            const targetTabId = tabId || await this.getTargetTabId();
            if (!targetTabId) return;
            const response = await chrome.runtime.sendMessage({ action: 'get_status', tabId: targetTabId });
            const isEnhanced = response && response.success && (response.isEnhanced || (response.data && response.data.isEnhanced));
            if (isEnhanced) {
                this.setCompletedState();
            } else {
                this.setInitialState();
            }
        } catch (error) {
            // Ignore errors, likely just not enhanced or script not ready
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.userHasInteracted = true;
                this.switchTab(e.target.dataset.tab, { persist: true });
            });
        });

        // Sub-tab navigation
        document.querySelectorAll('.sub-tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.userHasInteracted = true;
                this.switchSubTab(e.target.dataset.subtab, { persist: true });
            });
        });

        this.setupVocabularySortButtons();

        this.initializeWritingTab();

        // Morphology settings
        const ignoreAmbiguityCheckbox = document.getElementById('ignore-ambiguity');
        if (ignoreAmbiguityCheckbox) {
            ignoreAmbiguityCheckbox.addEventListener('change', () => {
                this.updateGrammarHighlighterHighlighting();
                this.syncGrammarHighlighterStateFromUI();
                this.saveTabState();
            });
        }

        // Auto-enhance checkbox (only if it exists)
        const autoEnhanceCheckbox = document.getElementById('auto-enhance');
        if (autoEnhanceCheckbox) {
            autoEnhanceCheckbox.addEventListener('change', (e) => {
                this.setAutoEnhance(e.target.checked);
            });
        }

        const spanClickOverrideButton = document.getElementById('span-click-override-toggle');
        if (spanClickOverrideButton) {
            spanClickOverrideButton.addEventListener('click', () => {
                this.applySpanClickOverrideState(!this.spanClickOverride);
            });
        }

        // Topic selection
        document.getElementById('topic-menu').addEventListener('change', (e) => {
            this.onTopicChange(e.target.value);
            this.saveTabState();
        });

        // Filter selection
        document.getElementById('filter-menu').addEventListener('change', () => {
            this.toggleEnhanceButton();
            this.saveTabState();
        });

        // Activity selection
        document.getElementById('activity-menu').addEventListener('change', () => {
            this.toggleEnhanceButton();
            this.toggleDensitySection();
            this.updateWordStressNoteVisibility();
            this.updateRootsSummaryVisibility();
            this.saveTabState();
        });

        const densitySlider = document.getElementById('density-slider');
        if (densitySlider) {
            densitySlider.addEventListener('input', (e) => {
                this.onDensityChange(e.target.value);
            });
        }

        // Action buttons
        document.getElementById('enhance-button').addEventListener('click', () => {
            console.log('SIDEPANEL: Enhance button clicked');
            this.enhancePage();
        });

        // Listen for reading tutor selection
        chrome.runtime.onMessage.addListener((message) => {
            if (message.action === 'reading_tutor_selection') {
                // Handle both direct cohort data and text selection
                this.handleReadingTutorSelection(message);
            }
        });

        chrome.runtime.onMessage.addListener((message, sender) => {
            if (message.action === 'roots_summary') {
                if (!this.shouldHandleSelectionFromTab(sender?.tab?.id || message.tabId)) return;
                this.renderRootsSummary(message.summary || []);
            }
        });

        // Listen for selection state updates from the page
        chrome.runtime.onMessage.addListener((message, sender) => {
            if (message.action === 'selection_state') {
                if (!this.shouldHandleSelectionFromTab(sender?.tab?.id)) return;
                this.applySelectionState(message.hasSelection);
            }
        });

        chrome.runtime.onMessage.addListener((message, sender) => {
            if (message.action === 'reading_tutor_dirty') {
                if (!this.shouldHandleSelectionFromTab(sender?.tab?.id || message.tabId)) return;
                if (this.currentTab !== 'reading-tutor') return;
                this.setReadingTutorDirty(true);
                if (message.hash) {
                    this.readingTutorValidationHash = message.hash;
                }
                this.scheduleReadingTutorAutoRefresh();
            }
        });

        chrome.runtime.onMessage.addListener((message, sender) => {
            if (message.action === 'analysis_error') {
                if (!this.shouldHandleSelectionFromTab(sender?.tab?.id || message.tabId)) return;
                this.setAnalysisWarning(message.details || {}, sender);
            }
        });

        chrome.runtime.onMessage.addListener((message, sender) => {
            if (message.action === 'reading_tutor_batch_progress') {
                if (!this.shouldHandleSelectionFromTab(sender?.tab?.id || message.tabId)) return;
                if (this.currentTab !== 'reading-tutor') return;

                const progress = message.progress || message.data || null;
                this.readingTutorBatchProgress = progress;
                const total = Number(progress?.total || 0);
                const completed = !!progress?.completed;
                const aborted = !!progress?.aborted;

                if (!this.isApplyingTabState) {
                    this.saveTabState();
                }

                if (this.readingTutorPaused) {
                    this.updateReadingTutorBatchProgress(progress);
                    return;
                }

                if (total >= 1 && !completed) {
                    this.readingTutorBatchInProgress = true;
                    this.setReadingTutorProcessing(true);
                    this.updateReadingTutorBatchProgress(progress);
                } else if (completed && !aborted) {
                    this.readingTutorBatchInProgress = false;
                    this.updateReadingTutorBatchProgress(null);
                    this.isProcessing = false;
                    if (this.processingContext === 'reading-tutor') {
                        this.processingContext = null;
                    }
                    this.readingTutorPaused = false;
                    this.setReadingTutorProcessing(false);
                    const tabId = sender?.tab?.id || message.tabId || this.currentTabId;
                    if (tabId) {
                        this.ackReadingTutorRefresh(tabId);
                        this.sendReadingTutorWatch(true, tabId);
                    }
                } else if (aborted) {
                    this.updateReadingTutorBatchProgress(progress);
                }
            }
        });

        document.getElementById('restore-button').addEventListener('click', () => {
            this.restorePage();
        });

        // Dismiss instructions
        const dismissButton = document.getElementById('dismiss-instructions');
        if (dismissButton) {
            dismissButton.addEventListener('click', () => {
                const instructions = document.getElementById('reading-tutor-instructions');
                if (instructions) instructions.style.display = 'none';
                this.readingTutorInstructionsDismissed = true;
                this.saveTabState();
            });
        }

        const refreshButton = document.getElementById('reading-tutor-refresh');
        if (refreshButton) {
            refreshButton.addEventListener('click', async () => {
                this.setReadingTutorProcessing(true);
                this.setReadingTutorDirty(false);
                this.clearAnalysisWarning();
                await this.ackReadingTutorRefresh();
                this.setReadingTutorPaused(false);
                this.readingTutorBatchInProgress = false;
                this.readingTutorBatchProgress = null;
                this.updateReadingTutorBatchProgress(null);
                await this.activateReadingTutor({ force: true });
            });
        }

        const analysisWarningButton = document.getElementById('reading-tutor-analysis-warning');
        if (analysisWarningButton) {
            analysisWarningButton.addEventListener('click', () => {
                if (!this.analysisWarning) return;
                this.updateAnalysisWarningUI();
                this.showAnalysisWarningModal();
            });
        }

        const analysisWarningClose = document.getElementById('analysis-error-close');
        if (analysisWarningClose) {
            analysisWarningClose.addEventListener('click', () => this.hideAnalysisWarningModal());
        }

        const analysisWarningModal = document.getElementById('analysis-error-modal');
        if (analysisWarningModal) {
            analysisWarningModal.addEventListener('click', (event) => {
                if (event.target === analysisWarningModal) {
                    this.hideAnalysisWarningModal();
                }
            });
        }

        const pauseButton = document.getElementById('reading-tutor-pause');
        if (pauseButton) {
            pauseButton.addEventListener('click', async () => {
                await this.pauseReadingTutorProcessing();
            });
        }

        const resumeButton = document.getElementById('reading-tutor-resume');
        if (resumeButton) {
            resumeButton.addEventListener('click', async () => {
                this.readingTutorBatchInProgress = true;
                this.setReadingTutorPaused(false);
                this.setReadingTutorProcessing(true);
                const spinner = document.getElementById('reading-tutor-spinner');
                if (spinner) {
                    spinner.style.display = 'inline-flex';
                    spinner.style.visibility = 'visible';
                }
                await this.activateReadingTutor({ force: true, resume: true });
            });
        }

        const spanClickOverrideToggle = document.getElementById('span-click-override-toggle');
        if (spanClickOverrideToggle) {
            spanClickOverrideToggle.addEventListener('change', (e) => {
                this.applySpanClickOverrideState(e.target.checked);
            });
        }

        const spanClickOverrideHelp = document.getElementById('span-click-override-help');
        const spanClickOverrideTooltip = document.getElementById('span-click-override-tooltip');
        if (spanClickOverrideHelp && spanClickOverrideTooltip) {
            spanClickOverrideHelp.addEventListener('click', (e) => {
                e.stopPropagation();
                spanClickOverrideTooltip.classList.toggle('is-visible');
            });

            document.addEventListener('click', (e) => {
                if (!spanClickOverrideTooltip.classList.contains('is-visible')) return;
                if (spanClickOverrideTooltip.contains(e.target) || spanClickOverrideHelp.contains(e.target)) return;
                spanClickOverrideTooltip.classList.remove('is-visible');
            });
        }
    }

    /**
     * Triggers the page enhancement process.
     * Handles permission requests if necessary.
     */
    async enhancePage() {
        await this.runExclusive(async () => {
            if (this.isProcessing) {
                if (this.processingContext === 'reading-tutor' && this.currentTab !== 'reading-tutor') {
                    this.isProcessing = false;
                    this.processingContext = null;
                } else {
                    return;
                }
            }

            const targetTabId = await this.getTargetTabId();
            if (!targetTabId) return;

            await this.syncSelectionStateFromTab(targetTabId);
            const selectionOnly = this.hasSelection;

            this.isProcessing = true;
            this.processingContext = 'enhance';
            this.setProcessingState(true);
            this.clearAnalysisWarning();

            const selections = {
                topic: document.getElementById('topic-menu').value,
                filter: document.getElementById('filter-menu').value,
                activity: document.getElementById('activity-menu').value,
            };

        const shouldSkip = !selectionOnly && await this.shouldSkipEnhancement({
            tabId: targetTabId,
            selections,
            lastEnhancement: this.lastEnhancement
        });
        try {
            if (shouldSkip) {
                this.setCompletedState();
                return;
            }

            // Always restore first
            await chrome.runtime.sendMessage({ action: 'restore', tabId: targetTabId });

            // Store selections
            await this.saveTabState();

            // Send message through background script
            const response = await chrome.runtime.sendMessage({
                action: 'enhance',
                selections: selections,
                selectionOnly: selectionOnly,
                tabId: targetTabId
            });

            if (!response.success) {
                throw new Error(response.error || 'Enhancement failed');
            }

            // Enhancement completed successfully
            const currentHash = selectionOnly ? null : await this.fetchTextHash(targetTabId);
            this.lastEnhancement = {
                selections: selections,
                selectionOnly: selectionOnly,
                textHash: currentHash
            };
            this.setCompletedState();
            this.saveTabState();

        } catch (error) {
            let errorMessage = (error && error.message) ? error.message : String(error);

            if (errorMessage.includes("Extension manifest must request permission")) {
                // Try to request permission dynamically
                try {
                    // Prefer the debug tab we were asked to enhance; fall back to the active tab.
                    if (targetTabId) {
                        const targetTab = await chrome.tabs.get(targetTabId);
                        if (targetTab?.url) {
                            const url = new URL(targetTab.url);
                            const origin = `${url.origin}/*`;

                            const granted = await chrome.permissions.request({ origins: [origin] });

                            if (granted) {
                                // Retry enhancement with the new permission.
                                this.isProcessing = false;
                                await this.enhancePage();
                                return;
                            }
                        }
                    }
                } catch (permError) {
                    console.error("Permission request failed:", permError);
                }

                errorMessage = "Please click the extension icon in the toolbar to re-activate the extension for this page.";
            }

            // Check if this is a language processing error and show a friendly message
            const friendlyMessage = this.getLanguageProcessingErrorMessage(errorMessage);
            if (friendlyMessage) {
                alert(friendlyMessage);
            } else {
                alert(`Cannot enhance this page.

${errorMessage}`);
            }
            this.setInitialState();
        } finally {
            this.isProcessing = false;
            this.processingContext = null;
            // Ensure loading is hidden if it wasn't handled by state changes
            document.getElementById('loading').style.display = 'none';
        }
        });
    }

    async restorePage() {
        try {
            const targetTabId = await this.getTargetTabId();
            await chrome.runtime.sendMessage({ action: 'restore', tabId: targetTabId });
        } catch (error) {
            console.error('Error restoring:', error);
        }
        this.lastEnhancement = null;
        this.setInitialState();
        this.saveTabState();
        this.clearRootsSummary();
    }

    setProcessingState(processing) {
        const enhanceButton = document.getElementById('enhance-button');
        const restoreButton = document.getElementById('restore-button');

        enhanceButton.disabled = true;
        restoreButton.disabled = true;

        this.isProcessing = processing;
        this.updateEnhanceButtonLabel();
        document.getElementById('loading').style.display = processing ? 'block' : 'none';
    }

    setCompletedState() {
        const enhanceButton = document.getElementById('enhance-button');
        const restoreButton = document.getElementById('restore-button');

        enhanceButton.disabled = false;
        this.isProcessing = false;
        this.updateEnhanceButtonLabel();

        restoreButton.disabled = false;

        document.getElementById('loading').style.display = 'none';

        this.pageEnhanced = true;
    }

    setInitialState() {
        const enhanceButton = document.getElementById('enhance-button');
        const restoreButton = document.getElementById('restore-button');

        enhanceButton.disabled = false;
        this.isProcessing = false;
        this.updateEnhanceButtonLabel();

        restoreButton.disabled = true;

        document.getElementById('loading').style.display = 'none';

        // Re-check button state based on selections
        this.toggleEnhanceButton();

        this.pageEnhanced = false;
    }

    async fetchTextHash(tabId) {
        try {
            if (!tabId) return null;
            const response = await chrome.runtime.sendMessage({ action: 'get_text_hash', tabId });
            if (response && response.success) return response.data?.hash || response.hash || null;
        } catch (e) {
            // ignore
        }
        return null;
    }

    async shouldSkipEnhancement({ tabId, selections, lastEnhancement }) {
        if (!tabId || !lastEnhancement) return false;
        if (lastEnhancement.selectionOnly) return false;
        if (!this.areSelectionsEqual(lastEnhancement.selections, selections)) return false;
        if (!this.pageEnhanced) return false;

        let isEnhanced = false;
        try {
            const response = await chrome.runtime.sendMessage({ action: 'get_status', tabId });
            isEnhanced = !!(response && response.success && (response.isEnhanced || (response.data && response.data.isEnhanced)));
        } catch (e) {
            return false;
        }

        if (!isEnhanced) return false;

        if (!lastEnhancement.textHash) {
            return true;
        }

        const currentHash = await this.fetchTextHash(tabId);
        if (!currentHash || currentHash !== lastEnhancement.textHash) return false;

        return true;
    }

    areSelectionsEqual(left, right) {
        if (!left || !right) return false;
        return left.topic === right.topic && left.filter === right.filter && left.activity === right.activity;
    }

    async fetchReadingTutorStatus(tabId) {
        try {
            if (!tabId) return null;
            const response = await chrome.runtime.sendMessage({ action: 'get_reading_tutor_status', tabId });
            if (response && response.success) {
                if (response.data && response.data.count !== undefined) {
                    return response.data.count || 0;
                }
            }
        } catch (e) {
            // ignore
        }
        return null;
    }

    async ensureReadingTutorActive() {
        const targetTabId = await this.getTargetTabId();
        if (!targetTabId) return;

        // Don't try to activate if we don't have access to the tab
        const hasAccess = this.tabAccessCache.get(targetTabId);
        if (hasAccess !== true) return;

        const existingCount = await this.fetchReadingTutorStatus(targetTabId);

        if (existingCount && existingCount > 0) {
            this.setReadingTutorDirty(false);
            await this.ackReadingTutorRefresh(targetTabId);
            await this.sendReadingTutorWatch(true, targetTabId);
            return;
        }

        await this.activateReadingTutor();
    }



    async switchTab(tabName, { persist = true, restoreOnExit = true } = {}) {
        const previousTab = this.currentTab;
        this.currentTab = tabName;

        // Remove active class from all tabs and buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Add active class to selected tab and button
        const activeButton = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
        if (activeButton) activeButton.classList.add('active');
        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) activeContent.classList.add('active');

        // Handle Reading Tutor activation
        if (tabName === 'reading-tutor') {
            await this.ensureReadingTutorActive();
            // Restore last selected subtab
            await this.switchSubTab(this.lastReadingTutorSubTab, { persist: false });
        } else {
            if (this.processingContext === 'reading-tutor') {
                this.readingTutorActivationToken++;
                this.isProcessing = false;
                this.processingContext = null;
                document.getElementById('loading').style.display = 'none';
            }
            this.stopReadingTutorPolling();
            this.setReadingTutorDirty(false);
            this.setReadingTutorPaused(false);
            this.setReadingTutorProcessing(false);
            this.readingTutorBatchInProgress = false;
            this.readingTutorBatchProgress = null;
            this.updateReadingTutorBatchProgress(null);
            // Hide attribution when leaving reading tutor
            const attribution = document.getElementById('openrussian-attribution');
            if (attribution) {
                attribution.style.display = 'none';
            }

            // If leaving Reading Tutor or switching to Reading Activities, restore page
            if (restoreOnExit && previousTab === 'reading-tutor') {
                await this.runExclusive(() => this.restorePage());
            }
        }

        if (persist && !this.isApplyingTabState) {
            await this.saveTabState();
        }
    }

    async switchSubTab(subTabName, { persist = true } = {}) {
        this.lastReadingTutorSubTab = subTabName;

        const attribution = document.getElementById('openrussian-attribution');
        if (attribution) {
            attribution.style.display = (subTabName === 'translations-and-tables') ? 'block' : 'none';
        }

        document.querySelectorAll('.sub-tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelectorAll('.sub-tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });

        const button = document.querySelector(`.sub-tab-button[data-subtab="${subTabName}"]`);
        if (button) button.classList.add('active');

        const content = document.getElementById(`${subTabName}-subtab`);
        if (content) {
            content.classList.add('active');
            content.style.display = 'block';
        }

        const tabId = await this.getTargetTabId();
        const currentHash = this.readingTutorRestoreHash || await this.fetchReadingTutorHash();
        const readingTutorCount = tabId ? await this.fetchReadingTutorStatus(tabId) : 0;
        const hasStoredSelection = this.lastReadingTutorSelectionData || (this.lastReadingTutorSelectionIndex !== null && this.lastReadingTutorSelectionIndex !== undefined);
        const canRestoreSelection = !!(this.lastReadingTutorSelectionHash && currentHash && this.lastReadingTutorSelectionHash === currentHash);
        const hashMismatch = !!(this.lastReadingTutorSelectionHash && currentHash && this.lastReadingTutorSelectionHash !== currentHash);

        if (subTabName === 'grammar-highlighter') {
            this.initializeGrammarHighlighterUI();

            if (tabId) {
                // Clear Translations selection
                chrome.tabs.sendMessage(tabId, { action: 'clear_reading_tutor_selection' }).catch(() => {});
                // Apply Grammar Highlighter styles
                this.updateGrammarHighlighterHighlighting();
            }
        } else if (subTabName === 'translations-and-tables') {
            if (tabId) {
                // Clear Grammar Highlighter styles
                chrome.tabs.sendMessage(tabId, {
                    action: 'update_grammar_highlighter_styles',
                    css: ''
                }).catch(() => {});

                if (canRestoreSelection || (hasStoredSelection && !hashMismatch && readingTutorCount > 0)) {
                    // Restore Translations selection
                    if (this.lastReadingTutorSelectionIndex !== undefined && this.lastReadingTutorSelectionIndex !== null) {
                        chrome.tabs.sendMessage(tabId, {
                            action: 'restore_reading_tutor_selection',
                            index: this.lastReadingTutorSelectionIndex
                        }).catch(() => {});
                    }

                    // Restore side panel content
                    if (this.lastReadingTutorSelectionData) {
                        this.handleReadingTutorSelection(this.lastReadingTutorSelectionData);
                    }
                } else if (hasStoredSelection && !hashMismatch && !currentHash && readingTutorCount > 0) {
                    // Attempt to refresh the hash for future restores.
                    await this.syncReadingTutorHash();
                } else if (hasStoredSelection && hashMismatch) {
                    this.clearReadingTutorSelectionState({ tabId, showInstructions: true });
                }
            }
        } else if (subTabName === 'vocabulary') {
            if (tabId) {
                chrome.tabs.sendMessage(tabId, {
                    action: 'update_grammar_highlighter_styles',
                    css: ''
                }).catch(() => {});
            }
            await this.updateVocabularyTable();
        }

        if (persist && !this.isApplyingTabState) {
            await this.saveTabState();
        }
    }

    initializeGrammarHighlighterUI() {
        const container = document.getElementById('grammar-highlighter-filters');
        if (!container || container.children.length > 0) return; // Already initialized

        const createTagButton = (tagObj, category) => {
            const button = document.createElement('button');
            button.textContent = tagObj.label;
            button.className = 'tag-toggle';
            button.dataset.category = category;
            button.dataset.tag = tagObj.tag;

            button.onclick = () => {
                button.classList.toggle('active');
                this.updateGrammarHighlighterHighlighting();
                this.syncGrammarHighlighterStateFromUI();
                this.saveTabState();
            };

            return button;
        };

        const grid = document.createElement('div');
        grid.className = 'grammar-highlighter-grid';
        container.appendChild(grid);

        const appendHeader = (text) => {
            const header = document.createElement('h4');
            header.textContent = text;
            header.className = 'grammar-grid-header';
            grid.appendChild(header);
        };

        const appendCell = (node, options = {}) => {
            const cell = document.createElement('div');
            cell.className = 'grammar-grid-cell';
            if (options.divider) {
                cell.classList.add('grammar-grid-divider');
            }
            if (options.spacer) {
                cell.classList.add('grammar-grid-spacer');
            }
            if (node) {
                cell.appendChild(node);
            }
            grid.appendChild(cell);
        };

        const appendRow = (category, rowTags, options = {}) => {
            rowTags.forEach((tagObj, index) => {
                const divider = options.dividers && index < 2;
                if (tagObj) {
                    const button = createTagButton(tagObj, tagObj.category || category);
                    appendCell(button, { divider });
                } else {
                    appendCell(null, { divider, spacer: true });
                }
            });
        };

        const appendRowWise = (category, tags, options = {}) => {
            for (let i = 0; i < tags.length; i += 3) {
                const rowTags = tags.slice(i, i + 3);
                while (rowTags.length < 3) {
                    rowTags.push(null);
                }
                appendRow(category, rowTags, options);
            }
        };

        const appendColumnGroup = (category, columns, options = {}) => {
            const maxRows = Math.max(...columns.map(col => col.length));
            for (let row = 0; row < maxRows; row++) {
                const rowTags = columns.map(col => col[row] || null);
                appendRow(category, rowTags, options);
            }
        };

        const appendHeaderRow = (headers, options = {}) => {
            headers.forEach((text, index) => {
                const divider = options.dividers && index < 2;
                const header = document.createElement('h4');
                header.textContent = text;
                header.className = 'grammar-grid-subheader';
                appendCell(header, { divider });
            });
        };

        appendHeader('Part of Speech');
        appendColumnGroup('Part of Speech', [
            [
                { tag: 'N', label: 'Noun' },
                { tag: 'V', label: 'Verb' },
                { tag: 'A', label: 'Adjective' },
                { tag: 'Adv', label: 'Adverb' },
                { tag: 'Pron', label: 'Pronoun' }
            ],
            [
                { tag: 'Num', label: 'Numeral' },
                { tag: 'Det', label: 'Determiner' },
                { tag: 'Pr', label: 'Preposition' },
                { tag: 'CC', label: 'Coord. Conj.' },
                { tag: 'CS', label: 'Subord. Conj.' }
            ],
            [
                { tag: 'Interj', label: 'Interjection' },
                { tag: 'Pcle', label: 'Particle' },
                { tag: 'Paren', label: 'Parenthetical' }
            ]
        ]);

        appendHeader('Case');
        appendColumnGroup('Case', [
            [
                { tag: 'Nom', label: 'Nominative' },
                { tag: 'Acc', label: 'Accusative' },
                { tag: 'Gen', label: 'Genitive' }
            ],
            [
                { tag: 'Loc', label: 'Prepositional' },
                { tag: 'Dat', label: 'Dative' },
                { tag: 'Ins', label: 'Instrumental' }
            ],
            [
                { tag: 'Loc2', label: 'Locative' },
                { tag: 'Gen2', label: 'Genitive 2' }
            ]
        ]);

        appendHeaderRow(['Gender', 'Number', 'Animacy'], { dividers: true });
        appendColumnGroup(null, [
            [
                { tag: 'Msc', label: 'Masculine', category: 'Gender' },
                { tag: 'Fem', label: 'Feminine', category: 'Gender' },
                { tag: 'Neu', label: 'Neuter', category: 'Gender' }
            ],
            [
                { tag: 'Sg', label: 'Singular', category: 'Number' },
                { tag: 'Pl', label: 'Plural', category: 'Number' }
            ],
            [
                { tag: 'Anim', label: 'Animate', category: 'Animacy' },
                { tag: 'Inan', label: 'Inanimate', category: 'Animacy' }
            ]
        ], { dividers: true });

        appendHeader('Pronouns');
        appendRowWise('Pronouns', [
            { tag: 'Pers', label: 'Personal' },
            { tag: 'Refl', label: 'Reflexive' },
            { tag: 'Dem', label: 'Demonstrative' },
            { tag: 'Pos', label: 'Possessive' },
            { tag: 'Interr', label: 'Interrogative' },
            { tag: 'Rel', label: 'Relative' },
            { tag: 'Neg', label: 'Negative' },
            { tag: 'Indef', label: 'Indefinite' }
        ]);

        appendHeader('Adjectives');
        appendRowWise('Adjectives', [
            { tag: 'Cmpar', label: 'Comparative' },
            { tag: 'Pred', label: 'Short Form' }
        ]);

        appendHeader('Person');
        appendColumnGroup('Person', [
            [
                { tag: 'Sg1', label: '1Sg' },
                { tag: 'Sg2', label: '2Sg' },
                { tag: 'Sg3', label: '3Sg' }
            ],
            [
                { tag: 'Pl1', label: '1Pl' },
                { tag: 'Pl2', label: '2Pl' },
                { tag: 'Pl3', label: '3Pl' }
            ],
            []
        ]);

        appendHeader('Verb Form');
        appendRowWise('Verb Form', [
            { tag: 'Inf', label: 'Infinitive' },
            { tag: 'Imp', label: 'Imperative' },
            { tag: 'Pass', label: 'Passive Voice' }
        ]);

        appendHeader('Participles');
        appendColumnGroup('Verb Form', [
            [
                { tag: 'PrsAct', label: 'Pres. Act.' },
                { tag: 'PstAct', label: 'Past Act.' }
            ],
            [
                { tag: 'PrsPss', label: 'Pres. Pass.' },
                { tag: 'PstPss', label: 'Past Pass.' }
            ],
            []
        ]);

        appendHeader('Tense');
        appendRowWise('Tense', [
            { tag: 'Pst', label: 'Past' },
            { tag: 'Prs', label: 'Present' },
            { tag: 'Fut', label: 'Future' }
        ]);

        appendHeader('Aspect');
        appendRowWise('Aspect', [
            { tag: 'Impf', label: 'Imperfective' },
            { tag: 'Perf', label: 'Perfective' }
        ]);
    }

    async updateGrammarHighlighterHighlighting() {
        const activeButtons = document.querySelectorAll('.tag-toggle.active');
        const ignoreAmbiguity = document.getElementById('ignore-ambiguity').checked;

        // Build CSS selector with AND logic for all selected tags
        const tagSelectors = [];
        activeButtons.forEach(btn => {
            const tag = btn.dataset.tag;
            const selectors = [`.rltk-tag-${tag}`];
            if (!ignoreAmbiguity) {
                selectors.push(`.rltk-tag-${tag}-tentative`);
            }
            tagSelectors.push(`:is(${selectors.join(', ')})`);
        });

        let css = '';
        if (tagSelectors.length > 0) {
            const fullSelector = tagSelectors.join('');
            css = `${fullSelector} { background-color: rgba(255, 255, 0, 0.3); border-bottom: 2px solid #ffc107; }`;
        }

        const targetTabId = await this.getTargetTabId();
        if (targetTabId) {
            chrome.tabs.sendMessage(targetTabId, {
                action: 'update_grammar_highlighter_styles',
                css: css
            });
        }
    }

    isStaleActivation(token) {
        return token !== this.readingTutorActivationToken || this.currentTab !== 'reading-tutor';
    }

    async activateReadingTutor(options = {}) {
        const force = !!options.force;
        const resume = !!options.resume;
        const activationToken = ++this.readingTutorActivationToken;
        if (!resume) {
            this.readingTutorBatchInProgress = false;
            this.readingTutorBatchProgress = null;
            this.updateReadingTutorBatchProgress(null);
        }
        this.setReadingTutorProcessing(true);
        this.setReadingTutorPaused(false);
        this.clearAnalysisWarning();
        // Show instructions
        const instructions = document.getElementById('reading-tutor-instructions');
        if (instructions) instructions.style.display = this.readingTutorInstructionsDismissed ? 'none' : 'block';

        const targetTabId = await this.getTargetTabId();
        if (targetTabId) {
            const existingCount = await this.fetchReadingTutorStatus(targetTabId);
            if (!force && existingCount && existingCount > 0) {
                this.setReadingTutorDirty(false);
                await this.ackReadingTutorRefresh(targetTabId);
                await this.sendReadingTutorWatch(true, targetTabId);
                this.setReadingTutorProcessing(false);
                return;
            }
        }

        // 1. Restore page to clear any existing activity
        if (!resume) {
            await this.restorePage();
        }

        if (this.currentTab !== 'reading-tutor' || activationToken !== this.readingTutorActivationToken) return;

        // 2. Trigger enhancement for Reading Tutor
        // We simulate an enhancement request with specific parameters
        const selections = {
            topic: 'reading-tutor',
            filter: 'all',
            activity: 'explore'
        };

        this.isProcessing = true;
        this.processingContext = 'reading-tutor';
        const container = document.getElementById('reading-tutor-results');

        let keepProcessingForBatches = false;
        try {
            const targetTabId = this.debugTabId || this.currentTabId;
            if (this.isStaleActivation(activationToken)) {
                return;
            }
            const resumeFromBatch = resume ? Number(this.readingTutorBatchProgress?.processed || 0) : 0;
            const response = await chrome.runtime.sendMessage({
                action: 'enhance',
                selections: selections,
                tabId: targetTabId,
                resumeFromBatch: resume ? resumeFromBatch : undefined
            });

            if (!response.success) {
                throw new Error(response.error);
            }

            const batching = response.batching || response.data?.batching;
            if (batching) {
                keepProcessingForBatches = true;
                this.readingTutorBatchInProgress = true;
                this.setReadingTutorProcessing(true);
                if (resume) {
                    this.updateReadingTutorBatchProgress(this.readingTutorBatchProgress);
                }
                return;
            }

            if (this.isStaleActivation(activationToken)) {
                return;
            }

            if (container) container.innerHTML = '<div class="info"></div>';

            // Poll to ensure Reading Tutor content is actually injected.
            const processed = await this.waitForReadingTutorProcessed(targetTabId, { attempts: 10, delayMs: 500 });
            if (!processed) {
                // Retry once if nothing was injected (can happen if the page was still loading).
                await chrome.runtime.sendMessage({
                    action: 'enhance',
                    selections: selections,
                    tabId: targetTabId
                });
                await this.waitForReadingTutorProcessed(targetTabId, { attempts: 10, delayMs: 500 });
            }

            if (this.isStaleActivation(activationToken)) {
                return;
            }

            this.setReadingTutorDirty(false);
            await this.ackReadingTutorRefresh(targetTabId);
            await this.sendReadingTutorWatch(true, targetTabId);
        } catch (error) {
            const errorMessage = (error && error.message) ? error.message : String(error);
            if (!this.isAccessErrorMessage(errorMessage)) {
                console.error('Error activating Reading Tutor:', error);
            }
            if (errorMessage.includes('Could not establish connection') || errorMessage.includes('Receiving end does not exist')) {
                const targetTabId = this.debugTabId || this.currentTabId;
                if (targetTabId) {
                    await this.checkAccess(targetTabId);
                }
                if (container) container.innerHTML = '<div class="info"></div>';
                return;
            }
            if (this.isAccessErrorMessage(errorMessage)) {
                const targetTabId = this.debugTabId || this.currentTabId;
                if (targetTabId) {
                    await this.checkAccess(targetTabId);
                }
                if (container) container.innerHTML = '<div class="info"></div>';
                return;
            }
            const friendlyMessage = this.getLanguageProcessingErrorMessage(errorMessage);
            const displayMessage = friendlyMessage || `Failed to activate: ${errorMessage}`;
            if (container) container.innerHTML = `<div class="error">${displayMessage}</div>`;
        } finally {
            if (!keepProcessingForBatches && !this.readingTutorBatchInProgress) {
                this.isProcessing = false;
                if (this.processingContext === 'reading-tutor') {
                    this.processingContext = null;
                }
                this.setReadingTutorProcessing(false);
            }
        }
    }

    async waitForReadingTutorProcessed(tabId, { attempts = 10, delayMs = 500 } = {}) {
        for (let i = 0; i < attempts; i++) {
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'get_reading_tutor_status',
                    tabId: tabId
                });
                const count = response?.data?.count ?? response?.count ?? 0;
                if (response && response.success && count > 0) {
                    return true;
                }
            } catch (e) {
                // ignore and retry
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        return false;
    }

    async fetchReadingTutorHash() {
        try {
            const targetTabId = await this.getTargetTabId();
            if (!targetTabId) return null;
            const response = await chrome.runtime.sendMessage({
                action: 'get_reading_tutor_restore_hash',
                tabId: targetTabId
            });
            if (response && response.success) {
                const hash = response.data?.hash || response.hash || null;
                if (hash) return hash;
            }
        } catch (e) {
            // ignore
        }
        return null;
    }

    async syncReadingTutorHash() {
        this.readingTutorRestoreHash = await this.fetchReadingTutorHash();
        if (!this.isApplyingTabState) {
            this.saveTabState();
        }
    }

    startReadingTutorPolling() {
        this.sendReadingTutorWatch(true);
    }

    stopReadingTutorPolling() {
        this.sendReadingTutorWatch(false);
    }

    setAutoEnhance(enabled) {
        try {
            chrome.storage.local.set({ enabled: enabled });
            if (enabled) {
                this.enhancePage();
            }
        } catch (error) {
            console.error('Error setting auto-enhance:', error);
        }
    }

    onTopicChange(topic) {
        this.checkForFilters(topic);
        this.updateActivities(topic);
        this.toggleEnhanceButton();
        this.toggleDensitySection();
        this.updateWordStressNoteVisibility(topic);
        this.updateRootsSummaryVisibility(topic);
    }

    updateWordStressNoteVisibility(topic, activity) {
        const stressNote = document.getElementById('word-stress-note');
        if (!stressNote) return;

        const currentTopic = topic ?? document.getElementById('topic-menu')?.value;
        const currentActivity = activity ?? document.getElementById('activity-menu')?.value;

        const shouldShow = currentTopic === 'word-stress' && (currentActivity === 'color' || currentActivity === 'hover' || currentActivity === 'click');
        stressNote.style.display = shouldShow ? 'block' : 'none';
    }

    updateRootsSummaryVisibility(topic, activity) {
        const section = document.getElementById('roots-summary-section');
        if (!section) return;

        const currentTopic = topic ?? document.getElementById('topic-menu')?.value;
        const currentActivity = activity ?? document.getElementById('activity-menu')?.value;
        const shouldShow = currentTopic === 'roots' && currentActivity === 'color' && Array.isArray(this.lastRootsSummary);
        section.style.display = shouldShow ? 'block' : 'none';
    }

    clearRootsSummary() {
        this.lastRootsSummary = null;
        const section = document.getElementById('roots-summary-section');
        if (!section) return;
        const tbody = section.querySelector('tbody');
        if (tbody) tbody.innerHTML = '';
        section.style.display = 'none';
    }

    renderRootsSummary(summary) {
        this.lastRootsSummary = Array.isArray(summary) ? summary : [];
        const section = document.getElementById('roots-summary-section');
        if (!section) return;

        const tbody = section.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        this.lastRootsSummary.forEach(entry => {
            const row = document.createElement('tr');

            const rootCell = document.createElement('td');
            const rootLabel = document.createElement('div');
            rootLabel.textContent = `${entry.definition} (${entry.count})`;
            rootCell.appendChild(rootLabel);

            const lemmaCell = document.createElement('td');
            lemmaCell.textContent = (entry.lemmas || []).join(', ');

            row.appendChild(rootCell);
            row.appendChild(lemmaCell);
            tbody.appendChild(row);
        });

        this.updateRootsSummaryVisibility();
    }

    checkForFilters(topic) {
        const filterMenu = document.getElementById('filter-menu');
        const filterSection = document.getElementById('filter-section');

        // Clear existing filter options
        filterMenu.innerHTML = '<option value="all">No filter</option><option value="unselected">Select filter...</option>';
        filterSection.style.display = 'none';

        // Russian topic filters based on JSON files
        const topicFilters = {
            'participles': [
                { id: 'present-active', val: 'PrsAct', text: 'Present Active' },
                { id: 'present-passive', val: 'PrsPss', text: 'Present Passive' },
                { id: 'past-active', val: 'PstAct', text: 'Past Active' },
                { id: 'past-passive', val: 'PstPss', text: 'Past Passive' }
            ],
            'verb-tense': [
                { id: 'past', val: 'Pst', text: 'Past' },
                { id: 'present', val: 'Prs', text: 'Present' },
                { id: 'future', val: 'Fut', text: 'Future' }
            ],
            'verbs': [
                { id: 'imperfective', val: 'Impf', text: 'Imperfective' },
                { id: 'perfective', val: 'Perf', text: 'Perfective' }
            ],
            'verb-aspect-pairs': [
                { id: 'imperfective', val: 'Impf', text: 'Imperfective' },
                { id: 'perfective', val: 'Perf', text: 'Perfective' }
            ],
            'nouns': [
                { id: 'Sg', val: 'Sg', text: 'Singular' },
                { id: 'Pl', val: 'Pl', text: 'Plural' }
            ],
            'adjectives': [
                { id: 'Fem', val: 'Fem', text: 'Feminine' },
                { id: 'Msc', val: 'Msc', text: 'Masculine' },
                { id: 'Neu', val: 'Neu', text: 'Neuter' },
                { id: 'MFN', val: 'MFN', text: 'All genders' }
            ],
            'gerunds': [
                { id: 'present-active', val: 'PrsAct', text: 'Present' },
                { id: 'past-active', val: 'PstAct', text: 'Past' }
            ]
        };

        if (topicFilters[topic]) {
            this.addFilterOptions(topicFilters[topic]);
            filterSection.style.display = 'block';
        }
    }

    addFilterOptions(filters) {
        const filterMenu = document.getElementById('filter-menu');

        filters.forEach(filter => {
            const option = document.createElement('option');
            option.id = filter.id;
            option.value = filter.val;
            option.textContent = filter.text;
            filterMenu.appendChild(option);
        });
    }

    updateActivities(topic) {
        const activityMenu = document.getElementById('activity-menu');
        const activitySection = activityMenu.closest('.panel-section');

        activityMenu.innerHTML = '<option value="unselected">Pick an Activity</option>';

        if (topic !== 'unselected') {
            const activities = this.getRussianActivities(topic);
            activities.forEach(activity => {
                const option = document.createElement('option');
                option.value = activity.val;
                option.textContent = activity.text;
                activityMenu.appendChild(option);
            });
            activitySection.style.display = 'block';
        } else {
            activitySection.style.display = 'none';
        }

        this.toggleDensitySection();
    }

    getRussianActivities(topic) {
        const activities = {
            'adjectives': [
                { val: 'color', text: 'Highlight / Color' },
                { val: 'click', text: 'Click to identify' },
                { val: 'mc', text: 'Multiple Choice' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'gerunds': [
                { val: 'color', text: 'Highlight / Color' },
                { val: 'click', text: 'Click to identify' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'nouns': [
                { val: 'color', text: 'Highlight / Color' },
                { val: 'click', text: 'Click to identify' },
                { val: 'mc', text: 'Multiple Choice' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'participles': [
                { val: 'color', text: 'Highlight / Color' },
                { val: 'click', text: 'Click to identify' },
                { val: 'mc', text: 'Multiple Choice' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'phonetics': [
                { val: 'color', text: 'Show Phonetics' },
                { val: 'click', text: 'Hover' },
                { val: 'mc', text: 'Multiple Choice' }
            ],
            'prepositions': [
                { val: 'color', text: 'Highlight / Color' },
                { val: 'click', text: 'Click to identify' },
                { val: 'mc', text: 'Multiple Choice' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'roots': [
                { val: 'color', text: 'Highlight / Color' },
                { val: 'mc', text: 'Multiple Choice' }
            ],
            'verb-aspect-pairs': [
                { val: 'color', text: 'Highlight / Color' },
                { val: 'click', text: 'Click to identify' },
                { val: 'mc', text: 'Multiple Choice' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'verb-tense': [
                { val: 'color', text: 'Highlight / Color' },
                { val: 'click', text: 'Click to identify' },
                { val: 'mc', text: 'Multiple Choice' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'verbs': [
                { val: 'color', text: 'Highlight / Color' },
                { val: 'click', text: 'Click to identify' },
                { val: 'mc', text: 'Multiple Choice' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'word-stress': [
                { val: 'color', text: 'Mark Stress' },
                { val: 'click', text: 'Click on stressed vowels' },
                { val: 'mc', text: 'Multiple Choice' },
                { val: 'hover', text: 'Hover' }
            ]
        };

        return activities[topic] || [];
    }

    toggleEnhanceButton() {
        const enhanceButton = document.getElementById('enhance-button');
        const filterMenu = document.getElementById('filter-menu');
        const activityMenu = document.getElementById('activity-menu');

        const filterSelected = filterMenu.style.display === 'none' || filterMenu.value !== 'unselected';
        const activitySelected = activityMenu.value !== 'unselected';

        enhanceButton.disabled = !(filterSelected && activitySelected);
    }

    initializeActivitySelectors() {
        const activityMenu = document.getElementById('activity-menu');
        Array.from(activityMenu.options).forEach(option => {
            this.activitySelectors[option.value] = option;
        });
    }

    async saveTabState(tabId = null) {
        if (this.isApplyingTabState) return;
        try {
            const targetTabId = tabId || await this.getTargetTabId();
            if (!targetTabId) return;
            const state = await this.captureTabState();

            const storage = chrome.storage.session || chrome.storage.local;
            await storage.set({ [`tabState_${targetTabId}`]: state });

            if (state.selections) {
                await chrome.storage.local.set(state.selections);
            }
        } catch (error) {
            console.error('Error saving tab state:', error);
        }
    }

    async loadTabState(tabId) {
        try {
            const storage = chrome.storage.session || chrome.storage.local;
            const key = `tabState_${tabId}`;
            const result = await storage.get(key);

            if (result[key]) {
                const stored = result[key];
                if (!stored.selections && (stored.topic || stored.filter || stored.activity)) {
                    stored.selections = {
                        topic: stored.topic,
                        filter: stored.filter,
                        activity: stored.activity
                    };
                }
                await this.applyTabState(stored);
            } else {
                // Fallback to last used global settings or defaults
                await this.loadStoredSettings();
                await this.applyTabState({});
                // After applying defaults, save the state so future loads have it
                await this.saveTabState(tabId);
            }
        } catch (error) {
            console.error('Error loading tab state:', error);
        }
    }

    applySelections(topic, filter, activity) {
        if (topic) {
            document.getElementById('topic-menu').value = topic;
            this.onTopicChange(topic);
        }

        if (filter) {
            // Ensure options are populated first (handled by onTopicChange)
            // But we need to wait for DOM update or just set it?
            // onTopicChange is synchronous in DOM manipulation, so it should be fine.
            const filterMenu = document.getElementById('filter-menu');
            // Check if the value exists in the options
            if ([...filterMenu.options].some(o => o.value === filter)) {
                filterMenu.value = filter;
            }
        }

        if (activity) {
            const activityMenu = document.getElementById('activity-menu');
            if ([...activityMenu.options].some(o => o.value === activity)) {
                activityMenu.value = activity;
            }
        }

        this.toggleDensitySection(activity);
        this.toggleEnhanceButton();
        this.updateWordStressNoteVisibility(topic, activity);
    }

    async loadStoredSettings() {
        try {
            const items = await new Promise((resolve, reject) => {
                chrome.storage.local.get(['enabled', 'language', 'topic', 'filter', 'activity'], (result) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve(result || {});
                });
            });

            const autoEnhanceCheckbox = document.getElementById('auto-enhance');
            if (items.enabled && autoEnhanceCheckbox) {
                autoEnhanceCheckbox.checked = items.enabled;
            }

            // Apply global settings as default
            this.applySelections(items.topic, items.filter, items.activity);
        } catch (error) {
            console.error('Error accessing storage:', error);
        }
    }

    clearReadingTutorSelectionState({ tabId, showInstructions = true } = {}) {
        this.lastReadingTutorSelectionIndex = null;
        this.lastReadingTutorSelectionData = null;
        this.lastReadingTutorSelectionHash = null;

        const container = document.getElementById('reading-tutor-results');
        if (container) container.innerHTML = '';

        const instructions = document.getElementById('reading-tutor-instructions');
        if (instructions && showInstructions && !this.readingTutorInstructionsDismissed) {
            instructions.style.display = 'block';
        }

        if (tabId) {
            chrome.tabs.sendMessage(tabId, { action: 'clear_reading_tutor_selection' }).catch(() => {});
        }

        if (!this.isApplyingTabState) {
            this.saveTabState();
        }
    }

    bindCaseTooltips(root) {
        const scope = root || document;
        const caseTooltipSpans = scope.querySelectorAll('.case-tooltip');
        caseTooltipSpans.forEach(span => {
            if (span.dataset.tooltipBound) return;
            span.dataset.tooltipBound = 'true';
            span.tabIndex = 0;

            const loadTooltip = async () => {
                if (span.dataset.tooltipLoaded) return;
                const url = span.dataset.caseSnippet;
                if (!url) return;
                try {
                    const response = await fetch(url);
                    const html = await response.text();
                    span.dataset.tooltipLoaded = 'true';
                    span.setAttribute('data-tooltip', html);
                } catch (e) {
                    // ignore
                }
            };

            const showTooltip = () => {
                const html = span.getAttribute('data-tooltip');
                if (!html) return;
                const existing = span.querySelector('.case-tooltip-content');
                if (existing) return;
                const tooltip = document.createElement('div');
                tooltip.className = 'case-tooltip-content';
                tooltip.innerHTML = html;
                span.appendChild(tooltip);

                const wordAnalysis = span.closest('.word-analysis');
                if (!wordAnalysis) return;

                const containerRect = wordAnalysis.getBoundingClientRect();
                const targetWidth = Math.round(containerRect.width * 0.9);
                tooltip.style.width = `${targetWidth}px`;
                tooltip.style.maxWidth = `${targetWidth}px`;

                const tooltipRect = tooltip.getBoundingClientRect();
                const minLeft = containerRect.left + 4;
                const maxLeft = containerRect.right - tooltipRect.width - 4;
                let shift = 0;
                if (tooltipRect.left < minLeft) {
                    shift = minLeft - tooltipRect.left;
                } else if (tooltipRect.left > maxLeft) {
                    shift = maxLeft - tooltipRect.left;
                }

                if (shift !== 0) {
                    tooltip.style.transform = `translateX(${shift}px)`;
                }
            };

            const hideTooltip = () => {
                const tooltip = span.querySelector('.case-tooltip-content');
                if (tooltip) tooltip.remove();
            };

            span.addEventListener('mouseenter', async () => {
                await loadTooltip();
                showTooltip();
            });
            span.addEventListener('focus', async () => {
                await loadTooltip();
                showTooltip();
            });
            span.addEventListener('mouseleave', hideTooltip);
            span.addEventListener('blur', hideTooltip);
        });
    }

    async handleReadingTutorSelection(data) {
        if (data.text === null && data.cohort === null) {
            this.clearReadingTutorSelectionState({ showInstructions: true });
            return;
        }

        if (data.index !== undefined) {
            this.lastReadingTutorSelectionIndex = data.index;
        }

        let currentHash = this.readingTutorRestoreHash || await this.fetchReadingTutorHash();
        if (!currentHash) {
            await this.syncReadingTutorHash();
            currentHash = this.readingTutorRestoreHash || null;
        }
        this.lastReadingTutorSelectionHash = currentHash || null;

        // Store the data for restoration
        this.lastReadingTutorSelectionData = data;
        if (!this.isApplyingTabState) {
            this.saveTabState();
        }

        const container = document.getElementById('reading-tutor-results');
        container.innerHTML = '<div class="loading">Analyzing...</div>';

        // Hide instructions
        const instructions = document.getElementById('reading-tutor-instructions');
        if (instructions) instructions.style.display = 'none';

        try {
            let cohorts;

            // Check if we received direct cohort data or just text
            if (typeof data === 'object' && data.cohort) {
                // We have the cohort directly from the click event
                cohorts = [data.cohort];
                const hasReadings = Array.isArray(cohorts[0]?.rs) && cohorts[0].rs.length > 0;
                if (!hasReadings) {
                    cohorts = null;
                }
            }

            if (!cohorts) {
                // Fallback to analyzing text (e.g. from selection)
                const text = typeof data === 'string' ? data : data.text;
                const analysisResponse = await chrome.runtime.sendMessage({
                    action: 'morph_analysis',
                    text: text
                });

                if (!analysisResponse.success) {
                    const sourceUrl = await this.getCurrentTabUrl();
                    this.setAnalysisWarning({
                        message: analysisResponse.error,
                        errorMessage: analysisResponse.error,
                        sourceUrl
                    });
                    container.innerHTML = `<div class="error">Analysis failed: ${analysisResponse.error}</div>`;
                    return;
                }
                const warnings = analysisResponse.data && Array.isArray(analysisResponse.data.warnings)
                    ? analysisResponse.data.warnings
                    : [];
                if (warnings.length > 0) {
                    this.setAnalysisWarning(warnings[0]);
                } else {
                    this.clearAnalysisWarning();
                }
                if (analysisResponse.data && Array.isArray(analysisResponse.data.disambigArray) && analysisResponse.data.disambigArray.length > 0) {
                    cohorts = analysisResponse.data.disambigArray;
                } else if (analysisResponse.data && Array.isArray(analysisResponse.data.ambigArray) && analysisResponse.data.ambigArray.length > 0) {
                    cohorts = analysisResponse.data.ambigArray;
                } else {
                    cohorts = analysisResponse.data;
                }
            }

            if (Array.isArray(cohorts)) {
                cohorts = cohorts.map((cohort) => {
                    if (cohort && cohort.rs === undefined && Array.isArray(cohort.r)) {
                        cohort.rs = cohort.r;
                    }
                    return cohort;
                });
            }

            if (!cohorts || cohorts.length === 0) {
                container.innerHTML = '<div class="info">No analysis found.</div>';
                return;
            }

            // Clear container
            container.innerHTML = '';

            // Process each cohort (word)
            for (const cohort of cohorts) {
                // Skip punctuation if desired, or show it
                // For now, show everything

                const wordDiv = document.createElement('div');
                wordDiv.className = 'word-analysis';
                wordDiv.style.marginBottom = '20px';
                wordDiv.style.borderBottom = '1px solid #eee';
                wordDiv.style.paddingBottom = '10px';

                // Generate stressed lemmas for all readings
                const readingsWithStress = await Promise.all(cohort.rs.map(async (r) => {
                    const lemma = r.l;
                    const tags = (r.ts || []).filter(t => !t.startsWith('<W:'));
                    const pos = tags.length > 0 ? tags[0] : null;
                    let stressedLemma = lemma;

                    // Construct input for stress generator to get stressed lemma
                    let input = null;
                    if (pos === 'N') {
                        const gender = tags.find(t => ['Msc', 'Fem', 'Neu', 'MFN'].includes(t));
                        const animacy = tags.find(t => ['Anim', 'Inan'].includes(t));
                        let tagStr = '+N';
                        if (gender) tagStr += '+' + gender;
                        if (animacy) tagStr += '+' + animacy;
                        tagStr += '+Sg+Nom';
                        input = lemma + tagStr;
                    } else if (pos === 'V') {
                        const aspect = tags.find(t => ['Impf', 'Perf'].includes(t));
                        const transitivity = tags.find(t => ['TV', 'IV'].includes(t));
                        let tagStr = '+V';
                        if (aspect) tagStr += '+' + aspect;
                        if (transitivity) tagStr += '+' + transitivity;
                        tagStr += '+Inf';
                        input = lemma + tagStr;
                    } else if (pos === 'A' || pos === 'Adj' || pos === 'Det') {
                         input = lemma + '+' + pos + '+Msc+Sg+Nom';
                    } else if (pos === 'Pron') {
                        // Try to reconstruct minimal tags for Pronoun lemma
                        // Usually Pron + (Pers) + (Gender) + (Number) + Nom
                        // But Pronouns are irregular.
                        // Let's try just lemma + Pron + Nom?
                        // Or use the tags we have, replacing Case with Nom.
                        const tagsWithoutCase = tags.filter(t => !['Nom', 'Gen', 'Dat', 'Acc', 'Ins', 'Loc', 'Voc'].includes(t));
                        input = lemma + '+' + tagsWithoutCase.join('+') + '+Nom';
                    }

                    if (input) {
                         try {
                             const response = await chrome.runtime.sendMessage({
                                action: 'generate',
                                input: input,
                                useStress: true
                            });
                            if (response.success && response.data && response.data.length > 0) {
                                stressedLemma = response.data[0];
                            }
                         } catch (e) {
                             console.warn('Failed to generate stress for lemma:', lemma, e);
                         }
                    }
                    return { ...r, stressedLemma, originalLemma: lemma };
                }));

                // Group readings by stressed lemma
                const readingsByLemma = {};
                for (const reading of readingsWithStress) {
                    if (!readingsByLemma[reading.stressedLemma]) {
                        readingsByLemma[reading.stressedLemma] = [];
                    }
                    readingsByLemma[reading.stressedLemma].push(reading);
                }

                // Kick off background loads but don't block UI rendering.
                this.loadFreqDict();
                this.loadTranslations();

                // Sort lemmas by frequency
                const sortedLemmas = Object.keys(readingsByLemma);
                if (this.freqDict) {
                    sortedLemmas.sort((a, b) => {
                        // Use original lemma for frequency lookup
                        const lemmaA = readingsByLemma[a][0].originalLemma;
                        const lemmaB = readingsByLemma[b][0].originalLemma;
                        const freqA = this.freqDict[lemmaA] || 0;
                        const freqB = this.freqDict[lemmaB] || 0;
                        return freqB - freqA;
                    });
                }

                for (const lemma of sortedLemmas) {
                    const lemmaDiv = document.createElement('div');
                    lemmaDiv.className = 'lemma-group';
                    lemmaDiv.style.marginLeft = '10px';

                    const lemmaReadings = readingsByLemma[lemma] || [];
                    const preferredReading = lemmaReadings.find(r => (r.ts || []).some(t => t === 'Num' || t.startsWith('Num'))) || lemmaReadings[0];
                    // Filter out weights from tags for processing
                    const tags = (preferredReading && preferredReading.ts ? preferredReading.ts : []).filter(t => !t.startsWith('<W:'));
                    const inflectingPOS = ['N', 'V', 'A', 'Adj', 'Pron', 'Num', 'Det'];
                    const explicitPos = tags.find(t => inflectingPOS.includes(t));
                    const hasNumeralTag = tags.some(t => t === 'Num' || t.startsWith('Num'));
                    const hasCaseTag = tags.some(t => ['Nom', 'Gen', 'Dat', 'Acc', 'Ins', 'Loc', 'Voc', 'Par', 'Loc2'].includes(t));
                    const pos = explicitPos || ((hasNumeralTag || hasCaseTag) ? 'Num' : (tags.length > 0 ? tags[0] : null));
                    const canInflect = pos && inflectingPOS.includes(pos);

                    const headerContainer = document.createElement('div');
                    headerContainer.style.display = 'flex';
                    headerContainer.style.alignItems = 'center';
                    headerContainer.style.gap = '8px';

                    let toggleButton = null;
                    let paradigmContainer = null;

                    if (canInflect) {
                        toggleButton = document.createElement('button');
                        toggleButton.textContent = '+';
                        toggleButton.className = 'toggle-button';
                        toggleButton.style.cursor = 'pointer';

                        headerContainer.appendChild(toggleButton);
                    } else {
                        // Add invisible spacer to maintain alignment
                        const spacer = document.createElement('span');
                        spacer.className = 'toggle-button-spacer';
                        headerContainer.appendChild(spacer);
                    }

                    const lemmaHeader = document.createElement('h4');
                    let labelText = `${lemma}`;

                    if (pos === 'V') {
                        const aspect = tags.find(t => ['Perf', 'Impf'].includes(t));
                        if (aspect) {
                            labelText += ` (${aspect})`;
                        }
                    } else if (pos === 'N') {
                        const gender = tags.find(t => ['Msc', 'Fem', 'Neu'].includes(t));
                        if (gender) {
                            labelText += ` (${gender})`;
                        }
                    }

                    // Create a span for the lemma text
                    const lemmaSpan = document.createElement('span');
                    lemmaSpan.textContent = labelText;
                    lemmaHeader.appendChild(lemmaSpan);

                    // Add translation if available
                    if (this.translations) {
                        // Normalize lemma for lookup: remove digits, stress marks, and lowercase
                        const cleanLemma = lemma.replace(/\d+/g, '').replace(/\u0301/g, '').toLowerCase();
                        const translationData = this.translations[cleanLemma];

                        if (translationData) {
                            let translationHtml = null;

                            // Map POS
                            let targetPos = null;
                            if (pos === 'N') targetPos = 'noun';
                            else if (pos === 'V') targetPos = 'verb';
                            else if (pos === 'A' || pos === 'Adj') targetPos = 'adjective';
                            else if (pos === 'Adv') targetPos = 'adverb';

                            let selectedPosKey = null;

                            if (targetPos && translationData[targetPos]) {
                                translationHtml = translationData[targetPos];
                                selectedPosKey = targetPos;
                            } else if (translationData['other']) {
                                // Many common words (incl. some adverbs like "уже") are stored under 'other'.
                                translationHtml = translationData['other'];
                                selectedPosKey = 'other';
                            } else {
                                // Fallback to any available POS entry.
                                const preferredOrder = ['noun', 'verb', 'adjective', 'adverb', 'expression', 'other'];
                                for (const key of preferredOrder) {
                                    if (translationData[key]) {
                                        translationHtml = translationData[key];
                                        selectedPosKey = key;
                                        break;
                                    }
                                }
                                if (!translationHtml) {
                                    const first = Object.values(translationData)[0];
                                    if (typeof first === 'string') {
                                        translationHtml = first;
                                        selectedPosKey = Object.keys(translationData)[0] || null;
                                    }
                                }
                            }

                            if (translationHtml) {
                                const transSpan = document.createElement('span');
                                transSpan.style.marginLeft = '10px';
                                transSpan.style.fontWeight = 'normal';
                                transSpan.style.fontSize = '0.9em';
                                transSpan.style.color = '#333';

                                const posMismatch = !!(targetPos && selectedPosKey && selectedPosKey !== targetPos);
                                if (posMismatch) {
                                    const prefix = document.createElement('span');
                                    prefix.textContent = 'Translation uncertain: ';
                                    prefix.style.fontStyle = 'italic';
                                    prefix.style.color = '#666';
                                    transSpan.appendChild(prefix);
                                }

                                const translationContent = document.createElement('span');
                                translationContent.innerHTML = translationHtml;
                                transSpan.appendChild(translationContent);

                                // Add event listeners for audio buttons
                                const audioBtns = transSpan.querySelectorAll('.rltk-audio-btn');
                                audioBtns.forEach(btn => {
                                    btn.addEventListener('click', (e) => {
                                        e.stopPropagation();
                                        const audioUrl = btn.getAttribute('data-audio-url');
                                        if (audioUrl) {
                                            new Audio(audioUrl).play();
                                        }
                                    });
                                });

                                lemmaHeader.appendChild(transSpan);
                            }
                        }
                    }

                    lemmaHeader.style.color = '#2c5aa0';
                    lemmaHeader.style.margin = '0';
                    lemmaHeader.style.display = 'flex';
                    lemmaHeader.style.alignItems = 'center';
                    lemmaHeader.style.flexWrap = 'wrap';

                    // Tooltip for readings
                    const readingsText = readingsByLemma[lemma].map(r => {
                        const t = (r.ts || []).filter(tag => !tag.startsWith('<W:'));
                        return t.join(' ');
                    }).join('\n');
                    lemmaHeader.title = readingsText;

                    headerContainer.appendChild(lemmaHeader);
                    lemmaDiv.appendChild(headerContainer);

                    const originalLemma = readingsByLemma[lemma][0].originalLemma;
                    const numeralReadings = readingsByLemma[lemma].filter(r => (r.ts || []).some(t => t === 'Num' || t.startsWith('Num')));
                    const paradigmReadings = pos === 'Num' && numeralReadings.length > 0 ? numeralReadings : readingsByLemma[lemma];

                    if (canInflect) {
                        paradigmContainer = document.createElement('div');
                        paradigmContainer.style.display = 'none';
                        paradigmContainer.style.marginTop = '10px';
                        lemmaDiv.appendChild(paradigmContainer);

                        toggleButton.onclick = async () => {
                            if (paradigmContainer.style.display === 'none') {
                                toggleButton.textContent = '-';
                                paradigmContainer.style.display = 'block';

                                if (!paradigmContainer.hasChildNodes()) {
                                    paradigmContainer.innerHTML = '<div class="loading">Generating...</div>';
                                    try {
                                        const result = await this.generateParadigm(originalLemma, pos, tags, paradigmReadings, cohort.form || cohort.w);
                                        const html = typeof result === 'string' ? result : result.html;
                                        const hasPassive = typeof result === 'object' ? result.hasPassive : false;
                                        const matchFound = typeof result === 'object' ? result.matchFound : false;

                                        paradigmContainer.innerHTML = html;
                                        this.bindCaseTooltips(paradigmContainer);

                                        if (!matchFound) {
                                            const warning = document.createElement('div');
                                            warning.className = 'warning';
                                            warning.style.backgroundColor = '#fff3cd';
                                            warning.style.color = '#856404';
                                            warning.style.padding = '10px';
                                            warning.style.marginBottom = '10px';
                                            warning.style.border = '1px solid #ffeeba';
                                            warning.style.borderRadius = '4px';
                                            warning.textContent = 'Oops! The clicked form was not found in the paradigm.';
                                            paradigmContainer.insertBefore(warning, paradigmContainer.firstChild);
                                        }

                                        if (hasPassive) {
                                            const showPassiveByDefault = paradigmReadings.some(r => (r.ts || []).includes('Pass'));

                                            const btn = document.createElement('button');
                                            btn.textContent = showPassiveByDefault ? 'Hide Passive Forms' : 'Show Passive Forms';
                                            btn.className = 'passive-toggle-btn';
                                            btn.style.marginBottom = '10px';
                                            btn.style.fontSize = '0.9em';
                                            btn.style.padding = '2px 8px';
                                            btn.style.cursor = 'pointer';

                                            btn.onclick = () => {
                                                const spans = paradigmContainer.querySelectorAll('.passive-variant');
                                                if (spans.length > 0) {
                                                    const isHidden = spans[0].style.display === 'none';
                                                    spans.forEach(s => s.style.display = isHidden ? 'inline' : 'none');
                                                    btn.textContent = isHidden ? 'Hide Passive Forms' : 'Show Passive Forms';
                                                }
                                            };
                                            paradigmContainer.insertBefore(btn, paradigmContainer.firstChild);

                                            if (showPassiveByDefault) {
                                                const spans = paradigmContainer.querySelectorAll('.passive-variant');
                                                spans.forEach(s => s.style.display = 'inline');
                                            }
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        paradigmContainer.innerHTML = '<div class="error">Error generating paradigm</div>';
                                    }
                                }
                            } else {
                                toggleButton.textContent = '+';
                                paradigmContainer.style.display = 'none';
                            }
                        };

                        // Automatically expand if there is only one lemma
                        if (Object.keys(readingsByLemma).length === 1 && !this.readingTutorBatchInProgress) {
                            toggleButton.click();
                        }
                    }

                    wordDiv.appendChild(lemmaDiv);
                }

                container.appendChild(wordDiv);
            }

            this.bindCaseTooltips(container);

        } catch (error) {
            container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
    }

    async generateParadigm(lemma, pos, tags, currentReadings = [], surfaceForm = null) {
        let hasPassive = false;
        let matchFound = false;

        const caseTooltipByTag = {
            Nom: 'resources/snippets/nominative-case.html',
            Acc: 'resources/snippets/accusative-case.html',
            Gen: 'resources/snippets/genitive-case.html',
            Prep: 'resources/snippets/prepositional-case.html',
            Dat: 'resources/snippets/dative-case.html',
            Ins: 'resources/snippets/instrumental-case.html',
            Inst: 'resources/snippets/instrumental-case.html',
            Short: 'resources/snippets/short-adjective-form.html'
        };
        const caseLabelCache = new Map();
        const buildCaseLabelHtml = (caseTag, labelText) => {
            const cacheKey = `${caseTag}|${labelText}`;
            if (caseLabelCache.has(cacheKey)) return caseLabelCache.get(cacheKey);

            const snippet = caseTooltipByTag[caseTag];
            if (!snippet) {
                caseLabelCache.set(cacheKey, labelText);
                return labelText;
            }

            const url = chrome.runtime.getURL(`rltk/${snippet}`);
            const html = `<span class="case-tooltip" data-case-snippet="${url}">${labelText}</span>`;
            caseLabelCache.set(cacheKey, html);
            return html;
        };

        const posTags = ['N', 'V', 'A', 'Adj', 'Pron', 'Num', 'Det'];
        const inferredPos = tags.find(t => posTags.includes(t));
        const hasNumeralTag = tags.some(t => t === 'Num' || t.startsWith('Num'));
        const hasCaseTag = tags.some(t => ['Nom', 'Gen', 'Dat', 'Acc', 'Ins', 'Loc', 'Voc', 'Par', 'Loc2'].includes(t));
        const normalizedPos = inferredPos || ((hasNumeralTag || hasCaseTag) ? 'Num' : pos);
        pos = normalizedPos;

        const participleTags = ['PrsAct', 'PstAct', 'PrsPss', 'PstPss'];
        const hasParticipleReading = (currentReadings || []).some(r => (r.ts || []).some(t => participleTags.includes(t)));

        let surfaceFormForDisplay = surfaceForm;

        const accentParticipleSurfaceForm = async () => {
            if (!surfaceForm) return surfaceForm;
            if (/[\u0300\u0301]/.test(surfaceForm)) return surfaceForm;

            const participleReading = (currentReadings || []).find(r => (r.ts || []).some(t => participleTags.includes(t)));
            if (!participleReading || !participleReading.ts) return surfaceForm;

            const readingTags = participleReading.ts.filter(t => !t.startsWith('<W:'));
            if (readingTags.length === 0) return surfaceForm;

            const input = `${lemma}+${readingTags.join('+')}`;

            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'generate',
                    input,
                    useStress: true
                });

                if (response.success && response.data && response.data.length > 0) {
                    const stressed = response.data[0];
                    if (window.RLTKUtils && typeof window.RLTKUtils.matchCapitalization === 'function' && typeof window.RLTKUtils.detectCapitalization === 'function') {
                        const capType = window.RLTKUtils.detectCapitalization(surfaceForm);
                        return window.RLTKUtils.matchCapitalization(stressed, capType);
                    }
                    return stressed;
                }
            } catch (e) {
                console.warn('Failed to accent participle surface form', e);
            }

            return surfaceForm;
        };

        if (hasParticipleReading) {
            surfaceFormForDisplay = await accentParticipleSurfaceForm();
        }

        const checkMatch = (input, generatedForm) => {
            if (!currentReadings || currentReadings.length === 0) return { isMatch: false };

            const tagsToIgnore = ['Ind', 'AnIn'];
            if (pos !== 'Num') {
                tagsToIgnore.push('Num');
            }
            const inputTags = input.split('+').slice(1).filter(t => !tagsToIgnore.includes(t));

            const isParticiple = inputTags.some(t => participleTags.includes(t));

            // Tags that vary for participles but shouldn't break the match for the "slot"
            const inflectionTags = ['Msc', 'Fem', 'Neu', 'MFN', 'Sg', 'Pl', 'Nom', 'Gen', 'Dat', 'Acc', 'Ins', 'Loc', 'Voc', 'Anim', 'Inan'];

            const isPassiveParticiple = inputTags.includes('PrsPss') || inputTags.includes('PstPss');

            const match = currentReadings.find(reading => {
                const readingTags = (reading.ts || []);

                // Strict Pass check (except for inherently passive participles)
                if (!isPassiveParticiple) {
                    const inputHasPass = inputTags.includes('Pass');
                    const readingHasPass = readingTags.includes('Pass');
                    if (inputHasPass !== readingHasPass) return false;
                }

                // 1. Check Participle Type Match
                if (isParticiple) {
                    const partTag = inputTags.find(t => participleTags.includes(t));
                    if (!readingTags.includes(partTag)) return false;

                    // Ensure we don't match Gerunds (Adv) to Participles (Adjectival)
                    if (!inputTags.includes('Adv') && readingTags.includes('Adv')) return false;

                    const relevantInputTags = inputTags.filter(t => !inflectionTags.includes(t) && t !== partTag && t !== 'Pass');
                    return relevantInputTags.every(t => readingTags.includes(t));
                }

                // 2. Standard Match
                return inputTags.every(t => readingTags.includes(t));
            });

            if (match) {
                // Normalize for comparison
                const normalize = (s) => s ? s.replace(/[\u0300\u0301]/g, '').replace(/ё/g, 'е').toLowerCase() : '';
                const normSurface = normalize(surfaceFormForDisplay);
                const normGenerated = normalize(generatedForm);

                return {
                    isMatch: true,
                    showSurface: normSurface !== normGenerated && surfaceFormForDisplay
                };
            }

            return { isMatch: false };
        };
        const generateForm = async (input, options = {}) => {
            let form = input;
            let failed = false;
            const suppressSurfaceVariant = options.suppressSurfaceVariant === true;
            const requireSurfaceMatch = options.requireSurfaceMatch === true;
            const addTooltip = (html, tooltip) => {
                if (!html) return html;
                const titleMatch = html.match(/title="([^"]*)"/);
                if (titleMatch) {
                    const existing = titleMatch[1];
                    const updated = existing.includes(tooltip) ? existing : `${existing}\n${tooltip}`;
                    return html.replace(/title="[^"]*"/, `title="${updated}"`);
                }
                return `<span title="${tooltip}">${html}</span>`;
            };
            try {
                const sendGenerateRequest = async (requestInput, useStress) => {
                    const request = chrome.runtime.sendMessage({
                        action: 'generate',
                        input: requestInput,
                        useStress
                    });
                    const timeout = new Promise(resolve => {
                        setTimeout(() => resolve({ success: false, data: [] }), 5000);
                    });
                    return Promise.race([request, timeout]);
                };

                // First attempt
                let response = await sendGenerateRequest(input, true);

                if (response.success && response.data && response.data.length > 0) {
                    form = response.data[0];
                } else {
                    // Try adjective-like tags for numerals if needed
                    let altSucceeded = false;
                    let improbableSucceeded = false;
                    if (input.includes('+Num')) {
                        const numFallbacks = [
                            input.replace('+Num', '+A'),
                            input.replace('+Num', ''),
                            input.replace('+Num', '+Adj')
                        ].filter((val, idx, arr) => val && arr.indexOf(val) === idx);

                        for (const fallbackInput of numFallbacks) {
                            response = await sendGenerateRequest(fallbackInput, true);

                            if (response.success && response.data && response.data.length > 0) {
                                form = response.data[0];
                                altSucceeded = true;
                                break;
                            }
                        }
                    }

                    if (!altSucceeded) {
                        // Second attempt with +Fac
                        let inputAlt = input + '+Fac';
                        response = await sendGenerateRequest(inputAlt, true);

                        if (!response.success || !response.data || response.data.length === 0) {
                            // Third attempt with +Prb
                            inputAlt = input + '+Prb';
                            response = await sendGenerateRequest(inputAlt, true);
                        }

                        if (response.success && response.data && response.data.length > 0) {
                            improbableSucceeded = true;
                        }
                    }

                    if (response.success && response.data && response.data.length > 0) {
                        form = improbableSucceeded
                            ? `<span title="impossible or unlikely" style="text-decoration: line-through;">${response.data[0]}</span>`
                            : response.data[0];
                    } else {
                        const fallbackResponse = await sendGenerateRequest(input, false);
                        if (fallbackResponse.success && fallbackResponse.data && fallbackResponse.data.length > 0) {
                            form = fallbackResponse.data[0];
                        } else {
                            failed = true;
                        }
                    }
                }
            } catch (e) {
                console.error(e);
                failed = true;
            }

            if (failed) {
                return `<span title="${input}">—</span>`;
            }

            if (input.includes('+Fac') && !form.includes('impossible or unlikely')) {
                form = `<span title="impossible or unlikely" style="text-decoration: line-through;">${form}</span>`;
            }

            form = addTooltip(form, input);

            // Strip HTML tags from form for comparison if it was wrapped
            const cleanForm = form.replace(/<[^>]*>/g, '');
            const matchResult = checkMatch(input, cleanForm);

            if (matchResult.isMatch) {
                matchFound = true;
                if (requireSurfaceMatch && matchResult.showSurface) {
                    return form;
                }
                if (matchResult.showSurface && !suppressSurfaceVariant) {
                    return `${form}<br><span class="surface-variant" style="font-size: 0.8em; color: #666; background-color: #fff3cd; border-bottom: 2px solid #ffc107;">(${surfaceFormForDisplay})</span>`;
                }
                return `<span style="background-color: #fff3cd; border-bottom: 2px solid #ffc107;">${form}</span>`;
            }
            return form;
        };

        const generateVerbForm = async (input) => {
            const activeHtml = await generateForm(input);

            let passiveInput;
            if (input.includes('+PrsAct')) {
                passiveInput = input.replace('+PrsAct', '+PrsAct+Pass');
            } else if (input.includes('+PstAct')) {
                passiveInput = input.replace('+PstAct', '+PstAct+Pass');
            } else if (input.includes('+PrsPss') || input.includes('+PstPss')) {
                return activeHtml;
            } else {
                passiveInput = input + '+Pass';
            }

            let passiveHtml = await generateForm(passiveInput);

            if (!passiveHtml.includes('—')) {
                 hasPassive = true;
                 let tooltip = "passive";
                 if (passiveHtml.includes('impossible or unlikely')) {
                     tooltip = "passive unlikely";
                     passiveHtml = passiveHtml.replace('impossible or unlikely', 'passive unlikely');
                 }
                 return `${activeHtml} <span class="passive-variant" style="display:none"><span class="passive" title="${tooltip}">(${passiveHtml})</span></span>`;
            }
            return activeHtml;
        };

        let html = '';

        if (pos === 'N') {
            // Noun Paradigm
            const varyTags = ['Sg', 'Pl', 'Nom', 'Gen', 'Dat', 'Acc', 'Ins', 'Loc', 'Voc', 'Par', 'Loc2', 'Leng'];
            const baseTagsList = tags.filter(t => !varyTags.includes(t));
            const hasNumBase = baseTagsList.some(t => t === 'Num' || t.startsWith('Num'));
            const baseTags = (baseTagsList.length > 0 ? '+' + baseTagsList.join('+') : '') + (hasNumBase ? '' : '+Num');
            let adjectivalBaseTags = baseTags.replace('+Num', '+A');
            if (!adjectivalBaseTags.includes('+A')) {
                adjectivalBaseTags += '+A';
            }
            const cases = ['Nom', 'Acc', 'Gen', 'Loc', 'Dat', 'Ins'];

            html += '<table class="paradigm-table"><thead><tr><th>Case</th><th>Singular</th><th>Plural</th></tr></thead><tbody>';

            for (const c of cases) {
                const sgInput = `${lemma}${baseTags}+Sg+${c}`;
                const plInput = `${lemma}${baseTags}+Pl+${c}`;

                let label = c;
                if (c === 'Ins') label = 'Inst';
                if (c === 'Loc') label = 'Prep';
                const labelHtml = buildCaseLabelHtml(label, label);

                let [sgForm, plForm] = await Promise.all([generateForm(sgInput), generateForm(plInput)]);

                if (c === 'Loc') {
                    const loc2Input = `${lemma}${baseTags}+Sg+Loc2`;
                    const loc2Form = await generateForm(loc2Input);
                    if (!loc2Form.includes('—') && !loc2Form.includes('impossible')) {
                         sgForm += `<br><span class="secondary-form" title="Used after в or на when expressing location.">(Locative = ${loc2Form})</span>`;
                    }
                }

                if (c === 'Nom') {
                    const vocInput = `${lemma}${baseTags}+Sg+Voc`;
                    const vocForm = await generateForm(vocInput);
                    if (!vocForm.includes('—') && !vocForm.includes('impossible')) {
                         sgForm += `<br><span class="secondary-form" title="Used to call someone's name.">(Vocative = ${vocForm})</span>`;
                    }
                }

                html += `<tr><td>${labelHtml}</td><td>${sgForm}</td><td>${plForm}</td></tr>`;
            }
            html += '</tbody></table>';

        } else if (pos === 'A' || pos === 'Adj' || pos === 'Det') {
            // Adjective Paradigm (and Determiners)
            const varyTags = ['Msc', 'Fem', 'Neu', 'MFN', 'Anim', 'Inan', 'AnIn', 'Sg', 'Pl', 'Nom', 'Gen', 'Dat', 'Acc', 'Ins', 'Loc', 'Loc2', 'Voc', 'Pred', 'Short', 'Cmp', 'Cmpar', 'Sup', 'Leng'];
            const baseTagsList = tags.filter(t => !varyTags.includes(t));

            const baseTags = baseTagsList.length > 0 ? '+' + baseTagsList.join('+') : '';
            const cases = ['Nom', 'Acc', 'Gen', 'Loc', 'Dat', 'Ins'];
            // Short forms (Pred) usually only for Nom? Or separate category.
            // Standard adjective table: Msc, Neu, Fem, Pl

            html += '<table class="paradigm-table"><thead><tr><th>Case</th><th>Masc</th><th>Neut</th><th>Fem</th><th>Plural</th></tr></thead><tbody>';

            for (const c of cases) {
                let label = c;
                if (c === 'Ins') label = 'Inst';
                if (c === 'Loc') label = 'Prep';
                const labelHtml = buildCaseLabelHtml(label, label);

                let forms;
                if (c === 'Acc') {
                    // Generate Inan and Anim for Msc and Pl
                    const inputs = [
                        `${lemma}${baseTags}+Msc+Inan+Sg+Acc`,
                        `${lemma}${baseTags}+Msc+Anim+Sg+Acc`,
                        `${lemma}${baseTags}+Neu+AnIn+Sg+Acc`,
                        `${lemma}${baseTags}+Fem+AnIn+Sg+Acc`,
                        `${lemma}${baseTags}+MFN+Inan+Pl+Acc`,
                        `${lemma}${baseTags}+MFN+Anim+Pl+Acc`
                    ];
                    const results = await Promise.all(inputs.map(input => generateForm(input, { suppressSurfaceVariant: true, requireSurfaceMatch: true })));

                    const mscForm = (results[0] === results[1]) ? results[0] : `${results[0]} / ${results[1]}`;
                    const neuForm = results[2];
                    const femForm = results[3];
                    const plForm = (results[4] === results[5]) ? results[4] : `${results[4]} / ${results[5]}`;

                    forms = [mscForm, neuForm, femForm, plForm];
                } else {
                    const inputs = [
                        `${lemma}${baseTags}+Msc+AnIn+Sg+${c}`,
                        `${lemma}${baseTags}+Neu+AnIn+Sg+${c}`,
                        `${lemma}${baseTags}+Fem+AnIn+Sg+${c}`,
                        `${lemma}${baseTags}+MFN+AnIn+Pl+${c}`
                    ];
                    forms = await Promise.all(inputs.map(generateForm));
                }

                html += `<tr><td>${labelHtml}</td><td>${forms[0]}</td><td>${forms[1]}</td><td>${forms[2]}</td><td>${forms[3]}</td></tr>`;
            }

            // Short forms (Pred)
            if (pos !== 'Det') {
                const shortInputs = [
                    `${lemma}${baseTags}+Msc+Sg+Pred`,
                    `${lemma}${baseTags}+Neu+Sg+Pred`,
                    `${lemma}${baseTags}+Fem+Sg+Pred`,
                    `${lemma}${baseTags}+MFN+Pl+Pred`
                ];
                const shortForms = await Promise.all(shortInputs.map(generateForm));
                if (shortForms.some(f => f !== '-')) {
                    const shortLabelHtml = buildCaseLabelHtml('Short', 'Short');
                    html += `<tr><td>${shortLabelHtml}</td><td>${shortForms[0]}</td><td>${shortForms[1]}</td><td>${shortForms[2]}</td><td>${shortForms[3]}</td></tr>`;
                }
            }

            // Comparative
            if (pos !== 'Det') {
                const compInput = `${lemma}${baseTags}+Cmpar+Pred`;
                const compForm = await generateForm(compInput);
                if (compForm && compForm !== '-' && !compForm.includes('impossible')) {
                    html += `<tr><td>Comparative</td><td colspan="4" style="text-align: center;">${compForm}</td></tr>`;
                }
            }

            html += '</tbody></table>';

        } else if (pos === 'Num') {
            const lemmaBase = (lemma || '').replace(/[\u0300\u0301]/g, '').replace(/\d+/g, '');
            const normalizedLemma = lemmaBase.toLowerCase();
            const adjectivalLemmas = new Set(['один', 'одна', 'одно', 'одни']);
            const twoLemmas = new Set(['два', 'две']);
            const paucalLemmas = new Set(['оба', 'обе']);
            const isOrdinal = tags.includes('Ord');

            const cases = ['Nom', 'Acc', 'Gen', 'Loc', 'Dat', 'Ins'];
            const varyTags = ['Msc', 'Fem', 'Neu', 'MFN', 'Anim', 'Inan', 'AnIn', 'Sg', 'Pl',
                              'Nom', 'Gen', 'Dat', 'Acc', 'Ins', 'Loc', 'Voc', 'Par', 'Loc2',
                              'Pred', 'Short', 'Cmp', 'Cmpar', 'Sup', 'Leng', 'Fac'];
            const posTags = new Set(['N', 'V', 'A', 'Adj', 'Det', 'Pron', 'Adv', 'Num']);
            const baseTagsList = tags.filter(t => !varyTags.includes(t) && !posTags.has(t));
            const normalizedBaseTags = Array.from(new Set(baseTagsList));
            const baseTags = '+Num' + (normalizedBaseTags.length > 0 ? '+' + normalizedBaseTags.join('+') : '');

            if (adjectivalLemmas.has(normalizedLemma) || isOrdinal) {
                html += '<table class="paradigm-table"><thead><tr><th>Case</th><th>Masc</th><th>Neut</th><th>Fem</th><th>Plural</th></tr></thead><tbody>';

                for (const c of cases) {
                    let label = c;
                    if (c === 'Ins') label = 'Inst';
                    if (c === 'Loc') label = 'Prep';
                    const labelHtml = buildCaseLabelHtml(label, label);

                    let forms;
                    if (c === 'Acc') {
                        const inputs = [
                            `${lemmaBase}${baseTags}+Msc+Inan+Sg+Acc`,
                            `${lemmaBase}${baseTags}+Msc+Anim+Sg+Acc`,
                            `${lemmaBase}${baseTags}+Neu+AnIn+Sg+Acc`,
                            `${lemmaBase}${baseTags}+Fem+AnIn+Sg+Acc`,
                            `${lemmaBase}${baseTags}+MFN+Inan+Pl+Acc`,
                            `${lemmaBase}${baseTags}+MFN+Anim+Pl+Acc`
                        ];
                        const results = await Promise.all(inputs.map(input => generateForm(input, { suppressSurfaceVariant: true })));

                        const mscForm = (results[0] === results[1]) ? results[0] : `${results[0]} / ${results[1]}`;
                        const neuForm = results[2];
                        const femForm = results[3];
                        const plForm = (results[4] === results[5]) ? results[4] : `${results[4]} / ${results[5]}`;

                        forms = [mscForm, neuForm, femForm, plForm];
                    } else {
                        const femCaseTag = `${lemmaBase}${baseTags}+Fem+AnIn+Sg+${c}`;
                        const inputs = [
                            `${lemmaBase}${baseTags}+Msc+AnIn+Sg+${c}`,
                            `${lemmaBase}${baseTags}+Neu+AnIn+Sg+${c}`,
                            femCaseTag,
                            `${lemmaBase}${baseTags}+MFN+AnIn+Pl+${c}`
                        ];
                        forms = await Promise.all(inputs.map(generateForm));
                    }

                    html += `<tr><td>${labelHtml}</td><td>${forms[0]}</td><td>${forms[1]}</td><td>${forms[2]}</td><td>${forms[3]}</td></tr>`;
                }

                html += '</tbody></table>';
            } else if (twoLemmas.has(normalizedLemma)) {
                html += '<table class="paradigm-table"><thead><tr><th>Case</th><th>Masc</th><th>Neut</th><th>Fem</th></tr></thead><tbody>';

                for (const c of cases) {
                    let label = c;
                    if (c === 'Ins') label = 'Inst';
                    if (c === 'Loc') label = 'Prep';
                    const labelHtml = buildCaseLabelHtml(label, label);

                    const mscInputs = c === 'Acc'
                        ? [`${lemmaBase}${baseTags}+Msc+Inan+Acc`, `${lemmaBase}${baseTags}+Msc+Anim+Acc`]
                        : c === 'Nom'
                            ? [`${lemmaBase}${baseTags}+Msc+AnIn+Nom`]
                            : [`${lemmaBase}${baseTags}+MFN+AnIn+${c}`];
                    const neuInputs = c === 'Acc'
                        ? [`${lemmaBase}${baseTags}+Neu+AnIn+Acc`]
                        : c === 'Nom'
                            ? [`${lemmaBase}${baseTags}+Neu+AnIn+Nom`]
                            : [`${lemmaBase}${baseTags}+MFN+AnIn+${c}`];
                    const femInputs = c === 'Acc'
                        ? [`${lemmaBase}${baseTags}+Fem+AnIn+Acc`, `${lemmaBase}${baseTags}+Fem+Anim+Acc+Fac`]
                        : c === 'Nom'
                            ? [`${lemmaBase}${baseTags}+Fem+AnIn+Nom`]
                            : [`${lemmaBase}${baseTags}+MFN+AnIn+${c}`];

                    const [mscResults, neuResults, femResults] = await Promise.all([
                        Promise.all(mscInputs.map(input => generateForm(input, { suppressSurfaceVariant: mscInputs.length > 1, requireSurfaceMatch: mscInputs.length > 1 }))),
                        Promise.all(neuInputs.map(input => generateForm(input, { suppressSurfaceVariant: neuInputs.length > 1, requireSurfaceMatch: neuInputs.length > 1 }))),
                        Promise.all(femInputs.map(input => generateForm(input, { suppressSurfaceVariant: femInputs.length > 1, requireSurfaceMatch: femInputs.length > 1 })))
                    ]);

                    const mscForm = mscResults.length === 2 && mscResults[0] !== mscResults[1]
                        ? `${mscResults[0]} / ${mscResults[1]}`
                        : mscResults[0];
                    const neuForm = neuResults.length === 2 && neuResults[0] !== neuResults[1]
                        ? `${neuResults[0]} / ${neuResults[1]}`
                        : neuResults[0];
                    const femForm = femResults.length === 2 && femResults[0] !== femResults[1]
                        ? `${femResults[0]} / ${femResults[1]}`
                        : femResults[0];

                    html += `<tr><td>${labelHtml}</td><td>${mscForm}</td><td>${neuForm}</td><td>${femForm}</td></tr>`;
                }

                html += '</tbody></table>';
            } else if (paucalLemmas.has(normalizedLemma)) {
                html += '<table class="paradigm-table"><thead><tr><th>Case</th><th>Masc</th><th>Neut</th><th>Fem</th></tr></thead><tbody>';

                for (const c of cases) {
                    let label = c;
                    if (c === 'Ins') label = 'Inst';
                    if (c === 'Loc') label = 'Prep';
                    const labelHtml = buildCaseLabelHtml(label, label);

                    const mscInputs = c === 'Acc'
                        ? [`${lemmaBase}${baseTags}+Msc+Inan+Acc`, `${lemmaBase}${baseTags}+Msc+Anim+Acc`]
                        : [`${lemmaBase}${baseTags}+Msc+AnIn+${c}`];
                    const neuInputs = c === 'Acc'
                        ? [`${lemmaBase}${baseTags}+Neu+AnIn+Acc`]
                        : [`${lemmaBase}${baseTags}+Neu+AnIn+${c}`];
                    const femInputs = c === 'Acc'
                        ? [`${lemmaBase}${baseTags}+Fem+Inan+Acc`, `${lemmaBase}${baseTags}+Fem+Anim+Acc`]
                        : [`${lemmaBase}${baseTags}+Fem+AnIn+${c}`];

                    const [mscResults, neuResults, femResults] = await Promise.all([
                        Promise.all(mscInputs.map(input => generateForm(input, { suppressSurfaceVariant: mscInputs.length > 1, requireSurfaceMatch: mscInputs.length > 1 }))),
                        Promise.all(neuInputs.map(input => generateForm(input, { suppressSurfaceVariant: neuInputs.length > 1, requireSurfaceMatch: neuInputs.length > 1 }))),
                        Promise.all(femInputs.map(input => generateForm(input, { suppressSurfaceVariant: femInputs.length > 1, requireSurfaceMatch: femInputs.length > 1 })))
                    ]);

                    const mscForm = mscResults.length === 2 && mscResults[0] !== mscResults[1]
                        ? `${mscResults[0]} / ${mscResults[1]}`
                        : mscResults[0];
                    const neuForm = neuResults.length === 2 && neuResults[0] !== neuResults[1]
                        ? `${neuResults[0]} / ${neuResults[1]}`
                        : neuResults[0];
                    const femForm = femResults.length === 2 && femResults[0] !== femResults[1]
                        ? `${femResults[0]} / ${femResults[1]}`
                        : femResults[0];

                    html += `<tr><td>${labelHtml}</td><td>${mscForm}</td><td>${neuForm}</td><td>${femForm}</td></tr>`;
                }

                html += '</tbody></table>';
            } else {
                html += '<table class="paradigm-table"><thead><tr><th>Case</th><th>Form</th></tr></thead><tbody>';

                const hasGenderTag = tags.some(t => ['Msc', 'Fem', 'Neu', 'MFN'].includes(t));
                const hasAnimacyTag = tags.some(t => ['Anim', 'Inan', 'AnIn'].includes(t));
                const defaultGenderTag = hasGenderTag ? '' : '+MFN';
                const defaultAnimacyTag = hasAnimacyTag ? '' : '+AnIn';

                for (const c of cases) {
                    let label = c;
                    if (c === 'Ins') label = 'Inst';
                    if (c === 'Loc') label = 'Prep';
                    const labelHtml = buildCaseLabelHtml(label, label);

                    const input = `${lemmaBase}${baseTags}${defaultGenderTag}${defaultAnimacyTag}+${c}`;
                    const form = await generateForm(input);
                    html += `<tr><td>${labelHtml}</td><td>${form}</td></tr>`;
                }

                html += '</tbody></table>';
            }


        } else if (pos === 'V') {
            // Verb Paradigm
            // varyTags: tags that vary across the paradigm and should be stripped from baseTags
            // This includes participle-specific tags (case, gender, animacy) so that clicking
            // on a participle form still generates the full verb paradigm correctly.
            const varyTags = ['Sg', 'Pl', 'Sg1', 'Sg2', 'Sg3', 'Pl1', 'Pl2', 'Pl3',
                              'Prs', 'Fut', 'Pst', 'Imp', 'Inf',
                              'Msc', 'Fem', 'Neu', 'MFN',
                              'PrsAct', 'PstAct', 'PrsPss', 'PstPss', 'Adv', 'Pass', 'Pres',
                              '1', '2', '3',
                              // Case tags (for participles)
                              'Nom', 'Gen', 'Dat', 'Acc', 'Ins', 'Loc', 'Voc',
                              // Animacy tags (for participles)
                              'Anim', 'Inan', 'AnIn',
                              // Short/predicative form tags (for participles)
                              'Pred', 'Short',
                              // Lexicalized marker and other special tags
                              'Lxc', 'Lxc-tentative', 'Leng'];
            const baseTagsList = tags.filter(t => !varyTags.includes(t));
            const baseTags = baseTagsList.length > 0 ? '+' + baseTagsList.join('+') : '';

            const aspect = tags.find(t => ['Impf', 'Perf'].includes(t)) || 'Impf';
            // Present/Future
            const tense = aspect === 'Perf' ? 'Fut' : 'Prs';
            const tenseLabel = aspect === 'Perf' ? 'Future' : 'Present';

            html += `<h4>${tenseLabel}</h4>`;
            html += '<table class="paradigm-table"><thead><tr><th>Person</th><th>Singular</th><th>Plural</th></tr></thead><tbody>';

            const persons = [1, 2, 3];
            for (const p of persons) {
                const sgInput = `${lemma}${baseTags}+${tense}+Sg${p}`;
                const plInput = `${lemma}${baseTags}+${tense}+Pl${p}`;
                const [sgForm, plForm] = await Promise.all([generateVerbForm(sgInput), generateVerbForm(plInput)]);
                html += `<tr><td>${p}</td><td>${sgForm}</td><td>${plForm}</td></tr>`;
            }
            html += '</tbody></table>';

            // Past
            html += `<h4>Past</h4>`;
            html += '<table class="paradigm-table"><thead><tr><th>Gender/Number</th><th>Form</th></tr></thead><tbody>';

            const pastInputs = [
                { label: 'Masc', input: `${lemma}${baseTags}+Pst+Msc+Sg` },
                { label: 'Fem', input: `${lemma}${baseTags}+Pst+Fem+Sg` },
                { label: 'Neut', input: `${lemma}${baseTags}+Pst+Neu+Sg` }
            ];

            for (const item of pastInputs) {
                const form = await generateVerbForm(item.input);
                html += `<tr><td>${item.label}</td><td>${form}</td></tr>`;
            }

            // Plural is the same for all genders in Past
            const plInput = `${lemma}${baseTags}+Pst+MFN+Pl`;
            const plForm = await generateVerbForm(plInput);
            html += `<tr><td>Plural</td><td>${plForm}</td></tr>`;

            html += '</tbody></table>';

            // Imperative
            html += `<h4>Imperative</h4>`;
            html += '<table class="paradigm-table"><thead><tr><th>Number</th><th>Form</th></tr></thead><tbody>';
            const impSg = await generateVerbForm(`${lemma}${baseTags}+Imp+Sg2`);
            const impPl = await generateVerbForm(`${lemma}${baseTags}+Imp+Pl2`);
            html += `<tr><td>Sg (2nd)</td><td>${impSg}</td></tr>`;
            html += `<tr><td>Pl (2nd)</td><td>${impPl}</td></tr>`;
            html += '</tbody></table>';

            // Infinitive
            const inf = await generateVerbForm(`${lemma}${baseTags}+Inf`);
            html += `<p><strong>Infinitive:</strong> ${inf}</p>`;

            // Participles and Verbal Adverbs
            html += `<h4>Participles & Gerunds</h4>`;
            html += '<table class="paradigm-table"><thead><tr><th>Type</th><th>Present</th><th>Past</th></tr></thead><tbody>';

            // Active Participle
            const prsActPartInput = `${lemma}${baseTags}+PrsAct+Msc+AnIn+Sg+Nom`;
            const pstActPartInput = `${lemma}${baseTags}+PstAct+Msc+AnIn+Sg+Nom`;
            const [prsActPart, pstActPart] = await Promise.all([generateVerbForm(prsActPartInput), generateVerbForm(pstActPartInput)]);
            html += `<tr><td>Active Participle</td><td>${prsActPart}</td><td>${pstActPart}</td></tr>`;

            // Passive Participle
            const prsPssPartInput = `${lemma}${baseTags}+PrsPss+Msc+AnIn+Sg+Nom`;
            const pstPssPartInput = `${lemma}${baseTags}+PstPss+Msc+AnIn+Sg+Nom`;
            const [prsPssPart, pstPssPart] = await Promise.all([generateVerbForm(prsPssPartInput), generateVerbForm(pstPssPartInput)]);
            html += `<tr><td>Passive Participle</td><td>${prsPssPart}</td><td>${pstPssPart}</td></tr>`;

            // Verbal Adverb
            const prsAdvInput = `${lemma}${baseTags}+PrsAct+Adv`;
            const pstAdvInput = `${lemma}${baseTags}+PstAct+Adv`;
            const [prsAdv, pstAdv] = await Promise.all([generateVerbForm(prsAdvInput), generateVerbForm(pstAdvInput)]);
            html += `<tr><td>Verbal Adverb</td><td>${prsAdv}</td><td>${pstAdv}</td></tr>`;

            html += '</tbody></table>';

        } else if (pos === 'Pron') {
             // Pronoun Paradigm (similar to Noun but maybe no Plural/Singular distinction for some)
             // Personal pronouns: Я, Ты, etc. have fixed Number.
             // But "весь", "тот" behave like Adjectives.
             // Let's try Noun-like structure first.

             const cases = ['Nom', 'Acc', 'Gen', 'Loc', 'Dat', 'Ins'];
             html += '<table class="paradigm-table"><thead><tr><th>Case</th><th>Form</th></tr></thead><tbody>';

             // We need to know if it has Gender/Number.
             // If it's "я", "ты", it's just Case.
             // If it's "он", it has Gender.
             // If it's "мой", it's Adjectival.

             // Simple fallback: Just generate for the tags we have + Case.
             // We need to strip existing Case tag and add new one.
             // And strip Number if we want to generate both?
             // Pronouns are tricky. Let's just try to generate cases for the *current* number/gender.

             // Construct base tags from current tags, excluding Case.
             const baseTags = tags.filter(t => !['Nom', 'Gen', 'Dat', 'Acc', 'Ins', 'Loc', 'Voc'].includes(t));
             const baseTagString = baseTags.join('+');

             for (const c of cases) {
                 const label = c === 'Ins' ? 'Inst' : c;
                 const labelHtml = buildCaseLabelHtml(label, label);
                 // Better: lemma + Pron + ...
                 // Let's try to reconstruct standard order: Pron + Pers? + Gender? + Number + Case
                 // Or just use the tags we have.

                 // If we use the tags from analysis, they are in some order.
                 // We just replace the case tag.

                 // But we want to generate the full paradigm.
                 // If lemma is "я", we want "меня", "мне"...
                 // "я" tags: Pron, Pers, Sg1, Nom.
                 // We want: Pron, Pers, Sg1, Gen...

                 // Let's try to use the tags we have, remove Case, add new Case.
                 const tagsWithoutCase = tags.filter(t => !['Nom', 'Gen', 'Dat', 'Acc', 'Ins', 'Loc', 'Voc'].includes(t));
                 const input = `${lemma}+${tagsWithoutCase.join('+')}+${c}`;
                 const form = await generateForm(input);
                 html += `<tr><td>${labelHtml}</td><td>${form}</td></tr>`;
             }
             html += '</tbody></table>';
        } else {
            return { html: "Paradigm generation not implemented for " + pos, hasPassive: false, matchFound: false };
        }

        return { html, hasPassive, matchFound };
    }

    initializeWritingTab() {
        const analyzeButton = document.getElementById('writing-analyze-button');
        if (analyzeButton) {
            analyzeButton.addEventListener('click', () => this.analyzeWriting());
        }

        const textarea = document.getElementById('writing-input');
        if (textarea) {
            textarea.addEventListener('input', () => {
                this.lastWritingInput = textarea.value;
                this.scheduleTabStateSave();
            });
        }
    }

    async analyzeWriting() {
        const textarea = document.getElementById('writing-input');
        const rawText = textarea.value;
        const text = rawText.trim();
        this.lastWritingInput = rawText;
        if (!text) {
            this.lastWritingTokens = null;
            this.lastWritingSelectedErrorIndex = null;
            this.applyWritingState({ input: rawText, tokens: null, selectedErrorIndex: null });
            this.saveTabState();
            return;
        }

        const analyzeButton = document.getElementById('writing-analyze-button');
        analyzeButton.disabled = true;
        analyzeButton.textContent = 'Analyzing...';

        const resultsContainer = document.getElementById('writing-results');
        const detailsContainer = document.getElementById('writing-details');
        const writingContainer = document.getElementById('writing-container');

        resultsContainer.innerHTML = '';
        detailsContainer.innerHTML = '';
        writingContainer.style.display = 'none';

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'analyze_l2',
                text: text
            });

            if (response && response.success) {
                this.displayWritingResults(response.data, { skipSave: true });
                this.lastWritingTokens = response.data || null;
                this.lastWritingSelectedErrorIndex = null;
                writingContainer.style.display = 'flex';
            } else {
                resultsContainer.innerHTML = '<p class="error">Analysis failed. Please try again.</p>';
                writingContainer.style.display = 'flex';
                this.lastWritingTokens = null;
                this.lastWritingSelectedErrorIndex = null;
            }
        } catch (error) {
            console.error('Analysis error:', error);
            resultsContainer.innerHTML = '<p class="error">An error occurred.</p>';
            writingContainer.style.display = 'flex';
            this.lastWritingTokens = null;
            this.lastWritingSelectedErrorIndex = null;
        } finally {
            analyzeButton.disabled = false;
            analyzeButton.textContent = 'Analyze';
            this.saveTabState();
        }
    }

    displayWritingResults(tokens, { selectedIndex = null, skipSave = false } = {}) {
        const resultsContainer = document.getElementById('writing-results');
        let html = '';

        this.lastWritingTokens = tokens;
        this.lastWritingSelectedErrorIndex = selectedIndex ?? null;

        tokens.forEach((token, index) => {
            let tokenHtml = '';
            if (token.isError) {
                // Store error data in a data attribute (JSON stringified)
                const errData = JSON.stringify(token.errorData).replace(/"/g, '&quot;');
                tokenHtml = `<a class="err" data-err="${errData}" data-index="${index}">${token.text}</a>`;
            } else {
                tokenHtml = token.text;
            }

            // Add space if not the first token and not a punctuation mark that attaches to left
            // Simple heuristic for Russian punctuation
            const isPunctuation = /^[.,!?;:)]/.test(token.text);
            if (index > 0 && !isPunctuation) {
                html += ' ';
            }
            html += tokenHtml;
        });

        resultsContainer.innerHTML = html;

        // Add event listeners to error spans
        resultsContainer.querySelectorAll('.err').forEach(el => {
            el.addEventListener('click', (e) => {
                // Remove selected class from others
                resultsContainer.querySelectorAll('.err').forEach(err => err.classList.remove('selected'));
                e.target.classList.add('selected');

                const errData = JSON.parse(e.target.dataset.err);
                const index = Number(e.target.dataset.index);
                this.showErrorDetails(errData, e.target.innerText, index);
            });
        });

        if (selectedIndex !== null && selectedIndex !== undefined) {
            const selectedToken = tokens[selectedIndex];
            const selectedEl = resultsContainer.querySelector(`.err[data-index="${selectedIndex}"]`);
            if (selectedEl && selectedToken && selectedToken.isError) {
                selectedEl.classList.add('selected');
                this.showErrorDetails(selectedToken.errorData, selectedToken.text, selectedIndex, { skipSave: true });
            }
        }

        if (!skipSave) {
            this.saveTabState();
        }
    }

    showErrorDetails(errorData, word, index = null, { skipSave = false } = {}) {
        const detailsContainer = document.getElementById('writing-details');

        const l10n = {
            "errors": {
                "a2o": "o→a", "e2je": "e→э", "FV": "no fill vowel", "H2S": "ъ→ь", "i2j": "й→и", "i2y": "ы→и",
                "ii": "ие→ии", "Ikn": "и→е/я/а", "j2i": "и→й", "je2e": "э→е", "NoFV": "add fill vowel",
                "NoGem": "add double letter", "NoSS": "add ь", "o2a": "a→o", "Pal": "keep consonant soft",
                "sh2shch": "щ→ш", "shch2sh": "ш→щ", "ski": "ский→ски", "SRo": "о→е", "SRy": "ы→и",
                "y2i": "и→ы", "prijti": "прийти", "revIkn": "е/я/а→и", "Gem": "no double letter",
            },
            "does_not_exist": "does not exist in Russian. Did you mean one of these?",
            "tbl_headers": ["Dictionary<br>form", "Error(s)", "Corrected to...<br>(hover/tap to see)"]
        };

        let html = `<div class="error-header">
            <span class="tag is-medium is-primary">${word}</span>
            <span class="does-not-exist">${l10n.does_not_exist}</span>
        </div>`;

        html += `<table class="table error-table">
            <thead>
                <tr>
                    <th>${l10n.tbl_headers[0]}</th>
                    <th>${l10n.tbl_headers[1]}</th>
                    <th>${l10n.tbl_headers[2]}</th>
                </tr>
            </thead>
            <tbody>`;

        if (errorData && errorData.length > 0) {
            errorData.forEach(item => {
                html += `<tr>
                    <td><span class="lemma">${item.lemma}</span></td>
                    <td>`;

                item.L2_error_tags.forEach(tag => {
                    const label = l10n.errors[tag] || tag;
                    html += `<span class="tag is-clickable is-link is-medium is-rounded L2_err_tag" data-err-id="${tag}">${label}</span> `;
                });

                html += `</td>
                    <td>
                        <button class="button is-info is-light spoiler-button">
                            <span class="icon"><i class="fas fa-eye-slash"></i></span>
                            <span class="spoiler-content">${item.corrected}</span>
                        </button>
                    </td>
                </tr>`;
            });
        }

        html += `</tbody></table>`;
        html += `<div id="explanation-content" class="explanation-box"></div>`;

        detailsContainer.innerHTML = html;
        detailsContainer.style.display = 'block';

        if (index !== null && index !== undefined) {
            this.lastWritingSelectedErrorIndex = index;
        }

        if (!skipSave) {
            this.saveTabState();
        }

        // Add event listeners for error tags
        detailsContainer.querySelectorAll('.L2_err_tag').forEach(tagEl => {
            tagEl.addEventListener('click', (e) => {
                // Toggle active state
                detailsContainer.querySelectorAll('.L2_err_tag').forEach(t => {
                    t.classList.remove('is-primary');
                    t.classList.add('is-link');
                });
                e.target.classList.remove('is-link');
                e.target.classList.add('is-primary');

                const errId = e.target.dataset.errId;
                this.fetchAndLoadExplanation(errId);
            });
        });

        // Auto-select first error if only one reading and one error
        if (errorData.length === 1 && errorData[0].L2_error_tags.length === 1) {
            const firstTag = detailsContainer.querySelector('.L2_err_tag');
            if (firstTag) firstTag.click();
        }
    }

    async fetchAndLoadExplanation(errId) {
        const explanationContainer = document.getElementById('explanation-content');
        explanationContainer.innerHTML = '<p>Loading explanation...</p>';

        try {
            const response = await fetch(`https://reynoldsnlp.github.io/rus_grammar_explanations/html/eng/${errId}.html`);
            if (response.ok) {
                const text = await response.text();
                // Parse HTML to extract body content
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                const bodyContent = doc.body.innerHTML;
                explanationContainer.innerHTML = bodyContent;
                explanationContainer.scrollIntoView({ behavior: 'smooth' });
            } else {
                explanationContainer.innerHTML = '<p>Explanation not available.</p>';
            }
        } catch (error) {
            console.error('Error fetching explanation:', error);
            explanationContainer.innerHTML = '<p>Error loading explanation.</p>';
        }
    }
}

// Initialize the side panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RussianToolsSidePanel();
});
