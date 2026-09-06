import { ArrowLeft, Download, FileJson2, FileText } from 'lucide-react';
import {
  buildLearningReport,
  exportLearningReportJson,
  exportLearningReportMarkdown,
} from './learning-report';
import type { LearnerProgress } from './progress';

type LearningReportViewProps = {
  progress: LearnerProgress;
  onBack: () => void;
};

function scoreLabel(score: number | null) {
  return score === null ? 'Not recorded' : `${Math.round(score * 100)}%`;
}

function download(name: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function LearningReportView({ progress, onBack }: LearningReportViewProps) {
  const report = buildLearningReport(progress);

  return (
    <div className="page report-page">
      <button className="back-button" onClick={onBack}><ArrowLeft size={16} /> Back to dashboard</button>

      <header className="page-header">
        <div>
          <p className="eyebrow">LOCAL LEARNING EVIDENCE</p>
          <h1>Your ReviewLab report</h1>
          <p>Evidence comes from your versioned local progress. Missing activity stays missing rather than being treated as a zero score.</p>
        </div>
        <div className="header-chip"><FileText size={14} /> Progress schema v{report.progressVersion}</div>
      </header>

      <section className="practice-strip" aria-label="Report exports">
        <button onClick={() => download('reviewlab-learning-report.md', 'text/markdown', exportLearningReportMarkdown(progress))}>
          <div className="practice-icon"><Download size={21} /></div>
          <span><small>READABLE EXPORT</small><strong>Download Markdown</strong><p>Portable human-readable evidence for notes, a portfolio or reflection.</p></span>
        </button>
        <button onClick={() => download('reviewlab-learning-report.json', 'application/json', exportLearningReportJson(progress))}>
          <div className="practice-icon"><FileJson2 size={21} /></div>
          <span><small>STRUCTURED EXPORT</small><strong>Download JSON</strong><p>The same report evidence as a documented machine-readable snapshot.</p></span>
        </button>
      </section>

      <section className="section-block">
        <div className="section-heading compact"><div><p className="eyebrow">DIAGNOSTIC EVIDENCE</p><h2>Starting point and current mastery</h2></div></div>
        <div className="concept-grid">
          <article className="concept-card">
            <span>BASELINE</span><h3>{scoreLabel(report.diagnostics.baseline.score)}</h3><p>Status: {report.diagnostics.baseline.status}</p>
          </article>
          <article className="concept-card">
            <span>POST-DIAGNOSTIC</span><h3>{scoreLabel(report.diagnostics.post.score)}</h3><p>Status: {report.diagnostics.post.status}</p>
          </article>
          <article className="concept-card">
            <span>CRITICAL RISKS</span><h3>{report.diagnostics.post.criticalRisks.length}</h3>
            <p>{report.diagnostics.post.criticalRisks.length ? report.diagnostics.post.criticalRisks.join(', ') : 'None recorded'}</p>
          </article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading compact"><div><p className="eyebrow">COMPETENCY CHANGE</p><h2>Comparable evidence</h2></div></div>
        <div className="lesson-list">
          {Object.keys(report.competencyChanges).length === 0 ? (
            <div className="empty-state"><h3>No comparable diagnostic evidence yet</h3><p>Complete both assessment forms to see competency change.</p></div>
          ) : Object.entries(report.competencyChanges).map(([id, delta]) => (
            <article className="lesson-row" key={id}>
              <div className="lesson-copy"><span>COMPETENCY</span><h3>{id}</h3></div>
              <div className="lesson-meta"><strong>{delta >= 0 ? '+' : ''}{Math.round(delta * 100)} pp</strong></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading compact"><div><p className="eyebrow">LEARNING ACTIVITY</p><h2>What you actually completed</h2></div></div>
        <div className="concept-grid">
          <article className="concept-card"><h3>{report.lessons.completedIds.length}</h3><p>Lessons completed</p></article>
          <article className="concept-card"><h3>{report.lessons.submittedReviewIds.length}</h3><p>Reviews submitted</p></article>
          <article className="concept-card"><h3>{report.practice.completedActivityIds.length}</h3><p>Practice activities completed</p></article>
          <article className="concept-card"><h3>{report.practice.timeSpentMinutes ?? 'Not recorded'}</h3><p>{report.practice.timeSpentMinutes === null ? 'Practice time' : 'Recorded practice minutes'}</p></article>
        </div>
        <p>Lesson time: {report.lessons.timeSpentMinutes === null ? 'not recorded by the current schema' : `${report.lessons.timeSpentMinutes} minutes`}.</p>
      </section>

      <section className="section-block">
        <div className="section-heading compact"><div><p className="eyebrow">CAPSTONE</p><h2>Executable evidence</h2></div></div>
        <div className="concept-grid">
          <article className="concept-card"><span>VERSION</span><h3>{report.capstone.version ?? 'Not started'}</h3></article>
          <article className="concept-card"><span>STAGE</span><h3>{report.capstone.stage}</h3></article>
          <article className="concept-card"><span>TEST EVIDENCE</span><h3>{report.capstone.testEvidence.length}</h3></article>
        </div>
        <aside className="compiler-callout">
          <div><span>REFLECTION</span><p>{report.capstone.reflection || 'Not recorded'}</p></div>
        </aside>
      </section>
    </div>
  );
}
