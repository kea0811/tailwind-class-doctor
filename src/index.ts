import { run } from './cli.js';

process.exitCode = run(process.argv, {
  out: (message: string): void => {
    process.stdout.write(`${message}\n`);
  },
  err: (message: string): void => {
    process.stderr.write(`${message}\n`);
  },
  isTTY: process.stdout.isTTY === true,
});
