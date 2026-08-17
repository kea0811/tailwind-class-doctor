import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { run } from '../src/cli.js';
import { capture, makeProject, type TempProject } from './helpers.js';

const argv = (...args: string[]) => ['node', 'tailwind-class-doctor', ...args];

describe('run', () => {
  let project: TempProject;

  beforeAll(() => {
    project = makeProject({
      'src/App.tsx': '<div className="p-2 p-4">\n  <span className="flex">ok</span>\n</div>\n',
      'src/styles.css': '.btn { @apply px-4 py-2; }\n',
      'src/notes.txt': 'class="p-2 p-2" — not a scanned extension\n',
      'src/clean.html': '<main class="flex gap-2"></main>\n',
      'node_modules/pkg/index.js': 'export const c = "p-2 p-2";\n',
      'README.md': '# hi\n',
    });
  });

  afterAll(() => {
    project.cleanup();
  });

  describe('--string mode', () => {
    it('returns 0 and prints an all-clear for a clean string', () => {
      const c = capture();
      expect(run(argv('-s', 'flex p-4'), c.io)).toBe(0);
      expect(c.outText()).toContain('no problems');
    });

    it('returns 1 and reports problems', () => {
      const c = capture();
      expect(run(argv('-s', 'p-2 p-4 flex flex'), c.io)).toBe(1);
      expect(c.outText()).toContain('(string)');
      expect(c.outText()).toContain('override');
      expect(c.outText()).toContain('duplicate');
      expect(c.outText()).toContain('order');
    });

    it('prints the fixed string with --fix', () => {
      const c = capture();
      expect(run(argv('-s', 'p-2 p-4 flex flex', '--fix'), c.io)).toBe(0);
      expect(c.out).toEqual(['flex p-4']);
    });

    it('respects --no-order', () => {
      const c = capture();
      expect(run(argv('-s', 'p-4 flex', '--no-order'), c.io)).toBe(0);
    });

    it('emits JSON with --format json', () => {
      const c = capture();
      expect(run(argv('-s', 'p-2 p-4', '--format', 'json', '--no-order'), c.io)).toBe(1);
      const parsed = JSON.parse(c.outText());
      expect(parsed.files[0].file).toBe('(string)');
      expect(parsed.summary.problems).toBe(1);
    });
  });

  describe('file mode', () => {
    it('scans a directory recursively, skipping node_modules and unknown extensions', () => {
      const c = capture();
      expect(run(argv(project.dir), c.io)).toBe(1);
      expect(c.outText()).toContain('App.tsx');
      expect(c.outText()).not.toContain('notes.txt');
      expect(c.outText()).not.toContain('node_modules');
    });

    it('lints explicit files', () => {
      const c = capture();
      expect(run(argv(project.path('src/clean.html')), c.io)).toBe(0);
      expect(c.outText()).toContain('no problems in 1 file');
    });

    it('emits JSON reports', () => {
      const c = capture();
      expect(run(argv(project.dir, '--format', 'json'), c.io)).toBe(1);
      const parsed = JSON.parse(c.outText());
      expect(parsed.summary.problems).toBeGreaterThan(0);
    });

    it('honours a custom --ext list', () => {
      const c = capture();
      expect(run(argv(project.dir, '-e', 'html,.css'), c.io)).toBe(0);
      expect(c.outText()).toContain('no problems in 2 files');
    });
  });

  describe('--fix mode', () => {
    it('rewrites dirty files and leaves clean ones alone', () => {
      const fixable = makeProject({
        'a.html': '<div class="p-2 p-4"></div>\n',
        'b.html': '<div class="flex gap-2"></div>\n',
      });
      const c = capture();
      expect(run(argv(fixable.dir, '--fix'), c.io)).toBe(0);
      expect(readFileSync(fixable.path('a.html'), 'utf8')).toBe('<div class="p-4"></div>\n');
      expect(readFileSync(fixable.path('b.html'), 'utf8')).toBe('<div class="flex gap-2"></div>\n');
      expect(c.outText()).toContain('a.html — fixed 1');
      expect(c.outText()).toContain('fixed 1 problems in 1 of 2 files');
      fixable.cleanup();
    });

    it('reports when there is nothing to fix', () => {
      const clean = makeProject({ 'a.html': '<div class="flex"></div>\n' });
      const c = capture();
      expect(run(argv(clean.dir, '--fix'), c.io)).toBe(0);
      expect(c.outText()).toContain('nothing to fix');
      clean.cleanup();
    });

    it('emits a JSON fix report', () => {
      const fixable = makeProject({ 'a.html': '<div class="p-2 p-4"></div>\n' });
      const c = capture();
      expect(run(argv(fixable.dir, '--fix', '--format', 'json'), c.io)).toBe(0);
      const parsed = JSON.parse(c.outText());
      expect(parsed.summary.fixed).toBe(1);
      fixable.cleanup();
    });
  });

  describe('usage errors', () => {
    it('rejects an unknown --format', () => {
      const c = capture();
      expect(run(argv('-s', 'flex', '--format', 'yaml'), c.io)).toBe(2);
      expect(c.errText()).toContain('Invalid --format');
    });

    it('rejects mixing --string with paths', () => {
      const c = capture();
      expect(run(argv('src', '-s', 'flex'), c.io)).toBe(2);
      expect(c.errText()).toContain('not both');
    });

    it('rejects a call with nothing to lint', () => {
      const c = capture();
      expect(run(argv(), c.io)).toBe(2);
      expect(c.errText()).toContain('Nothing to lint');
    });

    it('rejects a missing path', () => {
      const c = capture();
      expect(run(argv(project.path('nope.tsx')), c.io)).toBe(2);
      expect(c.errText()).toContain('Path not found');
    });

    it('rejects a scan that matches no files', () => {
      const empty = makeProject({ 'only.txt': 'hi' });
      const c = capture();
      expect(run(argv(empty.dir), c.io)).toBe(2);
      expect(c.errText()).toContain('No matching files');
      empty.cleanup();
    });

    it('rejects unknown options via commander', () => {
      const c = capture();
      expect(run(argv('--bogus'), c.io)).toBe(2);
      expect(c.errText()).toContain('unknown option');
    });
  });

  describe('help and version', () => {
    it('prints help with examples', () => {
      const c = capture();
      expect(run(argv('--help'), c.io)).toBe(0);
      expect(c.outText()).toContain('Examples:');
      expect(c.outText()).toContain('twdoctor');
    });

    it('prints the version', () => {
      const c = capture();
      expect(run(argv('-v'), c.io)).toBe(0);
      expect(c.out).toEqual(['0.1.0']);
    });
  });

  describe('color', () => {
    it('colors output on a TTY', () => {
      const c = capture(true);
      expect(run(argv('-s', 'p-2 p-4', '--no-order'), c.io)).toBe(1);
      expect(c.outText()).toContain('\u001b[31m');
    });

    it('honours --no-color on a TTY', () => {
      const c = capture(true);
      expect(run(argv('-s', 'p-2 p-4', '--no-color', '--no-order'), c.io)).toBe(1);
      expect(c.outText()).not.toContain('\u001b[');
    });

    it('colors usage errors on a TTY', () => {
      const c = capture(true);
      expect(run(argv(), c.io)).toBe(2);
      expect(c.errText()).toContain('\u001b[31m');
    });

    it('colors fix summaries on a TTY', () => {
      const fixable = makeProject({ 'a.html': '<div class="p-2 p-4"></div>\n' });
      const c = capture(true);
      expect(run(argv(fixable.dir, '--fix'), c.io)).toBe(0);
      expect(c.outText()).toContain('\u001b[32m');
      fixable.cleanup();
    });
  });
});
