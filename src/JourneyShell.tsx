import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, FileText, Gauge, ShieldAlert, TerminalSquare } from 'lucide-react';
import CapstoneView from './CapstoneView';
import DiagnosticView from './DiagnosticView';
import LearningReportView from './LearningReportView';
import { baselineDiagnostic } from './baseline-diagnostic';
import { scoreDiagnostic, type DiagnosticCompetencyId, type DiagnosticResult } from './diagnostic-engine';
import { postDiagnostic, assessMastery } from './post-diagnostic';
import { setCapstoneProgress, setDiagnosticProgress, setRecommendationProgress } from './progress-operations';
import { loadLearnerProgress, saveLearnerProgress } from './progress-store';
import type { DiagnosticProgress, LearnerProgress } from './progress';
import { recommendLearningPath } from './recommendations';

function navigate(path: string) {
  window.location.assign(path);
}

function responsesAsStrings(progress: DiagnosticProgress): Record<string, string> {
  return Object.fromEntries(
    Object.entries(progress.responses).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

function storedResult(
  assessment: typeof baselineDiagnostic,
  progress: DiagnosticProgress,
): DiagnosticResult | null {
  if (
    progress.status !== 'completed'
    || progress.assessmentId !== assessment.id
    || progress.assessmentVersion !== assessment.version
  ) return null;
  return scoreDiagnostic(assessment, responsesAsStrings(progress));
}

function completedActivityIds(progress: LearnerProgress): string[] {
  const practice = [
    ...Object.entries(progress.practice.patternBridge),
    ...Object.entries(progress.practice.translationReview),
    ...Object.entries(progress.practice.decisionLabs),
  ].filter(([, attempt]) => attempt.status === 'completed').map(([id]) => id);
  return [...progress.lessons.completed, ...practice];
}

function recommendationFor(progress: LearnerProgress) {
  const baseline = storedResult(baselineDiagnostic, progress.diagnostics.baseline);
  if (!baseline) return null;
  return recommendLearningPath(baseline, {
    completedActivityIds: completedActivityIds(progress),
    masteredCompetencyIds: progress.recommendations.masteredCompetencyIds as DiagnosticCompetencyId[],
  });
}

export function JourneyLaunchpad() {
  const loaded = useMemo(() => loadLearnerProgress(localStorage), []);
  const progress = loaded.progress;
  const baselineComplete = progress.diagnostics.baseline.status === 'completed';
  const postComplete = progress.diagnostics.post.status === 'completed';
  const recommendation = recommendationFor(progress);

  return (
    <section className="page" aria-label="Measured learning journey">
      {loaded.status === 'recovery-required' && (
        <div className="empty-state" role="alert">
          <ShieldAlert size={24} />
          <h2>Saved progress needs recovery before measured learning can continue.</h2>
          <p>{loaded.reason}</p>
        </div>
      )}

      {!baselineComplete ? (
        <section className="bridge-banner">
          <div className="bridge-icon"><Gauge size={23} /></div>
          <div>
            <p className="overline dark">START WITH EVIDENCE</p>
            <h2>Take the baseline before following a recommended path.</h2>
            <p>Eight unseen production-review decisions establish your starting competency profile. The assessment is versioned and resumable.</p>
          </div>
          <button className="primary-button" onClick={() => navigate(`/diagnostics/${baselineDiagnostic.id}`)}>
            {progress.diagnostics.baseline.status === 'in-progress' ? 'Resume baseline' : 'Start baseline'} <ArrowRight size={16} />
          </button>
        </section>
      ) : (
        <section className="section-block">
          <div className="section-heading compact">
            <div><p className="eyebrow">PERSONALISED PATH</p><h2>Recommended from your baseline evidence</h2><p>Recommendations explain the competency gap they address; nothing is hard-locked.</p></div>
            <span className="path-caption"><CheckCircle2 size={16} /> Baseline complete</span>
          </div>
          <div className="lesson-list">
            {recommendation?.activities.length ? recommendation.activities.map((activity) => (
              <button
                className={`lesson-row ${activity.status === 'completed' ? 'done' : ''}`}
                key={activity.id}
                onClick={() => navigate(activity.kind === 'lesson' ? `/lessons/${activity.id}` : `/practice/${activity.id}`)}
              >
                <div className="lesson-copy">
                  <span>{activity.competencyIds.join(' · ')}</span>
                  <h3>{activity.title}</h3>
                  <p>{activity.reasons.join(' ')}</p>
                </div>
                <div className="lesson-meta"><span>{activity.status}</span></div>
                <ArrowRight size={18} />
              </button>
            )) : (
              <div className="empty-state"><CheckCircle2 size={24} /><h3>No baseline gaps need a recommendation.</h3></div>
            )}
          </div>
        </section>
      )}

      <section className="practice-strip" aria-label="Journey destinations">
        <button onClick={() => navigate(`/diagnostics/${postDiagnostic.id}`)}>
          <div className="practice-icon"><Gauge size={21} /></div>
          <span><small>MASTERY CHECK</small><strong>{postComplete ? 'Review post-diagnostic' : 'Take post-diagnostic'}</strong><p>Compare an equivalent unseen form against your baseline and keep critical risks as hard mastery gates.</p></span>
          <ArrowRight size={18} />
        </button>
        <button onClick={() => navigate('/report')}>
          <div className="practice-icon"><FileText size={21} /></div>
          <span><small>LOCAL EVIDENCE</small><strong>Learning report</strong><p>Review and export diagnostic, lesson, practice, reflection and capstone evidence.</p></span>
          <ArrowRight size={18} />
        </button>
        <button onClick={() => navigate('/capstone')}>
          <div className="practice-icon"><TerminalSquare size={21} /></div>
          <span><small>EXECUTABLE CAPSTONE</small><strong>{progress.capstone.stage === 'not-started' ? 'Start capstone' : 'Resume capstone'}</strong><p>{recommendation?.capstoneReady ? 'Critical baseline risks are clear.' : 'Still accessible: readiness depends on resolving critical competencies, not screen completion.'}</p></span>
          <ArrowRight size={18} />
        </button>
      </section>
    </section>
  );
}

export default function JourneySurface({ pathname }: { pathname: string }) {
  const loaded = useMemo(() => loadLearnerProgress(localStorage), []);
  const [progress, setProgress] = useState<LearnerProgress>(loaded.progress);
  const [recoveryReason] = useState(loaded.status === 'recovery-required' ? loaded.reason : null);

  const replaceProgress = (next: LearnerProgress) => {
    if (recoveryReason) return;
    saveLearnerProgress(localStorage, next);
    setProgress(next);
  };

  const updateDiagnostic = (phase: 'baseline' | 'post', diagnostic: DiagnosticProgress) => {
    let next = setDiagnosticProgress(progress, phase, diagnostic);

    if (diagnostic.status === 'completed') {
      const assessment = phase === 'baseline' ? baselineDiagnostic : postDiagnostic;
      const result = scoreDiagnostic(assessment, responsesAsStrings(diagnostic));

      if (phase === 'baseline') {
        const recommendation = recommendLearningPath(result, {
          completedActivityIds: completedActivityIds(next),
          masteredCompetencyIds: next.recommendations.masteredCompetencyIds as DiagnosticCompetencyId[],
        });
        next = setRecommendationProgress(next, {
          activityIds: recommendation.activities.map((activity) => activity.id),
          masteredCompetencyIds: recommendation.masteredCompetencyIds,
          atRiskCompetencyIds: recommendation.atRiskCompetencyIds,
        });
      } else {
        const baseline = storedResult(baselineDiagnostic, next.diagnostics.baseline);
        if (baseline) {
          const mastery = assessMastery(baseline, result);
          next = setRecommendationProgress(next, {
            activityIds: mastery.remediationActivityIds,
            masteredCompetencyIds: result.strengths,
            atRiskCompetencyIds: mastery.unresolvedCriticalCompetencies,
          });
        }
      }
    }

    replaceProgress(next);
  };

  if (recoveryReason) {
    return (
      <main className="main-content">
        <section className="page empty-state" role="alert">
          <ShieldAlert size={26} /><h1>Saved progress needs recovery.</h1><p>{recoveryReason}</p>
          <button className="secondary-button" onClick={() => navigate('/')}>Back to dashboard</button>
        </section>
      </main>
    );
  }

  if (pathname === `/diagnostics/${baselineDiagnostic.id}`) {
    return (
      <main className="main-content">
        <DiagnosticView
          assessment={baselineDiagnostic}
          eyebrow="BASELINE DIAGNOSTIC"
          progress={progress.diagnostics.baseline}
          onBack={() => navigate('/')}
          onProgress={(diagnostic) => updateDiagnostic('baseline', diagnostic)}
        />
      </main>
    );
  }

  if (pathname === `/diagnostics/${postDiagnostic.id}`) {
    const baseline = storedResult(baselineDiagnostic, progress.diagnostics.baseline);
    const post = storedResult(postDiagnostic, progress.diagnostics.post);
    const mastery = baseline && post ? assessMastery(baseline, post) : null;
    return (
      <main className="main-content">
        <DiagnosticView
          assessment={postDiagnostic}
          eyebrow="POST-DIAGNOSTIC · MASTERY"
          progress={progress.diagnostics.post}
          onBack={() => navigate('/')}
          onProgress={(diagnostic) => updateDiagnostic('post', diagnostic)}
        />
        {mastery && (
          <section className="page section-block" aria-live="polite">
            <div className="section-heading compact">
              <div><p className="eyebrow">MASTERY DECISION</p><h2>{mastery.mastered ? 'Mastery criteria met.' : 'Targeted remediation remains.'}</h2></div>
            </div>
            <div className="concept-grid">
              <article className="concept-card"><h3>{mastery.overallImprovement === null ? 'Not comparable' : `${mastery.overallImprovement >= 0 ? '+' : ''}${Math.round(mastery.overallImprovement * 100)} pp`}</h3><p>Overall change from baseline</p></article>
              <article className="concept-card"><h3>{mastery.unresolvedCriticalCompetencies.length}</h3><p>Unresolved critical competencies</p></article>
              <article className="concept-card"><h3>{mastery.remediationActivityIds.length}</h3><p>Targeted remediation activities</p></article>
            </div>
            {mastery.remediationActivityIds.length > 0 && <p>Next activities: {mastery.remediationActivityIds.join(', ')}</p>}
          </section>
        )}
      </main>
    );
  }

  if (pathname === '/report') {
    return <main className="main-content"><LearningReportView progress={progress} onBack={() => navigate('/')} /></main>;
  }

  if (pathname === '/capstone') {
    return (
      <main className="main-content">
        <CapstoneView
          progress={progress.capstone}
          onBack={() => navigate('/')}
          onProgress={(capstone) => replaceProgress(setCapstoneProgress(progress, capstone))}
        />
      </main>
    );
  }

  return (
    <main className="main-content">
      <section className="page empty-state">
        <ShieldAlert size={26} /><h1>That learning location is unavailable.</h1>
        <button className="secondary-button" onClick={() => navigate('/')}>Back to dashboard</button>
      </section>
    </main>
  );
}
