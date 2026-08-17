import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IO } from '../src/cli.js';

export interface TempProject {
  dir: string;
  path: (rel: string) => string;
  cleanup: () => void;
}

/** Materialize a throwaway project on disk from a `{ relativePath: contents }` map. */
export function makeProject(files: Record<string, string>): TempProject {
  const dir = mkdtempSync(path.join(tmpdir(), 'twdoctor-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content, 'utf8');
  }
  return {
    dir,
    path: (rel: string) => path.join(dir, rel),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

export interface Capture {
  io: IO;
  out: string[];
  err: string[];
  outText: () => string;
  errText: () => string;
}

/** Collect everything the CLI writes so tests can assert on it. */
export function capture(isTTY = false): Capture {
  const out: string[] = [];
  const err: string[] = [];
  return {
    io: {
      out: (message: string) => out.push(message),
      err: (message: string) => err.push(message),
      isTTY,
    },
    out,
    err,
    outText: () => out.join('\n'),
    errText: () => err.join('\n'),
  };
}
