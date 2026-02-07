/**
 * Roots Topic Logic for RLTK Extension
 *
 * Highlights root segments using root parses and definitions.
 */

(function() {
    'use strict';

    window.TopicInitFuncs = window.TopicInitFuncs || {};

    let rootParses = null;
    let rootDefinitions = null;

    const ROOT_TAG = 'ROOT';

    function normalizeText(text) {
        return (text || '')
            .toLowerCase()
            .replace(/[\u0300\u0301]/g, '')
            .replace(/ё/g, 'е');
    }

    function ensureRootStyles() {
        if (document.getElementById('rltk-root-styles')) return;
        const style = document.createElement('style');
        style.id = 'rltk-root-styles';
        style.textContent = `
            .rltk-root-fragment {
                background-color: rgba(255, 207, 64, 0.45);
                border-bottom: 2px solid rgba(255, 193, 7, 0.9);
                padding: 0 1px;
                cursor: help;
            }
            .rltk-root-fragment.rltk-root-muted {
                background-color: transparent;
                border-bottom-color: transparent;
            }
            .rltk-root-fragment.rltk-root-focused {
                background-color: rgba(255, 160, 0, 0.6);
                border-bottom-color: rgba(255, 140, 0, 0.95);
            }
            .rltk-root-tooltip {
                position: absolute;
                background: #fff;
                border: 1px solid #ccc;
                padding: 8px 10px;
                border-radius: 4px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                z-index: 10000;
                font-size: 13px;
                color: #333;
                max-width: 260px;
                text-align: left;
            }
        `;
        document.head.appendChild(style);
    }

    function resetRootsSummary() {
        window.RootsSummaryUtils = window.RootsSummaryUtils || {};
        window.RootsSummaryUtils.summary = {};
    }

    function recordRootSummary(root, definition, lemma) {
        if (!window.RootsSummaryUtils) return;
        const summary = window.RootsSummaryUtils.summary || {};
        if (!summary[root]) {
            summary[root] = {
                root,
                definition,
                count: 0,
                lemmas: {}
            };
        }
        summary[root].count += 1;
        if (lemma) summary[root].lemmas[lemma] = true;
        window.RootsSummaryUtils.summary = summary;
    }

    function getRootSummaryArray() {
        if (!window.RootsSummaryUtils || !window.RootsSummaryUtils.summary) return [];
        const entries = Object.values(window.RootsSummaryUtils.summary).map(entry => {
            return {
                root: entry.root,
                definition: entry.definition,
                count: entry.count,
                lemmas: Object.keys(entry.lemmas || {}).sort()
            };
        });
        entries.sort((a, b) => b.count - a.count || a.root.localeCompare(b.root));
        return entries;
    }

    window.TopicInitFuncs["roots"] = async function() {
        if (rootParses && rootDefinitions) {
            resetRootsSummary();
            return;
        }

        try {
            const [parseResponse, defResponse] = await Promise.all([
                chrome.runtime.sendMessage({ target: 'offscreen', action: 'get_model_data', modelName: 'root_parses' }),
                chrome.runtime.sendMessage({ target: 'offscreen', action: 'get_model_data', modelName: 'roots_definitions' })
            ]);

            if (parseResponse.success) rootParses = parseResponse.data;
            if (defResponse.success) rootDefinitions = defResponse.data;
            resetRootsSummary();
        } catch (e) {
            console.error('Failed to load root models', e);
        }
    };

    function getRootsForLemma(lemma) {
        if (!rootParses || !rootDefinitions) return [];
        const normalizedLemma = normalizeText(lemma);
        const parse = rootParses[normalizedLemma] || rootParses[lemma] || null;
        if (!parse || !Array.isArray(parse)) return [];

        const roots = [];
        parse.forEach(part => {
            if (!Array.isArray(part) || part.length < 2) return;
            const [segment, tag] = part;
            if (tag !== ROOT_TAG) return;
            const normalizedSegment = normalizeText(segment);
            if (!normalizedSegment || normalizedLemma.length < normalizedSegment.length) return;
            const definition = rootDefinitions[segment] || rootDefinitions[normalizedSegment] || null;
            if (definition) {
                const baseRoots = definition.split(';').map(chunk => chunk.split(':')[0].trim());
                const baseLengths = baseRoots
                    .map(root => normalizeText(root).length)
                    .filter(len => len > 0);
                const maxBaseLength = baseLengths.length > 0 ? Math.max(...baseLengths) : 0;
                if (maxBaseLength > 0 && normalizedLemma.length < maxBaseLength) return;
            }
            if (definition) {
                roots.push({ root: segment, definition });
            }
        });

        const seen = new Set();
        return roots.filter(entry => {
            const key = `${entry.root}|${entry.definition}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function findRootReading(cohort) {
        if (!cohort.rs || cohort.rs.length === 0) return null;
        for (const reading of cohort.rs) {
            if (!reading || !reading.l) continue;
            const roots = getRootsForLemma(reading.l);
            if (roots.length > 0) {
                return { reading, roots };
            }
        }
        return null;
    }

    function createRootTooltip(target, definition) {
        const existing = document.querySelector('.rltk-root-tooltip');
        if (existing) existing.remove();

        const tooltip = document.createElement('div');
        tooltip.className = 'rltk-root-tooltip';
        tooltip.textContent = definition;
        document.body.appendChild(tooltip);

        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const left = rect.left + window.scrollX + (rect.width - tooltipRect.width) / 2;
        const top = rect.top + window.scrollY - tooltipRect.height - 8;

        tooltip.style.left = `${Math.max(8, left)}px`;
        tooltip.style.top = `${Math.max(8, top)}px`;
    }

    function attachTooltipHandlers(span, definition) {
        span.addEventListener('mouseenter', () => {
            createRootTooltip(span, definition);
        });
        span.addEventListener('mouseleave', () => {
            const tooltip = document.querySelector('.rltk-root-tooltip');
            if (tooltip) tooltip.remove();
        });
    }

    function buildRootHighlightedSpan(originalText, roots, enableTooltip = true) {
        const normalizedText = normalizeText(originalText);
        let cursor = 0;
        const matches = [];

        roots.forEach(entry => {
            const normalizedRoot = normalizeText(entry.root);
            if (!normalizedRoot) return;
            const index = normalizedText.indexOf(normalizedRoot, cursor);
            if (index === -1) return;
            matches.push({ start: index, end: index + normalizedRoot.length, definition: entry.definition });
            cursor = index + normalizedRoot.length;
        });

        if (matches.length === 0) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const wrapper = document.createElement('span');
        let lastIndex = 0;
        matches.forEach(match => {
            if (match.start > lastIndex) {
                wrapper.appendChild(document.createTextNode(originalText.slice(lastIndex, match.start)));
            }
            const rootSpan = document.createElement('span');
            rootSpan.className = 'rltk-root-fragment';
            rootSpan.textContent = originalText.slice(match.start, match.end);
            rootSpan.dataset.definition = match.definition;
            if (enableTooltip) {
                attachTooltipHandlers(rootSpan, match.definition);
            }
            wrapper.appendChild(rootSpan);
            lastIndex = match.end;
        });

        if (lastIndex < originalText.length) {
            wrapper.appendChild(document.createTextNode(originalText.slice(lastIndex)));
        }

        return wrapper;
    }

    function buildDistractorDefinitions(correctRoot, correctDefinition, distractorCount = 4) {
        if (!rootDefinitions) return [correctDefinition];
        const normalizedRoot = normalizeText(correctRoot);
        const prefixLength = normalizedRoot.length >= 3 ? 3 : 2;
        const prefix = normalizedRoot.slice(0, prefixLength);
        const candidates = Object.keys(rootDefinitions)
            .filter(root => root !== correctRoot)
            .map(root => ({ root, definition: rootDefinitions[root] }))
            .filter(item => !isMultiDefinition(item.definition));

        const similar = candidates
            .filter(item => normalizeText(item.root).startsWith(prefix))
            .sort((a, b) => a.root.localeCompare(b.root));
        const randomPool = candidates.filter(item => item.definition !== correctDefinition);

        const options = [correctDefinition];

        if (similar.length > 0) {
            options.push(similar[0].definition);
        }

        while (options.length < distractorCount + 1 && randomPool.length > 0) {
            const pickIndex = Math.floor(Math.random() * randomPool.length);
            const pick = randomPool.splice(pickIndex, 1)[0];
            if (!options.includes(pick.definition)) {
                options.push(pick.definition);
            }
        }

        const unique = Array.from(new Set(options));
        return unique.slice(0, distractorCount + 1);
    }

    function stripRootLabel(definition) {
        if (!definition) return '';
        const parts = definition.split(':');
        if (parts.length <= 1) return definition.trim();
        return parts.slice(1).join(':').trim();
    }

    function isMultiDefinition(definition) {
        return !!definition && definition.includes(';');
    }

    window.FilterFuncs.roots = function(cohort) {
        return !!findRootReading(cohort);
    };

    window.EnhanceFuncs["roots-color"] = function(originalText, cohort, cohortIndex) {
        ensureRootStyles();
        const rootReading = findRootReading(cohort);
        if (!rootReading) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const { reading, roots } = rootReading;
        roots.forEach(entry => recordRootSummary(entry.root, entry.definition, reading.l));

        const span = document.createElement('span');
        span.className = `ʁ ʁ${cohortIndex} ʁ-root-word`;
        span.appendChild(buildRootHighlightedSpan(originalText, roots));
        span.setAttribute('data-readings', JSON.stringify([reading]));
        return span;
    };

    window.EnhanceFuncs["roots-mc"] = function(originalText, cohort, cohortIndex, isCorrect) {
        if (!isCorrect) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const rootReading = findRootReading(cohort);
        if (!rootReading) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        const { reading, roots } = rootReading;
        const primaryRoot = roots.find(entry => !isMultiDefinition(entry.definition));
        if (!primaryRoot) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }
        const correctMeaning = stripRootLabel(primaryRoot.definition);

        const container = document.createElement('span');
        container.className = `ʁ ʁ${cohortIndex} ʁ-root-mc`;

        const wordSpan = buildRootHighlightedSpan(originalText, [primaryRoot], false);
        wordSpan.classList.add('rltk-root-mc-word');

        const select = document.createElement('select');
        const promptRoot = normalizeText(primaryRoot.root).toUpperCase();
        const promptText = `${promptRoot}?`;
        const width = window.RLTKUtils.getResponsiveWidth(promptText, 1);
        select.style.cssText = window.RLTKUtils.getBaseFormStyles(width);
        window.RLTKUtils.addStopPropagationListeners(select);

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = promptText;
        placeholder.selected = true;
        select.appendChild(placeholder);

        const options = buildDistractorDefinitions(primaryRoot.root, primaryRoot.definition, 4)
            .map(stripRootLabel)
            .filter(Boolean);
        const uniqueOptions = Array.from(new Set(options));
        if (uniqueOptions.length < 5) {
            const span = document.createElement('span');
            span.textContent = originalText;
            return span;
        }

        uniqueOptions.forEach((definition, index) => {
            const opt = document.createElement('option');
            opt.value = definition;
            opt.textContent = definition;
            opt.dataset.isCorrect = definition === correctMeaning;
            select.appendChild(opt);
        });

        const optionElements = Array.from(select.options).slice(1);
        optionElements.sort(() => Math.random() - 0.5);
        select.innerHTML = '';
        select.appendChild(placeholder);
        optionElements.forEach(opt => select.appendChild(opt));

        placeholder.selected = true;
        select.selectedIndex = 0;

        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (!selectedOption || !selectedOption.value) return;

            const isCorrectAnswer = selectedOption.dataset.isCorrect === 'true';
            if (isCorrectAnswer) {
                const correctSpan = window.RLTKUtils.createSuccessSpan(
                    originalText,
                    cohortIndex,
                    'ʁ-root-mc-correct'
                );
                container.parentNode.replaceChild(correctSpan, container);
            } else {
                window.RLTKUtils.showIncorrectFeedback(this, () => {
                    this.selectedIndex = 0;
                });
            }
        });

        const rootHighlight = wordSpan.querySelector('.rltk-root-fragment');
        if (rootHighlight) {
            rootHighlight.classList.add('rltk-root-muted');
            const setFocusState = (active) => {
                rootHighlight.classList.toggle('rltk-root-focused', active);
                rootHighlight.classList.toggle('rltk-root-muted', !active);
            };
            select.addEventListener('focus', () => setFocusState(true));
            select.addEventListener('blur', () => setFocusState(false));
            select.addEventListener('mouseenter', () => setFocusState(true));
            select.addEventListener('mouseleave', () => {
                if (document.activeElement !== select) setFocusState(false);
            });
        }

        container.appendChild(wordSpan);
        container.appendChild(select);
        container.setAttribute('data-readings', JSON.stringify([reading]));
        return container;
    };

    window.RootsSummaryUtils = window.RootsSummaryUtils || {};
    window.RootsSummaryUtils.getSummary = getRootSummaryArray;
    window.RootsSummaryUtils.reset = resetRootsSummary;
})();
