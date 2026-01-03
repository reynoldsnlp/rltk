/**
 * Token Selector Utility for RLTK Extension
 *
 * This utility manages the selection of tokens for targeted activities (like Cloze tests).
 * It ensures that selected tokens are spaced out appropriately to avoid overwhelming the user
 * and to provide a balanced exercise.
 * It supports:
 * 1. Configurable density/distance between selected tokens.
 * 2. Persistence of settings.
 */

(function() {
	'use strict';

	// Create global namespace if missing
	window.RLTKUtils = window.RLTKUtils || {};

	// Storage key and max distance used for mapping density slider to minDistance
	const STORAGE_KEY = 'rltk_token_selector_minDistance';
	const MAX_MIN_DISTANCE = 10;
	const DEFAULT_MIN_DISTANCE = 5;

	// Utility mapping between density (0..100) and minDistance (0..MAX_MIN_DISTANCE)
	function densityToMinDistance(density) {
		const d = Math.max(0, Math.min(100, Number(density) || 0));
		return Math.round((1 - d / 100) * MAX_MIN_DISTANCE);
	}
	function minDistanceToDensity(minDistance) {
		const m = Math.max(0, Math.min(MAX_MIN_DISTANCE, Number(minDistance) || 0));
		return Math.round((1 - m / MAX_MIN_DISTANCE) * 100);
	}

	// Load saved value or default
	function loadMinDistance() {
		const raw = localStorage.getItem(STORAGE_KEY);
		const parsed = raw !== null ? Number(raw) : NaN;
		if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_MIN_DISTANCE;
		return Math.round(Math.min(parsed, MAX_MIN_DISTANCE));
	}

	function saveMinDistance(value) {
		const v = Math.max(0, Math.round(value));
		localStorage.setItem(STORAGE_KEY, String(v));
		if (chrome && chrome.storage && chrome.storage.local) {
			chrome.storage.local.set({ [STORAGE_KEY]: v });
		}
	}

	/**
	 * TokenSelector implementation
	 * Manages the state of token selection (last selected index, minimum distance).
	 */
	const TokenSelector = {
		lastSelectedIndex: -1,
		minDistance: loadMinDistance(),

		/**
		 * Determines if a token at the given index should be selected.
		 * Enforces a deterministic minimum distance between selections.
		 * @param {number} cohortIndex - The index of the current token.
		 * @returns {boolean} True if the token should be selected.
		 */
		shouldSelectToken(cohortIndex) {
			// Always select the first eligible token
			if (this.lastSelectedIndex === -1) {
				this.lastSelectedIndex = cohortIndex;
				return true;
			}

			// If spacing is zero, select everything
			if (this.minDistance <= 0) {
				this.lastSelectedIndex = cohortIndex;
				return true;
			}

			const distance = cohortIndex - this.lastSelectedIndex;
			if (distance >= this.minDistance) {
				this.lastSelectedIndex = cohortIndex;
				return true;
			}

			return false;
		},

		/**
		 * Resets the selection state (e.g., for a new paragraph or document).
		 */
		reset() {
			this.lastSelectedIndex = -1;
		},

		// API to set minDistance (and persist)
		setMinDistance(n) {
			this.minDistance = Math.max(0, Math.round(n));
			saveMinDistance(this.minDistance);
		},

		// API to set density (0..100) which maps to minDistance
		setDensity(density) {
			const md = densityToMinDistance(density);
			this.setMinDistance(md);
		},

		// Read helpers
		getMinDistance() {
			return this.minDistance;
		},

		getDensity() {
			return minDistanceToDensity(this.minDistance);
		}
	};

	// Expose
	window.RLTKUtils.TokenSelector = TokenSelector;

	// Pull latest stored value from extension storage (async) to respect Options page settings.
	if (chrome && chrome.storage && chrome.storage.local) {
		chrome.storage.local.get([STORAGE_KEY], (res) => {
			const val = res && res[STORAGE_KEY];
			if (val !== undefined && val !== null) {
				TokenSelector.setMinDistance(Number(val));
			}
		});

		chrome.storage.onChanged.addListener((changes, areaName) => {
			if (areaName !== 'local') return;
			if (changes[STORAGE_KEY] && changes[STORAGE_KEY].newValue !== undefined) {
				TokenSelector.minDistance = Math.max(0, Math.round(Number(changes[STORAGE_KEY].newValue)));
			}
		});
	}

	// Listen for external updates (from options panel)
	window.addEventListener('message', (ev) => {
		try {
			const msg = ev && ev.data;
			if (!msg || typeof msg !== 'object') return;
			if (msg.type === 'rltk-token-selector-update' && msg.minDistance !== undefined) {
				TokenSelector.setMinDistance(Number(msg.minDistance));
			}
			if (msg.type === 'rltk-token-selector-set-density' && msg.density !== undefined) {
				TokenSelector.setDensity(Number(msg.density));
			}
			if (msg.type === 'rltk-token-selector-reset') {
				TokenSelector.setMinDistance(DEFAULT_MIN_DISTANCE);
				TokenSelector.reset();
			}
		} catch (e) {
			/* ignore */
		}
	}, false);
})();
