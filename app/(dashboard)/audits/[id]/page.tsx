"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Search,
  FileText,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Audit = {
  id: string;
  website_url: string;
  score: number | null;
  status: string;
  total_findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  created_at: string;
};

type Finding = {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  evidence: Record<string, unknown>;
  created_at: string;
};

type AuditDetails = {
  audit: Audit;
  findings: Finding[];
};

const severityConfig: Record<
  string,
  { color: string; background: string; label: string }
> = {
  critical: {
    color: "text-red-700",
    background: "bg-red-50 border-red-200",
    label: "Critical",
  },
  high: {
    color: "text-orange-700",
    background: "bg-orange-50 border-orange-200",
    label: "High",
  },
  medium: {
    color: "text-amber-700",
    background: "bg-amber-50 border-amber-200",
    label: "Medium",
  },
  low: {
    color: "text-blue-700",
    background: "bg-blue-50 border-blue-200",
    label: "Low",
  },
  info: {
    color: "text-slate-600",
    background: "bg-slate-100 border-slate-200",
    label: "Info",
  },
};

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function EvidenceValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-slate-400">Not available</span>;
  }

  if (typeof value === "object") {
    return (
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return (
    <span className="break-all text-sm text-slate-600">
      {String(value)}
    </span>
  );
}

function FindingCard({
  finding,
  index,
}: {
  finding: Finding;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const severity =
    severityConfig[finding.severity?.toLowerCase()] ??
    severityConfig.info;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between gap-4 p-5 text-left transition hover:bg-slate-50"
      >
        <div className="flex min-w-0 gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
            {String(index + 1).padStart(2, "0")}
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severity.background} ${severity.color}`}
              >
                {severity.label}
              </span>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
                {finding.category}
              </span>
            </div>

            <h3 className="font-semibold text-slate-900">
              {finding.title}
            </h3>

            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
              {finding.description}
            </p>
          </div>
        </div>

        <div className="mt-1 shrink-0 text-slate-400">
          {expanded ? (
            <ChevronUp size={20} />
          ) : (
            <ChevronDown size={20} />
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-slate-100 bg-slate-50/70 p-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <AlertCircle size={16} className="text-amber-600" />
              Issue description
            </div>
            <p className="text-sm leading-7 text-slate-600">
              {finding.description}
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Lightbulb size={16} className="text-blue-600" />
              Recommended action
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-blue-900">
              {finding.recommendation}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <FileText size={16} />
              Audit evidence
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              {finding.evidence &&
              Object.keys(finding.evidence).length > 0 ? (
                Object.entries(finding.evidence).map(([key, value]) => (
                  <div key={key}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {key.replace(/([A-Z])/g, " $1")}
                    </p>
                    <EvidenceValue value={value} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">
                  No additional evidence available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditDetailsContent() {
  const params = useParams<{ id: string }>();
  const auditId = params.id;

  const [details, setDetails] = useState<AuditDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAudit = useCallback(async () => {
    if (!auditId) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/audit/${auditId}`, {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to load audit report."
        );
      }

      if (!result.success || !result.data?.audit) {
        throw new Error("Invalid audit report response.");
      }

      setDetails(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading the report."
      );
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchInitialAudit() {
      try {
        const response = await fetch(`/api/audit/${auditId}`, {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to load audit report."
          );
        }

        if (!result.success || !result.data?.audit) {
          throw new Error("Invalid audit report response.");
        }

        if (!cancelled) {
          setDetails(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong while loading the report."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchInitialAudit();

    return () => {
      cancelled = true;
    };
  }, [auditId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-5">
        <div className="text-center">
          <RefreshCw
            className="mx-auto mb-4 animate-spin text-blue-600"
            size={30}
          />
          <h2 className="font-semibold text-slate-800">
            Preparing your audit report
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Loading website intelligence...
          </p>
        </div>
      </main>
    );
  }

  if (error || !details) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-5">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle
            className="mx-auto mb-4 text-red-500"
            size={36}
          />
          <h2 className="text-xl font-bold text-slate-900">
            Report unavailable
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error || "We could not find this audit report."}
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => void loadAudit()}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Try again
            </button>

            <Link
              href="/"
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { audit, findings } = details;
  const score = Math.max(0, Math.min(100, audit.score ?? 0));

  const scoreLabel =
    score >= 90
      ? "Excellent"
      : score >= 75
        ? "Good"
        : score >= 50
          ? "Needs improvement"
          : "Poor";

  const severityStats = [
    { label: "Critical", count: audit.critical, color: "bg-red-500" },
    { label: "High", count: audit.high, color: "bg-orange-500" },
    { label: "Medium", count: audit.medium, color: "bg-amber-500" },
    { label: "Low", count: audit.low, color: "bg-blue-500" },
    { label: "Info", count: audit.info, color: "bg-slate-400" },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8fc]">
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </Link>

          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-600">
                <ShieldCheck size={15} />
                StorePilot AI / Audit Report
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Website Audit Report
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Detailed website analysis and improvement opportunities.
              </p>
            </div>

            <button
              onClick={() => void loadAudit()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh report
            </button>
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Globe size={24} />
              </div>

              <div className="min-w-0">
                <h2 className="break-all text-lg font-bold text-slate-900">
                  {getHostname(audit.website_url)}
                </h2>
                <p className="mt-1 break-all text-sm text-slate-500">
                  {audit.website_url}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                <CheckCircle2 size={14} />
                {audit.status}
              </span>

              <a
                href={audit.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Visit website
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
            <CalendarDays size={14} />
            Audited on {formatDate(audit.created_at)}
          </div>
        </section>

        <section className="mb-6 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">
                Overall website score
              </h2>
              <Search size={18} className="text-slate-400" />
            </div>

            <div className="flex flex-col items-center py-3">
              <div
                className="relative flex h-40 w-40 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#2563eb ${score * 3.6}deg, #e2e8f0 0deg)`,
                }}
              >
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-4xl font-bold tracking-tight text-slate-900">
                    {score}
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    OUT OF 100
                  </span>
                </div>
              </div>

              <span className="mt-4 text-lg font-bold text-slate-900">
                {scoreLabel}
              </span>
              <p className="mt-1 text-center text-xs text-slate-400">
                Based on StorePilot AI audit checks
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-6 font-semibold text-slate-800">
              Findings overview
            </h2>

            <div className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Total findings
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {findings.length}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Critical issues
                </p>
                <p className="mt-2 text-3xl font-bold text-red-600">
                  {audit.critical}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Improvement areas
                </p>
                <p className="mt-2 text-3xl font-bold text-blue-600">
                  {audit.high + audit.medium + audit.low}
                </p>
              </div>
            </div>

            <h3 className="mb-4 text-sm font-semibold text-slate-700">
              Severity distribution
            </h3>

            <div className="space-y-4">
              {severityStats.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">
                      {item.label}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {item.count}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{
                        width: `${
                          audit.total_findings > 0
                            ? (item.count / audit.total_findings) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Detected findings
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review each issue, inspect its evidence and follow the recommended action.
              </p>
            </div>

            <span className="text-sm font-medium text-slate-500">
              {findings.length} results
            </span>
          </div>

          {findings.length > 0 ? (
            <div className="space-y-4">
              {findings.map((finding, index) => (
                <FindingCard
                  key={finding.id || `${finding.title}-${index}`}
                  finding={finding}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
              <CheckCircle2
                className="mx-auto mb-3 text-green-500"
                size={36}
              />
              <h3 className="font-semibold text-slate-900">
                No findings detected
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                No issues were returned by this audit.
              </p>
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-slate-200 py-6 text-center">
          <p className="text-xs text-slate-400">
            Generated by StorePilot AI · Website Intelligence
          </p>
        </footer>
      </div>
    </main>
  );
}

export default function AuditDetailsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-5">
          <div className="text-center">
            <RefreshCw
              className="mx-auto mb-4 animate-spin text-blue-600"
              size={30}
            />
            <h2 className="font-semibold text-slate-800">
              Preparing your audit report
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Loading website intelligence...
            </p>
          </div>
        </main>
      }
    >
      <AuditDetailsContent />
    </Suspense>
  );
}