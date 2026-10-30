
export type AuditStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type FindingSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

export type AuditCategory =
  | "seo"
  | "technical"
  | "content"
  | "accessibility";

export interface AuditEvidence {
  pageUrl: string;
  detectedValue?: string | null;
  expectedValue?: string | null;
  details?: Record<string, unknown>;
}

export interface AuditFinding {
  id: string;
  category: AuditCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  recommendation: string;
  evidence: AuditEvidence;
}

export interface AuditSummary {
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface AuditResult {
  id: string;
  websiteUrl: string;
  status: AuditStatus;
  score: number | null;
  summary: AuditSummary;
  findings: AuditFinding[];
  createdAt: string;
  completedAt?: string | null;
}
