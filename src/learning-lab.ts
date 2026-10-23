export type LabQuestion = { id: string; kind: string; prompt: string; code: string; options: string[]; hint: string; bridge: string; practiceReference?: string; reviewCriteria?: string[] };
export type LabAttempt = { id: string; questionId: string; answer: string; score: number | null; feedback: string; source: string; at: string };
const day = 86_400_000;
export function topicStatus(questions: LabQuestion[], attempts: LabAttempt[], now = Date.now()) {
  const latest = questions.map(q => attempts.filter(a => a.questionId === q.id).at(-1));
  const mastered = questions.length > 0 && questions.every(q => {
    const recent = attempts.filter(a => a.questionId === q.id).slice(-2);
    return recent.length === 2 && recent.every(a => a.score !== null && a.score >= 80) && recent[0].at.slice(0, 10) !== recent[1].at.slice(0, 10);
  });
  const due = questions.filter((_, i) => !latest[i] || Date.parse(latest[i]!.at) + (latest[i]!.score === null || latest[i]!.score! < 80 ? day : 3 * day) <= now);
  const average = latest.filter((a): a is LabAttempt => Boolean(a) && a!.score !== null);
  const dates = new Set(attempts.map(a => a.at.slice(0, 10)));
  let streak = 0;
  let cursor = Date.parse(new Date(now).toISOString().slice(0, 10));
  if (!dates.has(new Date(cursor).toISOString().slice(0, 10))) cursor -= day;
  while (dates.has(new Date(cursor).toISOString().slice(0, 10))) { streak++; cursor -= day; }
  return { mastered, due, average: average.length ? Math.round(average.reduce((sum, a) => sum + a.score!, 0) / average.length) : null, answered: latest.filter(Boolean).length, scored: average.length, streak };
}
export function nextQuestion(questions: LabQuestion[], attempts: LabAttempt[], completed: string[], now = Date.now()) {
  const dueIds = new Set(topicStatus(questions, attempts, now).due.map(q => q.id));
  return [...questions].filter(q => !completed.includes(q.id)).sort((a, b) => {
    const last = (id: string) => attempts.filter(x => x.questionId === id).at(-1);
    if (dueIds.has(a.id) !== dueIds.has(b.id)) return dueIds.has(a.id) ? -1 : 1;
    return (last(a.id)?.score ?? -1) - (last(b.id)?.score ?? -1);
  })[0];
}
