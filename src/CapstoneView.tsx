import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Code2, Play, TerminalSquare } from 'lucide-react';
import {
  canRevealExpertAnswer,
  completeCapstone,
  markCapstoneRepairReady,
  recordCapstoneFindings,
  resumeCapstoneStage,
  startCapstone,
} from './capstone-journey';
import type { CapstoneProgress } from './progress';

type CapstoneViewProps = {
  progress: CapstoneProgress;
  onBack: () => void;
  onProgress: (progress: CapstoneProgress) => void;
};

const generateCommand = 'node scripts/generate-capstone.ts --output ../reviewlab-capstone';
const testCommand = 'dotnet test ReviewLab.Capstone.Tests/ReviewLab.Capstone.Tests.csproj';
const expertCommand = 'node scripts/generate-capstone.ts --output ../reviewlab-capstone-expert --variant expert';

export default function CapstoneView({ progress, onBack, onProgress }: CapstoneViewProps) {
  const stage = resumeCapstoneStage(progress);
  const [finding, setFinding] = useState(Object.values(progress.findings)[0] ?? '');
  const [testEvidence, setTestEvidence] = useState(progress.testEvidence.join('\n'));
  const [reflection, setReflection] = useState(progress.reflection);
  const evidenceEntries = useMemo(
    () => testEvidence.split('\n').map((entry) => entry.trim()).filter(Boolean),
    [testEvidence],
  );

  const begin = () => onProgress(startCapstone(progress));
  const submitReview = () => onProgress(recordCapstoneFindings(progress, { 'learner-review': finding }));
  const markRepaired = () => onProgress(markCapstoneRepairReady(progress));
  const finish = () => onProgress(completeCapstone(progress, evidenceEntries, reflection));

  return (
    <div className="page capstone-page">
      <button className="back-button" onClick={onBack}><ArrowLeft size={16} /> Back to dashboard</button>

      <header className="page-header">
        <div>
          <p className="eyebrow">EXECUTABLE CAPSTONE · .NET 8</p>
          <h1>Review, repair, and prove the worker.</h1>
          <p>The browser guides the learning journey. The actual C# project runs locally in your terminal, where you control the edits and test evidence.</p>
        </div>
        <div className="header-chip"><span className="status-dot" /> Stage: {stage}</div>
      </header>

      <section className="section-block">
        <div className="section-heading compact"><div><p className="eyebrow">LOCAL WORKSPACE</p><h2>Generate the disposable learner project</h2></div></div>
        <article className="quiz-card">
          <p>The starter deliberately contains production defects. Its initial test run is expected to fail.</p>
          <pre><code>{generateCommand}{'\n'}cd ../reviewlab-capstone{'\n'}{testCommand}</code></pre>
          <p>Requires a desktop/local environment with the .NET 8 SDK. ReviewLab itself does not execute these commands.</p>
        </article>
      </section>

      {stage === 'not-started' && (
        <section className="bridge-banner">
          <div className="bridge-icon"><Play size={23} /></div>
          <div><p className="overline dark">READY WHEN YOU ARE</p><h2>Start with your own review.</h2><p>Expert comparison stays hidden until you submit at least one finding.</p></div>
          <button className="primary-button" onClick={begin}>Start capstone</button>
        </section>
      )}

      {stage === 'review' && (
        <section className="review-section">
          <div className="section-heading compact"><div><p className="eyebrow">01 · REVIEW</p><h2>Record your production findings</h2><p>Inspect the generated worker, composition root and failing tests before changing code.</p></div></div>
          <label htmlFor="capstone-findings">Your findings</label>
          <textarea
            id="capstone-findings"
            value={finding}
            onChange={(event) => setFinding(event.target.value)}
            placeholder="What is risky, why does it matter in production, and what should change?"
          />
          <button className="primary-button" disabled={!finding.trim()} onClick={submitReview}>Submit review</button>
        </section>
      )}

      {canRevealExpertAnswer(progress) && (
        <section className="section-block">
          <div className="section-heading compact"><div><p className="eyebrow">EXPERT COMPARISON UNLOCKED</p><h2>Compare only after your own review</h2></div></div>
          <aside className="compiler-callout">
            <div className="callout-icon"><Code2 size={23} /></div>
            <div>
              <span>REFERENCE VARIANT</span>
              <p>The repository keeps an independently maintained expert repair behind the same behavioural tests. Generate it separately if you want to diff approaches after recording your findings.</p>
              <pre><code>{expertCommand}</code></pre>
            </div>
          </aside>
        </section>
      )}

      {stage === 'repair' && (
        <section className="section-block">
          <div className="section-heading compact"><div><p className="eyebrow">02 · REPAIR</p><h2>Make the production fixes locally</h2><p>Work from the failing tests and your review rather than copying the reference variant.</p></div></div>
          <pre><code>{testCommand}</code></pre>
          <button className="primary-button" onClick={markRepaired}>I am ready to record test evidence</button>
        </section>
      )}

      {stage === 'evidence' && (
        <section className="review-section">
          <div className="section-heading compact"><div><p className="eyebrow">03 · EVIDENCE</p><h2>Record what actually happened locally</h2><p>Enter terminal/test evidence yourself. ReviewLab does not claim to have run your code.</p></div></div>
          <label htmlFor="capstone-test-evidence">Test evidence <span>one entry per line</span></label>
          <textarea id="capstone-test-evidence" value={testEvidence} onChange={(event) => setTestEvidence(event.target.value)} placeholder="dotnet test: 7 passed, 0 failed" />
          <label htmlFor="capstone-reflection">Repair reflection</label>
          <textarea id="capstone-reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="What changed in your review/repair judgement?" />
          <button className="primary-button" disabled={evidenceEntries.length === 0 || !reflection.trim()} onClick={finish}>Complete capstone</button>
        </section>
      )}

      {stage === 'completed' && (
        <section className="results-section" aria-live="polite">
          <div className="score-card">
            <div className="score-gauge good"><CheckCircle2 size={28} /><span>DONE</span></div>
            <div><p className="eyebrow">CAPSTONE EVIDENCE RECORDED</p><h2>Your local repair journey is complete.</h2><p>{progress.testEvidence.length} test evidence entr{progress.testEvidence.length === 1 ? 'y' : 'ies'} and your reflection are stored in the versioned learner report.</p></div>
          </div>
          <aside className="compiler-callout"><div className="callout-icon"><TerminalSquare size={23} /></div><div><span>REFLECTION</span><p>{progress.reflection}</p></div></aside>
        </section>
      )}
    </div>
  );
}
