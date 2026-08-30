import { useState } from 'react';
import { ArrowRight, Bot, Check, CheckCircle2, Eye, GitCompareArrows, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';
import { translationChallenges } from './patterns';
import SyntaxPanel from './SyntaxPanel';

type ChallengeState = {
  selected: number[];
  submitted: boolean;
  solutionRevealed: boolean;
};

const emptyChallenge: ChallengeState = {
  selected: [],
  submitted: false,
  solutionRevealed: false,
};

export default function TranslationReviewView() {
  const [challengeId, setChallengeId] = useState(translationChallenges[0].id);
  const [challengeStates, setChallengeStates] = useState<Record<string, ChallengeState>>({});
  const challenge = translationChallenges.find((item) => item.id === challengeId) ?? translationChallenges[0];
  const review = challengeStates[challenge.id] ?? emptyChallenge;
  const findingLines = challenge.findings.map((finding) => finding.line);
  const matched = review.selected.filter((line) => findingLines.includes(line));
  const falsePositives = review.selected.filter((line) => !findingLines.includes(line));
  const score = Math.max(0, Math.round((matched.length / findingLines.length) * 100 - falsePositives.length * 10));

  const selectChallenge = (id: string) => {
    setChallengeId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleLine = (line: number) => {
    if (review.submitted) return;
    const selected = review.selected.includes(line)
      ? review.selected.filter((item) => item !== line)
      : [...review.selected, line];
    setChallengeStates((current) => ({ ...current, [challenge.id]: { ...review, selected } }));
  };

  const submitReview = () => {
    if (review.selected.length === 0) return;
    setChallengeStates((current) => ({ ...current, [challenge.id]: { ...review, submitted: true } }));
    window.setTimeout(() => document.getElementById('translation-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const retryReview = () => {
    setChallengeStates((current) => ({ ...current, [challenge.id]: emptyChallenge }));
  };

  const revealSolution = () => {
    setChallengeStates((current) => ({ ...current, [challenge.id]: { ...review, solutionRevealed: true } }));
    window.setTimeout(() => document.getElementById('idiomatic-solution')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  return (
    <div className="page translation-page">
      <header className="page-header translation-header">
        <div>
          <p className="eyebrow">TRANSLATION REVIEW · AI CODE LAB</p>
          <h1>Review the plausible mistake.</h1>
          <p>The TypeScript works. An agent translated it into C#. Find where syntax survived but the runtime contract did not.</p>
        </div>
        <div className="header-chip"><Bot size={14} /> Agent output: untrusted</div>
      </header>

      <section className="translation-principle">
        <ShieldAlert size={21} />
        <div><strong>Do not review generated code by resemblance.</strong><p>Trace lifetime, cancellation, I/O, HTTP outcomes and database execution. The translation is complete only when behavior—not syntax—matches the intended contract.</p></div>
      </section>

      <nav className="challenge-picker" aria-label="Translation challenges">
        {translationChallenges.map((item, index) => {
          const state = challengeStates[item.id];
          return (
            <button className={item.id === challenge.id ? 'active' : ''} key={item.id} onClick={() => selectChallenge(item.id)}>
              <span>{state?.submitted ? <Check size={15} /> : index + 1}</span>
              <div><small>{item.category}</small><strong>{item.title}</strong></div>
            </button>
          );
        })}
      </nav>

      <section className="translation-brief">
        <p className="eyebrow">REVIEW BRIEF</p>
        <h2>{challenge.title}</h2>
        <p>{challenge.brief}</p>
        <div><GitCompareArrows size={16} /><span>Left is the working source. Flag suspicious lines only in the generated C#.</span></div>
      </section>

      <div className="translation-grid">
        <div className="source-reference">
          <div className="panel-kicker"><span>SOURCE OF INTENT</span><i>READ ONLY</i></div>
          <SyntaxPanel label="Working NestJS / Node" fileName={challenge.sourceFile} code={challenge.sourceCode} language="typescript" />
        </div>
        <div className="generated-review">
          <div className="panel-kicker"><span>GENERATED TRANSLATION</span><i>CLICK SUSPICIOUS LINES</i></div>
          <SyntaxPanel
            label="AI-generated .NET"
            fileName={challenge.generatedFile}
            code={challenge.generatedCode}
            language="csharp"
            selectedLines={review.selected}
            findingLines={findingLines}
            submitted={review.submitted}
            onLineClick={toggleLine}
          />
          <div className="translation-actions">
            <span>{review.selected.length} line{review.selected.length === 1 ? '' : 's'} flagged</span>
            {!review.submitted
              ? <button className="primary-button" disabled={review.selected.length === 0} onClick={submitReview}>Submit review <ArrowRight size={15} /></button>
              : <button className="secondary-button" onClick={retryReview}><RotateCcw size={14} /> Try again</button>}
          </div>
        </div>
      </div>

      {review.submitted && (
        <section className="translation-results" id="translation-results">
          <div className="translation-score">
            <div className={`score-gauge ${score >= 70 ? 'good' : ''}`}><strong>{score}</strong><span>/ 100</span></div>
            <div><p className="eyebrow">TRANSLATION VERDICT</p><h2>{score >= 85 ? 'You reviewed behavior, not resemblance.' : score >= 60 ? 'Good contract instincts.' : 'The translation remained too plausible.'}</h2><p>You found {matched.length} of {findingLines.length} contract breaks{falsePositives.length ? ` with ${falsePositives.length} false positive${falsePositives.length === 1 ? '' : 's'}` : ''}.</p></div>
          </div>

          <div className="translation-findings">
            {challenge.findings.map((finding) => {
              const caught = review.selected.includes(finding.line);
              return (
                <article className={caught ? 'caught' : 'missed'} key={`${challenge.id}-${finding.line}`}>
                  <div>{caught ? <CheckCircle2 size={19} /> : <XCircle size={19} />}</div>
                  <section>
                    <header><span className={finding.severity}>{finding.severity === 'blocker' ? 'MUST FIX' : 'SHOULD FIX'}</span><i>LINE {finding.line}</i><strong>{caught ? 'Caught' : 'Missed'}</strong></header>
                    <h3>{finding.title}</h3>
                    <p>{finding.explanation}</p>
                    <aside><ArrowRight size={14} /><span><b>Idiomatic direction:</b> {finding.better}</span></aside>
                  </section>
                </article>
              );
            })}
          </div>

          {!review.solutionRevealed && <button className="reveal-solution" onClick={revealSolution}><Eye size={17} /><span><strong>Reveal the idiomatic C#</strong><small>Compare only after you understand the findings.</small></span><ArrowRight size={16} /></button>}
        </section>
      )}

      {review.solutionRevealed && (
        <section className="idiomatic-solution" id="idiomatic-solution">
          <div className="section-heading compact"><div><p className="eyebrow">IDIOMATIC VERSION</p><h2>Preserve the contract, not the syntax</h2><p>This is one strong implementation—not a template to copy without context.</p></div></div>
          <div className="idiomatic-grid">
            <SyntaxPanel label="Maintainer revision" fileName={challenge.generatedFile} code={challenge.idiomaticCode} language="csharp" />
            <aside><p className="overline">WHAT CHANGED</p>{challenge.idiomaticNotes.map((note) => <div key={note}><CheckCircle2 size={16} /><span>{note}</span></div>)}</aside>
          </div>
        </section>
      )}
    </div>
  );
}
