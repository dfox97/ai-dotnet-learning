import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Blocks,
  Bot,
  Box,
  Braces,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  ExternalLink,
  Gauge,
  GitPullRequest,
  GraduationCap,
  Menu,
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
import PatternBridgeView from './PatternBridgeView';
import ProgressTransferControls from './ProgressTransferControls';
import ResourcesView from './ResourcesView';
import StructuredLessonView from './StructuredLessonView';
import TranslationReviewView from './TranslationReviewView';
import { glossary, lessons, type Lesson } from './content';
import { bridgePatterns, translationChallenges } from './patterns';
import {
  createWindowNavigationHistory,
  navigateToLearningLocation,
  resolveBrowserLocation,
} from './browser-navigation';
import { createEmptyProgress, type LearnerProgress, type ReviewState } from './progress';
import { markLessonCompleted, setLessonReview } from './progress-operations';
import {
  loadLearnerProgress,
  resetLearnerProgress,
  saveLearnerProgress,
} from './progress-store';

type Progress = LearnerProgress['lessons'];

type Page = 'dashboard' | 'lesson' | 'glossary' | 'resources' | 'bridge' | 'translation';

type AppLocationState = {
  page: Page;
  activeLessonId: string;
  practiceId: string | null;
  recoveredFrom: string | null;
};

const lessonIds = new Set(lessons.map((lesson) => lesson.id));
const bridgePatternIds = new Set(bridgePatterns.map((pattern) => pattern.id));
const translationChallengeIds = new Set(translationChallenges.map((challenge) => challenge.id));
const practiceIds = new Set([...bridgePatternIds, ...translationChallengeIds]);
const knownLearningIds = {
  lessonIds,
  diagnosticIds: new Set<string>(),
  practiceIds,
};

const iconForLesson = [Braces, TerminalSquare, Gauge, ServerCog, Database, Box, Blocks, ShieldCheck, Bot];

function resolveAppPath(pathname: string): AppLocationState {
  if (pathname === '/glossary') {
    return { page: 'glossary', activeLessonId: lessons[0].id, practiceId: null, recoveredFrom: null };
  }
  if (pathname === '/resources') {
    return { page: 'resources', activeLessonId: lessons[0].id, practiceId: null, recoveredFrom: null };
  }

  const resolved = resolveBrowserLocation(pathname, knownLearningIds);
  const { location } = resolved;

  if (location.kind === 'dashboard') {
    return { page: 'dashboard', activeLessonId: lessons[0].id, practiceId: null, recoveredFrom: resolved.recoveredFrom };
  }
  if (location.kind === 'lesson') {
    return { page: 'lesson', activeLessonId: location.lessonId, practiceId: null, recoveredFrom: null };
  }
  if (location.kind === 'practice') {
    if (bridgePatternIds.has(location.activityId)) {
      return { page: 'bridge', activeLessonId: lessons[0].id, practiceId: location.activityId, recoveredFrom: null };
    }
    if (translationChallengeIds.has(location.activityId)) {
      return { page: 'translation', activeLessonId: lessons[0].id, practiceId: location.activityId, recoveredFrom: null };
    }
  }

  return { page: 'dashboard', activeLessonId: lessons[0].id, practiceId: null, recoveredFrom: pathname };
}

