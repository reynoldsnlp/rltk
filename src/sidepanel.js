class RussianToolsSidePanel {
    constructor() {
        this.activitySelectors = {};
        this.isProcessing = false;

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.initializeActivitySelectors();

        // Load state for the current tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
            await this.loadTabState(tabs[0].id);
        }

        // Listen for tab activation to switch state
        chrome.tabs.onActivated.addListener(async (activeInfo) => {
            await this.loadTabState(activeInfo.tabId);
            this.checkPageStatus();
        });

        // Proactively try to inject scripts when the panel opens
        // This acts as a backup or for when the panel is already open and user navigates
        chrome.runtime.sendMessage({ action: 'inject_content_script' })
            .then(() => this.checkPageStatus())
            .catch(err => console.log("Initial injection check failed:", err));
    }

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

        document.getElementById('restore-button').addEventListener('click', () => {
            this.restorePage();
        });
    }

    async enhancePage() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.setProcessingState(true);

        const selections = {
            topic: document.getElementById('topic-menu').value,
            filter: document.getElementById('filter-menu').value,
            activity: document.getElementById('activity-menu').value,
        };

        try {
            // Always restore first
            await chrome.runtime.sendMessage({ action: 'restore' });

            // Store selections
            await this.saveTabState();

            // Send message through background script
            const response = await chrome.runtime.sendMessage({
                action: 'enhance',
                selections: selections
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
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (tabs.length > 0 && tabs[0].url) {
                        const url = new URL(tabs[0].url);
                        const origin = `${url.protocol}//${url.hostname}/*`;

                        const granted = await chrome.permissions.request({
                            origins: [origin]
                        });

                        if (granted) {
                            // Retry enhancement
                            this.isProcessing = false; // Reset flag for retry
                            await this.enhancePage();
                            return; // Exit this execution as the retry will handle it
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

    initializeActivitySelectors() {
// ...existing code...
    }

    switchTab(tabName) {
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
            'assistive-reading': [
                { val: 'click', text: 'Click to identify' }
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

    restoreSelections() {
        // Deprecated in favor of loadTabState and applySelections
    }
}

// Initialize the side panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RussianToolsSidePanel();
});
