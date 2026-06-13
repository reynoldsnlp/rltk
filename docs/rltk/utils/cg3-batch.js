(function(root) {
    'use strict';

    const MEMORY_ERROR_RE = /memory access out of bounds|WASM memory error/i;
    const TOKEN_LINE_RE = /^"<.*>"$/;

    function isMemoryAccessError(error) {
        if (!error) return false;
        const message = error.message ? error.message : String(error);
        return MEMORY_ERROR_RE.test(message);
    }

    function splitCg3IntoCohorts(input) {
        if (!input) return [];
        const lines = input.split('\n');
        const cohorts = [];
        let current = [];

        for (const line of lines) {
            if (TOKEN_LINE_RE.test(line)) {
                if (current.length) cohorts.push(current.join('\n'));
                current = [line];
                continue;
            }

            if (current.length || line.trim().length > 0) {
                current.push(line);
            }
        }

        if (current.length) cohorts.push(current.join('\n'));
        return cohorts;
    }

    function joinCg3Cohorts(cohorts) {
        if (!cohorts.length) return '';
        return `${cohorts.join('\n')}\n`;
    }

    function joinCg3Outputs(outputs) {
        if (!outputs.length) return '';
        return `${outputs.map(output => output.trimEnd()).join('\n')}\n`;
    }

    async function runCg3WithRecursiveSplit(input, runner, options = {}) {
        const maxDepth = Number.isFinite(options.maxDepth) ? options.maxDepth : 20;
        const cohorts = Array.isArray(options.cohorts) ? options.cohorts : splitCg3IntoCohorts(input);

        async function runRange(start, end, depth) {
            const slice = cohorts.slice(start, end);
            const chunk = joinCg3Cohorts(slice);

            try {
                return await runner(chunk);
            } catch (error) {
                if (!isMemoryAccessError(error) || end - start <= 1 || depth >= maxDepth) {
                    throw error;
                }

                const mid = start + Math.floor((end - start) / 2);
                const left = await runRange(start, mid, depth + 1);
                const right = await runRange(mid, end, depth + 1);
                return joinCg3Outputs([left, right]);
            }
        }

        if (!cohorts.length) {
            return await runner(input || '');
        }

        return await runRange(0, cohorts.length, 0);
    }

    const api = {
        isMemoryAccessError,
        splitCg3IntoCohorts,
        joinCg3Cohorts,
        runCg3WithRecursiveSplit
    };

    root.RLTKCG3Batch = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
