import { bridgePatterns, translationChallenges } from './patterns.ts';
import { resources } from './resources.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Practice content validation failed: ${message}`);
}

function lineCount(code: string): number {
  return code.split('\n').length;
}

function assertUnique(values: string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    assert(value.trim().length > 0, `${label} contains an empty identifier`);
    assert(!seen.has(value), `${label} contains duplicate identifier "${value}"`);
    seen.add(value);
  }
}

export function validatePracticeAndReferenceContent(): void {
  assertUnique(bridgePatterns.map((pattern) => pattern.id), 'bridge patterns');
  assertUnique(translationChallenges.map((challenge) => challenge.id), 'translation challenges');
  assertUnique(resources.map((resource) => resource.url), 'resource URLs');

  for (const pattern of bridgePatterns) {
    assert(pattern.title.trim().length > 0, `${pattern.id} is missing a title`);
    assertUnique(pattern.concepts.map((concept) => concept.id), `${pattern.id} concepts`);

    const typeScriptLineCount = lineCount(pattern.typeScript.code);
    const csharpLineCount = lineCount(pattern.csharp.code);

    for (const concept of pattern.concepts) {
      for (const line of concept.typeScriptLines) {
        assert(line >= 1 && line <= typeScriptLineCount, `${pattern.id}/${concept.id} references invalid TypeScript line ${line}`);
      }
      for (const line of concept.csharpLines) {
        assert(line >= 1 && line <= csharpLineCount, `${pattern.id}/${concept.id} references invalid C# line ${line}`);
      }
    }
  }

  for (const challenge of translationChallenges) {
    assert(challenge.title.trim().length > 0, `${challenge.id} is missing a title`);
    const generatedLineCount = lineCount(challenge.generatedCode);
    for (const finding of challenge.findings) {
      assert(finding.line >= 1 && finding.line <= generatedLineCount, `${challenge.id} finding references invalid generated line ${finding.line}`);
      assert(finding.title.trim().length > 0, `${challenge.id} contains a finding without a title`);
    }
  }

  for (const resource of resources) {
    assert(resource.title.trim().length > 0, `resource ${resource.url} is missing a title`);
    assert(resource.description.trim().length > 0, `${resource.title} is missing a description`);
    let url: URL;
    try {
      url = new URL(resource.url);
    } catch {
      throw new Error(`Practice content validation failed: ${resource.title} has an invalid URL`);
    }
    assert(url.protocol === 'https:', `${resource.title} must use an HTTPS URL`);
  }
}
