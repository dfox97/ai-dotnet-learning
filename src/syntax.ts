import csharp from '@shikijs/langs/csharp';
import typescript from '@shikijs/langs/typescript';
import githubDark from '@shikijs/themes/github-dark';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

export const codeHighlighter = createHighlighterCore({
  themes: [githubDark],
  langs: [csharp, typescript],
  engine: createJavaScriptRegexEngine(),
});
