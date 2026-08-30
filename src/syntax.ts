import csharp from '@shikijs/langs/csharp';
import githubDark from '@shikijs/themes/github-dark';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

export const csharpHighlighter = createHighlighterCore({
  themes: [githubDark],
  langs: [csharp],
  engine: createJavaScriptRegexEngine(),
});
