import { useEffect, useMemo, useState } from 'react';
import type { ThemedToken } from 'shiki/core';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Code2,
  FileCode2,
  Flag,
  GitPullRequest,
  MessageSquareText,
  RotateCcw,
  TerminalSquare,
  X,
  XCircle,
} from 'lucide-react';
import DecisionLab from './DecisionLab';
import type { LessonContentContract } from './content-contract';
import type { LearnerProgress, ReviewState } from './progress';
import {
  addReviewFinding,
  assessReviewFinding,
  removeReviewFinding,
  setReviewQuizAnswer,
  submitStructuredReviewAttempt,
  updateReviewFinding,
} from './review-attempt-state';
import { retryConceptIds } from './review-guidance';
import {
  evaluateStructuredReview,
  objectiveReviewScore,
  persistStructuredReview,
  readStructuredReview,
  type StructuredReviewAttempt,
} from './review-reasoning';
import { buildReviewReasoningRubrics } from './review-rubric';

const codeHighlighter = import('./syntax').then((module) => module.codeHighlighter);

const emptyReview: ReviewState = {
  selected: [],
  note: '',
  submitted: false,
  quizAnswer: null,
};

type StructuredLessonViewProps = {
  lesson: LessonContentContract;
  lessons: LessonContentContract[];
  progress: LearnerProgress['lessons'];
  onBack: () => void;
  onOpenLesson: (id: string) => void;
  onUpdateReview: (lessonId: string, review: ReviewState) => void;
  onComplete: (lessonId: string) => void;
};

function severityLabel(severity: LessonContentContract['findings'][number]['severity']) {
  if (severity === 'blocker') return 'Must fix';
  if (severity === 'warning') return 'Should fix';
  return 'Consider';
}

