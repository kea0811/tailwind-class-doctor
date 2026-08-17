import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Command, CommanderError } from 'commander';
import { fixSource, lintSource } from './doctor.js';
import { colorize, formatJson, formatPretty } from './format.js';
import { lintClassList } from './lint.js';
import type { FileReport, LintOptions, Problem } from './types.js';

const VERSION = '0.1.0';

const DEFAULT_EXTS = [
  '.html', '.htm', '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.astro', '.mdx',
  '.css', '.scss',
];

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next']);

const EXAMPLE_ROWS: Array<[string, string]> = [
  ['src/', 'scan a directory recursively'],
  ['src/App.tsx styles.css', 'lint specific files'],
  ['-s "p-2 p-4 flex flex"', 'lint a class string directly'],
  ['-s "mt-2 flex p-4" --fix', 'print the fixed string'],
  ['src/ --fix', 'rewrite files in place'],
  ['src/ --format json', 'machine-readable output'],
  ['src/ --no-order', 'skip the canonical-order rule'],
];

const HELP_EXAMPLES = [
  '',
  'Examples:',
  ...EXAMPLE_ROWS.map(
    ([cmd, desc]) => `  ${`$ twdoctor ${cmd}`.padEnd(38)}  ${desc}`,
  ),
].join('\n');

/** A user-facing error whose message is printed without a stack trace. */
export class CliError extends Error {}

/** How the CLI talks to the outside world (injected so it is testable). */
export interface IO {
  out: (message: string) => void;
  err: (message: string) => void;
  isTTY: boolean;
}

interface CliOptions {
  string?: string;
  fix: boolean;
  format: string;
  order: boolean;
  color: boolean;
  ext?: string;
}

function walk(dir: string, exts: Set<string>, found: string[]): void {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walk(full, exts, found);
      }
    } else if (exts.has(path.extname(entry.name))) {
      found.push(full);
    }
  }
}

function collectFiles(paths: string[], exts: Set<string>): string[] {
  const found: string[] = [];
  for (const p of paths) {
    if (!existsSync(p)) {
      throw new CliError(`Path not found: ${p}`);
    }
    if (statSync(p).isDirectory()) {
      walk(p, exts, found);
    } else {
      found.push(p);
    }
  }
  if (found.length === 0) {
    throw new CliError('No matching files found — check the paths or --ext list.');
  }
  return found;
}

function parseExts(list: string | undefined): Set<string> {
  if (list === undefined) {
    return new Set(DEFAULT_EXTS);
  }
  return new Set(
    list.split(',').map((ext) => (ext.startsWith('.') ? ext : `.${ext}`)),
  );
}

function lintStringMode(classes: string, options: CliOptions, io: IO, lintOptions: LintOptions): number {
  const outcome = lintClassList(classes, lintOptions);
  if (options.fix) {
    io.out(outcome.fixed);
    return 0;
  }
  const problems: Problem[] = outcome.findings.map((finding) => ({
    kind: finding.kind,
    className: finding.className,
    message: finding.message,
    related: finding.related,
    line: 1,
    column: finding.offset + 1,
  }));
  const reports: FileReport[] = [{ file: '(string)', problems }];
  emit(reports, options, io);
  return problems.length > 0 ? 1 : 0;
}

function fixFilesMode(files: string[], options: CliOptions, io: IO, lintOptions: LintOptions): number {
  const changed: Array<{ file: string; fixed: number }> = [];
  let total = 0;
  for (const file of files) {
    const { output, fixedCount } = fixSource(readFileSync(file, 'utf8'), lintOptions);
    if (fixedCount > 0) {
      writeFileSync(file, output, 'utf8');
      changed.push({ file, fixed: fixedCount });
      total += fixedCount;
    }
  }
  if (options.format === 'json') {
    io.out(JSON.stringify({ files: changed, summary: { scanned: files.length, fixed: total } }, null, 2));
    return 0;
  }
  const color = options.color && io.isTTY;
  for (const entry of changed) {
    io.out(`${colorize('✎', 32, color)} ${entry.file} — fixed ${entry.fixed}`);
  }
  io.out(
    total === 0
      ? colorize(`✓ nothing to fix in ${files.length} files`, 32, color)
      : colorize(`fixed ${total} problems in ${changed.length} of ${files.length} files`, 32, color),
  );
  return 0;
}

function lintFilesMode(files: string[], options: CliOptions, io: IO, lintOptions: LintOptions): number {
  const reports: FileReport[] = files.map((file) => ({
    file,
    problems: lintSource(readFileSync(file, 'utf8'), lintOptions),
  }));
  emit(reports, options, io);
  return reports.some((report) => report.problems.length > 0) ? 1 : 0;
}

function emit(reports: FileReport[], options: CliOptions, io: IO): void {
  if (options.format === 'json') {
    io.out(formatJson(reports));
    return;
  }
  for (const line of formatPretty(reports, options.color && io.isTTY)) {
    io.out(line);
  }
}

function execute(paths: string[], options: CliOptions, io: IO): number {
  if (options.format !== 'pretty' && options.format !== 'json') {
    throw new CliError(`Invalid --format "${options.format}": use pretty or json.`);
  }
  const lintOptions: LintOptions = { order: options.order };
  if (options.string !== undefined) {
    if (paths.length > 0) {
      throw new CliError('Pass either file paths or --string, not both.');
    }
    return lintStringMode(options.string, options, io, lintOptions);
  }
  if (paths.length === 0) {
    throw new CliError('Nothing to lint — pass file/directory paths or --string. See --help.');
  }
  const files = collectFiles(paths, parseExts(options.ext));
  return options.fix
    ? fixFilesMode(files, options, io, lintOptions)
    : lintFilesMode(files, options, io, lintOptions);
}

function buildProgram(io: IO, exit: { code: number }): Command {
  const program = new Command();
  program
    .name('tailwind-class-doctor')
    .description('Lint Tailwind class strings for duplicates, conflicts, and canonical order.')
    .version(VERSION, '-v, --version', 'output the version number')
    .argument('[paths...]', 'files or directories to scan')
    .option('-s, --string <classes>', 'lint a class string instead of files')
    .option('-f, --fix', 'apply fixes (rewrite files, or print the fixed string with -s)', false)
    .option('--format <format>', 'output format: pretty, json', 'pretty')
    .option('--no-order', 'disable the canonical-order rule')
    .option('--no-color', 'disable colored output')
    .option('-e, --ext <list>', `extensions for directory scans (default: ${DEFAULT_EXTS.join(',')})`)
    .addHelpText('after', HELP_EXAMPLES)
    .action((paths: string[], options: CliOptions) => {
      exit.code = execute(paths, options, io);
    });
  return program;
}

/**
 * Parse `argv` (full `process.argv` shape) and run the CLI, returning an exit
 * code: 0 clean, 1 problems found, 2 usage error.
 */
export function run(argv: string[], io: IO): number {
  const exit = { code: 0 };
  const program = buildProgram(io, exit);
  program.exitOverride();
  program.configureOutput({
    writeOut: (str) => io.out(str.replace(/\n$/, '')),
    writeErr: (str) => io.err(str.replace(/\n$/, '')),
  });

  try {
    program.parse(argv);
    return exit.code;
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode === 0 ? 0 : 2;
    }
    io.err(colorize((error as Error).message, 31, io.isTTY));
    return 2;
  }
}
