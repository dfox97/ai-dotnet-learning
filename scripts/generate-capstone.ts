import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type CapstoneVariant = 'starter' | 'expert';

export async function generateCapstoneWorkspace(
  outputPath: string,
  variant: CapstoneVariant = 'starter',
): Promise<string> {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const template = resolve(root, 'capstone', 'templates', variant);
  const output = resolve(outputPath);

  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(template, output, { recursive: true });

  return output;
}

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = readArg('--output');
  if (!output) {
    console.error('Usage: node scripts/generate-capstone.ts --output <directory> [--variant starter|expert]');
    process.exitCode = 1;
  } else {
    const requestedVariant = readArg('--variant') ?? 'starter';
    if (requestedVariant !== 'starter' && requestedVariant !== 'expert') {
      console.error(`Unknown capstone variant: ${requestedVariant}`);
      process.exitCode = 1;
    } else {
      await generateCapstoneWorkspace(output, requestedVariant);
      console.log(`Generated ${requestedVariant} capstone workspace at ${resolve(output)}`);
    }
  }
}
