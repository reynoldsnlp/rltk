class RussianToolsSidePanel {
    constructor() {
        this.activitySelectors = {};
        this.currentUser = null;
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

        // Account buttons
        document.getElementById('sign-in-button').addEventListener('click', () => {
            this.openSignInWindow();
        });

        document.getElementById('account-menu-button').addEventListener('click', () => {
            this.toggleAccountMenu();
        });
    }

    setAutoEnhance(enabled) {
        chrome.storage.local.set({ enabled: enabled });
        if (enabled) {
            this.enhancePage();
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

        // Russian-specific filter logic
        if (topic === 'cases') {
            this.addFilterOptions([
                { id: 'nominative', val: 'nominative', text: 'Nominative Case' },
                { id: 'accusative', val: 'accusative', text: 'Accusative Case' },
                { id: 'genitive', val: 'genitive', text: 'Genitive Case' },
                { id: 'dative', val: 'dative', text: 'Dative Case' },
                { id: 'instrumental', val: 'instrumental', text: 'Instrumental Case' },
                { id: 'prepositional', val: 'prepositional', text: 'Prepositional Case' }
            ]);
            filterSection.style.display = 'block';
        } else if (topic === 'russian-specific') {
            this.addFilterOptions([
                { id: 'aspect', val: 'aspect', text: 'Verbal Aspect' },
                { id: 'motion-verbs', val: 'motion-verbs', text: 'Motion Verbs' },
                { id: 'soft-hard', val: 'soft-hard', text: 'Soft/Hard Consonants' }
            ]);
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
            'cases': [
                { val: 'case-identification', text: 'Identify Case' },
                { val: 'case-practice', text: 'Case Practice' }
            ],
            'russian-specific': [
                { val: 'aspect-drill', text: 'Aspect Drill' },
                { val: 'motion-practice', text: 'Motion Verb Practice' }
            ],
            'determiners': [
                { val: 'determiner-practice', text: 'Determiner Practice' }
            ],
            'Preps': [
                { val: 'preposition-drill', text: 'Preposition Drill' }
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

    enhancePage() {
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

        chrome.storage.local.set(selections, () => {
            // Send message to content script to start enhancement
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'enhance',
                    selections: selections
                });
            });
        });
    }

    setProcessingState(processing) {
        document.getElementById('enhance-button').style.display = processing ? 'none' : 'block';
        document.getElementById('abort-button').style.display = processing ? 'block' : 'none';
        document.getElementById('restore-button').style.display = processing ? 'none' : 'block';
        document.getElementById('loading').style.display = processing ? 'block' : 'none';
    }

    abortProcessing() {
        this.isProcessing = false;
        this.setProcessingState(false);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'abort' });
        });
    }

    restoreOriginal() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'restore' });
        });
        this.setProcessingState(false);
        this.isProcessing = false;
    }

    openSignInWindow() {
        const signInWindow = window.open('', '', 'width=985,height=735');
        signInWindow.location.href = 'https://auth.example.com?action=sign-in';
        signInWindow.focus();
    }

    toggleAccountMenu() {
        // Implementation for account menu toggle
        console.log('Account menu toggled');
    }

    initializeActivitySelectors() {
        const activityMenu = document.getElementById('activity-menu');
        Array.from(activityMenu.options).forEach(option => {
            this.activitySelectors[option.value] = option;
        });
    }

    loadStoredSettings() {
        chrome.storage.local.get(['enabled', 'language', 'topic', 'filter', 'activity', 'user'], (items) => {
            if (items.enabled) {
                document.getElementById('auto-enhance').checked = items.enabled;
            }
            // Store other settings for restoration
            this.storedSettings = items;
        });
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
