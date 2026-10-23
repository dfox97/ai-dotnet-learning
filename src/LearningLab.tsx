import { useEffect, useState } from 'react';
import { nextQuestion, topicStatus, type LabAttempt, type LabQuestion } from './learning-lab';
import './learning-lab.css';

async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/lab${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const data = await response.json();
  if (!response.ok) throw new Error(data.reference ? `${data.error}\n\nReference: ${data.reference}` : data.error ?? 'The learning server is unavailable.');
  return data;
}
export default function LearningLab() {
  const [questions, setQuestions] = useState<LabQuestion[]>([]);
  const [attempts, setAttempts] = useState<LabAttempt[]>([]);
  const [ai, setAi] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
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
  async function load() {
    setError('');
    try {
      const [config, progress] = await Promise.all([api<{ aiEnabled: boolean; questions: LabQuestion[] }>(''), api<LabAttempt[]>('/progress')]);
      setQuestions(config.questions); setAi(config.aiEnabled); setAttempts(progress); setLoaded(true);
    } catch { setError('Cannot reach the learning server. Start the ASP.NET Core backend, then retry.'); }
  }
  useEffect(() => { void load(); }, []);
  const status = topicStatus(questions, attempts);
  const finished = completed.length === questions.length && questions.length > 0;
  function open(question: LabQuestion | undefined) {
    setReviewing(false); setCovered([]); setActive(question ?? null); setAnswer(''); setFeedback(null); setHint(false); setReply(''); setMessage(''); setError('');
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
    <header className="lab-header"><a href={import.meta.env.BASE_URL}>← ReviewLab workspace</a><span>10–15 MINUTES · NO CODE EDITOR NEEDED</span></header>
    <section className="lab-intro"><p className="eyebrow">YOUR TYPESCRIPT → C# MENTOR</p><h1>DotNet Learning Lab</h1><p>Build a mental model you can explain. Predict behaviour, spot bugs, and defend your reasoning.</p><p className="lab-mode">{ai ? 'AI mentor connected · written answers receive AI feedback' : 'Practice mode · answer-key scoring and guided written self-review'}</p></section>
    {error && <div className="lab-error" role="alert">{error}{!loaded && <button onClick={() => void load()}>Retry connection</button>}</div>}
    {!loaded && !error && <p role="status">Loading your learning history…</p>}
    {loaded && <>
      <section className="lab-stats" aria-label="Learning progress"><article><strong>{status.average === null ? '—' : `${status.average}/100`}</strong><span>Average across {status.scored} scored questions</span></article><article><strong>{status.answered}/{questions.length}</strong><span>Questions with evidence</span></article><article><strong>{status.streak} {status.streak === 1 ? 'day' : 'days'}</strong><span>Learning streak · UTC</span></article><article><strong>{status.mastered ? 'Mastered' : 'Building understanding'}</strong><span>Two passing dates per question required</span></article></section>
      {!active && finished && <p className="lab-callout" role="status">Session complete. Review your evidence below and return for spaced practice.</p>}
      {!active ? <section className="lab-card"><p className="eyebrow">RECOMMENDED SESSION</p><h2>Reference types vs value types</h2><p>Four questions: multiple choice, output prediction, bug spotting, and an explanation in your own words. Due questions come first, followed by unanswered concepts and your weakest recent scores.</p><p>{status.due.length} {status.due.length === 1 ? 'question' : 'questions'} due for review. Missed concepts return after one day; passing answers after three.</p><button className="primary-button" onClick={() => { setCompleted([]); open(nextQuestion(questions, attempts, [])); }}>Start learning session →</button></section> : <section className="lab-card" aria-label="Learning session">
        <div className="lab-question-meta"><span>Question {Math.min(completed.length + (feedback ? 0 : 1), questions.length)} of {questions.length} · {active.kind}</span><button className="secondary-button" disabled={busy || tutorBusy} onClick={() => open(undefined)}>Back to dashboard</button></div>
        <h2>{active.prompt}</h2><pre><code>{active.code}</code></pre>
        <details><summary>Connect it to TypeScript</summary><p>{active.bridge}</p></details>
        <form onSubmit={event => { event.preventDefault(); void grade(); }}>
          {active.options.length ? <fieldset disabled={busy || !!feedback}><legend>Your answer</legend>{active.options.map(option => <label className="lab-option" key={option}><input type="radio" name="answer" checked={answer === option} onChange={() => setAnswer(option)} />{option}</label>)}</fieldset> : <label className="lab-written">Your explanation<textarea maxLength={4000} rows={5} value={answer} disabled={busy || !!feedback || reviewing} onChange={e => setAnswer(e.target.value)} placeholder="What is copied? What changes? How does TypeScript compare?" /></label>}
          {!feedback && !reviewing && <div className="lab-actions"><button className="primary-button" disabled={busy || !answer.trim()}>{busy ? 'Reviewing…' : active.kind === 'explanation' && !ai ? 'Compare with reference' : 'Review my answer'}</button><button type="button" className="secondary-button" onClick={() => setHint(!hint)}>Show hint</button></div>}
        </form>
        {reviewing && !feedback && <section className="lab-feedback" aria-label="Written self-review"><h3>Compare your reasoning</h3><p>{active.practiceReference}</p><p>Check only the ideas your original explanation covered. Your reflection is saved without a numeric score and does not establish mastery.</p><fieldset disabled={busy}><legend>My explanation covered</legend>{active.reviewCriteria?.map(criterion => <label className="lab-option" key={criterion}><input type="checkbox" checked={covered.includes(criterion)} onChange={e => setCovered(current => e.target.checked ? [...current, criterion] : current.filter(item => item !== criterion))} />{criterion}</label>)}</fieldset><div className="lab-actions"><button className="primary-button" disabled={busy} onClick={() => void grade()}>{busy ? 'Saving…' : 'Save written reflection'}</button><button className="secondary-button" disabled={busy} onClick={() => setReviewing(false)}>Revise my explanation</button></div></section>}
        {hint && <p className="lab-callout">{active.hint}</p>}
        {feedback && <section className="lab-feedback" role="status"><h3>{feedback.score === null ? 'Written reflection saved · unscored' : `${feedback.score}/100 · ${feedback.source === 'ai' ? 'AI assessment' : 'Answer-key assessment'}`}</h3><p>{feedback.feedback}</p><p>Saved to your Markdown learning history.</p><button className="primary-button" onClick={() => open(nextQuestion(questions, attempts, completed))}>{finished ? 'Finish session' : 'Next question →'}</button></section>}

        <section className="lab-tutor"><h3>{ai ? 'Ask your AI mentor' : 'Explore the reference'}</h3><p>{ai ? 'Ask for a hint, a different explanation, or challenge the feedback. To change a score, try the question again.' : 'Practice mode returns the authored explanation. Configure AI for conversational replies.'}</p><form onSubmit={e => { e.preventDefault(); void ask(); }}><label>Your follow-up<textarea maxLength={4000} rows={2} value={message} onChange={e => setMessage(e.target.value)} /></label><button className="secondary-button" disabled={tutorBusy || !message.trim()}>{tutorBusy ? 'Thinking…' : 'Ask mentor'}</button></form>{reply && <p className="lab-callout" role="status">{reply}</p>}</section>
      </section>}
      <section className="lab-card"><div className="lab-question-meta"><h2>Your learning evidence</h2><a className="secondary-button" href="/api/lab/progress.md" download="reference-value-types.md">Download Markdown</a></div><p>Progress lives in a readable Markdown file on your learning server. Each attempt keeps its answer, score, feedback, and date. An early high score alone does not establish mastery.</p>{attempts.length === 0 ? <p>No attempts yet. Your first session establishes a baseline.</p> : <ol className="lab-history">{attempts.slice(-12).reverse().map(a => <li key={a.id}><strong>{a.questionId} · {a.score === null ? 'Unscored reflection' : `${a.score}/100`}</strong><span>{new Date(a.at).toLocaleString()} · {a.source}</span><details><summary>Your saved answer</summary><p>{a.answer}</p></details><p>{a.feedback}</p></li>)}</ol>}</section>
    </>}
  </main>;
}
