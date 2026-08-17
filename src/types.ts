/** A single parsed class from a class string. */
export interface ClassToken {
  /** The token exactly as written, e.g. `md:hover:-mt-2`. */
  raw: string;
  /** Variant prefixes in written order, e.g. `['md', 'hover']`. */
  variants: string[];
  /** The token with variants stripped (still includes `!` / leading `-`). */
  base: string;
  /** The utility name with `!` and the negative `-` stripped, e.g. `mt-2`. */
  name: string;
  /** True for negative utilities (`-mt-2`). */
  negative: boolean;
  /** True when marked important (`!p-2` or `p-2!`). */
  important: boolean;
  /** Character offset of the token within the class string. */
  index: number;
  /** Property group the utility belongs to, or null when unknown. */
  group: string | null;
}

export type FindingKind = 'duplicate' | 'override' | 'shorthand' | 'ineffective' | 'order';

/** A single issue found in one class string. */
export interface Finding {
  kind: FindingKind;
  /** The offending class as written. */
  className: string;
  /** Character offset of the offending class within the class string. */
  offset: number;
  /** The class that wins over / shadows this one, if any. */
  related: string | null;
  message: string;
}

export interface LintOptions {
  /** Enforce the canonical class order (default true). */
  order: boolean;
}

export interface LintOutcome {
  findings: Finding[];
  /** Tokens that survive deduplication and conflict resolution. */
  kept: ClassToken[];
  /** The fully fixed class string. */
  fixed: string;
}

/** A class string found in a source file. */
export interface Chunk {
  /** The class string itself (without quotes). */
  value: string;
  /** Character offset of `value` within the source. */
  start: number;
}

/** A finding mapped to a line/column position in a source file. */
export interface Problem {
  kind: FindingKind;
  className: string;
  message: string;
  related: string | null;
  line: number;
  column: number;
}

export interface FileReport {
  file: string;
  problems: Problem[];
}
