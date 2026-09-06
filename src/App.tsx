import { useEffect, useMemo, useState } from 'react';
import type { ThemedToken } from 'shiki/core';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Blocks,
  Bot,
  Box,
  Braces,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Code2,
  Database,
  ExternalLink,
  FileCode2,
  Flag,
  Gauge,
  GitPullRequest,
  GraduationCap,
  Menu,
  MessageSquareText,
  Play,
  RotateCcw,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  X,
  XCircle,
} from 'lucide-react';
import DecisionLab from './DecisionLab';
import PatternBridgeView from './PatternBridgeView';
import TranslationReviewView from './TranslationReviewView';
import ResourcesView from './ResourcesView';
import { glossary, lessons, type Finding, type Lesson } from './content';

type ReviewState = {
  selected: number[];
  note: string;
  submitted: boolean;
  quizAnswer: number | null;
};

type Progress = {
  completed: string[];
  reviews: Record<string, ReviewState>;
};

type Page = 'dashboard' | 'lesson' | 'glossary' | 'resources' | 'bridge' | 'translation';

const emptyReview: ReviewState = {
  selected: [],
  note: '',
  submitted: false,
  quizAnswer: null,
};

const defaultProgress: Progress = {
  completed: [],
  reviews: {},
};

const iconForLesson = [Braces, TerminalSquare, Gauge, ServerCog, Database, Box, Blocks, ShieldCheck, Bot];
const codeHighlighter = import('./syntax').then((module) => module.codeHighlighter);

function loadProgress(): Progress {
  try {
    const saved = localStorage.getItem('reviewlab-progress');
    if (!saved) return defaultProgress;

    const parsed = JSON.parse(saved) as Progress;
    if (!Array.isArray(parsed.completed) || typeof parsed.reviews !== 'object') {
      return defaultProgress;
    }
    return parsed;
  } catch {
    return defaultProgress;
  }
}

function severityLabel(severity: Finding['severity']) {
  if (severity === 'blocker') return 'Must fix';
  if (severity === 'warning') return 'Should fix';
  return 'Consider';
}

function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [activeLessonId, setActiveLessonId] = useState(lessons[0].id);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('reviewlab-progress', JSON.stringify(progress));
  }, [progress]);

  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0];
  const nextLesson = lessons.find((lesson) => !progress.completed.includes(lesson.id)) ?? lessons[lessons.length - 1];
  const percent = Math.round((progress.completed.length / lessons.length) * 100);

  const openLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    setPage('lesson');
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPage = (target: Page) => {
    setPage(target);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateReview = (lessonId: string, nextReview: ReviewState) => {
    setProgress((current) => ({
      ...current,
      reviews: { ...current.reviews, [lessonId]: nextReview },
    }));
  };

  const completeLesson = (lessonId: string) => {
    setProgress((current) => {
      if (current.completed.includes(lessonId)) return current;
      return { ...current, completed: [...current.completed, lessonId] };
    });
  };

  const resetProgress = () => {
    const confirmed = window.confirm('Reset all completed lessons and review notes?');
    if (!confirmed) return;
    setProgress(defaultProgress);
    setPage('dashboard');
  };

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        percent={percent}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onNavigate={openPage}
        onReset={resetProgress}
      />

      <main className="main-content">
        <MobileHeader onMenu={() => setMobileNavOpen(true)} />
        {page === 'dashboard' && (
          <Dashboard
            progress={progress}
            percent={percent}
            nextLesson={nextLesson}
            onOpenLesson={openLesson}
            onNavigate={openPage}
          />
        )}
        {page === 'lesson' && (
          <LessonView
            lesson={activeLesson}
            progress={progress}
            onBack={() => openPage('dashboard')}
            onOpenLesson={openLesson}
            onUpdateReview={updateReview}
            onComplete={completeLesson}
          />
        )}
        {page === 'glossary' && <Glossary onOpenLesson={openLesson} />}
        {page === 'resources' && <ResourcesView />}
        {page === 'bridge' && <PatternBridgeView />}
        {page === 'translation' && <TranslationReviewView />}
      </main>
    </div>
  );
}

type SidebarProps = {
  page: Page;
  percent: number;
  open: boolean;
  onClose: () => void;
  onNavigate: (page: Page) => void;
  onReset: () => void;
};

