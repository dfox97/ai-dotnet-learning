import { CheckCircle2, ShieldAlert } from 'lucide-react';
import type { DiagnosticCompetencyId } from './diagnostic-engine';

export type CompetencyStatusSummaryProps = {
  masteredCompetencyIds: DiagnosticCompetencyId[];
  atRiskCompetencyIds: DiagnosticCompetencyId[];
  criticalAtRiskCompetencyIds: DiagnosticCompetencyId[];
};

function label(id: DiagnosticCompetencyId): string {
  return id.replace(/-/g, ' ');
}

export default function CompetencyStatusSummary({
  masteredCompetencyIds,
  atRiskCompetencyIds,
  criticalAtRiskCompetencyIds,
}: CompetencyStatusSummaryProps) {
  const critical = new Set(criticalAtRiskCompetencyIds);

  return (
    <div className="concept-grid" aria-label="Competency status">
      <article className="concept-card">
        <span>MASTERED</span>
        <h3>{masteredCompetencyIds.length}</h3>
        <p>{masteredCompetencyIds.length ? masteredCompetencyIds.map(label).join(', ') : 'No competencies marked mastered yet.'}</p>
        <CheckCircle2 size={18} aria-hidden="true" />
      </article>
      <article className="concept-card">
        <span>STILL AT RISK</span>
        <h3>{atRiskCompetencyIds.length}</h3>
        <p>{atRiskCompetencyIds.length ? atRiskCompetencyIds.map(label).join(', ') : 'No unresolved baseline gaps.'}</p>
        <ShieldAlert size={18} aria-hidden="true" />
      </article>
      <article className="concept-card">
        <span>CRITICAL RISKS</span>
        <h3>{criticalAtRiskCompetencyIds.length}</h3>
        <p>{atRiskCompetencyIds.length
          ? atRiskCompetencyIds.map((id) => `${label(id)}${critical.has(id) ? ' (critical)' : ''}`).join(', ')
          : 'Capstone critical-risk gate is clear.'}</p>
      </article>
    </div>
  );
}
