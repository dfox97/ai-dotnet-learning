export type Finding = {
  line: number;
  title: string;
  severity: 'blocker' | 'warning' | 'suggestion';
  explanation: string;
  better: string;
};

export type Quiz = {
  question: string;
  code?: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type DecisionLab = {
  title: string;
  scenario: string;
  question: string;
  options: {
    label: string;
    detail: string;
    correct: boolean;
    feedback: string;
  }[];
  takeaway: string;
};

export type Lesson = {
  id: string;
  number: string;
  title: string;
  eyebrow: string;
  duration: string;
  difficulty: 'Foundation' | 'Core' | 'Production';
  summary: string;
  outcome: string;
  concepts: { title: string; body: string; node: string }[];
  callout: { label: string; title: string; body: string };
  fileName: string;
  code: string;
  prompt: string;
  findings: Finding[];
  quiz: Quiz;
  decisionLab?: DecisionLab;
};
