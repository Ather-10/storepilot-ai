
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Globe,
  Activity,
  Search,
  ShieldCheck,
  AlertTriangle,
  Clock3,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type {
  AuditFinding,
  AuditSummary,
} from "@/modules/audit/audit.types";

// API response type
type AuditApiData = {
  auditId: string;
  websiteUrl: string;
  score: number;
  summary: AuditSummary;
  findings: AuditFinding[];
};

// Audit history record type
type AuditRecord = {
  id: string;
  domain: string;
  type: string;
  date: string;
  status: "Completed" | "Pending" | "Failed";
  score: number;
  findingsCount: number;
};

type AuditHistoryResponse = {
  id: string;
  website_url: string;
  score: number;
  status: string;
  total_findings: number;
  created_at: string;
};

export function Overview() {
  // State management
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const [auditResult, setAuditResult] =
    useState<AuditApiData | null>(null);

  const [auditHistory, setAuditHistory] =
    useState<AuditRecord[]>([]);

  // Load audit history from database
  const loadAuditHistory = useCallback(
    async (): Promise<AuditRecord[]> => {
      const response = await fetch("/api/audit/history", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to load audit history."
        );
      }

      if (!Array.isArray(result.data)) {
        throw new Error("Invalid audit history response.");
      }

      return (result.data as AuditHistoryResponse[]).map(
        (audit) => {
          let domain = audit.website_url;

          try {
            domain = new URL(audit.website_url).hostname;
          } catch {
            // Keep the original URL if it cannot be parsed.
          }

          const status: AuditRecord["status"] =
            audit.status === "completed"
              ? "Completed"
              : audit.status === "failed"
                ? "Failed"
                : "Pending";

          return {
            id: audit.id,
            domain,
            type: "SEO website audit",
            date: new Date(audit.created_at).toLocaleDateString(),
            status,
            score: audit.score,
            findingsCount: audit.total_findings,
          };
        }
      );
    },
    []
  );

  // Load history automatically when dashboard opens
  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      try {
        setHistoryError("");

        const records = await loadAuditHistory();

        if (!cancelled) {
          setAuditHistory(records);
        }
      } catch (error) {
        console.error("History loading error:", error);

        if (!cancelled) {
          setHistoryError(
            error instanceof Error
              ? error.message
              : "Unable to load audit history."
          );
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    }

    void fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [loadAuditHistory]);

  // Submit audit request
  async function handleAuditSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!url.trim()) {
      setMessage("Please enter a website URL.");
      return;
    }

    setLoading(true);
    setMessage("");
    setAuditResult(null);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Audit failed. Please try again."
        );
      }

      const auditData: AuditApiData = result.data;

      // Store latest audit result
      setAuditResult(auditData);
      setUrl(auditData.websiteUrl);
      setMessage("Website audit completed successfully!");

      // Refresh history independently
      setHistoryLoading(true);
      setHistoryError("");

      try {
        const updatedHistory = await loadAuditHistory();

        setAuditHistory(updatedHistory);
      } catch (historyError) {
        console.error(
          "History refresh error:",
          historyError
        );

        setHistoryError(
          historyError instanceof Error
            ? historyError.message
            : "Unable to refresh audit history."
        );
      } finally {
        setHistoryLoading(false);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Calculate dashboard statistics from database history
  const totalAudits = auditHistory.length;

  const uniqueWebsites = new Set(
    auditHistory.map((audit) => audit.domain)
  ).size;

  const averageScore =
    totalAudits > 0
      ? Math.round(
          auditHistory.reduce(
            (total, audit) => total + audit.score,
            0
          ) / totalAudits
        )
      : null;

  const totalIssues = auditHistory.reduce(
    (total, audit) => total + audit.findingsCount,
    0
  );

  return (
    <main className="min-w-0 flex-1">
      {/* Top navigation */}
      <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
        <div>
          <p className="text-sm text-slate-500">
            Workspace / Overview
          </p>

          <h2 className="text-xl font-bold text-slate-900">
            Dashboard
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Audit engine available
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
            A
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8">
        {/* Welcome */}
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-violet-600">
              YOUR WEBSITE INTELLIGENCE CENTER
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Welcome to StorePilot AI
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Understand your website. Discover opportunities. Grow smarter.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
            <Clock3 className="mr-2 inline" size={14} />
            Your workspace
          </div>
        </section>

        {/* Audit form */}
        <section
          id="overview"
          className="relative overflow-hidden rounded-2xl bg-[#171c32] p-6 text-white shadow-xl shadow-slate-200 sm:p-9"
        >
          <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />

          <div className="relative max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 text-xs font-medium text-violet-200">
              <Sparkles size={14} />
              AI-powered website intelligence
            </div>

            <h2 className="text-2xl font-bold sm:text-3xl">
              Discover what&apos;s holding your website back.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Enter your website URL to prepare an audit of its SEO,
              technical health, content structure and accessibility.
            </p>

            <form
              onSubmit={handleAuditSubmit}
              className="mt-7 flex flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <Globe
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={19}
                />

                <Input
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setMessage("");
                    setAuditResult(null);
                  }}
                  placeholder="https://yourwebsite.com"
                  className="h-12 border-white/10 bg-white pl-11 text-slate-900 placeholder:text-slate-400"
                  aria-label="Website URL"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 bg-violet-600 px-6 text-white hover:bg-violet-500"
              >
                {loading ? "Auditing website..." : "Start Audit"}

                {!loading && (
                  <ArrowRight className="ml-2" size={17} />
                )}
              </Button>
            </form>

            {message && (
              <p
                role="status"
                className={`mt-3 text-sm ${
                  auditResult
                    ? "text-emerald-300"
                    : "text-red-300"
                }`}
              >
                {message}
              </p>
            )}

            <p className="mt-4 text-xs text-slate-400">
              Public websites only · No installation required
            </p>
          </div>
        </section>

        {/* Audit results */}
        {auditResult && (
          <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm text-slate-500">
                Audit completed for
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-900">
                {auditResult.websiteUrl}
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl bg-violet-50 p-5">
                <p className="text-sm text-violet-700">
                  Website Health Score
                </p>

                <p className="mt-2 text-4xl font-bold text-violet-900">
                  {auditResult.score}/100
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  Total Findings
                </p>

                <p className="mt-2 text-4xl font-bold text-slate-900">
                  {auditResult.summary.totalFindings}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-5">
                <p className="text-sm text-amber-700">
                  High Priority
                </p>

                <p className="mt-2 text-4xl font-bold text-amber-900">
                  {auditResult.summary.critical +
                    auditResult.summary.high}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-bold text-slate-900">
                Detected Issues
              </h3>

              {auditResult.findings.length === 0 ? (
                <p className="text-sm text-emerald-600">
                  No SEO issues were detected by the current rules.
                </p>
              ) : (
                <div className="space-y-3">
                  {auditResult.findings.map((finding, index) => (
                    <div
                      key={finding.id ?? `${finding.title}-${index}`}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-semibold text-slate-900">
                          {finding.title}
                        </h4>

                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium capitalize text-amber-700">
                          {finding.severity}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        {finding.description}
                      </p>

                      <p className="mt-2 text-sm text-violet-700">
                        Recommendation: {finding.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Statistics */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Audits",
              value: String(totalAudits),
              note: "Your audit activity",
              icon: Search,
              color: "bg-violet-100 text-violet-700",
            },
            {
              label: "Websites",
              value: String(uniqueWebsites),
              note: "Unique websites audited",
              icon: Globe,
              color: "bg-blue-100 text-blue-700",
            },
            {
              label: "Average Score",
              value:
                averageScore !== null
                  ? `${averageScore}/100`
                  : "—",
              note: "Across completed audits",
              icon: Activity,
              color: "bg-emerald-100 text-emerald-700",
            },
            {
              label: "Issues Found",
              value: String(totalIssues),
              note: "Detected opportunities",
              icon: AlertTriangle,
              color: "bg-amber-100 text-amber-700",
            },
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </span>

                  <div className={`rounded-lg p-2 ${stat.color}`}>
                    <Icon size={19} />
                  </div>
                </div>

                <p className="mt-4 text-3xl font-bold text-slate-900">
                  {historyLoading ? "..." : stat.value}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {stat.note}
                </p>
              </div>
            );
          })}
        </section>

        {/* Recent audits */}
        <section
          id="audits"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h3 className="font-bold text-slate-900">
                Recent audits
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Your latest website inspection activity
              </p>
            </div>

            <a
              href="#audits"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              View all
              <ArrowUpRight className="ml-1" size={15} />
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Website</th>
                  <th className="px-5 py-4 font-medium">Audit type</th>
                  <th className="px-5 py-4 font-medium">Date</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Score</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {historyLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-sm text-slate-400"
                    >
                      Loading your audit history...
                    </td>
                  </tr>
                ) : historyError ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-sm text-red-500"
                    >
                      {historyError}
                    </td>
                  </tr>
                ) : auditHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-sm text-slate-400"
                    >
                      No audits yet. Submit a website URL to get started.
                    </td>
                  </tr>
                ) : (
                  auditHistory.slice(0, 5).map((audit) => (
                    <tr
                      key={audit.id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                        {audit.domain}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        {audit.type}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        {audit.date}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            audit.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700"
                              : audit.status === "Failed"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {audit.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-bold text-slate-800">
                        {audit.score}/100
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Product note */}
        <section className="flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/70 p-4">
          <div className="rounded-lg bg-white p-2 text-violet-600 shadow-sm">
            <ShieldCheck size={20} />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              Your website intelligence journey starts here.
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Your audit statistics and recent activity are securely
              saved and synchronized with your account.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