function Sidebar({ page, percent, open, onClose, onNavigate, onReset }: SidebarProps) {
  return (
    <>
      {open && <button className="nav-scrim" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><GitPullRequest size={20} /></div>
          <div>
            <strong>ReviewLab</strong>
            <span>.NET / AUTOMATION</span>
          </div>
          <button className="nav-close" aria-label="Close navigation" onClick={onClose}><X size={20} /></button>
        </div>

        <nav className="primary-nav" aria-label="Main navigation">
          <p>Workspace</p>
          <button className={page === 'dashboard' ? 'active' : ''} onClick={() => onNavigate('dashboard')}>
            <Gauge size={18} /> Dashboard
          </button>
          <button className={page === 'lesson' ? 'active' : ''} onClick={() => onNavigate('lesson')}>
            <GitPullRequest size={18} /> Review labs
          </button>
          <p className="nav-group-label">Practice</p>
          <button className={page === 'bridge' ? 'active' : ''} onClick={() => onNavigate('bridge')}>
            <Blocks size={18} /> Pattern bridge
          </button>
          <button className={page === 'translation' ? 'active' : ''} onClick={() => onNavigate('translation')}>
            <Bot size={18} /> Translation review
          </button>
          <button className={page === 'glossary' ? 'active' : ''} onClick={() => onNavigate('glossary')}>
            <BookOpen size={18} /> .NET glossary
          </button>
          <button className={page === 'resources' ? 'active' : ''} onClick={() => onNavigate('resources')}>
            <GraduationCap size={18} /> Learning resources
          </button>
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-progress">
          <div className="sidebar-progress-heading">
            <span>Your progress</span><strong>{percent}%</strong>
          </div>
          <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
          <p>{percent === 100 ? 'Track complete. Revisit any review.' : 'Every review is saved locally.'}</p>
        </div>

        <button className="reset-button" onClick={onReset}><RotateCcw size={15} /> Reset progress</button>

        <div className="profile-card">
          <div className="profile-avatar">TS</div>
          <div><strong>TypeScript → C#</strong><span>Automation pathway</span></div>
        </div>
      </aside>
    </>
  );
}

function MobileHeader({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="mobile-header">
      <button aria-label="Open navigation" onClick={onMenu}><Menu size={22} /></button>
      <div className="brand-mark"><GitPullRequest size={18} /></div>
      <strong>ReviewLab</strong>
    </header>
  );
}

type DashboardProps = {
  progress: Progress;
  percent: number;
  nextLesson: Lesson;
  onOpenLesson: (id: string) => void;
  onNavigate: (page: Page) => void;
};

function Dashboard({ progress, percent, nextLesson, onOpenLesson, onNavigate }: DashboardProps) {
  const reviewedCount = Object.values(progress.reviews).filter((review) => review.submitted).length;

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">YOUR LEARNING WORKSPACE</p>
          <h1>Good morning, reviewer.</h1>
          <p>Turn your TypeScript instincts into production .NET judgment.</p>
        </div>
        <div className="header-chip"><span className="status-dot" /> Path active</div>
      </header>

      <section className="hero-grid">
        <article className="continue-card">
          <div className="continue-copy">
            <span className="overline"><Play size={13} fill="currentColor" /> CONTINUE YOUR PATH</span>
            <p className="lesson-index">MODULE {nextLesson.number} · {nextLesson.duration}</p>
            <h2>{nextLesson.title}</h2>
            <p>{nextLesson.summary}</p>
            <button className="primary-button light" onClick={() => onOpenLesson(nextLesson.id)}>
              {progress.completed.length === 0 ? 'Start first review' : 'Continue learning'} <ArrowRight size={17} />
            </button>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="code-window">
              <div className="window-dots"><i /><i /><i /></div>
              <code><em>public</em> record <b>Job</b>(<br />&nbsp;&nbsp;<span>string</span> Id,<br />&nbsp;&nbsp;<span>JobStatus</span> Status<br />);</code>
              <div className="review-stamp"><Check size={14} /> REVIEW</div>
            </div>
          </div>
        </article>

        <article className="progress-card">
          <div className="card-title-row"><div><p className="overline dark">PATH PROGRESS</p><h3>{percent}% complete</h3></div><Gauge size={21} /></div>
          <div className="progress-ring" style={{ '--progress': `${percent * 3.6}deg` } as React.CSSProperties}>
            <div><strong>{progress.completed.length}</strong><span>of {lessons.length}</span></div>
          </div>
          <div className="stat-row">
            <div><strong>{reviewedCount}</strong><span>PRs reviewed</span></div>
            <div><strong>{lessons.length - progress.completed.length}</strong><span>Modules left</span></div>
          </div>
        </article>
      </section>

      <section className="practice-strip">
        <button onClick={() => onNavigate('bridge')}>
          <div className="practice-icon bridge"><Blocks size={21} /></div>
          <span><small>INTERACTIVE LAB 01</small><strong>Pattern bridge</strong><p>Connect Angular and NestJS patterns to idiomatic .NET side by side.</p></span>
          <ArrowRight size={18} />
        </button>
        <button onClick={() => onNavigate('translation')}>
          <div className="practice-icon translation"><Bot size={21} /></div>
          <span><small>INTERACTIVE LAB 02</small><strong>Translation review</strong><p>Audit plausible AI-generated C# against working TypeScript intent.</p></span>
          <ArrowRight size={18} />
        </button>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">CURRICULUM</p><h2>Your review path</h2><p>Nine focused pull requests. Each adds one production layer.</p></div>
          <span className="path-caption"><ShieldCheck size={16} /> Tailored for RPA engineering</span>
        </div>

        <div className="lesson-list">
          {lessons.map((lesson, index) => {
            const LessonIcon = iconForLesson[index];
            const done = progress.completed.includes(lesson.id);
            const review = progress.reviews[lesson.id];
            const active = !done && lesson.id === nextLesson.id;
            return (
              <button className={`lesson-row ${done ? 'done' : ''} ${active ? 'current' : ''}`} key={lesson.id} onClick={() => onOpenLesson(lesson.id)}>
                <div className="lesson-status">
                  {done ? <CheckCircle2 size={22} /> : <span>{lesson.number}</span>}
                </div>
                <div className="lesson-icon"><LessonIcon size={20} /></div>
                <div className="lesson-copy">
                  <span>{lesson.eyebrow}</span>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.outcome}</p>
                </div>
                <div className="lesson-meta">
                  {active && <span className="current-pill">UP NEXT</span>}
                  {review?.submitted && !done && <span className="reviewed-pill">REVIEWED</span>}
                  <span><Clock3 size={14} /> {lesson.duration}</span>
                  <span className={`difficulty ${lesson.difficulty.toLowerCase()}`}>{lesson.difficulty}</span>
                </div>
                <ChevronRight className="row-arrow" size={20} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="bridge-banner">
        <div className="bridge-icon"><Sparkles size={23} /></div>
        <div><p className="overline dark">YOUR EXISTING ADVANTAGE</p><h3>You already know how to reason about systems.</h3><p>Every module starts with the Node.js or TypeScript instinct you have, then shows where .NET deliberately differs.</p></div>
        <div className="bridge-tags"><span>Angular DI → ASP.NET DI</span><span>Promise → Task</span><span>GraphQL resolver → REST endpoint</span></div>
      </section>
    </div>
  );
}

type LessonViewProps = {
  lesson: Lesson;
  progress: Progress;
  onBack: () => void;
  onOpenLesson: (id: string) => void;
  onUpdateReview: (lessonId: string, review: ReviewState) => void;
  onComplete: (lessonId: string) => void;
};

function LessonView({ lesson, progress, onBack, onOpenLesson, onUpdateReview, onComplete }: LessonViewProps) {
  const review = progress.reviews[lesson.id] ?? emptyReview;
  const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);
  const isComplete = progress.completed.includes(lesson.id);
  const answerIsCorrect = review.quizAnswer === lesson.quiz.answer;
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
  const findingLines = lesson.findings.map((finding) => finding.line);
  const matched = review.selected.filter((line) => findingLines.includes(line));
  const falsePositives = review.selected.filter((line) => !findingLines.includes(line));
  const score = Math.max(0, Math.round((matched.length / findingLines.length) * 100 - falsePositives.length * 10));

  const toggleLine = (line: number) => {
    if (review.submitted) return;
    const selected = review.selected.includes(line)
      ? review.selected.filter((item) => item !== line)
      : [...review.selected, line];
    onUpdateReview(lesson.id, { ...review, selected });
  };

  const submitReview = () => {
    if (review.selected.length === 0) return;
    onUpdateReview(lesson.id, { ...review, submitted: true });
    window.setTimeout(() => document.getElementById('review-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const retryReview = () => {
    onUpdateReview(lesson.id, { ...review, selected: [], submitted: false });
  };

  const selectQuizAnswer = (answer: number) => {
    onUpdateReview(lesson.id, { ...review, quizAnswer: answer });
  };

  const finishLesson = () => {
    onComplete(lesson.id);
    const following = lessons[lessonIndex + 1];
    if (following) {
      onOpenLesson(following.id);
    } else {
      onBack();
    }
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
            <article className="concept-card" key={concept.title}>
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
          <div><p className="eyebrow">02 · REVIEW THE PULL REQUEST</p><h2>Find the production risks</h2><p>{lesson.prompt}</p></div>
          <div className="review-instruction"><GitPullRequest size={18} /><span>Click suspicious lines<br /><b>before revealing feedback</b></span></div>
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
                const selected = review.selected.includes(lineNumber);
                const isFinding = review.submitted && findingLines.includes(lineNumber);
                const missed = review.submitted && isFinding && !selected;
                const incorrect = review.submitted && selected && !isFinding;
                return (
                  <button
                    className={`code-line ${selected ? 'selected' : ''} ${isFinding ? 'has-finding' : ''} ${missed ? 'missed' : ''} ${incorrect ? 'incorrect' : ''}`}
                    key={`${lesson.id}-${lineNumber}`}
                    onClick={() => toggleLine(lineNumber)}
                    disabled={review.submitted}
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
                    {review.submitted && isFinding && <span className="line-result">{selected ? <Check size={14} /> : 'missed'}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="review-sidebar">
            <div className="review-sidebar-heading"><MessageSquareText size={18} /><div><strong>Your review</strong><span>{review.selected.length} line{review.selected.length === 1 ? '' : 's'} flagged</span></div></div>
            <label htmlFor={`note-${lesson.id}`}>Overall review note <span>optional</span></label>
            <textarea
              id={`note-${lesson.id}`}
              value={review.note}
              disabled={review.submitted}
              onChange={(event) => onUpdateReview(lesson.id, { ...review, note: event.target.value })}
              placeholder="What would you tell the author? Focus on impact and a safer direction…"
            />
            <div className="review-checklist">
              <p>Review lens</p>
              <span><CheckCircle2 size={15} /> Correctness & contracts</span>
              <span><CheckCircle2 size={15} /> Runtime & resources</span>
              <span><CheckCircle2 size={15} /> Production operation</span>
            </div>
            {!review.submitted ? (
              <button className="primary-button" disabled={review.selected.length === 0} onClick={submitReview}>Submit review <ArrowRight size={16} /></button>
            ) : (
              <button className="secondary-button" onClick={retryReview}><RotateCcw size={15} /> Try review again</button>
            )}
          </aside>
        </div>
      </section>

      {review.submitted && (
        <section className="results-section" id="review-results">
          <div className="score-card">
            <div className={`score-gauge ${score >= 70 ? 'good' : ''}`}><strong>{score}</strong><span>/ 100</span></div>
            <div>
              <p className="eyebrow">REVIEW FEEDBACK</p>
              <h2>{score >= 85 ? 'Sharp review.' : score >= 60 ? 'Good instincts. Tighten the net.' : 'A useful first pass.'}</h2>
              <p>You caught {matched.length} of {findingLines.length} risks{falsePositives.length > 0 ? `, with ${falsePositives.length} false positive${falsePositives.length === 1 ? '' : 's'}` : ''}. Compare your reasoning with the maintainer notes below.</p>
            </div>
          </div>

          <div className="findings-list">
            {lesson.findings.map((finding) => {
              const caught = review.selected.includes(finding.line);
              return (
                <article className={`finding-card ${caught ? 'caught' : 'missed'}`} key={`${lesson.id}-${finding.line}-${finding.title}`}>
                  <div className="finding-status">{caught ? <CheckCircle2 size={20} /> : <XCircle size={20} />}</div>
                  <div className="finding-copy">
                    <div className="finding-title-row"><span className={`severity ${finding.severity}`}>{severityLabel(finding.severity)}</span><span>LINE {finding.line}</span><strong>{caught ? 'You caught this' : 'You missed this'}</strong></div>
                    <h3>{finding.title}</h3>
                    <p>{finding.explanation}</p>
                    <div className="better-path"><ArrowRight size={15} /><span><b>Safer direction:</b> {finding.better}</span></div>
                  </div>
                </article>
              );
            })}
          </div>
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
              const chosen = review.quizAnswer === index;
              const revealed = review.quizAnswer !== null;
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
          {review.quizAnswer !== null && (
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
          disabled={!review.submitted || !answerIsCorrect}
          onClick={finishLesson}
        >
          {lessonIndex === lessons.length - 1 ? 'Finish the pathway' : 'Complete & continue'} <ArrowRight size={16} />
        </button>
      </footer>
    </div>
  );
}

function Glossary({ onOpenLesson }: { onOpenLesson: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = glossary.filter(([term, definition]) => `${term} ${definition}`.toLowerCase().includes(normalizedQuery));

  return (
    <div className="page glossary-page">
      <header className="page-header">
        <div><p className="eyebrow">REFERENCE</p><h1>.NET field guide</h1><p>The terms that turn up in code reviews, builds and architecture discussions.</p></div>
      </header>
      <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search compiler, runtime, packages…" /></div>
      <div className="glossary-grid">
        {filtered.map(([term, definition]) => (
          <article key={term}><span>{term.slice(0, 2)}</span><h2>{term}</h2><p>{definition}</p></article>
        ))}
      </div>
      {filtered.length === 0 && <div className="empty-state"><Search size={26} /><h3>No matching term</h3><p>Try a broader runtime or compiler concept.</p></div>}
      <section className="docs-card">
        <div><GraduationCap size={26} /><div><p className="eyebrow">NEXT PRACTICE</p><h2>Use the vocabulary in context</h2><p>The compiler module connects Roslyn, IL, the CLR and JIT compilation in one review.</p></div></div>
        <button className="secondary-button" onClick={() => onOpenLesson('compiler-nullability')}>Open compiler module <ExternalLink size={15} /></button>
      </section>
    </div>
  );
}

export default App;
