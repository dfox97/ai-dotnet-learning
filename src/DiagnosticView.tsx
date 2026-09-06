import { ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import {
  scoreDiagnostic,
  type DiagnosticAssessment,
  type DiagnosticResult,
} from './diagnostic-engine';
import type { DiagnosticProgress } from './progress';

type DiagnosticViewProps = {
  assessment: DiagnosticAssessment;
  progress: DiagnosticProgress;
  eyebrow: string;
  onBack: () => void;
  onProgress: (progress: DiagnosticProgress) => void;
};

function stringResponses(progress: DiagnosticProgress): Record<string, string> {
  return Object.fromEntries(
    Object.entries(progress.responses).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

function storedAssessmentMatches(assessment: DiagnosticAssessment, progress: DiagnosticProgress): boolean {
  return progress.assessmentId === assessment.id && progress.assessmentVersion === assessment.version;
}

function resultFromStoredProgress(assessment: DiagnosticAssessment, progress: DiagnosticProgress): DiagnosticResult | null {
  if (progress.status !== 'completed' || !storedAssessmentMatches(assessment, progress)) return null;
  return scoreDiagnostic(assessment, stringResponses(progress));
}

export default function DiagnosticView({ assessment, progress, eyebrow, onBack, onProgress }: DiagnosticViewProps) {
  const matchesStoredForm = storedAssessmentMatches(assessment, progress);
  const responses = matchesStoredForm ? stringResponses(progress) : {};
  const result = resultFromStoredProgress(assessment, progress);
  const answered = Object.keys(responses).length;
  const complete = answered === assessment.questions.length;

  const selectOption = (questionId: string, optionId: string) => {
    if (progress.status === 'completed' && matchesStoredForm) return;
    onProgress({
      assessmentId: assessment.id,
      assessmentVersion: assessment.version,
      status: 'in-progress',
      responses: { ...responses, [questionId]: optionId },
      competencyScores: {},
      criticalRisks: [],
    });
  };

  const submit = () => {
    if (!complete) return;
    const scored = scoreDiagnostic(assessment, responses);
    onProgress({
      assessmentId: assessment.id,
      assessmentVersion: assessment.version,
      status: 'completed',
      responses,
      competencyScores: scored.competencyScores,
      criticalRisks: scored.criticalRisks,
    });
  };

  return (
    <div className="page diagnostic-page">
      <button className="back-button" onClick={onBack}><ArrowLeft size={16} /> Back to dashboard</button>

      <header className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{assessment.title}</h1>
          <p>{assessment.scenario}</p>
        </div>
        <div className="header-chip"><span className="status-dot" /> {answered} of {assessment.questions.length} answered</div>
      </header>

      <section className="section-block" aria-label={`${assessment.title} questions`}>
        <div className="lesson-list">
          {assessment.questions.map((question, index) => (
            <article className="lesson-row" key={question.id}>
              <div className="lesson-status"><span>{String(index + 1).padStart(2, '0')}</span></div>
              <div className="lesson-copy">
                <span>{question.critical ? 'CRITICAL PRODUCTION RISK' : question.competencyId}</span>
                <h2>{question.prompt}</h2>
                <fieldset disabled={Boolean(result)}>
                  <legend className="sr-only">Choose one answer</legend>
                  <div className="quiz-options">
                    {question.options.map((option) => (
                      <label key={option.id}>
                        <input
                          type="radio"
                          name={question.id}
                          value={option.id}
                          checked={responses[question.id] === option.id}
                          onChange={() => selectOption(question.id, option.id)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </article>
          ))}
        </div>
      </section>

      {!result && (
        <footer className="lesson-footer">
          <div>
            {complete ? <CheckCircle2 size={22} /> : <ShieldAlert size={22} />}
            <span>
              <strong>{complete ? 'Ready to score' : 'Assessment in progress'}</strong>
              <small>Your selections are stored locally so you can resume this exact assessment version.</small>
            </span>
          </div>
          <button className="primary-button" type="button" disabled={!complete} onClick={submit}>Submit diagnostic</button>
        </footer>
      )}

      {result && (
        <section className="results-section" aria-live="polite">
          <div className="score-card">
            <div className={`score-gauge ${(result.score ?? 0) >= 0.75 ? 'good' : ''}`}>
              <strong>{Math.round((result.score ?? 0) * 100)}</strong><span>%</span>
            </div>
            <div>
              <p className="eyebrow">COMPETENCY PROFILE</p>
              <h2>{result.criticalRisks.length === 0 ? 'No critical-risk misses in this attempt.' : 'Critical risks still need attention.'}</h2>
              <p>This result reports competency evidence only. It does not reveal the authored answer key.</p>
            </div>
          </div>

          <div className="concept-grid">
            <article className="concept-card">
              <h3>Strengths</h3>
              <p>{result.strengths.length ? result.strengths.join(', ') : 'No competency reached full evidence in this attempt.'}</p>
            </article>
            <article className="concept-card">
              <h3>Gaps</h3>
              <p>{result.gaps.length ? result.gaps.join(', ') : 'No ordinary gaps recorded.'}</p>
            </article>
            <article className="concept-card">
              <h3>Critical risks</h3>
              <p>{result.criticalRisks.length ? result.criticalRisks.join(', ') : 'None unresolved in this attempt.'}</p>
            </article>
          </div>
        </section>
      )}
    </div>
  );
}
