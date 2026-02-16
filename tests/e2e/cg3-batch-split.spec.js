const { test, expect } = require('@playwright/test');
const { runCg3WithRecursiveSplit } = require('../../src/rltk/utils/cg3-batch');

test.describe('CG3 batch splitting', () => {
  test('recursively splits on memory access errors', async () => {
    const cohorts = [
      '"<a>"\n\t"a" tag',
      '"<b>"\n\t"b" tag',
      '"<c>"\n\t"c" tag',
      '"<d>"\n\t"d" tag'
    ];
    const input = `${cohorts.join('\n')}\n`;

    const runner = async (text) => {
      const count = (text.match(/^"<.*>"$/gm) || []).length;
      if (count >= 3) {
        throw new Error('memory access out of bounds');
      }
      return text.replace(/"([a-z])"/g, '"$1-out"');
    };

    const output = await runCg3WithRecursiveSplit(input, runner, { maxDepth: 10 });

    expect(output).toContain('"<a>"');
    expect(output).toContain('"a-out"');
    expect(output.indexOf('"<a>"')).toBeLessThan(output.indexOf('"<d>"'));
  });

  test('rethrows non-memory errors', async () => {
    const input = '"<x>"\n\t"x" tag\n';
    const runner = async () => {
      throw new Error('grammar load failed');
    };

    await expect(runCg3WithRecursiveSplit(input, runner)).rejects.toThrow(/grammar load failed/);
  });
});
