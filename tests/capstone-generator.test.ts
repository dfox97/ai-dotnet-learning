import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';
import { generateCapstoneWorkspace } from '../scripts/generate-capstone.ts';

async function snapshotFiles(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else {
        result[relative(root, path)] = await readFile(path, 'utf8');
      }
    }
  }

  await walk(root);
  return result;
}

test('generates the same starter workspace every time', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'reviewlab-capstone-'));
  const first = join(temp, 'first');
  const second = join(temp, 'second');

  try {
    await generateCapstoneWorkspace(first);
    await generateCapstoneWorkspace(second);
    assert.deepEqual(await snapshotFiles(first), await snapshotFiles(second));
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('keeps the expert repair separate from the learner starter', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'reviewlab-capstone-'));
  const starter = join(temp, 'starter');
  const expert = join(temp, 'expert');

  try {
    await generateCapstoneWorkspace(starter, 'starter');
    await generateCapstoneWorkspace(expert, 'expert');

    const starterWorker = await readFile(join(starter, 'ReviewLab.Capstone', 'AutomationWorker.cs'), 'utf8');
    const expertWorker = await readFile(join(expert, 'ReviewLab.Capstone', 'AutomationWorker.cs'), 'utf8');
    assert.notEqual(starterWorker, expertWorker);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
