import type { DiagnosticCompetencyId, DiagnosticResult } from './diagnostic-engine.ts';

export type LearningActivity = {
  id: string;
  kind: 'lesson' | 'practice';
  title: string;
};

export type RecommendationRule = {
  competencyId: DiagnosticCompetencyId;
  critical: boolean;
  activities: Array<LearningActivity & { reason: string }>;
};

export type RecommendationEvidence = {
  completedActivityIds: string[];
  masteredCompetencyIds: DiagnosticCompetencyId[];
};

export type RecommendedActivity = LearningActivity & {
  competencyIds: DiagnosticCompetencyId[];
  reasons: string[];
  status: 'recommended' | 'completed';
};

export type LearningPathRecommendation = {
  activities: RecommendedActivity[];
  masteredCompetencyIds: DiagnosticCompetencyId[];
  atRiskCompetencyIds: DiagnosticCompetencyId[];
  criticalAtRiskCompetencyIds: DiagnosticCompetencyId[];
  capstoneReady: boolean;
};

export const recommendationRules: RecommendationRule[] = [
  {
    competencyId: 'nullability',
    critical: false,
    activities: [
      { id: 'compiler-nullability', kind: 'lesson', title: 'Make the compiler your reviewer', reason: 'Practise nullable flow analysis and boundary contracts.' },
      { id: 'csharp-foundations', kind: 'lesson', title: 'C# without the ceremony', reason: 'Reinforce C# type and value semantics before deeper reviews.' },
    ],
  },
  {
    competencyId: 'cancellation',
    critical: true,
    activities: [
      { id: 'async-reliability', kind: 'lesson', title: 'Async that can stop safely', reason: 'Practise CancellationToken propagation through unattended work.' },
      { id: 'automation-production', kind: 'lesson', title: 'Ship an automation worker', reason: 'Apply cancellation in a production worker lifecycle.' },
    ],
  },
  {
    competencyId: 'di-lifetime',
    critical: true,
    activities: [
      { id: 'di-composition', kind: 'lesson', title: 'Dependency injection that tells the truth', reason: 'Trace scoped, transient and singleton ownership explicitly.' },
      { id: 'di-lifetimes', kind: 'practice', title: 'DI lifetimes pattern bridge', reason: 'Compare familiar TypeScript DI instincts with .NET lifetime rules.' },
    ],
  },
  {
    competencyId: 'async-correctness',
    critical: true,
    activities: [
      { id: 'async-reliability', kind: 'lesson', title: 'Async that can stop safely', reason: 'Review sync-over-async, fire-and-forget work and observable failures.' },
      { id: 'singleton-translation', kind: 'practice', title: 'Translation review', reason: 'Audit plausible generated C# rather than translating syntax mechanically.' },
    ],
  },
  {
    competencyId: 'persistence-query',
    critical: false,
    activities: [
      { id: 'data-sql', kind: 'lesson', title: 'SQL beneath the abstraction', reason: 'Review deferred execution, projection and database query shape.' },
    ],
  },
  {
    competencyId: 'idempotency',
    critical: true,
    activities: [
      { id: 'automation-production', kind: 'lesson', title: 'Ship an automation worker', reason: 'Practise at-least-once delivery and idempotent side effects.' },
    ],
  },
  {
    competencyId: 'observability',
    critical: false,
    activities: [
      { id: 'readable-architecture', kind: 'lesson', title: 'Code that humans and agents can change safely', reason: 'Use structured evidence and explicit failure contracts.' },
      { id: 'automation-production', kind: 'lesson', title: 'Ship an automation worker', reason: 'Review production logging and operability in a worker.' },
    ],
  },
  {
    competencyId: 'tool-authority',
    critical: true,
    activities: [
      { id: 'agentic-dotnet', kind: 'lesson', title: 'Review agentic .NET systems', reason: 'Separate model suggestions from deterministic authority boundaries.' },
    ],
  },
];

export const criticalCompetencies = recommendationRules
  .filter((rule) => rule.critical)
  .map((rule) => rule.competencyId);

export function recommendLearningPath(
  diagnostic: DiagnosticResult,
  evidence: RecommendationEvidence = { completedActivityIds: [], masteredCompetencyIds: [] },
): LearningPathRecommendation {
  const mastered = new Set(evidence.masteredCompetencyIds);
  const atRisk = diagnostic.gaps.filter((competencyId) => !mastered.has(competencyId));
  const atRiskSet = new Set(atRisk);
  const byActivity = new Map<string, RecommendedActivity>();

  for (const rule of recommendationRules) {
    if (!atRiskSet.has(rule.competencyId)) continue;

    for (const activity of rule.activities) {
      const existing = byActivity.get(activity.id);
      if (existing) {
        if (!existing.competencyIds.includes(rule.competencyId)) existing.competencyIds.push(rule.competencyId);
        existing.reasons.push(activity.reason);
        continue;
      }

      byActivity.set(activity.id, {
        id: activity.id,
        kind: activity.kind,
        title: activity.title,
        competencyIds: [rule.competencyId],
        reasons: [activity.reason],
        status: evidence.completedActivityIds.includes(activity.id) ? 'completed' : 'recommended',
      });
    }
  }

  const criticalAtRiskCompetencyIds = criticalCompetencies.filter((competencyId) => atRiskSet.has(competencyId));

  return {
    activities: [...byActivity.values()],
    masteredCompetencyIds: [...mastered],
    atRiskCompetencyIds: atRisk,
    criticalAtRiskCompetencyIds,
    capstoneReady: criticalAtRiskCompetencyIds.length === 0,
  };
}
