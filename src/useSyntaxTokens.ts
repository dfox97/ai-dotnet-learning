import { useEffect, useState } from 'react';
import type { ThemedToken } from 'shiki/core';

const codeHighlighter = import('./syntax').then((module) => module.codeHighlighter);

export type CodeLanguage = 'csharp' | 'typescript';

export function useSyntaxTokens(code: string, language: CodeLanguage) {
  const [lines, setLines] = useState<ThemedToken[][]>([]);

  useEffect(() => {
    let active = true;
    setLines([]);

    void codeHighlighter.then((highlighter) => {
      const result = highlighter.codeToTokens(code, { lang: language, theme: 'github-dark' });
      if (active) setLines(result.tokens);
    });

    return () => {
      active = false;
    };
  }, [code, language]);

  return lines;
}
