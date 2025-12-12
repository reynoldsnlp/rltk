(function() {
	'use strict';

	const STORAGE_KEY = 'rltk_token_selector_minDistance';
	const MAX_MIN_DISTANCE = 10;

	const densityRange = document.getElementById('densityRange');
	const densityValue = document.getElementById('densityValue');
	const minDistanceInput = document.getElementById('minDistanceInput');
	const saveBtn = document.getElementById('saveBtn');
	const resetBtn = document.getElementById('resetBtn');
	const status = document.getElementById('status');

	function minDistanceToDensity(minDistance) {
		const m = Math.max(0, Math.min(MAX_MIN_DISTANCE, Number(minDistance) || 0));
		return Math.round((1 - m / MAX_MIN_DISTANCE) * 100);
	}
	function densityToMinDistance(density) {
		const d = Math.max(0, Math.min(100, Number(density) || 0));
		return Math.round((1 - d / 100) * MAX_MIN_DISTANCE);
	}

	function loadSettings() {
		const raw = localStorage.getItem(STORAGE_KEY);
		const md = raw !== null ? Number(raw) : 3;
		const density = minDistanceToDensity(md);
		densityRange.value = density;
		densityValue.textContent = `${density}%`;
		minDistanceInput.value = md;
	}

	function saveSettings(minDistance, density) {
		// Persist minDistance (primary)
		localStorage.setItem(STORAGE_KEY, String(minDistance));

		// Notify parent/frame via postMessage
		const msg = { type: 'rltk-token-selector-update', minDistance: Number(minDistance) };
		window.parent.postMessage(msg, '*');

		// Also try to directly update parent RLTKUtils if accessible
		try {
			if (window.parent && window.parent.RLTKUtils && window.parent.RLTKUtils.TokenSelector) {
				window.parent.RLTKUtils.TokenSelector.setMinDistance(Number(minDistance));
			}
		} catch (e) {
			// ignore cross-origin or unavailable
		}

		// Update UI
		status.textContent = 'Saved';
		setTimeout(() => { status.textContent = ''; }, 1500);
	}

	// Event wiring
	densityRange.addEventListener('input', function() {
		const d = Number(this.value);
		densityValue.textContent = `${d}%`;
		// Reflect computed minDistance in numeric input for preview
		minDistanceInput.value = densityToMinDistance(d);
	});

	minDistanceInput.addEventListener('input', function() {
		const md = Number(this.value) || 0;
		const density = minDistanceToDensity(md);
		densityRange.value = density;
		densityValue.textContent = `${density}%`;
	});

	saveBtn.addEventListener('click', function() {
		const md = Number(minDistanceInput.value) || 0;
		saveSettings(md, Number(densityRange.value));
	});

	resetBtn.addEventListener('click', function() {
		const def = 3;
		minDistanceInput.value = def;
		densityRange.value = minDistanceToDensity(def);
		densityValue.textContent = `${densityRange.value}%`;
		// Persist reset and notify
		saveSettings(def, densityRange.value);
		// Also send reset message
		window.parent.postMessage({ type: 'rltk-token-selector-reset' }, '*');
		status.textContent = 'Reset';
		setTimeout(() => { status.textContent = ''; }, 1500);
	});

	// Init
	document.addEventListener('DOMContentLoaded', loadSettings);
	// Also run immediately in case DOM already loaded
	if (document.readyState === 'complete' || document.readyState === 'interactive') {
		loadSettings();
	}
})();
