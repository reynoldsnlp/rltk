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

        this.init();
    }

    async loadFreqDict() {
        if (this.freqDict) return;
        try {
            const url = chrome.runtime.getURL('src/resources/models/Sharoff_lem_freq_dict.json');
            const response = await fetch(url);
            this.freqDict = await response.json();
        } catch (e) {
            console.error('Failed to load frequency dictionary:', e);
            this.freqDict = {};
        }
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

    /**
     * Initializes the side panel: sets up listeners, loads state, and checks access.
     */
    async init() {
        this.setupEventListeners();
        this.initializeActivitySelectors();

        // Load state for the current tab
        let tabs;
        const urlParams = new URLSearchParams(window.location.search);
        const debugTabId = urlParams.get('debugTabId');

        if (debugTabId) {
            tabs = [{ id: parseInt(debugTabId) }];
        } else {
            tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        }

        if (tabs.length > 0) {
            const tabId = tabs[0].id;
            this.connectToBackground(tabId);
            await this.loadTabState(tabId);
            this.checkAccess(tabId);
        }

        // Listen for tab activation to switch state
        chrome.tabs.onActivated.addListener(async (activeInfo) => {
            // Re-connect for the new tab if needed, or just update state
            // Since side panel is tab-specific, this instance might be for a specific tab?
            // Actually, if the side panel is open for multiple tabs, is it the same instance?
            // "A single instance of the side panel is shared across all tabs." -> This is for global side panel.
            // But we use `open({ tabId })`.
            // "If you specify a tabId, the side panel is specific to that tab."
            // This implies there might be separate instances or the same instance reloaded?
            // Usually it's the same document if the URL is the same.

            await this.loadTabState(activeInfo.tabId);
            this.checkAccess(activeInfo.tabId);
        });

        // Listen for tab updates (navigation)
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.active) {
                this.checkAccess(tabId);
            }
        });

        // Listen for access granted message
        chrome.runtime.onMessage.addListener((message) => {
            if (message.action === 'access_granted') {
                this.hideAccessModal();
                this.checkPageStatus();
            }
        });
    }

    /**
     * Checks if the extension has access to the given tab.
     * If not, shows a modal prompting the user to grant access.
     */
    async checkAccess(tabId) {
        try {
            // Try to ping the content script
            await chrome.tabs.sendMessage(tabId, { action: 'ping' });
            this.hideAccessModal();
            this.checkPageStatus();
        } catch (error) {
            // If ping failed, try to inject via background
            try {
                const response = await chrome.runtime.sendMessage({ action: 'inject_content_script' });
                if (response && response.success) {
                    this.hideAccessModal();
                    this.checkPageStatus();
                } else {
                    // Check if it's a restricted page (chrome:// etc)
                    // If so, maybe we shouldn't show the modal or show a different one?
                    // For now, just show the modal as "Access Required" implies we can't access it.
                    // But if it's chrome://, clicking the icon won't help.
                    // However, the user asked to "gray out the sidebar with a modal".
                    this.showAccessModal();
                }
            } catch (injectError) {
                this.showAccessModal();
            }
        }
    }

    showAccessModal() {
        const modal = document.getElementById('access-modal');
        if (modal) modal.style.display = 'flex';
    }

    hideAccessModal() {
        const modal = document.getElementById('access-modal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Checks if the current page is already enhanced and updates UI accordingly.
     */
    async checkPageStatus() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'get_status' });
            if (response && response.success && response.data && response.data.isEnhanced) {
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
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Sub-tab navigation
        document.querySelectorAll('.sub-tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchSubTab(e.target.dataset.subtab);
            });
        });

        this.initializeWritingTab();

        // Morphology settings
        const ignoreAmbiguityCheckbox = document.getElementById('ignore-ambiguity');
        if (ignoreAmbiguityCheckbox) {
            ignoreAmbiguityCheckbox.addEventListener('change', () => {
                this.updateMorphologyHighlighting();
            });
        }

        // Auto-enhance checkbox (only if it exists)
        const autoEnhanceCheckbox = document.getElementById('auto-enhance');
        if (autoEnhanceCheckbox) {
            autoEnhanceCheckbox.addEventListener('change', (e) => {
                this.setAutoEnhance(e.target.checked);
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
            this.saveTabState();
        });

        // Action buttons
        document.getElementById('enhance-button').addEventListener('click', () => {
            this.enhancePage();
        });

        // Listen for grammar explorer selection
        chrome.runtime.onMessage.addListener((message) => {
            if (message.action === 'grammar_explorer_selection') {
                // Handle both direct cohort data and text selection
                this.handleGrammarExplorerSelection(message);
            }
        });

        document.getElementById('restore-button').addEventListener('click', () => {
            this.restorePage();
        });

        // Dismiss instructions
        const dismissButton = document.getElementById('dismiss-instructions');
        if (dismissButton) {
            dismissButton.addEventListener('click', () => {
                const instructions = document.getElementById('grammar-explorer-instructions');
                if (instructions) instructions.style.display = 'none';
            });
        }
    }

    /**
     * Triggers the page enhancement process.
     * Handles permission requests if necessary.
     */
    async enhancePage() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.setProcessingState(true);

        const selections = {
            topic: document.getElementById('topic-menu').value,
            filter: document.getElementById('filter-menu').value,
            activity: document.getElementById('activity-menu').value,
        };

        // Get debugTabId if present
        const urlParams = new URLSearchParams(window.location.search);
        const debugTabId = urlParams.get('debugTabId') ? parseInt(urlParams.get('debugTabId')) : null;

        try {
            // Always restore first
            await chrome.runtime.sendMessage({ action: 'restore', tabId: debugTabId });

            // Store selections
            await this.saveTabState();

            // Send message through background script
            const response = await chrome.runtime.sendMessage({
                action: 'enhance',
                selections: selections,
                tabId: debugTabId
            });

            if (!response.success) {
                throw new Error(response.error);
            }

            // Enhancement completed successfully
            this.setCompletedState();

        } catch (error) {
            console.error('Error enhancing page:', error);

            let errorMessage = error.message;
            if (errorMessage.includes("Extension manifest must request permission")) {
                // Try to request permission dynamically
                try {
                    // Prefer the debug tab we were asked to enhance; fall back to the active tab.
                    const targetTabId = debugTabId || (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
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

            alert(`Cannot enhance this page.

${errorMessage}`);
            this.setInitialState();
        } finally {
            this.isProcessing = false;
            // Ensure loading is hidden if it wasn't handled by state changes
            document.getElementById('loading').style.display = 'none';
        }
    }

    async restorePage() {
        try {
            await chrome.runtime.sendMessage({ action: 'restore' });
        } catch (error) {
            console.error('Error restoring:', error);
        }
        this.setInitialState();
    }

    setProcessingState(processing) {
        const enhanceButton = document.getElementById('enhance-button');
        const restoreButton = document.getElementById('restore-button');

        enhanceButton.disabled = true;
        restoreButton.disabled = true;

        enhanceButton.textContent = processing ? 'Processing...' : 'Enhance';
        document.getElementById('loading').style.display = processing ? 'block' : 'none';
    }

    setCompletedState() {
        const enhanceButton = document.getElementById('enhance-button');
        const restoreButton = document.getElementById('restore-button');

        enhanceButton.disabled = false;
        enhanceButton.textContent = 'Enhance';

        restoreButton.disabled = false;

        document.getElementById('loading').style.display = 'none';
    }

    setInitialState() {
        const enhanceButton = document.getElementById('enhance-button');
        const restoreButton = document.getElementById('restore-button');

        enhanceButton.disabled = false;
        enhanceButton.textContent = 'Enhance';

        restoreButton.disabled = true;

        document.getElementById('loading').style.display = 'none';

        // Re-check button state based on selections
        this.toggleEnhanceButton();
    }



    async switchTab(tabName) {
        // Remove active class from all tabs and buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Add active class to selected tab and button
        document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Handle Grammar Explorer activation
        if (tabName === 'grammar-explorer') {
            await this.activateGrammarExplorer();
            // Default to word-details subtab
            this.switchSubTab('word-details');
        } else {
            // If leaving Grammar Explorer or switching to Interact, restore page
            // But if we are in Interact, we might want to keep the current activity?
            // The requirement says: "When any tab other than "Interact" is selected, the page should be restored"
            // So if we switch TO Interact, we might need to restore if we came from Grammar Explorer?
            // Or just let the user click Enhance again.
            // Let's assume switching tabs should reset the view unless it's Interact -> Interact (which doesn't happen).
            // Actually, activateGrammarExplorer calls enhancePage with specific settings.
            // If we switch away, we should probably restore.
            if (this.currentTab === 'grammar-explorer') {
                await this.restorePage();
            }
        }
        this.currentTab = tabName;
    }

    switchSubTab(subTabName) {
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

        if (subTabName === 'morphology') {
            this.initializeMorphologyUI();
        }
    }

    initializeMorphologyUI() {
        const container = document.getElementById('morphology-filters');
        if (!container || container.children.length > 0) return; // Already initialized

        const categories = {
            'Part of Speech': [
                { tag: 'N', label: 'Noun' },
                { tag: 'V', label: 'Verb' },
                { tag: 'A', label: 'Adjective' },
                { tag: 'Adv', label: 'Adverb' },
                { tag: 'Pron', label: 'Pronoun' },
                { tag: 'Num', label: 'Numeral' },
                { tag: 'Det', label: 'Determiner' },
                { tag: 'Pr', label: 'Preposition' },
                { tag: 'CC', label: 'Coord. Conj.' },
                { tag: 'CS', label: 'Subord. Conj.' },
                { tag: 'Interj', label: 'Interjection' },
                { tag: 'Pcle', label: 'Particle' }
            ],
            'Case': [
                { tag: 'Nom', label: 'Nominative' },
                { tag: 'Gen', label: 'Genitive' },
                { tag: 'Dat', label: 'Dative' },
                { tag: 'Acc', label: 'Accusative' },
                { tag: 'Ins', label: 'Instrumental' },
                { tag: 'Loc', label: 'Locative' },
                { tag: 'Voc', label: 'Vocative' },
                { tag: 'Loc2', label: 'Locative 2' },
                { tag: 'Gen2', label: 'Genitive 2' }
            ],
            'Number': [
                { tag: 'Sg', label: 'Singular' },
                { tag: 'Pl', label: 'Plural' }
            ],
            'Gender': [
                { tag: 'Msc', label: 'Masculine' },
                { tag: 'Fem', label: 'Feminine' },
                { tag: 'Neu', label: 'Neuter' }
            ],
            'Tense': [
                { tag: 'Prs', label: 'Present' },
                { tag: 'Pst', label: 'Past' },
                { tag: 'Fut', label: 'Future' }
            ],
            'Aspect': [
                { tag: 'Perf', label: 'Perfective' },
                { tag: 'Impf', label: 'Imperfective' }
            ],
            'Person': [
                { tag: 'Sg1', label: '1st Sg' },
                { tag: 'Sg2', label: '2nd Sg' },
                { tag: 'Sg3', label: '3rd Sg' },
                { tag: 'Pl1', label: '1st Pl' },
                { tag: 'Pl2', label: '2nd Pl' },
                { tag: 'Pl3', label: '3rd Pl' }
            ],
            'Verb Form': [
                { tag: 'Inf', label: 'Infinitive' },
                { tag: 'Imp', label: 'Imperative' },
                { tag: 'Pass', label: 'Passive Voice' },
                { tag: 'PrsAct', label: 'Pres. Act. Part.' },
                { tag: 'PrsPss', label: 'Pres. Pass. Part.' },
                { tag: 'PstAct', label: 'Past Act. Part.' },
                { tag: 'PstPss', label: 'Past Pass. Part.' }
            ],
            'Representation': [
                { tag: 'Pers', label: 'Personal' },
                { tag: 'Refl', label: 'Reflexive' },
                { tag: 'Dem', label: 'Demonstrative' },
                { tag: 'Pos', label: 'Possessive' },
                { tag: 'Interr', label: 'Interrogative' },
                { tag: 'Rel', label: 'Relative' },
                { tag: 'Neg', label: 'Negative' },
                { tag: 'Indef', label: 'Indefinite' }
            ],
            'Other': [
                { tag: 'Anim', label: 'Animate' },
                { tag: 'Inan', label: 'Inanimate' },
                { tag: 'Cmpar', label: 'Comparative' },
                { tag: 'Pred', label: 'Short Form' },
                { tag: 'Paren', label: 'Parenthetical' }
            ]
        };

        for (const [category, tags] of Object.entries(categories)) {
            const section = document.createElement('div');
            section.className = 'morphology-section';
            section.style.marginBottom = '10px';

            const title = document.createElement('h4');
            title.textContent = category;
            title.style.margin = '5px 0';
            section.appendChild(title);

            const tagsContainer = document.createElement('div');
            tagsContainer.style.display = 'flex';
            tagsContainer.style.flexWrap = 'wrap';
            tagsContainer.style.gap = '5px';

            tags.forEach(tagObj => {
                const button = document.createElement('button');
                button.textContent = tagObj.label;
                button.className = 'tag-toggle';
                button.dataset.category = category;
                button.dataset.tag = tagObj.tag;
                button.style.padding = '2px 6px';
                button.style.border = '1px solid #ccc';
                button.style.borderRadius = '4px';
                button.style.background = '#fff';
                button.style.cursor = 'pointer';

                button.onclick = () => {
                    button.classList.toggle('active');
                    button.style.background = button.classList.contains('active') ? '#e0e0ff' : '#fff';
                    button.style.borderColor = button.classList.contains('active') ? '#2c5aa0' : '#ccc';
                    this.updateMorphologyHighlighting();
                };

                tagsContainer.appendChild(button);
            });

            section.appendChild(tagsContainer);
            container.appendChild(section);
        }
    }

    async updateMorphologyHighlighting() {
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

        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'update_morphology_styles',
                css: css
            });
        }
    }

    async activateGrammarExplorer() {
        // Show instructions
        const instructions = document.getElementById('grammar-explorer-instructions');
        if (instructions) instructions.style.display = 'block';

        // 1. Restore page to clear any existing activity
        await this.restorePage();

        // 2. Trigger enhancement for Grammar Explorer
        // We simulate an enhancement request with specific parameters
        const selections = {
            topic: 'grammar-explorer',
            filter: 'all',
            activity: 'explore'
        };

        this.isProcessing = true;
        // Show loading in the results area
        const container = document.getElementById('grammar-explorer-results');
        if (container) container.innerHTML = '<div class="loading">Preparing text...</div>';

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'enhance',
                selections: selections
            });

            if (!response.success) {
                throw new Error(response.error);
            }

            if (container) container.innerHTML = '<div class="info"></div>';

        } catch (error) {
            console.error('Error activating Grammar Explorer:', error);
            if (container) container.innerHTML = `<div class="error">Failed to activate: ${error.message}</div>`;
        } finally {
            this.isProcessing = false;
        }
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

        // Show/hide word stress note
        const stressNote = document.getElementById('word-stress-note');
        if (stressNote) {
            stressNote.style.display = (topic === 'word-stress') ? 'block' : 'none';
        }
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
                { val: 'cloze', text: 'Hover' }
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

    async saveTabState() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) return;

            const tabId = tabs[0].id;
            const state = {
                topic: document.getElementById('topic-menu').value,
                filter: document.getElementById('filter-menu').value,
                activity: document.getElementById('activity-menu').value
            };

            // Use session storage if available (preferred for tab-specific data), fallback to local
            const storage = chrome.storage.session || chrome.storage.local;
            await storage.set({ [`tabState_${tabId}`]: state });

            // Also save to local for default/fallback
            await chrome.storage.local.set(state);
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
                const { topic, filter, activity } = result[key];
                this.applySelections(topic, filter, activity);
            } else {
                // Fallback to last used global settings or defaults
                this.loadStoredSettings();
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

        this.toggleEnhanceButton();
    }

    loadStoredSettings() {
        try {
            chrome.storage.local.get(['enabled', 'language', 'topic', 'filter', 'activity'], (items) => {
                if (chrome.runtime.lastError) {
                    console.warn('Error loading settings:', chrome.runtime.lastError);
                    return;
                }

                const autoEnhanceCheckbox = document.getElementById('auto-enhance');
                if (items.enabled && autoEnhanceCheckbox) {
                    autoEnhanceCheckbox.checked = items.enabled;
                }

                // Apply global settings as default
                this.applySelections(items.topic, items.filter, items.activity);
            });
        } catch (error) {
            console.error('Error accessing storage:', error);
        }
    }

    async handleGrammarExplorerSelection(data) {
        const container = document.getElementById('grammar-explorer-results');
        container.innerHTML = '<div class="loading">Analyzing...</div>';

        try {
            let cohorts;

            // Check if we received direct cohort data or just text
            if (typeof data === 'object' && data.cohort) {
                // We have the cohort directly from the click event
                cohorts = [data.cohort];
            } else {
                // Fallback to analyzing text (e.g. from selection)
                const text = typeof data === 'string' ? data : data.text;
                const analysisResponse = await chrome.runtime.sendMessage({
                    action: 'morph_analysis',
                    text: text
                });

                if (!analysisResponse.success) {
                    container.innerHTML = `<div class="error">Analysis failed: ${analysisResponse.error}</div>`;
                    return;
                }
                cohorts = analysisResponse.data;
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

                // Ensure frequency dictionary is loaded
                await this.loadFreqDict();

                // Sort lemmas by frequency
                const sortedLemmas = Object.keys(readingsByLemma).sort((a, b) => {
                    // Use original lemma for frequency lookup
                    const lemmaA = readingsByLemma[a][0].originalLemma;
                    const lemmaB = readingsByLemma[b][0].originalLemma;
                    const freqA = this.freqDict[lemmaA] || 0;
                    const freqB = this.freqDict[lemmaB] || 0;
                    return freqB - freqA;
                });

                for (const lemma of sortedLemmas) {
                    const lemmaDiv = document.createElement('div');
                    lemmaDiv.className = 'lemma-group';
                    lemmaDiv.style.marginLeft = '10px';

                    // Determine POS from the first reading's tags (first element)
                    const firstReading = readingsByLemma[lemma][0];
                    // Filter out weights from tags for processing
                    const tags = (firstReading.ts || []).filter(t => !t.startsWith('<W:'));
                    const pos = tags.length > 0 ? tags[0] : null;
                    const inflectingPOS = ['N', 'V', 'A', 'Adj', 'Pron', 'Num', 'Det'];
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
                        toggleButton.style.width = '24px';
                        toggleButton.style.height = '24px';
                        toggleButton.style.padding = '0';
                        toggleButton.style.cursor = 'pointer';
                        toggleButton.style.border = '1px solid #ccc';
                        toggleButton.style.background = '#f0f0f0';
                        toggleButton.style.borderRadius = '4px';
                        toggleButton.style.display = 'flex';
                        toggleButton.style.alignItems = 'center';
                        toggleButton.style.justifyContent = 'center';
                        toggleButton.style.fontWeight = 'bold';

                        headerContainer.appendChild(toggleButton);
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

                    lemmaHeader.textContent = labelText;
                    lemmaHeader.style.color = '#2c5aa0';
                    lemmaHeader.style.margin = '0';

                    // Tooltip for readings
                    const readingsText = readingsByLemma[lemma].map(r => {
                        const t = (r.ts || []).filter(tag => !tag.startsWith('<W:'));
                        return t.join(' ');
                    }).join('\n');
                    lemmaHeader.title = readingsText;

                    headerContainer.appendChild(lemmaHeader);
                    lemmaDiv.appendChild(headerContainer);

                    // Fetch translations (using original lemma for lookup)
                    const originalLemma = readingsByLemma[lemma][0].originalLemma;
                    const translation = await this.getTranslations(originalLemma);
                    if (translation) {
                        const transP = document.createElement('p');
                        transP.innerHTML = `<strong>Translation:</strong> ${translation}`;
                        lemmaDiv.appendChild(transP);
                    }

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
                                        const result = await this.generateParadigm(originalLemma, pos, tags, readingsByLemma[lemma], cohort.form || cohort.w);
                                        const html = typeof result === 'string' ? result : result.html;
                                        const hasPassive = typeof result === 'object' ? result.hasPassive : false;
                                        const matchFound = typeof result === 'object' ? result.matchFound : false;

                                        paradigmContainer.innerHTML = html;

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
                                            const showPassiveByDefault = readingsByLemma[lemma].some(r => (r.ts || []).includes('Pass'));

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
                        if (Object.keys(readingsByLemma).length === 1) {
                            toggleButton.click();
                        }
                    }

                    wordDiv.appendChild(lemmaDiv);
                }

                container.appendChild(wordDiv);
            }

        } catch (error) {
            container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
    }

    async getTranslations(lemma) {
        const response = await chrome.runtime.sendMessage({
            action: 'get_model_data',
            modelName: 'lemmaToTranslationsMap',
            key: lemma
        });

        if (response.success && response.data) {
            const word = response.data;
            let translation = "";
            if (word.senses) {
                word.senses.forEach(sense => {
                    if (sense && sense.glosses) {
                        translation += sense.glosses.join(', ') + "; ";
                    }
                });
                if (translation.endsWith("; ")) {
                    translation = translation.substring(0, translation.length - 2);
                }
            }
            return translation;
        }
        return null;
    }

    async generateParadigm(lemma, pos, tags, currentReadings = [], surfaceForm = null) {
        let hasPassive = false;
        let matchFound = false;

        const checkMatch = (input, generatedForm) => {
            if (!currentReadings || currentReadings.length === 0) return { isMatch: false };

            const tagsToIgnore = ['Ind', 'AnIn'];
            const inputTags = input.split('+').slice(1).filter(t => !tagsToIgnore.includes(t));

            // Identify if this is a participle form
            const participleTags = ['PrsAct', 'PstAct', 'PrsPss', 'PstPss'];
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
                const normSurface = normalize(surfaceForm);
                const normGenerated = normalize(generatedForm);

                return {
                    isMatch: true,
                    showSurface: normSurface !== normGenerated && surfaceForm
                };
            }

            return { isMatch: false };
        };
        const generateForm = async (input) => {
            let form = input;
            let failed = false;
            try {
                // First attempt
                let response = await chrome.runtime.sendMessage({
                    action: 'generate',
                    input: input,
                    useStress: true
                });

                if (response.success && response.data && response.data.length > 0) {
                    form = response.data[0];
                } else {
                    // Second attempt with +Fac
                    let inputAlt = input + '+Fac';
                    response = await chrome.runtime.sendMessage({
                        action: 'generate',
                        input: inputAlt,
                        useStress: true
                    });

                    if (!response.success || !response.data || response.data.length === 0) {
                        // Third attempt with +Prb
                        inputAlt = input + '+Prb';
                        response = await chrome.runtime.sendMessage({
                            action: 'generate',
                            input: inputAlt,
                            useStress: true
                        });
                    }

                    if (response.success && response.data && response.data.length > 0) {
                        form = `<span title="impossible or unlikely" style="text-decoration: line-through;">${response.data[0]}</span>`;
                    } else {
                        failed = true;
                    }
                }
            } catch (e) {
                console.error(e);
                failed = true;
            }

            if (failed) {
                return `<span title="${input}">—</span>`;
            }

            // Strip HTML tags from form for comparison if it was wrapped
            const cleanForm = form.replace(/<[^>]*>/g, '');
            const matchResult = checkMatch(input, cleanForm);

            if (matchResult.isMatch) {
                matchFound = true;
                if (matchResult.showSurface) {
                    return `${form}<br><span class="surface-variant" style="font-size: 0.8em; color: #666; background-color: #fff3cd; border-bottom: 2px solid #ffc107;">(${surfaceForm})</span>`;
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
            const gender = tags.find(t => ['Msc', 'Fem', 'Neu', 'MFN'].includes(t)) || 'Msc';
            const animacy = tags.find(t => ['Anim', 'Inan'].includes(t)) || 'Inan';
            const cases = ['Nom', 'Acc', 'Gen', 'Loc', 'Dat', 'Ins'];

            html += '<table class="paradigm-table"><thead><tr><th>Case</th><th>Singular</th><th>Plural</th></tr></thead><tbody>';

            for (const c of cases) {
                const sgInput = `${lemma}+N+${gender}+${animacy}+Sg+${c}`;
                const plInput = `${lemma}+N+${gender}+${animacy}+Pl+${c}`;
                const label = c === 'Ins' ? 'Inst' : c;

                const [sgForm, plForm] = await Promise.all([generateForm(sgInput), generateForm(plInput)]);
                html += `<tr><td>${label}</td><td>${sgForm}</td><td>${plForm}</td></tr>`;
            }
            html += '</tbody></table>';

        } else if (pos === 'A' || pos === 'Adj' || pos === 'Det') {
            // Adjective Paradigm (and Determiners)
            const cases = ['Nom', 'Acc', 'Gen', 'Loc', 'Dat', 'Ins'];
            // Short forms (Pred) usually only for Nom? Or separate category.
            // Standard adjective table: Msc, Neu, Fem, Pl

            html += '<table class="paradigm-table"><thead><tr><th>Case</th><th>Masc</th><th>Neut</th><th>Fem</th><th>Plural</th></tr></thead><tbody>';

            for (const c of cases) {
                const label = c === 'Ins' ? 'Inst' : c;

                let forms;
                if (c === 'Acc') {
                    // Generate Inan and Anim for Msc and Pl
                    const inputs = [
                        `${lemma}+${pos}+Msc+Inan+Sg+Acc`,
                        `${lemma}+${pos}+Msc+Anim+Sg+Acc`,
                        `${lemma}+${pos}+Neu+AnIn+Sg+Acc`,
                        `${lemma}+${pos}+Fem+AnIn+Sg+Acc`,
                        `${lemma}+${pos}+MFN+Inan+Pl+Acc`,
                        `${lemma}+${pos}+MFN+Anim+Pl+Acc`
                    ];
                    const results = await Promise.all(inputs.map(generateForm));

                    const mscForm = (results[0] === results[1]) ? results[0] : `${results[0]} / ${results[1]}`;
                    const neuForm = results[2];
                    const femForm = results[3];
                    const plForm = (results[4] === results[5]) ? results[4] : `${results[4]} / ${results[5]}`;

                    forms = [mscForm, neuForm, femForm, plForm];
                } else {
                    const inputs = [
                        `${lemma}+${pos}+Msc+AnIn+Sg+${c}`,
                        `${lemma}+${pos}+Neu+AnIn+Sg+${c}`,
                        `${lemma}+${pos}+Fem+AnIn+Sg+${c}`,
                        `${lemma}+${pos}+MFN+AnIn+Pl+${c}`
                    ];
                    forms = await Promise.all(inputs.map(generateForm));
                }

                html += `<tr><td>${label}</td><td>${forms[0]}</td><td>${forms[1]}</td><td>${forms[2]}</td><td>${forms[3]}</td></tr>`;
            }

            // Short forms (Pred)
            if (pos !== 'Det') {
                const shortInputs = [
                    `${lemma}+${pos}+Msc+Sg+Pred`,
                    `${lemma}+${pos}+Neu+Sg+Pred`,
                    `${lemma}+${pos}+Fem+Sg+Pred`,
                    `${lemma}+${pos}+MFN+Pl+Pred`
                ];
                const shortForms = await Promise.all(shortInputs.map(generateForm));
                if (shortForms.some(f => f !== '-')) {
                    html += `<tr><td>Short</td><td>${shortForms[0]}</td><td>${shortForms[1]}</td><td>${shortForms[2]}</td><td>${shortForms[3]}</td></tr>`;
                }
            }

            html += '</tbody></table>';

        } else if (pos === 'V') {
            // Verb Paradigm
            const aspect = tags.find(t => ['Impf', 'Perf'].includes(t)) || 'Impf';
            const transitivity = tags.find(t => ['TV', 'IV'].includes(t)) || '';
            const transitivityTag = transitivity ? `+${transitivity}` : '';

            // Present/Future
            const tense = aspect === 'Perf' ? 'Fut' : 'Prs';
            const tenseLabel = aspect === 'Perf' ? 'Future' : 'Present';

            html += `<h4>${tenseLabel}</h4>`;
            html += '<table class="paradigm-table"><thead><tr><th>Person</th><th>Singular</th><th>Plural</th></tr></thead><tbody>';

            const persons = [1, 2, 3];
            for (const p of persons) {
                const sgInput = `${lemma}+V+${aspect}${transitivityTag}+${tense}+Sg${p}`;
                const plInput = `${lemma}+V+${aspect}${transitivityTag}+${tense}+Pl${p}`;
                const [sgForm, plForm] = await Promise.all([generateVerbForm(sgInput), generateVerbForm(plInput)]);
                html += `<tr><td>${p}</td><td>${sgForm}</td><td>${plForm}</td></tr>`;
            }
            html += '</tbody></table>';

            // Past
            html += `<h4>Past</h4>`;
            html += '<table class="paradigm-table"><thead><tr><th>Gender/Number</th><th>Form</th></tr></thead><tbody>';

            const pastInputs = [
                { label: 'Masc', input: `${lemma}+V+${aspect}${transitivityTag}+Pst+Msc+Sg` },
                { label: 'Fem', input: `${lemma}+V+${aspect}${transitivityTag}+Pst+Fem+Sg` },
                { label: 'Neut', input: `${lemma}+V+${aspect}${transitivityTag}+Pst+Neu+Sg` }
            ];

            for (const item of pastInputs) {
                const form = await generateVerbForm(item.input);
                html += `<tr><td>${item.label}</td><td>${form}</td></tr>`;
            }

            // Plural is the same for all genders in Past
            const plInput = `${lemma}+V+${aspect}${transitivityTag}+Pst+MFN+Pl`;
            const plForm = await generateVerbForm(plInput);
            html += `<tr><td>Plural</td><td>${plForm}</td></tr>`;

            html += '</tbody></table>';

            // Imperative
            html += `<h4>Imperative</h4>`;
            html += '<table class="paradigm-table"><thead><tr><th>Number</th><th>Form</th></tr></thead><tbody>';
            const impSg = await generateVerbForm(`${lemma}+V+${aspect}${transitivityTag}+Imp+Sg2`);
            const impPl = await generateVerbForm(`${lemma}+V+${aspect}${transitivityTag}+Imp+Pl2`);
            html += `<tr><td>Sg (2nd)</td><td>${impSg}</td></tr>`;
            html += `<tr><td>Pl (2nd)</td><td>${impPl}</td></tr>`;
            html += '</tbody></table>';

            // Infinitive
            const inf = await generateVerbForm(`${lemma}+V+${aspect}${transitivityTag}+Inf`);
            html += `<p><strong>Infinitive:</strong> ${inf}</p>`;

            // Participles and Verbal Adverbs
            html += `<h4>Participles & Gerunds</h4>`;
            html += '<table class="paradigm-table"><thead><tr><th>Type</th><th>Present</th><th>Past</th></tr></thead><tbody>';

            // Active Participle
            const prsActPartInput = `${lemma}+V+${aspect}${transitivityTag}+PrsAct+Msc+AnIn+Sg+Nom`;
            const pstActPartInput = `${lemma}+V+${aspect}${transitivityTag}+PstAct+Msc+AnIn+Sg+Nom`;
            const [prsActPart, pstActPart] = await Promise.all([generateVerbForm(prsActPartInput), generateVerbForm(pstActPartInput)]);
            html += `<tr><td>Active Participle</td><td>${prsActPart}</td><td>${pstActPart}</td></tr>`;

            // Passive Participle
            const prsPssPartInput = `${lemma}+V+${aspect}+TV+PrsPss+Msc+AnIn+Sg+Nom`;
            const pstPssPartInput = `${lemma}+V+${aspect}+TV+PstPss+Msc+AnIn+Sg+Nom`;
            const [prsPssPart, pstPssPart] = await Promise.all([generateVerbForm(prsPssPartInput), generateVerbForm(pstPssPartInput)]);
            html += `<tr><td>Passive Participle</td><td>${prsPssPart}</td><td>${pstPssPart}</td></tr>`;

            // Verbal Adverb
            const prsAdvInput = `${lemma}+V+${aspect}${transitivityTag}+PrsAct+Adv`;
            const pstAdvInput = `${lemma}+V+${aspect}${transitivityTag}+PstAct+Adv`;
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
                 html += `<tr><td>${label}</td><td>${form}</td></tr>`;
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
    }

    async analyzeWriting() {
        const textarea = document.getElementById('writing-input');
        const text = textarea.value.trim();
        if (!text) return;

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
                this.displayWritingResults(response.data);
                writingContainer.style.display = 'flex';
            } else {
                resultsContainer.innerHTML = '<p class="error">Analysis failed. Please try again.</p>';
                writingContainer.style.display = 'flex';
            }
        } catch (error) {
            console.error('Analysis error:', error);
            resultsContainer.innerHTML = '<p class="error">An error occurred.</p>';
            writingContainer.style.display = 'flex';
        } finally {
            analyzeButton.disabled = false;
            analyzeButton.textContent = 'Analyze';
        }
    }

    displayWritingResults(tokens) {
        const resultsContainer = document.getElementById('writing-results');
        let html = '';

        tokens.forEach((token, index) => {
            let tokenHtml = '';
            if (token.isError) {
                // Store error data in a data attribute (JSON stringified)
                const errData = JSON.stringify(token.errorData).replace(/"/g, '&quot;');
                tokenHtml = `<a class="err" data-err="${errData}">${token.text}</a>`;
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
                this.showErrorDetails(errData, e.target.innerText);
            });
        });
    }

    showErrorDetails(errorData, word) {
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
