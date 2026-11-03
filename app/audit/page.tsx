
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Finding = {
  category: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  evidence?: {
  pageUrl?: string;
  detectedValue?: unknown;
  expectedValue?: unknown;
} | string | null;
};

type AuditResult = {
  websiteDomain: string;
  websiteUrl: string;
  score: number;
  summary: {
    totalFindings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  findings: Finding[];
  isFreeAudit: boolean;
};

const severityStyles: Record<string, string> = {
  critical: "border-red-500/20 bg-red-500/10 text-red-400",
  high: "border-orange-500/20 bg-orange-500/10 text-orange-400",
  medium: "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
  low: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  info: "border-slate-500/20 bg-slate-500/10 text-slate-400",
};

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export default function AuditPage() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function runAudit() {
      const params = new URLSearchParams(window.location.search);
      const url = params.get("url");

      if (!url) {
        setError("Please provide a website URL to run an SEO audit.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/audit/free", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to complete the SEO audit.");
        }

       if (!cancelled) {
  const auditData = data.data as AuditResult;

  // Save guest audit locally in the browser
  try {
    localStorage.setItem(
      "storepilot_guest_audit",
      JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        data: auditData,
      })
    );
  } catch (storageError) {
    console.warn("Unable to save guest audit locally:", storageError);
  }

  setResult(auditData);
}
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    runAudit();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#080d1b] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href="/" className="text-xl font-bold">
            StorePilot<span className="text-blue-400"> AI</span>
          </Link>

          <Link
            href="/signup"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-blue-500"
          >
            Create Free Account
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
            Website SEO Analysis
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Your SEO Audit Report
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Discover issues and opportunities to improve your website.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-20 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />
            <h2 className="mt-6 text-lg font-semibold">
              Analyzing your website...
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Checking your websites SEO health. This may take a moment.
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <h2 className="text-xl font-semibold text-red-400">
              Audit could not be completed
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
              {error}
            </p>
            <Link
              href="/#free-audit"
              className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
            >
              Try Again
            </Link>
          </div>
        )}

        {!loading && result && (
          <>
            <section className="grid gap-5 lg:grid-cols-[1fr_2fr]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
                <p className="text-sm text-slate-400">Overall SEO Score</p>

                <div className="mt-5 flex items-center gap-5">
                  <div
                    className={`text-6xl font-bold tracking-tight ${getScoreColor(result.score)}`}
                  >
                    {result.score}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Out of 100
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {result.score >= 80
                        ? "Good SEO health"
                        : result.score >= 60
                          ? "Needs improvement"
                          : "Significant improvements needed"}
                    </p>
                  </div>
                </div>

                <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${
                      result.score >= 80
                        ? "bg-emerald-400"
                        : result.score >= 60
                          ? "bg-yellow-400"
                          : "bg-red-400"
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(100, result.score))}%`,
                    }}
                  />
                </div>

                <p className="mt-5 break-all text-sm text-slate-400">
                  {result.websiteUrl}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7">
                <p className="text-sm text-slate-400">Audit Overview</p>

                <h2 className="mt-2 text-3xl font-bold">
                  {result.summary.totalFindings}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Total SEO findings identified
                </p>

                <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-5">
                  {[
                    { label: "Critical", value: result.summary.critical, color: "text-red-400" },
                    { label: "High", value: result.summary.high, color: "text-orange-400" },
                    { label: "Medium", value: result.summary.medium, color: "text-yellow-400" },
                    { label: "Low", value: result.summary.low, color: "text-blue-400" },
                    { label: "Info", value: result.summary.info, color: "text-slate-400" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-white/10 bg-[#0c1426] p-4"
                    >
                      <p className={`text-2xl font-bold ${item.color}`}>
                        {item.value}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-10">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">SEO Findings</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Issues and recommendations identified during the audit.
                  </p>
                </div>
                <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-medium text-blue-300">
                  Free Audit
                </span>
              </div>

              {result.findings.length === 0 ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
                  <h3 className="text-lg font-semibold text-emerald-400">
                    No SEO findings detected
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Your website passed the checks performed by this audit.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {result.findings.map((finding, index) => (
                    <article
                      key={`${finding.title}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            severityStyles[finding.severity.toLowerCase()] ||
                            severityStyles.info
                          }`}
                        >
                          {finding.severity}
                        </span>
                        <span className="text-xs text-slate-500">
                          {finding.category}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-semibold">
                        {finding.title}
                      </h3>

                      <p className="mt-3 text-sm leading-7 text-slate-400">
                        {finding.description}
                      </p>

                     {finding.evidence && (
  <div className="mt-4 rounded-lg bg-black/20 p-4">
    <p className="text-xs font-semibold text-slate-500">
      Evidence
    </p>

    {typeof finding.evidence === "object" ? (
      <div className="mt-3 space-y-2 text-sm">
        {finding.evidence.pageUrl && (
          <p className="break-all text-slate-300">
            <span className="text-slate-500">Page URL: </span>
            {finding.evidence.pageUrl}
          </p>
        )}

        {finding.evidence.detectedValue !== undefined && (
          <p className="break-words text-slate-300">
            <span className="text-slate-500">Detected: </span>
            {String(finding.evidence.detectedValue)}
          </p>
        )}

        {finding.evidence.expectedValue !== undefined && (
          <p className="break-words text-slate-300">
            <span className="text-slate-500">Expected: </span>
            {String(finding.evidence.expectedValue)}
          </p>
        )}
      </div>
    ) : (
      <p className="mt-2 break-words text-sm text-slate-300">
        {finding.evidence}
      </p>
    )}
  </div>
)}

                      <div className="mt-5 border-t border-white/10 pt-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                          Recommendation
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-300">
                          {finding.recommendation}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-12 rounded-2xl border border-blue-400/20 bg-gradient-to-r from-blue-600/20 to-cyan-500/10 p-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                Take Your SEO Further
              </p>
              <h2 className="mt-3 text-2xl font-bold">
                Ready for deeper website insights?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
                Create your free account to manage websites and save your audit
                history in one organized workspace.
              </p>
              <Link
                href="/signup"
                className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold hover:bg-blue-500"
              >
                Create Your Free Account →
              </Link>
            </section>
          </>
        )}
      </div>

      <footer className="border-t border-white/10 px-5 py-7 text-center text-xs text-slate-500">
        © 2026 StorePilot AI. All rights reserved.
      </footer>
    </main>
  );
}
