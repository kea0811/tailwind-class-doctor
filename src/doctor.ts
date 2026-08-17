import { extractClassChunks, positionAt } from './extract.js';
import { lintClassList } from './lint.js';
import type { LintOptions, Problem } from './types.js';

/** Lint every class string found in a source file. */
export function lintSource(source: string, options: LintOptions): Problem[] {
  const problems: Problem[] = [];
  let cursor = 0;
  for (const chunk of extractClassChunks(source)) {
    if (chunk.start < cursor) {
      continue;
    }
    cursor = chunk.start + chunk.value.length;
    for (const finding of lintClassList(chunk.value, options).findings) {
      const { line, column } = positionAt(source, chunk.start + finding.offset);
      problems.push({
        kind: finding.kind,
        className: finding.className,
        message: finding.message,
        related: finding.related,
        line,
        column,
      });
    }
  }
  return problems;
}

/** Rewrite every fixable class string in a source file. */
export function fixSource(
  source: string,
  options: LintOptions,
): { output: string; fixedCount: number } {
  let output = '';
  let cursor = 0;
  let fixedCount = 0;
  for (const chunk of extractClassChunks(source)) {
    if (chunk.start < cursor) {
      continue;
    }
    const { findings, fixed } = lintClassList(chunk.value, options);
    output += source.slice(cursor, chunk.start);
    if (findings.length > 0) {
      output += fixed;
      fixedCount += findings.length;
    } else {
      output += chunk.value;
    }
    cursor = chunk.start + chunk.value.length;
  }
  return { output: output + source.slice(cursor), fixedCount };
}