function App() {
  const navigationHistory = useMemo(() => createWindowNavigationHistory(window), []);
  const initialNavigation = useMemo(() => resolveAppPath(navigationHistory.pathname), [navigationHistory]);
  const initialProgress = useMemo(() => loadLearnerProgress(localStorage), []);
  const [page, setPage] = useState<Page>(initialNavigation.page);
  const [activeLessonId, setActiveLessonId] = useState(initialNavigation.activeLessonId);
  const [practiceId, setPracticeId] = useState<string | null>(initialNavigation.practiceId);
  const [recoveredFrom, setRecoveredFrom] = useState<string | null>(initialNavigation.recoveredFrom);
  const [progress, setProgress] = useState<LearnerProgress>(initialProgress.progress);
  const [progressRecoveryReason, setProgressRecoveryReason] = useState<string | null>(
    initialProgress.status === 'recovery-required' ? initialProgress.reason : null,
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!progressRecoveryReason) saveLearnerProgress(localStorage, progress);
  }, [progress, progressRecoveryReason]);

  useEffect(() => {
    if (initialNavigation.recoveredFrom) navigationHistory.replace('/');

    return navigationHistory.subscribe((pathname) => {
      const next = resolveAppPath(pathname);
      setPage(next.page);
      setActiveLessonId(next.activeLessonId);
      setPracticeId(next.practiceId);
      setRecoveredFrom(next.recoveredFrom);
      setMobileNavOpen(false);
      if (next.recoveredFrom) navigationHistory.replace('/');
      window.scrollTo({ top: 0 });
    });
  }, [initialNavigation.recoveredFrom, navigationHistory]);

  const lessonProgress = progress.lessons;
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0];
  const nextLesson = lessons.find((lesson) => !lessonProgress.completed.includes(lesson.id)) ?? null;
  const percent = Math.round((lessonProgress.completed.length / lessons.length) * 100);

  const openLesson = (lessonId: string) => {
    navigateToLearningLocation(navigationHistory, { kind: 'lesson', lessonId });
    setActiveLessonId(lessonId);
    setPracticeId(null);
    setRecoveredFrom(null);
    setPage('lesson');
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPractice = (target: 'bridge' | 'translation', activityId: string) => {
    navigateToLearningLocation(navigationHistory, { kind: 'practice', activityId });
    setPracticeId(activityId);
    setRecoveredFrom(null);
    setPage(target);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPage = (target: Page) => {
    if (target === 'dashboard') {
      navigateToLearningLocation(navigationHistory, { kind: 'dashboard' });
      setPracticeId(null);
    } else if (target === 'lesson') {
      navigateToLearningLocation(navigationHistory, { kind: 'lesson', lessonId: activeLessonId });
      setPracticeId(null);
    } else if (target === 'bridge') {
      openPractice('bridge', bridgePatternIds.has(practiceId ?? '') ? practiceId! : bridgePatterns[0].id);
      return;
    } else if (target === 'translation') {
      openPractice('translation', translationChallengeIds.has(practiceId ?? '') ? practiceId! : translationChallenges[0].id);
      return;
    } else if (target === 'glossary') {
      navigationHistory.push('/glossary');
      setPracticeId(null);
    } else if (target === 'resources') {
      navigationHistory.push('/resources');
      setPracticeId(null);
    }

    setRecoveredFrom(null);
    setPage(target);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateReview = (lessonId: string, nextReview: ReviewState) => {
    setProgress((current) => setLessonReview(current, lessonId, nextReview));
  };

  const completeLesson = (lessonId: string) => {
    setProgress((current) => markLessonCompleted(current, lessonId));
  };

  const replaceProgress = (replacement: LearnerProgress) => {
    setProgress(replacement);
    setProgressRecoveryReason(null);
  };

  const acceptCleanProgress = () => {
    resetLearnerProgress(localStorage);
    setProgress(createEmptyProgress());
    setProgressRecoveryReason(null);
  };

  const resetProgress = () => {
    const confirmed = window.confirm('Reset all ReviewLab progress, including lessons and future journey state?');
    if (!confirmed) return;
    resetLearnerProgress(localStorage);
    setProgress(createEmptyProgress());
    setProgressRecoveryReason(null);
    setPracticeId(null);
    setRecoveredFrom(null);
    setPage('dashboard');
    navigationHistory.replace('/');
  };

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        percent={percent}
        progress={progress}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onNavigate={openPage}
        onReplaceProgress={replaceProgress}
        onReset={resetProgress}
      />

      <main className="main-content">
        <MobileHeader onMenu={() => setMobileNavOpen(true)} />
        {progressRecoveryReason && (
          <section className="empty-state" role="alert">
            <XCircle size={26} />
            <h2>Saved progress needs recovery.</h2>
            <p>{progressRecoveryReason}</p>
            <p>Your stored value has not been overwritten. Start clean only when you are ready to replace it.</p>
            <button className="secondary-button" onClick={acceptCleanProgress}>Start with clean progress</button>
          </section>
        )}
        {recoveredFrom && (
          <section className="empty-state" role="status">
            <XCircle size={26} />
            <h2>That learning link is no longer available.</h2>
            <p>ReviewLab returned you to the dashboard from <code>{recoveredFrom}</code>.</p>
            <button className="secondary-button" onClick={() => setRecoveredFrom(null)}>Dismiss</button>
          </section>
        )}
        {page === 'dashboard' && (
          <Dashboard
            progress={lessonProgress}
            percent={percent}
            nextLesson={nextLesson}
            onOpenLesson={openLesson}
            onNavigate={openPage}
          />
        )}
        {page === 'lesson' && (
          <StructuredLessonView
            lesson={activeLesson}
            lessons={lessons}
            progress={lessonProgress}
            onBack={() => openPage('dashboard')}
            onOpenLesson={openLesson}
            onUpdateReview={updateReview}
            onComplete={completeLesson}
          />
        )}
        {page === 'glossary' && <Glossary onOpenLesson={openLesson} />}
        {page === 'resources' && <ResourcesView />}
        {page === 'bridge' && (
          <PatternBridgeView
            key={`bridge-${practiceId ?? 'default'}`}
            initialPatternId={practiceId ?? undefined}
            onPatternChange={(id) => openPractice('bridge', id)}
          />
        )}
        {page === 'translation' && (
          <TranslationReviewView
            key={`translation-${practiceId ?? 'default'}`}
            initialChallengeId={practiceId ?? undefined}
            onChallengeChange={(id) => openPractice('translation', id)}
          />
        )}
      </main>
    </div>
  );
}

type SidebarProps = {
  page: Page;
  percent: number;
  progress: LearnerProgress;
  open: boolean;
  onClose: () => void;
  onNavigate: (page: Page) => void;
  onReplaceProgress: (progress: LearnerProgress) => void;
  onReset: () => void;
};

function Sidebar({ page, percent, progress, open, onClose, onNavigate, onReplaceProgress, onReset }: SidebarProps) {
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

        <ProgressTransferControls progress={progress} onReplace={onReplaceProgress} />
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
  nextLesson: Lesson | null;
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
        <div className="header-chip"><span className="status-dot" /> {nextLesson ? 'Path active' : 'Path complete'}</div>
      </header>

      <section className="hero-grid">
        <article className="continue-card">
          <div className="continue-copy">
            {nextLesson ? (
              <>
                <span className="overline"><Play size={13} fill="currentColor" /> CONTINUE YOUR PATH</span>
                <p className="lesson-index">MODULE {nextLesson.number} · {nextLesson.duration}</p>
                <h2>{nextLesson.title}</h2>
                <p>{nextLesson.summary}</p>
                <button className="primary-button light" onClick={() => onOpenLesson(nextLesson.id)}>
                  {progress.completed.length === 0 ? 'Start first review' : 'Continue learning'} <ArrowRight size={17} />
                </button>
              </>
            ) : (
              <>
                <span className="overline"><CheckCircle2 size={13} /> PATH COMPLETE</span>
                <p className="lesson-index">ALL {lessons.length} MODULES COMPLETE</p>
                <h2>Your review pathway is complete.</h2>
                <p>Revisit any review or continue into the practice labs to keep strengthening production judgement.</p>
              </>
            )}
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
            const active = !done && lesson.id === nextLesson?.id;
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
