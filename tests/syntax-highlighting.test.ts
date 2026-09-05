import assert from 'node:assert/strict';
import test from 'node:test';
import { codeHighlighter } from '../src/syntax.ts';

test('renders C# snippets with the configured learner-facing theme', async () => {
  const highlighter = await codeHighlighter;
  const html = highlighter.codeToHtml('var answer = 42;', {
    lang: 'csharp',
    theme: 'github-dark',
  });

  assert.match(html, /class="shiki github-dark"/);
  assert.match(html, /answer/);
  assert.match(html, /42/);
});
