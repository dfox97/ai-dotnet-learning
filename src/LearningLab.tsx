import { useEffect, useState } from 'react';
import {
  buildVisualGuidePrompt,
  chatGptUrl,
  moduleStatus,
  nextQuestion,
  normalizeTrack,
  topicStatus,
  type AdaptiveSession,
  type LabAttempt,
  type LabModule,
  type LabQuestion,
  type LabTrack,
} from './learning-lab';
import './learning-lab.css';

type LabConfig = { aiEnabled: boolean; questions: LabQuestion[]; adaptiveSession: AdaptiveSession | null; track?: LabTrack };
const historyWindow = 12;

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/lab${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await response.json();
  if (!response.ok) throw new Error(data.reference ? `${data.error}\n\nReference: ${data.reference}` : data.error ?? 'The learning server is unavailable.');
  return data;
}

type ModuleCardProps = {
  module: LabModule;
  index: number;
  attempts: LabAttempt[];
  ai: boolean;
  generating: boolean;
  onOpenLesson: () => void;
  onStart: () => void;
  onResume: () => void;
  onGenerate: () => void;
};

function ModuleCard({ module, index, attempts, ai, generating, onOpenLesson, onStart, onResume, onGenerate }: ModuleCardProps) {
  const status = moduleStatus(module, attempts);
  const moduleComplete = module.questions.every(question => attempts.some(attempt => attempt.questionId === question.id));
  const adaptiveIncomplete = module.adaptiveSession?.questions.some(question => !attempts.some(attempt => attempt.questionId === question.id)) ?? false;
  return <li className="lab-module">
    <div className="lab-question-meta"><span>MODULE {index + 1} · {module.minutes} MINUTES</span><span>{status.percent}% · {status.answered}/{module.questions.length} concepts{status.mastered ? ' · Mastered' : ''}</span></div>
    <h3>{module.title}</h3><p>{module.summary}</p>
    <p className="lab-module-meta">{status.due.length} due for review · {status.average === null ? 'not scored yet' : `${status.average}/100 latest average`}</p>
    <div className="lab-actions"><button className="secondary-button" onClick={onOpenLesson}>Open lesson</button><button className="primary-button" onClick={onStart}>{status.answered > 0 ? 'Continue session' : 'Start learning session'}</button></div>
    <section className="lab-adaptive" aria-label={`Adaptive practice for ${module.title}`}><h4>Keep growing with fresh questions</h4><p>{ai ? 'Your next four questions use your saved answers, feedback and scores. Weak concepts get more practice; consistent passes lead to harder transfer scenarios.' : 'Connect an AI provider to generate fresh sessions. Authored practice and written self-review remain available without a key.'}</p>
      {!moduleComplete && <p>Complete the module's authored questions to establish your starting evidence.</p>}
      {module.adaptiveSession && <p><strong>Why this session:</strong> {module.adaptiveSession.rationale}</p>}
      {adaptiveIncomplete ? <button className="primary-button" disabled={generating} onClick={onResume}>Resume adaptive session →</button> : <button className="primary-button" disabled={!ai || !moduleComplete || generating} onClick={onGenerate}>{generating ? 'Creating your next session…' : 'Generate next session →'}</button>}
      {generating && <p role="status">Designing four new questions from your learning evidence. This may take a minute.</p>}
    </section>
  </li>;
}

type ModuleLessonProps = { module: LabModule; index: number; onBack: () => void; onStart: () => void };

function ModuleLesson({ module, index, onBack, onStart }: ModuleLessonProps) {
  const [copied, setCopied] = useState(false);
  const prompt = buildVisualGuidePrompt(module);
  return <section className="lab-card lab-lesson" aria-label={`${module.title} lesson`}>
    <div className="lab-question-meta"><span>MODULE {index + 1} · {module.minutes} MINUTES</span><button className="secondary-button" onClick={onBack}>Back to track</button></div>
    <h2>{module.title}</h2><p>{module.summary}</p>
    <p className="lab-callout"><strong>Stopping point:</strong> {module.checkpoint}</p>
    {module.sections.map(section => <article className="lab-lesson-section" key={section.title}><h3>{section.title} · {section.minutes} min</h3><p className="lab-lesson-body">{section.body}</p>{section.code && <pre><code>{section.code}</code></pre>}</article>)}
    <h3>TypeScript and Node bridge</h3><p className="lab-lesson-body">{module.tsComparison}</p>
    <h3>Still true in .NET 10</h3><p className="lab-lesson-body">{module.appliesToday}</p>
    <h3>Historical .NET Framework detail</h3><p className="lab-lesson-body">{module.historical}</p>
    <h3>Reference</h3><p><a href={module.bookUrl} target="_blank" rel="noreferrer">{module.bookReference}</a></p>
    <h3>Microsoft documentation</h3><ul className="lab-docs">{module.docs.map(doc => <li key={doc.url}><a href={doc.url} target="_blank" rel="noreferrer">{doc.title}</a></li>)}</ul>
    <div className="lab-actions"><button className="primary-button" onClick={onStart}>Start module session →</button><a className="secondary-button" href={chatGptUrl(prompt)} target="_blank" rel="noreferrer">Open a visual guide in ChatGPT →</a><button className="secondary-button" onClick={() => { void navigator.clipboard.writeText(prompt).then(() => setCopied(true)); }}>{copied ? 'Visual-guide prompt copied' : 'Copy visual-guide prompt'}</button></div>
  </section>;
}

function EvidencePanel({ attempts }: { attempts: LabAttempt[] }) {
  return <section className="lab-card"><div className="lab-question-meta"><h2>Your learning evidence</h2><a className="secondary-button" href="/api/lab/progress.md" download="dotnet-under-the-hood.md">Download Markdown</a></div><p>Progress lives in a readable Markdown file on your learning server. Each attempt keeps its answer, score, feedback and date, and the file summarises module completion, misconceptions and revision history. An early high score alone does not establish mastery.</p>{attempts.length === 0 ? <p>No attempts yet. Your first session establishes a baseline.</p> : <ol className="lab-history">{attempts.slice(-historyWindow).reverse().map(a => <li key={a.id}><strong>{a.conceptId ?? a.questionId} · {a.score === null ? 'Unscored reflection' : `${a.score}/100`}</strong><span>{new Date(a.at).toLocaleString()} · {a.source}</span><details><summary>Your saved answer</summary><p>{a.answer}</p></details><p>{a.feedback}</p></li>)}</ol>}</section>;
}

export default function LearningLab() {
  const [track, setTrack] = useState<LabTrack | null>(null);
  const [attempts, setAttempts] = useState<LabAttempt[]>([]);
  const [ai, setAi] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null);
  const [sessionModuleId, setSessionModuleId] = useState<string | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<LabQuestion[]>([]);
  const [active, setActive] = useState<LabQuestion | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<LabAttempt | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [covered, setCovered] = useState<string[]>([]);
  const [hint, setHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [tutorBusy, setTutorBusy] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  async function load() {
    setError('');
    try {
      const [config, progress] = await Promise.all([api<LabConfig>(''), api<LabAttempt[]>('/progress')]);
      setTrack(normalizeTrack(config.track, config.questions, config.adaptiveSession));
      setAi(config.aiEnabled);
      setAttempts(progress);
      setLoaded(true);
    } catch { setError('Cannot reach the learning server. Start the ASP.NET Core backend, then retry.'); }
  }
  useEffect(() => { void load(); }, []);

  const modules = track?.modules ?? [];
  const lessonModule = modules.find(module => module.id === lessonModuleId) ?? null;
  const sessionModule = modules.find(module => module.id === sessionModuleId) ?? null;
  const overall = topicStatus(modules.flatMap(module => module.questions), attempts);
  const finished = completed.length === sessionQuestions.length && sessionQuestions.length > 0;

  function open(question: LabQuestion | undefined) {
    setReviewing(false); setCovered([]); setActive(question ?? null); setAnswer(''); setFeedback(null); setHint(false); setReply(''); setMessage(''); setError('');
  }
  function startModule(module: LabModule) {
    setLessonModuleId(null); setSessionModuleId(module.id); setSessionQuestions(module.questions); setCompleted([]);
    open(nextQuestion(module.questions, attempts, []));
  }
  function resumeModule(moduleId: string, session: AdaptiveSession) {
    const done = session.questions.filter(question => attempts.some(attempt => attempt.questionId === question.id)).map(question => question.id);
    setLessonModuleId(null); setSessionModuleId(moduleId); setSessionQuestions(session.questions); setCompleted(done);
    open(nextQuestion(session.questions, attempts, done));
  }
  function leaveSession() { setActive(null); setSessionModuleId(null); setSessionQuestions([]); setCompleted([]); }
  async function generateSession(module: LabModule) {
    setGeneratingId(module.id); setError('');
    try {
      const session = await api<AdaptiveSession>('/sessions', { moduleId: module.id });
      setTrack(current => current ? { ...current, modules: current.modules.map(item => item.id === module.id ? { ...item, adaptiveSession: session } : item) } : current);
      resumeModule(module.id, session);
    } catch (e) { setError((e as Error).message); }
    finally { setGeneratingId(null); }
  }
  async function grade() {
    if (!active) return;
    if (active.kind === 'explanation' && !ai && !reviewing) { setReviewing(true); return; }
    setBusy(true); setError('');
    try {
      const result = await api<LabAttempt>(active.kind === 'explanation' && !ai ? '/reflection' : '/grade', { questionId: active.id, answer, covered });
      setFeedback(result); setAttempts(current => [...current, result]);
      setCompleted(current => [...new Set([...current, active.id])]);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function ask() {
    if (!active) return;
    setTutorBusy(true); setError('');
    try {
      const result = await api<{ reply: string; source: string }>('/tutor', { questionId: active.id, message });
      setReply(`${result.source === 'ai' ? 'AI tutor' : 'Practice reference'}\n${result.reply}`);
    } catch (e) { setError((e as Error).message); }
    finally { setTutorBusy(false); }
  }

  return <main className="lab-page">
    <header className="lab-header"><a href={import.meta.env.BASE_URL}>← ReviewLab workspace</a><span>15–30 MINUTE MODULES · 5–10 MINUTE STOPPING POINTS</span></header>
    <section className="lab-intro"><p className="eyebrow">YOUR TYPESCRIPT → C# MENTOR</p><h1>DotNet Learning Lab</h1><p>Build a mental model you can explain. Predict behaviour, review AI-generated code, and defend your reasoning.</p><p className="lab-mode">{ai ? 'AI mentor connected · written answers receive AI feedback' : 'Practice mode · answer-key scoring and guided written self-review'}</p></section>
    {error && <div className="lab-error" role="alert">{error}{!loaded && <button onClick={() => void load()}>Retry connection</button>}</div>}
    {!loaded && !error && <p role="status">Loading your learning history…</p>}
    {loaded && <>
      <section className="lab-stats" aria-label="Learning progress"><article><strong>{overall.average === null ? '—' : `${overall.average}/100`}</strong><span>Average across {overall.scored} scored concepts</span></article><article><strong>{overall.answered}/{modules.flatMap(module => module.questions).length}</strong><span>Concepts with evidence</span></article><article><strong>{overall.streak} {overall.streak === 1 ? 'day' : 'days'}</strong><span>Learning streak · UTC</span></article><article><strong>{overall.mastered ? 'Track mastered' : 'Building understanding'}</strong><span>Two passing dates per concept required</span></article></section>
      {active && sessionModule ? <SessionPanel {...{ sessionModule, active, sessionQuestions, attempts, completed, answer, setAnswer, feedback, reviewing, setReviewing, covered, setCovered, hint, setHint, busy, ai, reply, message, setMessage, tutorBusy, finished, grade, ask, leaveSession, open }} /> : lessonModule ? <ModuleLesson module={lessonModule} index={modules.findIndex(module => module.id === lessonModule.id)} onBack={() => setLessonModuleId(null)} onStart={() => startModule(lessonModule)} /> : <section className="lab-card" aria-label=".NET Under the Hood learning track">
        <p className="eyebrow">LEARNING TRACK</p><h2>{track?.title}</h2><p>{track?.description}</p>
        <ol className="lab-modules">{modules.map((module, index) => <ModuleCard key={module.id} module={module} index={index} attempts={attempts} ai={ai} generating={generatingId === module.id} onOpenLesson={() => setLessonModuleId(module.id)} onStart={() => startModule(module)} onResume={() => resumeModule(module.id, module.adaptiveSession!)} onGenerate={() => void generateSession(module)} />)}</ol>
      </section>}
      <EvidencePanel attempts={attempts} />
    </>}
  </main>;
}

type SessionPanelProps = {
  sessionModule: LabModule;
  active: LabQuestion;
  sessionQuestions: LabQuestion[];
  attempts: LabAttempt[];
  completed: string[];
  answer: string;
  setAnswer: (value: string) => void;
  feedback: LabAttempt | null;
  reviewing: boolean;
  setReviewing: (value: boolean) => void;
  covered: string[];
  setCovered: (updater: (current: string[]) => string[]) => void;
  hint: boolean;
  setHint: (value: boolean) => void;
  busy: boolean;
  ai: boolean;
  reply: string;
  message: string;
  setMessage: (value: string) => void;
  tutorBusy: boolean;
  finished: boolean;
  grade: () => Promise<void>;
  ask: () => Promise<void>;
  leaveSession: () => void;
  open: (question: LabQuestion | undefined) => void;
};

function SessionPanel(props: SessionPanelProps) {
  const { sessionModule, active, sessionQuestions, attempts, completed, answer, setAnswer, feedback, reviewing, setReviewing, covered, setCovered, hint, setHint, busy, ai, reply, message, setMessage, tutorBusy, finished, grade, ask, leaveSession, open } = props;
  return <section className="lab-card" aria-label="Learning session">
    <div className="lab-question-meta"><span>{sessionModule.title} · Question {Math.min(completed.length + (feedback ? 0 : 1), sessionQuestions.length)} of {sessionQuestions.length} · {active.kind} · {active.difficulty ?? 'foundation'}</span><button className="secondary-button" disabled={busy || tutorBusy} onClick={leaveSession}>Back to track</button></div>
    <h2>{active.prompt}</h2>{active.generated && <p className="lab-mode">AI-generated practice · {active.conceptId}. The answer key may contain mistakes; use the tutor to challenge its reasoning.</p>}<pre><code>{active.code}</code></pre>
    <details><summary>Connect it to TypeScript</summary><p>{active.bridge}</p></details>
    <form onSubmit={event => { event.preventDefault(); void grade(); }}>
      {active.options.length ? <fieldset disabled={busy || !!feedback}><legend>Your answer</legend>{active.options.map(option => <label className="lab-option" key={option}><input type="radio" name="answer" checked={answer === option} onChange={() => setAnswer(option)} />{option}</label>)}</fieldset> : <label className="lab-written">Your explanation<textarea maxLength={4000} rows={5} value={answer} disabled={busy || !!feedback || reviewing} onChange={e => setAnswer(e.target.value)} placeholder="What is copied? What changes? How does TypeScript compare?" /></label>}
      {!feedback && !reviewing && <div className="lab-actions"><button className="primary-button" disabled={busy || !answer.trim()}>{busy ? 'Reviewing…' : active.kind === 'explanation' && !ai ? 'Compare with reference' : 'Review my answer'}</button><button type="button" className="secondary-button" onClick={() => setHint(!hint)}>Show hint</button></div>}
    </form>
    {reviewing && !feedback && <section className="lab-feedback" aria-label="Written self-review"><h3>Compare your reasoning</h3><p>{active.practiceReference}</p><p>Check only the ideas your original explanation covered. Your reflection is saved without a numeric score and does not establish mastery.</p><fieldset disabled={busy}><legend>My explanation covered</legend>{active.reviewCriteria?.map(criterion => <label className="lab-option" key={criterion}><input type="checkbox" checked={covered.includes(criterion)} onChange={e => setCovered(current => e.target.checked ? [...current, criterion] : current.filter(item => item !== criterion))} />{criterion}</label>)}</fieldset><div className="lab-actions"><button className="primary-button" disabled={busy} onClick={() => void grade()}>{busy ? 'Saving…' : 'Save written reflection'}</button><button className="secondary-button" disabled={busy} onClick={() => setReviewing(false)}>Revise my explanation</button></div></section>}
    {hint && <p className="lab-callout">{active.hint}</p>}
    {feedback && <section className="lab-feedback" role="status"><h3>{feedback.score === null ? 'Written reflection saved · unscored' : `${feedback.score}/100 · ${feedback.source === 'ai' ? 'AI assessment' : feedback.source === 'generated-answer-key' ? 'AI-authored answer key' : 'Answer-key assessment'}`}</h3><p>{feedback.feedback}</p><p>Saved to your Markdown learning history.</p><button className="primary-button" onClick={() => open(nextQuestion(sessionQuestions, attempts, completed))}>{finished ? 'Finish session' : 'Next question →'}</button></section>}
    <section className="lab-tutor"><h3>{ai ? 'Ask your AI mentor' : 'Explore the reference'}</h3><p>{ai ? 'Ask for a hint, a different explanation, or challenge the feedback. To change a score, try the question again.' : 'Practice mode returns the authored explanation. Configure AI for conversational replies.'}</p><form onSubmit={e => { e.preventDefault(); void ask(); }}><label>Your follow-up<textarea maxLength={4000} rows={2} value={message} onChange={e => setMessage(e.target.value)} /></label><button className="secondary-button" disabled={tutorBusy || !message.trim()}>{tutorBusy ? 'Thinking…' : 'Ask mentor'}</button></form>{reply && <p className="lab-callout" role="status">{reply}</p>}</section>
  </section>;
}