export default function StructuredLessonView({
  lesson,
  lessons,
  progress,
  onBack,
  onOpenLesson,
  onUpdateReview,
  onComplete,
}: StructuredLessonViewProps) {
  const review = progress.reviews[lesson.id] ?? emptyReview;
  const attempt = readStructuredReview(review, lesson.findings);
  const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);
  const isComplete = progress.completed.includes(lesson.id);
  const answerIsCorrect = attempt.quizAnswer === lesson.quiz.answer;
  const codeLines = useMemo(() => lesson.code.split('\n'), [lesson.code]);
  const [highlightedLines, setHighlightedLines] = useState<ThemedToken[][]>([]);

  useEffect(() => {
    let active = true;
    setHighlightedLines([]);

    void codeHighlighter.then((highlighter) => {
      const result = highlighter.codeToTokens(lesson.code, { lang: 'csharp', theme: 'github-dark' });
      if (active) setHighlightedLines(result.tokens);
    });

    return () => {
      active = false;
    };
  }, [lesson.code]);

  const feedback = evaluateStructuredReview(lesson.findings, attempt);
  const score = Math.round(objectiveReviewScore(feedback, lesson.findings.length) * 100);
  const rubrics = buildReviewReasoningRubrics(lesson.findings);
  const retryIds = new Set(retryConceptIds(feedback, lesson.findings));
  const retryConcepts = lesson.concepts.filter((concept) => retryIds.has(concept.id));
  const selectedLines = new Set(attempt.findings.map(({ line }) => line));
  const canSubmit = attempt.findings.length > 0 && attempt.findings.every((finding) => (
    finding.risk.trim().length > 0 && finding.correction.trim().length > 0
  ));

  const saveAttempt = (nextAttempt: StructuredReviewAttempt) => {
    onUpdateReview(lesson.id, persistStructuredReview(review, nextAttempt));
  };

  const toggleLine = (line: number) => {
    if (attempt.submitted) return;
    saveAttempt(selectedLines.has(line)
      ? removeReviewFinding(attempt, line)
      : addReviewFinding(attempt, line));
  };

  const editFinding = (
    line: number,
    changes: Parameters<typeof updateReviewFinding>[2],
  ) => saveAttempt(updateReviewFinding(attempt, line, changes));

  const submitReview = () => {
    if (!canSubmit) return;
    saveAttempt(submitStructuredReviewAttempt(attempt));
    window.setTimeout(() => document.getElementById('review-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const retryReview = () => {
    saveAttempt({ ...attempt, findings: [], submitted: false });
  };

  const selectQuizAnswer = (answer: number) => {
    saveAttempt(setReviewQuizAnswer(attempt, answer));
  };

  const assessReasoning = (
    line: number,
    assessment: 'partial' | 'meets',
  ) => saveAttempt(assessReviewFinding(attempt, line, assessment));

  const finishLesson = () => {
    onComplete(lesson.id);
    const following = lessons[lessonIndex + 1];
    if (following) onOpenLesson(following.id);
    else onBack();
  };

  return (
    <div className="page lesson-page">
      <button className="back-button" onClick={onBack}><ArrowLeft size={16} /> Back to path</button>

      <header className="lesson-header">
        <div className="lesson-number-large">{lesson.number}</div>
        <div>
          <p className="eyebrow">{lesson.eyebrow} · {lesson.duration}</p>
          <h1>{lesson.title}</h1>
          <p>{lesson.summary}</p>
          <div className="lesson-badges"><span>{lesson.difficulty}</span><span><Flag size={14} /> {lesson.outcome}</span></div>
        </div>
      </header>

      <section className="mental-model-section">
        <div className="section-heading compact">
          <div><p className="eyebrow">01 · BUILD THE MENTAL MODEL</p><h2>Translate what you already know</h2></div>
        </div>
        <div className="concept-grid">
          {lesson.concepts.map((concept, index) => (
            <article className="concept-card" key={concept.id}>
              <span className="concept-number">0{index + 1}</span>
              <h3>{concept.title}</h3>
              <p>{concept.body}</p>
              <div><ArrowRight size={14} /><span>{concept.node}</span></div>
            </article>
          ))}
        </div>
        <aside className="compiler-callout">
          <div className="callout-icon"><Code2 size={23} /></div>
          <div><span>{lesson.callout.label}</span><h3>{lesson.callout.title}</h3><p>{lesson.callout.body}</p></div>
        </aside>
      </section>

      <section className="review-section">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">02 · REVIEW THE PULL REQUEST</p>
            <h2>Find and explain the production risks</h2>
            <p>{lesson.prompt}</p>
          </div>
          <div className="review-instruction"><GitPullRequest size={18} /><span>Flag suspicious lines<br /><b>then explain risk and correction</b></span></div>
        </div>

        <div className="review-workspace">
          <div className="code-panel">
            <div className="code-toolbar">
              <div className="file-tab"><FileCode2 size={16} /><span>{lesson.fileName}</span><i>MODIFIED</i></div>
              <div className="diff-stats"><span>+{codeLines.length}</span><span>−0</span></div>
            </div>
            <div className="code-scroll" role="list" aria-label={`Review ${lesson.fileName}`}>
              {codeLines.map((line, index) => {
                const lineNumber = index + 1;
                const selected = selectedLines.has(lineNumber);
                const isFinding = attempt.submitted && lesson.findings.some((finding) => finding.line === lineNumber);
                const missed = attempt.submitted && isFinding && !selected;
                const incorrect = attempt.submitted && selected && !isFinding;
                return (
                  <button
                    className={`code-line ${selected ? 'selected' : ''} ${isFinding ? 'has-finding' : ''} ${missed ? 'missed' : ''} ${incorrect ? 'incorrect' : ''}`}
                    key={`${lesson.id}-${lineNumber}`}
                    onClick={() => toggleLine(lineNumber)}
                    disabled={attempt.submitted}
                    aria-pressed={selected}
                    aria-label={`Line ${lineNumber}: ${line || 'blank'}`}
                  >
                    <span className="comment-gutter">{selected ? <MessageSquareText size={14} /> : '+'}</span>
                    <span className="line-number">{lineNumber}</span>
                    <code>
                      {highlightedLines[index]?.length
                        ? highlightedLines[index].map((token, tokenIndex) => (
                            <span style={{ color: token.color }} key={`${lineNumber}-${tokenIndex}`}>{token.content}</span>
                          ))
                        : line || ' '}
                    </code>
                    {attempt.submitted && isFinding && <span className="line-result">{selected ? <Check size={14} /> : 'missed'}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="review-sidebar">
            <div className="review-sidebar-heading">
              <MessageSquareText size={18} />
              <div><strong>Your review</strong><span>{attempt.findings.length} line{attempt.findings.length === 1 ? '' : 's'} flagged</span></div>
            </div>

            {attempt.findings.length === 0 && !attempt.submitted && (
              <p>Flag a suspicious line to record its severity, production risk and proposed correction.</p>
            )}

            {attempt.findings.map((finding) => (
              <fieldset key={finding.line} disabled={attempt.submitted} className="review-finding-editor">
                <legend>Line {finding.line}</legend>
                <label htmlFor={`severity-${lesson.id}-${finding.line}`}>Severity</label>
                <select
                  id={`severity-${lesson.id}-${finding.line}`}
                  aria-label={`Severity for line ${finding.line}`}
                  value={finding.severity}
                  onChange={(event) => editFinding(finding.line, { severity: event.target.value as typeof finding.severity })}
                >
                  <option value="blocker">Must fix</option>
                  <option value="warning">Should fix</option>
                  <option value="suggestion">Consider</option>
                </select>
                <label htmlFor={`risk-${lesson.id}-${finding.line}`}>Why is this risky?</label>
                <textarea
                  id={`risk-${lesson.id}-${finding.line}`}
                  aria-label={`Risk for line ${finding.line}`}
                  value={finding.risk}
                  onChange={(event) => editFinding(finding.line, { risk: event.target.value })}
                  placeholder="Describe the production impact or contract risk…"
                />
                <label htmlFor={`correction-${lesson.id}-${finding.line}`}>What should change?</label>
                <textarea
                  id={`correction-${lesson.id}-${finding.line}`}
                  aria-label={`Correction for line ${finding.line}`}
                  value={finding.correction}
                  onChange={(event) => editFinding(finding.line, { correction: event.target.value })}
                  placeholder="Propose a safer direction without rewriting the whole solution…"
                />
              </fieldset>
            ))}

            <label htmlFor={`note-${lesson.id}`}>Overall review note <span>optional</span></label>
            <textarea
              id={`note-${lesson.id}`}
              value={review.note}
              disabled={attempt.submitted}
              onChange={(event) => onUpdateReview(lesson.id, { ...review, note: event.target.value })}
              placeholder="Summarise the review for the author…"
            />
            <div className="review-checklist">
              <p>Review lens</p>
              <span><CheckCircle2 size={15} /> Correctness & contracts</span>
              <span><CheckCircle2 size={15} /> Runtime & resources</span>
              <span><CheckCircle2 size={15} /> Production operation</span>
            </div>
            {!attempt.submitted ? (
              <>
                {!canSubmit && attempt.findings.length > 0 && <p role="status">Add a risk explanation and proposed correction for every flagged line before submitting.</p>}
                <button className="primary-button" disabled={!canSubmit} onClick={submitReview}>Submit review <ArrowRight size={16} /></button>
              </>
            ) : (
              <button className="secondary-button" onClick={retryReview}><RotateCcw size={15} /> Try review again</button>
            )}
          </aside>
        </div>
      </section>

      {attempt.submitted && (
        <section className="results-section" id="review-results" aria-live="polite">
          <div className="score-card">
            <div className={`score-gauge ${score >= 70 ? 'good' : ''}`}><strong>{score}</strong><span>/ 100</span></div>
            <div>
              <p className="eyebrow">REVIEW FEEDBACK</p>
              <h2>{score >= 85 ? 'Sharp review.' : score >= 60 ? 'Good instincts. Tighten the net.' : 'A useful first pass.'}</h2>
              <p>
                You matched {feedback.matchedLines.length} of {lesson.findings.length} risks.
                {feedback.falsePositiveLines.length > 0 ? ` ${feedback.falsePositiveLines.length} false positive${feedback.falsePositiveLines.length === 1 ? '' : 's'}.` : ''}
                {feedback.severityDisagreements.length > 0 ? ` ${feedback.severityDisagreements.length} severity classification${feedback.severityDisagreements.length === 1 ? '' : 's'} differed from the rubric.` : ''}
              </p>
              <p>The score uses line selection and severity only. Written reasoning is self-assessed against the authored rubric below.</p>
            </div>
          </div>

          <div className="findings-list">
            {lesson.findings.map((finding) => {
              const learnerFinding = attempt.findings.find((candidate) => candidate.line === finding.line);
              const caught = Boolean(learnerFinding);
              const rubric = rubrics[finding.line];
              const severityMismatch = learnerFinding && learnerFinding.severity !== finding.severity;
              return (
                <article className={`finding-card ${caught ? 'caught' : 'missed'}`} key={finding.id}>
                  <div className="finding-status">{caught ? <CheckCircle2 size={20} /> : <XCircle size={20} />}</div>
                  <div className="finding-copy">
                    <div className="finding-title-row">
                      <span className={`severity ${finding.severity}`}>{severityLabel(finding.severity)}</span>
                      <span>LINE {finding.line}</span>
                      <strong>{caught ? 'You caught this' : 'You missed this'}</strong>
                    </div>
                    <h3>{finding.title}</h3>
                    {learnerFinding && (
                      <div className="better-path">
                        <span>
                          <b>Your reasoning:</b> {learnerFinding.risk}<br />
                          <b>Your correction:</b> {learnerFinding.correction}<br />
                          <b>Your severity:</b> {severityLabel(learnerFinding.severity)}{severityMismatch ? ` · rubric expects ${severityLabel(finding.severity)}` : ''}
                        </span>
                      </div>
                    )}
                    <p><b>Rubric risk criterion:</b> {rubric.riskCriterion}</p>
                    <div className="better-path"><ArrowRight size={15} /><span><b>Rubric correction criterion:</b> {rubric.correctionCriterion}</span></div>
                    {learnerFinding && (
                      <div className="review-self-assessment" role="group" aria-label={`Self-assess reasoning for line ${finding.line}`}>
                        <span>Does your written reasoning meet both rubric criteria?</span>
                        <button
                          type="button"
                          className="secondary-button"
                          aria-pressed={learnerFinding.reasoningAssessment === 'partial'}
                          onClick={() => assessReasoning(finding.line, 'partial')}
                        >Needs work</button>
                        <button
                          type="button"
                          className="secondary-button"
                          aria-pressed={learnerFinding.reasoningAssessment === 'meets'}
                          onClick={() => assessReasoning(finding.line, 'meets')}
                        >Meets rubric</button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {retryConcepts.length > 0 && (
            <aside className="compiler-callout">
              <div className="callout-icon"><RotateCcw size={23} /></div>
              <div>
                <span>RETRY GUIDANCE</span>
                <h3>Revisit the concepts behind missed or incomplete reasoning.</h3>
                <p>{retryConcepts.map((concept) => concept.title).join(' · ')}</p>
              </div>
            </aside>
          )}
        </section>
      )}

      <section className="quiz-section">
        <div className="quiz-copy"><p className="eyebrow">03 · COMPILER CHECK</p><h2>Predict before you run</h2><p>Build the habit of reasoning from static types and runtime behavior.</p></div>
        <article className="quiz-card">
          <div className="quiz-label"><TerminalSquare size={17} /> QUICK CHECK</div>
          <h3>{lesson.quiz.question}</h3>
          {lesson.quiz.code && <pre><code>{lesson.quiz.code}</code></pre>}
          <div className="quiz-options">
            {lesson.quiz.options.map((option, index) => {
              const chosen = attempt.quizAnswer === index;
              const revealed = attempt.quizAnswer !== null;
              const correct = index === lesson.quiz.answer;
              return (
                <button
                  key={option}
                  className={`${chosen ? 'chosen' : ''} ${revealed && correct ? 'correct' : ''} ${revealed && chosen && !correct ? 'wrong' : ''}`}
                  onClick={() => selectQuizAnswer(index)}
                >
                  <span>{revealed && correct ? <Check size={15} /> : revealed && chosen ? <X size={15} /> : String.fromCharCode(65 + index)}</span>
                  {option}
                </button>
              );
            })}
          </div>
          {attempt.quizAnswer !== null && (
            <div className={`quiz-explanation ${answerIsCorrect ? 'correct' : 'wrong'}`}>
              <strong>{answerIsCorrect ? 'Correct.' : 'Not quite.'}</strong> {lesson.quiz.explanation}
            </div>
          )}
        </article>
      </section>

      {lesson.decisionLab && <DecisionLab lab={lesson.decisionLab} lessonId={lesson.id} />}

      <footer className="lesson-footer">
        <div>
          {isComplete ? <CheckCircle2 size={22} /> : <Circle size={22} />}
          <span><strong>{isComplete ? 'Module complete' : 'Ready to complete?'}</strong><small>Submit the review and answer the compiler check correctly.</small></span>
        </div>
        <button
          className="primary-button"
          disabled={!attempt.submitted || !answerIsCorrect}
          onClick={finishLesson}
        >
          {lessonIndex === lessons.length - 1 ? 'Finish the pathway' : 'Complete & continue'} <ArrowRight size={16} />
        </button>
      </footer>
    </div>
  );
}
