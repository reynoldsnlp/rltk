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
        // Auto-enhance checkbox
        document.getElementById('auto-enhance').addEventListener('change', (e) => {
            this.setAutoEnhance(e.target.checked);
        });

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

        document.getElementById('abort-button').addEventListener('click', () => {
            this.abortProcessing();
        });

        document.getElementById('restore-button').addEventListener('click', () => {
            this.restoreOriginal();
        });
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
        filterMenu.innerHTML = '<option value="no-filter">No filter</option><option value="unselected">Select filter...</option>';
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
                { id: 'singular', val: 'Sg', text: 'Singular' },
                { id: 'plural', val: 'Pl', text: 'Plural' }
            ],
            'adjectives': [
                { id: 'feminine', val: 'Fem', text: 'Feminine' },
                { id: 'masculine', val: 'Msc', text: 'Masculine' },
                { id: 'neutral', val: 'Neu', text: 'Neutral' },
                { id: 'MFN', val: 'MFN', text: 'No Gender' }
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
        activityMenu.innerHTML = '<option value="unselected">Pick an Activity</option>';

        if (topic !== 'unselected') {
            const activities = this.getRussianActivities(topic);
            activities.forEach(activity => {
                const option = document.createElement('option');
                option.value = activity.val;
                option.textContent = activity.text;
                activityMenu.appendChild(option);
            });
        }
    }

    getRussianActivities(topic) {
        const activities = {
            'adjectives': [
                { val: 'color', text: 'Color' },
                { val: 'click', text: 'Click' },
                { val: 'mc', text: 'Multiple Choice' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'assistive-reading': [
                { val: 'click', text: 'Click' }
            ],
            'gerunds': [
                { val: 'color', text: 'Color' },
                { val: 'click', text: 'Click' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'nouns': [
                { val: 'color', text: 'Color' },
                { val: 'click', text: 'Click' },
                { val: 'mc', text: 'Multiple Choice' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'participles': [
                { val: 'color', text: 'Color' },
                { val: 'click', text: 'Click' },
                { val: 'mc', text: 'Multiple Choice' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'phonetics': [
                { val: 'color', text: 'Show Phonetics' },
                { val: 'click', text: 'Hover' },
                { val: 'mc', text: 'Multiple Choice' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'prepositions': [
                { val: 'color', text: 'Color' },
                { val: 'click', text: 'Click' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'verb-aspect-pairs': [
                { val: 'color', text: 'Color' },
                { val: 'click', text: 'Click' },
                { val: 'mc', text: 'Multiple Choice' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'verb-tense': [
                { val: 'color', text: 'Color' },
                { val: 'click', text: 'Click' },
                { val: 'mc', text: 'Multiple Choice' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'verbs': [
                { val: 'color', text: 'Color' },
                { val: 'click', text: 'Click' },
                { val: 'mc', text: 'Multiple Choice' },
                { val: 'cloze', text: 'Fill in the blanks' }
            ],
            'word-stress': [
                { val: 'color', text: 'Mark Stress' },
                { val: 'click', text: 'Click' },
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

    async enhancePage() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.setProcessingState(true);

        const selections = {
            language: 'ru',
            topic: document.getElementById('topic-menu').value,
            filter: document.getElementById('filter-menu').value,
            activity: document.getElementById('activity-menu').value,
            timestamp: Date.now()
        };

        try {
            // Store selections first
            await chrome.storage.local.set(selections);

            // Send message through background script
            const response = await chrome.runtime.sendMessage({
                action: 'enhance',
                selections: selections
            });

            if (!response.success) {
                throw new Error(response.error);
            }

            // Enhancement completed successfully - reset to completed state
            this.setCompletedState();

        } catch (error) {
            console.error('Error enhancing page:', error);
            alert(`Cannot enhance this page: ${error.message}\n\nTry refreshing the page and try again.`);
            this.setProcessingState(false);
            this.isProcessing = false;
        }
    }

    setProcessingState(processing) {
        document.getElementById('enhance-button').style.display = processing ? 'none' : 'block';
        document.getElementById('abort-button').style.display = processing ? 'block' : 'none';
        document.getElementById('restore-button').style.display = 'none';
        document.getElementById('loading').style.display = processing ? 'block' : 'none';
    }

    setCompletedState() {
        this.isProcessing = false;
        document.getElementById('enhance-button').style.display = 'none';
        document.getElementById('abort-button').style.display = 'none';
        document.getElementById('restore-button').style.display = 'block';
        document.getElementById('loading').style.display = 'none';
    }

    async abortProcessing() {
        this.isProcessing = false;
        this.setInitialState();

        try {
            await chrome.runtime.sendMessage({ action: 'abort' });
        } catch (error) {
            console.error('Error aborting:', error);
        }
    }

    async restoreOriginal() {
        try {
            await chrome.runtime.sendMessage({ action: 'restore' });
        } catch (error) {
            console.error('Error restoring:', error);
        }

        this.setInitialState();
    }

    setInitialState() {
        this.isProcessing = false;
        document.getElementById('enhance-button').style.display = 'block';
        document.getElementById('abort-button').style.display = 'none';
        document.getElementById('restore-button').style.display = 'none';
        document.getElementById('loading').style.display = 'none';
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

                if (items.enabled) {
                    document.getElementById('auto-enhance').checked = items.enabled;
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
