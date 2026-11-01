
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  ArrowRight,
  ArrowUpRight,
  Globe,
  Activity,
  Search,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  FileSearch,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type {
  AuditFinding,
  AuditSummary,
} from "@/modules/audit/audit.types";

type AuditApiData = {
  auditId: string;
  websiteUrl: string;
  score: number;
  summary: AuditSummary;
  findings: AuditFinding[];
};

type AuditRecord = {
  id: string;
  domain: string;
  type: string;
  date: string;
  status: "Completed" | "Pending" | "Failed";
  score: number | null;
  findingsCount: number;
};

type AuditHistoryResponse = {
  id: string;
  website_url: string;
  score: number | null;
  status: string;
  total_findings: number;
  created_at: string;
};

export function Overview() {
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const [auditResult, setAuditResult] =
    useState<AuditApiData | null>(null);

  const [auditHistory, setAuditHistory] =
    useState<AuditRecord[]>([]);

  const loadAuditHistory = useCallback(async (): Promise<AuditRecord[]> => {
    const response = await fetch("/api/audit/history", {
      method: "GET",
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to load audit history.");
    }

    if (!Array.isArray(result.data)) {
      throw new Error("Invalid audit history response.");
    }

    return (result.data as AuditHistoryResponse[]).map((audit) => {
      let domain = audit.website_url;

      try {
        domain = new URL(audit.website_url).hostname;
      } catch {
        // Keep original URL.
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
        date: new Date(audit.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        status,
        score: audit.score,
        findingsCount: audit.total_findings,
      };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      try {
        const records = await loadAuditHistory();

        if (!cancelled) {
          setAuditHistory(records);
          setHistoryError("");
        }
      } catch (error) {
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

      setAuditResult(auditData);
      setUrl(auditData.websiteUrl);
      setMessage("Your website audit has been completed successfully.");

      setHistoryLoading(true);
      setHistoryError("");

      try {
        const updatedHistory = await loadAuditHistory();
        setAuditHistory(updatedHistory);
      } catch (error) {
        setHistoryError(
          error instanceof Error
            ? error.message
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

  const completedAudits = auditHistory.filter(
    (audit) => audit.status === "Completed"
  );

  const totalAudits = auditHistory.length;

  const uniqueWebsites = new Set(
    auditHistory.map((audit) => audit.domain)
  ).size;

  const averageScore =
    completedAudits.length > 0
      ? Math.round(
          completedAudits.reduce(
            (total, audit) => total + (audit.score ?? 0),
            0
          ) / completedAudits.length
        )
      : null;

  const totalIssues = auditHistory.reduce(
    (total, audit) => total + audit.findingsCount,
    0
  );

  const statistics = [
    {
      label: "Total Audits",
      value: String(totalAudits),
      description: "Website inspections completed",
      icon: Search,
      iconStyle: "bg-violet-50 text-violet-600",
    },
    {
      label: "Websites",
      value: String(uniqueWebsites),
      description: "Unique websites inspected",
      icon: Globe,
      iconStyle: "bg-blue-50 text-blue-600",
    },
    {
      label: "Average Score",
      value: averageScore !== null ? `${averageScore}/100` : "—",
      description: "Across completed audits",
      icon: Activity,
      iconStyle: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Issues Found",
      value: String(totalIssues),
      description: "Detected improvement opportunities",
      icon: AlertTriangle,
      iconStyle: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:space-y-8 sm:p-8">

        {/* Welcome */}
        <section>
          <p className="text-[10px] font-bold tracking-[0.16em] text-violet-600 sm:text-xs">
            WEBSITE INTELLIGENCE PLATFORM
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Welcome to StorePilot AI
          </h1>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
            Understand your website performance, uncover technical issues
            and discover opportunities to improve your online presence.
          </p>
        </section>

        {/* Audit form */}
        <section
          id="overview"
          className="relative overflow-hidden rounded-2xl bg-[#171c32] p-4 text-white shadow-xl shadow-slate-200 sm:p-9"
        >
          <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative max-w-2xl">

            {/* Compact badges - same row on mobile */}
            <div className="mb-4 flex flex-nowrap items-center gap-1.5 sm:mb-5 sm:gap-2">
              <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-1 text-[10px] font-medium text-violet-200 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs">
                <Sparkles size={12} />
                Website intelligence
              </div>

              <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Audit engine available
              </div>
            </div>

            <h2 className="text-xl font-bold sm:text-3xl">
              Discover what&apos;s holding your website back.
            </h2>

            <p className="mt-2 max-w-xl text-xs leading-5 text-slate-300 sm:mt-3 sm:text-sm sm:leading-6">
              Analyze your website&apos;s SEO, technical health, content
              structure and accessibility with a detailed website audit.
            </p>

            <form
              onSubmit={handleAuditSubmit}
              className="mt-4 flex flex-col gap-3 sm:mt-7 sm:flex-row"
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
                  className="h-11 border-white/10 bg-white pl-11 text-slate-900 placeholder:text-slate-400 sm:h-12"
                  aria-label="Website URL"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-11 bg-violet-600 px-6 text-white hover:bg-violet-500 sm:h-12"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 animate-spin" size={16} />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Start Audit
                    <ArrowRight className="ml-2" size={17} />
                  </>
                )}
              </Button>
            </form>

            {message && (
              <p
                role="status"
                className={`mt-3 text-sm ${
                  auditResult ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {message}
              </p>
            )}

            <p className="mt-3 text-[10px] text-slate-400 sm:mt-4 sm:text-xs">
              Public websites only · No installation required
            </p>
          </div>
        </section>

        {/* Latest audit result */}
        {auditResult && (
          <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50/70 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={21} />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    Audit completed successfully
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Your latest website analysis is ready.
                  </p>
                </div>
              </div>

              <Link
                href={`/audits/${auditResult.auditId}`}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                View full report
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Website
                </p>
                <p className="mt-1 break-all font-semibold text-slate-900">
                  {auditResult.websiteUrl}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Website score
                </p>
                <p className="mt-1 text-2xl font-bold text-violet-700">
                  {auditResult.score}/100
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Total findings
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {auditResult.summary.totalFindings}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Statistics */}
        <section>
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Workspace performance
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              An overview of your website audit activity.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {statistics.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">
                      {stat.label}
                    </span>

                    <div className={`rounded-lg p-2.5 ${stat.iconStyle}`}>
                      <Icon size={19} />
                    </div>
                  </div>

                  <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                    {historyLoading ? "..." : stat.value}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {stat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent audits */}
        <section
          id="audits"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 className="font-bold text-slate-900">
                Recent audits
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Access and review your latest website reports.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
              {historyLoading ? "Loading..." : `${totalAudits} audits`}
            </span>
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
                  <th className="px-5 py-4 text-right font-medium">Report</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {historyLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm text-slate-400"
                    >
                      <RefreshCw
                        className="mr-2 inline animate-spin"
                        size={15}
                      />
                      Loading your audit history...
                    </td>
                  </tr>
                ) : historyError ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-red-500"
                    >
                      {historyError}
                    </td>
                  </tr>
                ) : auditHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <FileSearch
                        className="mx-auto mb-3 text-slate-300"
                        size={30}
                      />
                      <p className="font-medium text-slate-700">
                        No audits yet
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Enter a website URL above to create your first audit.
                      </p>
                    </td>
                  </tr>
                ) : (
                  auditHistory.slice(0, 5).map((audit) => (
                    <tr
                      key={audit.id}
                      className="group cursor-pointer transition hover:bg-violet-50/40"
                      onClick={() => {
                        router.push(`/audits/${audit.id}`);
                      }}
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Globe size={17} />
                          </div>

                          <span className="font-semibold text-slate-800 group-hover:text-violet-700">
                            {audit.domain}
                          </span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        {audit.type}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        {audit.date}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
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

                      <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-800">
                        {audit.score !== null
                          ? `${audit.score}/100`
                          : "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <Link
                          href={`/audits/${audit.id}`}
                          aria-label={`View report for ${audit.domain}`}
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                        >
                          View
                          <ArrowUpRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!historyLoading &&
            !historyError &&
            auditHistory.length > 5 && (
              <div className="border-t border-slate-100 px-5 py-3 text-center">
                <p className="text-xs text-slate-400">
                  Showing the 5 most recent audits. Full audit history will
                  be available in a dedicated page.
                </p>
              </div>
            )}
        </section>

        {/* Footer information */}
        <section className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/60 p-4">
          <div className="rounded-lg bg-white p-2 text-violet-600 shadow-sm">
            <ShieldCheck size={19} />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              Your website intelligence, in one place.
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Your audit activity is securely associated with your account.
              Select any completed audit to review its detailed report.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
