import { describe, expect, it } from 'vitest';
import { colorize, formatJson, formatPretty } from '../src/format.js';
import type { FileReport, Problem } from '../src/types.js';

const problem = (overrides: Partial<Problem> = {}): Problem => ({
  kind: 'override',
  className: 'p-2',
  message: '"p-2" is overridden by later "p-4"',
  related: 'p-4',
  line: 3,
  column: 14,
  ...overrides,
});

describe('colorize', () => {
  it('wraps text in ANSI codes when enabled', () => {
    expect(colorize('hi', 31, true)).toBe('\u001b[31mhi\u001b[39m');
  });

  it('passes text through when disabled', () => {
    expect(colorize('hi', 31, false)).toBe('hi');
  });
});

describe('formatPretty', () => {
  it('prints a green all-clear for a single clean file', () => {
    const lines = formatPretty([{ file: 'a.tsx', problems: [] }], false);
    expect(lines).toEqual(['✓ no problems in 1 file']);
  });

  it('prints file headers, problem rows, and a red summary', () => {
    const reports: FileReport[] = [
      { file: 'a.tsx', problems: [problem()] },
      { file: 'b.tsx', problems: [] },
      { file: 'c.css', problems: [problem({ kind: 'order', line: 1, column: 1 })] },
    ];
    const lines = formatPretty(reports, false);
    expect(lines[0]).toBe('a.tsx');
    expect(lines[1]).toContain('3:14');
    expect(lines[1]).toContain('✖ override');
    expect(lines[1]).toContain('overridden by later');
    expect(lines[3]).toBe('c.css');
    expect(lines[4]).toContain('⚠ order');
    expect(lines.at(-1)).toBe('✖ 2 problems in 2 of 3 files — rerun with --fix to fix them');
  });

  it('colors output when asked to', () => {
    const lines = formatPretty([{ file: 'a.tsx', problems: [problem()] }], true);
    expect(lines[0]).toBe('\u001b[36ma.tsx\u001b[39m');
    expect(lines[1]).toContain('\u001b[31m✖\u001b[39m');
  });
});

describe('formatJson', () => {
  it('emits only files with problems plus a summary', () => {
    const reports: FileReport[] = [
      { file: 'a.tsx', problems: [problem()] },
      { file: 'b.tsx', problems: [] },
    ];
    const parsed = JSON.parse(formatJson(reports));
    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0].file).toBe('a.tsx');
    expect(parsed.files[0].problems[0].kind).toBe('override');
    expect(parsed.summary).toEqual({ scanned: 2, problems: 1 });
  });
});
