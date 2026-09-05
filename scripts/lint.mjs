import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const sourceRoot = new URL('../src/', import.meta.url);
const allowedExtensions = new Set(['.ts', '.tsx', '.css']);
const failures = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }

    if (!allowedExtensions.has(extname(entry.name))) continue;

    const content = await readFile(path, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      if (/\s+$/.test(line)) failures.push(`${path}:${index + 1} trailing whitespace`);
      if (/\bdebugger\s*;/.test(line)) failures.push(`${path}:${index + 1} debugger statement`);
    });
  }
}

await walk(sourceRoot);

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Lint checks passed.');
}
