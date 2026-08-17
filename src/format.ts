import type { FileReport } from './types.js';

/** Wrap `text` in an ANSI color when enabled (31 red, 32 green, 33 yellow, 36 cyan, 90 dim). */
export function colorize(text: string, code: number, enabled: boolean): string {
  return enabled ? `\u001b[${code}m${text}\u001b[39m` : text;
}

const plural = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

/** Human-readable report: file headers, one line per problem, summary line. */
export function formatPretty(reports: FileReport[], color: boolean): string[] {
  const lines: string[] = [];
  let total = 0;
  let affected = 0;
  for (const report of reports) {
    if (report.problems.length === 0) {
      continue;
    }
    total += report.problems.length;
    affected++;
    lines.push(colorize(report.file, 36, color));
    for (const problem of report.problems) {
      const warn = problem.kind === 'order';
      const icon = colorize(warn ? '⚠' : '✖', warn ? 33 : 31, color);
      const where = colorize(`${problem.line}:${problem.column}`.padEnd(7), 90, color);
      lines.push(`  ${where} ${icon} ${problem.kind.padEnd(11)} ${problem.message}`);
    }
    lines.push('');
  }
  if (total === 0) {
    lines.push(colorize(`✓ no problems in ${plural(reports.length, 'file')}`, 32, color));
  } else {
    lines.push(
      colorize(
        `✖ ${plural(total, 'problem')} in ${affected} of ${plural(reports.length, 'file')} — rerun with --fix to fix them`,
        31,
        color,
      ),
    );
  }
  return lines;
}

/** Machine-readable report. */
export function formatJson(reports: FileReport[]): string {
  const files = reports.filter((report) => report.problems.length > 0);
  return JSON.stringify(
    {
      files,
      summary: {
        scanned: reports.length,
        problems: files.reduce((sum, report) => sum + report.problems.length, 0),
      },
    },
    null,
    2,
  );
}
