class RussianToolsSidePanel {
    constructor() {
        this.activitySelectors = {};
        this.isProcessing = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadStoredSettings();
        this.initializeActivitySelectors();
        this.restoreSelections();
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
        });

        // Filter selection
        document.getElementById('filter-menu').addEventListener('change', () => {
            this.toggleEnhanceButton();
        });

        // Activity selection
        document.getElementById('activity-menu').addEventListener('change', () => {
            this.toggleEnhanceButton();
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
            await chrome.storage.local.set(selections);

            // Send message through background script
            console.log('Sending enhance request from sidepanel.js with selections:', selections);
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
            alert(`Cannot enhance this page. Refresh the page and try again.

Error: ${error.message}`);
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
                // Store other settings for restoration
                this.storedSettings = items;
            });
        } catch (error) {
            console.error('Error accessing storage:', error);
        }
    }

    restoreSelections() {
        if (this.storedSettings) {
            const { topic, filter, activity } = this.storedSettings;

            if (topic) {
                document.getElementById('topic-menu').value = topic;
                this.onTopicChange(topic);
            }

            if (filter) {
                document.getElementById('filter-menu').value = filter;
            }

            if (activity) {
                document.getElementById('activity-menu').value = activity;
            }

            this.toggleEnhanceButton();
        }
    }
}

// Initialize the side panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RussianToolsSidePanel();
});
