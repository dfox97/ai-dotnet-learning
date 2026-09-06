import { useState } from 'react';
import { ArrowLeftRight, ArrowRight, CheckCircle2, Layers3, Link2 } from 'lucide-react';
import { bridgePatterns } from './practice-catalog';
import SyntaxPanel from './SyntaxPanel';

type PatternBridgeViewProps = {
  initialPatternId?: string;
  onPatternChange?: (patternId: string) => void;
};

export default function PatternBridgeView({ initialPatternId, onPatternChange }: PatternBridgeViewProps) {
  const initialPattern = bridgePatterns.find((item) => item.id === initialPatternId) ?? bridgePatterns[0];
  const [patternId, setPatternId] = useState(initialPattern.id);
  const [conceptId, setConceptId] = useState(initialPattern.concepts[0].id);
  const pattern = bridgePatterns.find((item) => item.id === patternId) ?? bridgePatterns[0];
  const concept = pattern.concepts.find((item) => item.id === conceptId) ?? pattern.concepts[0];
  const patternIndex = bridgePatterns.findIndex((item) => item.id === pattern.id);

  const selectPattern = (nextPatternId: string) => {
    const nextPattern = bridgePatterns.find((item) => item.id === nextPatternId);
    if (!nextPattern) return;
    setPatternId(nextPattern.id);
    setConceptId(nextPattern.concepts[0].id);
    onPatternChange?.(nextPattern.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page bridge-page">
      <header className="page-header bridge-page-header">
        <div>
          <p className="eyebrow">PATTERN BRIDGE · INTERACTIVE LAB</p>
          <h1>Same intent. Different runtime.</h1>
          <p>Connect familiar Angular, NestJS and Node patterns to idiomatic .NET without mistaking similarity for equivalence.</p>
        </div>
        <div className="header-chip"><span className="status-dot" /> {patternIndex + 1} of {bridgePatterns.length}</div>
      </header>

      <section className="bridge-intro-card">
        <div className="bridge-intro-icon"><ArrowLeftRight size={24} /></div>
        <div><strong>How to use this lab</strong><p>Select a concept to highlight both implementations. Read the contract difference, then carry its review question into the next pull request.</p></div>
        <div className="bridge-stack"><span>Angular</span><span>NestJS</span><ArrowRight size={14} /><span>C#</span><span>.NET</span></div>
      </section>

      <nav className="pattern-picker" aria-label="Comparison patterns">
        {bridgePatterns.map((item, index) => (
          <button className={item.id === pattern.id ? 'active' : ''} key={item.id} onClick={() => selectPattern(item.id)}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div><small>{item.category}</small><strong>{item.title}</strong></div>
            {item.id === pattern.id ? <CheckCircle2 size={17} /> : <ArrowRight size={15} />}
          </button>
        ))}
      </nav>

      <section className="bridge-workspace">
        <div className="bridge-workspace-heading">
          <div><p className="eyebrow">CURRENT COMPARISON</p><h2>{pattern.title}</h2><p>{pattern.summary}</p></div>
          <span><Layers3 size={15} /> Select a concept below</span>
        </div>

        <div className="concept-tabs" role="tablist" aria-label="Linked concepts">
          {pattern.concepts.map((item) => (
            <button
              role="tab"
              aria-selected={item.id === concept.id}
              className={item.id === concept.id ? 'active' : ''}
              key={item.id}
              onClick={() => setConceptId(item.id)}
            >
              <Link2 size={13} /> {item.label}
            </button>
          ))}
        </div>

        <div className="comparison-grid">
          <SyntaxPanel
            label={pattern.typeScript.label}
            fileName={pattern.typeScript.fileName}
            code={pattern.typeScript.code}
            language="typescript"
            highlightedLines={concept.typeScriptLines}
          />
          <div className="comparison-link" aria-hidden="true"><ArrowLeftRight size={17} /></div>
          <SyntaxPanel
            label={pattern.csharp.label}
            fileName={pattern.csharp.fileName}
            code={pattern.csharp.code}
            language="csharp"
            highlightedLines={concept.csharpLines}
          />
        </div>

        <div className="concept-explanation">
          <div className="concept-explanation-label"><Link2 size={16} /><span>LINKED CONCEPT</span><strong>{concept.label}</strong></div>
          <div><span>KEY DIFFERENCE</span><p>{concept.difference}</p></div>
          <div className="concept-review-rule"><span>ASK IN REVIEW</span><p>{concept.review}</p></div>
        </div>
      </section>

      <footer className="pattern-next">
        <div><span>{String(patternIndex + 1).padStart(2, '0')}</span><p><strong>{pattern.category}</strong> comparison complete when you can explain every linked concept without relying on syntax.</p></div>
        {patternIndex < bridgePatterns.length - 1 && <button className="primary-button" onClick={() => selectPattern(bridgePatterns[patternIndex + 1].id)}>Next pattern <ArrowRight size={16} /></button>}
      </footer>
    </div>
  );
}
