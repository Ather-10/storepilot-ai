import type {
  AuditFinding,
  AuditSummary,
  FindingSeverity,
} from "../audit.types";

const SEVERITY_PENALTIES: Record<FindingSeverity, number> = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2,
  info: 0,
};

export interface AuditScoreResult {
  score: number;
  summary: AuditSummary;
}

export function calculateAuditScore(
  findings: AuditFinding[]
): AuditScoreResult {
  const summary: AuditSummary = {
    totalFindings: findings.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  let totalPenalty = 0;

  for (const finding of findings) {
    summary[finding.severity] += 1;
    totalPenalty += SEVERITY_PENALTIES[finding.severity];
  }

  const score = Math.max(0, 100 - totalPenalty);

  return {
    score,
    summary,
  };
}