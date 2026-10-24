export type LabQuestion = { id: string; kind: string; prompt: string; code: string; options: string[]; hint: string; bridge: string; conceptId?: string; difficulty?: string; generated?: boolean; practiceReference?: string; reviewCriteria?: string[] };
export type LabAttempt = { id: string; questionId: string; answer: string; score: number | null; feedback: string; source: string; at: string; conceptId?: string };
export type AdaptiveSession = { id: string; createdAt: string; rationale: string; moduleId?: string; questions: LabQuestion[] };
export type LabModuleDoc = { title: string; url: string };
export type LabModuleSection = { title: string; minutes: number; body: string; code: string };
export type LabModule = {
  id: string;
  title: string;
  summary: string;
  outcome: string;
  minutes: number;
  tsComparison: string;
  bookReference: string;
  bookUrl: string;
  docs: LabModuleDoc[];
  sections: LabModuleSection[];
  appliesToday: string;
  historical: string;
  checkpoint: string;
  questions: LabQuestion[];
  adaptiveSession: AdaptiveSession | null;
};
export type LabTrack = { id: string; title: string; description: string; modules: LabModule[] };
const day = 86_400_000;
const percentScale = 100;
export function topicStatus(questions: LabQuestion[], attempts: LabAttempt[], now = Date.now()) {
  const latest = questions.map(q => attempts.filter(a => (a.conceptId ?? a.questionId) === (q.conceptId ?? q.id)).at(-1));
  const mastered = questions.length > 0 && questions.every(q => {
    const recent = attempts.filter(a => (a.conceptId ?? a.questionId) === (q.conceptId ?? q.id)).slice(-2);
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
export function moduleStatus(module: LabModule, attempts: LabAttempt[], now = Date.now()) {
  const status = topicStatus(module.questions, attempts, now);
  const total = module.questions.length;
  return { ...status, total, completed: total > 0 && status.answered === total, percent: total === 0 ? 0 : Math.round((status.answered / total) * percentScale) };
}
const sectionBudget = 900;
const promptBudget = 6000;
function clip(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}
export function buildVisualGuidePrompt(module: LabModule): string {
  const sections = module.sections.map((section, index) => `${index + 1}. ${section.title} - ${clip(section.body, sectionBudget)}`).join('\n');
  return clip([
    'Help me understand this .NET topic by building a visual guide.',
    'Use diagrams, flowcharts, memory-layout sketches, timelines and comparison tables (Mermaid or ASCII is fine).',
    'Be accurate to .NET 10 and clearly mark anything that is historical .NET Framework behaviour. Explain in your own words; do not quote any book.',
    '',
    `Lesson: ${module.title}`,
    `Summary: ${module.summary}`,
    `Goal: ${module.outcome}`,
    '',
    'Sections:',
    sections,
    '',
    `TypeScript and Node bridge: ${module.tsComparison}`,
    `Still true in .NET 10: ${module.appliesToday}`,
    `Historical .NET Framework detail: ${module.historical}`,
    `Reference: ${module.bookReference}`,
    '',
    'Please produce:',
    '1. A one-paragraph mental model.',
    '2. A diagram of the core idea.',
    '3. A table comparing C# with TypeScript/Node for this topic.',
    '4. A step-by-step flow of what happens in the example code.',
    '5. Two common mistakes and how they show up in real code.',
    '6. Three reasoning questions with answers (why and when, not syntax recall).',
  ].join('\n'), promptBudget);
}
export function chatGptUrl(prompt: string): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}
export function normalizeTrack(track: LabTrack | undefined, questions: LabQuestion[], adaptiveSession: AdaptiveSession | null): LabTrack {
  if (track && track.modules.length > 0) return track;
  return {
    id: 'reference-value-types',
    title: '.NET Under the Hood',
    description: 'Reference and value semantics, with the original foundation questions.',
    modules: [{
      id: 'value-types',
      title: 'Reference types vs value types',
      summary: 'Predict what assignment copies and how parameters behave.',
      outcome: 'Explain copied values, copied references and pass-by-value parameters.',
      minutes: 15,
      tsComparison: 'TypeScript objects share references; const stops rebinding, not mutation.',
      bookReference: 'CLR via C#, 4th Edition - Chapter 5, "Primitive, Reference, and Value Types".',
      bookUrl: 'https://www.oreilly.com/library/view/clr-via-c/9780735668737/ch05.html',
      docs: [{ title: 'Boxing and unboxing (C# programming guide)', url: 'https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/types/boxing-and-unboxing' }],
      sections: [],
      appliesToday: 'Value and reference semantics behave the same on .NET 10.',
      historical: 'Nothing in this module is .NET Framework-specific.',
      checkpoint: 'Answer the four foundation questions, then stop.',
      questions,
      adaptiveSession,
    }],
  };
}
