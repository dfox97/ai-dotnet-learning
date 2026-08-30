import { Check, FileCode2, MessageSquareText } from 'lucide-react';
import { useMemo } from 'react';
import { useSyntaxTokens, type CodeLanguage } from './useSyntaxTokens';

type SyntaxPanelProps = {
  label: string;
  fileName: string;
  code: string;
  language: CodeLanguage;
  highlightedLines?: number[];
  selectedLines?: number[];
  findingLines?: number[];
  submitted?: boolean;
  onLineClick?: (line: number) => void;
};

export default function SyntaxPanel({
  label,
  fileName,
  code,
  language,
  highlightedLines = [],
  selectedLines = [],
  findingLines = [],
  submitted = false,
  onLineClick,
}: SyntaxPanelProps) {
  const rawLines = useMemo(() => code.split('\n'), [code]);
  const tokens = useSyntaxTokens(code, language);

  return (
    <article className="syntax-panel">
      <header className="syntax-panel-header">
        <div><span className={`language-mark ${language}`}>{language === 'csharp' ? 'C#' : 'TS'}</span><strong>{label}</strong></div>
        <div><FileCode2 size={14} /><span>{fileName}</span></div>
      </header>
      <div className="syntax-panel-scroll" role="list" aria-label={`${label}: ${fileName}`}>
        {rawLines.map((line, index) => {
          const lineNumber = index + 1;
          const highlighted = highlightedLines.includes(lineNumber);
          const selected = selectedLines.includes(lineNumber);
          const finding = submitted && findingLines.includes(lineNumber);
          const missed = finding && !selected;
          const incorrect = submitted && selected && !finding;
          return (
            <button
              type="button"
              className={`syntax-line ${highlighted ? 'highlighted' : ''} ${selected ? 'selected' : ''} ${finding ? 'finding' : ''} ${missed ? 'missed' : ''} ${incorrect ? 'incorrect' : ''}`}
              key={`${fileName}-${lineNumber}`}
              onClick={onLineClick ? () => onLineClick(lineNumber) : undefined}
              disabled={!onLineClick || submitted}
              aria-label={`Line ${lineNumber}: ${line || 'blank'}`}
            >
              {onLineClick && <span className="syntax-gutter">{selected ? <MessageSquareText size={13} /> : '+'}</span>}
              <span className="syntax-number">{lineNumber}</span>
              <code>
                {tokens[index]?.length
                  ? tokens[index].map((token, tokenIndex) => <span style={{ color: token.color }} key={`${lineNumber}-${tokenIndex}`}>{token.content}</span>)
                  : line || ' '}
              </code>
              {finding && <span className="syntax-result">{selected ? <Check size={13} /> : 'missed'}</span>}
            </button>
          );
        })}
      </div>
    </article>
  );
}
