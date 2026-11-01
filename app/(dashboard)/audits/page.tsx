
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Search,
  ClipboardList,
  Globe,
  CheckCircle2,
  Clock3,
  XCircle,
  RefreshCw,
  FileSearch,
  Filter,
  AlertCircle,
  Trash2,
} from "lucide-react";

type Audit = {
  id: string;
  website_url: string;
  score: number | null;
  status: "pending" | "running" | "completed" | "failed";
  total_findings: number;
  created_at: string;
};

type StatusFilter = "all" | Audit["status"];

function getStatusStyle(status: Audit["status"]) {
  switch (status) {
    case "completed":
      return {
        label: "Completed",
        className: "bg-emerald-50 text-emerald-700",
        icon: CheckCircle2,
      };
    case "running":
      return {
        label: "Running",
        className: "bg-blue-50 text-blue-700",
        icon: RefreshCw,
      };
    case "pending":
      return {
        label: "Pending",
        className: "bg-amber-50 text-amber-700",
        icon: Clock3,
      };
    default:
      return {
        label: "Failed",
        className: "bg-red-50 text-red-700",
        icon: XCircle,
      };
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function AuditHistoryPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadAudits = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/audit/history", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load audit history.");
      }

      setAudits(result.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading audits."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchInitialAudits() {
      try {
        const response = await fetch("/api/audit/history", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load audit history.");
        }

        if (!cancelled) {
          setAudits(result.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong while loading audits."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchInitialAudits();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteAudit = async (audit: Audit) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the audit for ${getDomain(
        audit.website_url
      )}?\n\nAll findings associated with this audit will also be deleted. This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(audit.id);
      setError("");

      const response = await fetch(`/api/audit/${audit.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to delete this audit.");
      }

      setAudits((currentAudits) =>
        currentAudits.filter((item) => item.id !== audit.id)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting the audit."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAudits = useMemo(() => {
    return audits.filter((audit) => {
      const matchesSearch = getDomain(audit.website_url)
        .toLowerCase()
        .includes(search.toLowerCase().trim());

      const matchesStatus =
        statusFilter === "all" || audit.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [audits, search, statusFilter]);

  const completedCount = audits.filter(
    (audit) => audit.status === "completed"
  ).length;

  const failedCount = audits.filter(
    (audit) => audit.status === "failed"
  ).length;

  const totalIssues = audits.reduce(
    (total, audit) => total + (audit.total_findings || 0),
    0
  );

  return (
    <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-violet-600"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <ClipboardList size={19} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-violet-600">
                  StorePilot AI
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Audit History
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Review and manage your previous website audits.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"
            >
              <Globe size={17} />
              New Website Audit
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="Total Audits"
            value={audits.length}
            icon={ClipboardList}
            color="violet"
          />
          <StatCard
            label="Completed"
            value={completedCount}
            icon={CheckCircle2}
            color="emerald"
          />
          <StatCard
            label="Issues Found"
            value={totalIssues}
            icon={AlertCircle}
            color="amber"
          />
          <StatCard
            label="Failed Audits"
            value={failedCount}
            icon={XCircle}
            color="red"
          />
        </div>

        {/* Main Content */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Search and Filters */}
          <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                All Website Audits
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {filteredAudits.length} of {audits.length} records
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1 sm:w-64">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search website..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div className="relative">
                <Filter
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as StatusFilter)
                  }
                  className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 text-sm text-slate-700 outline-none transition focus:border-violet-400 sm:w-40"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="running">Running</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <button
                type="button"
                onClick={loadAudits}
                disabled={loading || deletingId !== null}
                aria-label="Refresh audit history"
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                <span className="sm:hidden">Refresh</span>
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && audits.length === 0 && (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3">
              <RefreshCw className="animate-spin text-violet-600" size={27} />
              <p className="text-sm text-slate-500">
                Loading your audit history...
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex flex-col items-center justify-center gap-3 px-5 py-8 text-center">
              <AlertCircle size={30} className="text-red-500" />
              <p className="text-sm font-medium text-slate-800">{error}</p>
              <button
                type="button"
                onClick={loadAudits}
                disabled={loading || deletingId !== null}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && audits.length === 0 && (
            <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <FileSearch size={30} />
              </div>

              <h3 className="text-lg font-semibold text-slate-900">
                No audits yet
              </h3>

              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Your website audit reports will appear here once you run your first audit.
              </p>

              <Link
                href="/"
                className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                Run Your First Audit
              </Link>
            </div>
          )}

          {/* No Search Results */}
          {!loading &&
            !error &&
            audits.length > 0 &&
            filteredAudits.length === 0 && (
              <div className="px-5 py-16 text-center">
                <Search size={28} className="mx-auto text-slate-300" />
                <h3 className="mt-3 font-semibold text-slate-900">
                  No matching audits
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Try another website name or status filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  className="mt-4 text-sm font-semibold text-violet-600 hover:text-violet-700"
                >
                  Clear filters
                </button>
              </div>
            )}

          {/* Desktop Table */}
          {!loading && !error && filteredAudits.length > 0 && (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Website
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Score
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Issues
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Date
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredAudits.map((audit) => {
                      const status = getStatusStyle(audit.status);
                      const StatusIcon = status.icon;

                      return (
                        <tr
                          key={audit.id}
                          className="transition hover:bg-slate-50/80"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                                <Globe size={19} />
                              </div>
                              <div className="min-w-0">
                                <p className="max-w-xs truncate text-sm font-semibold text-slate-800">
                                  {getDomain(audit.website_url)}
                                </p>
                                <p className="max-w-xs truncate text-xs text-slate-400">
                                  {audit.website_url}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-slate-800">
                              {audit.score !== null
                                ? `${audit.score}/100`
                                : "—"}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-sm text-slate-600">
                            {audit.total_findings}
                          </td>

                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                              <StatusIcon size={13} />
                              {status.label}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                            {formatDate(audit.created_at)}
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/audits/${audit.id}`}
                                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                              >
                                View Report
                                <ArrowUpRight size={14} />
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleDeleteAudit(audit)}
                                disabled={deletingId !== null}
                                aria-label={`Delete audit for ${getDomain(audit.website_url)}`}
                                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingId === audit.id ? (
                                  <RefreshCw
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                                {deletingId === audit.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="space-y-3 p-4 md:hidden">
                {filteredAudits.map((audit) => {
                  const status = getStatusStyle(audit.status);
                  const StatusIcon = status.icon;

                  return (
                    <div
                      key={audit.id}
                      className="rounded-xl border border-slate-200 p-4 transition hover:border-violet-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                            <Globe size={19} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {getDomain(audit.website_url)}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {audit.website_url}
                            </p>
                          </div>
                        </div>

                        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${status.className}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 border-y border-slate-100 py-3">
                        <div>
                          <p className="text-xs text-slate-400">Score</p>
                          <p className="mt-1 text-sm font-bold text-slate-800">
                            {audit.score !== null
                              ? `${audit.score}/100`
                              : "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">Issues</p>
                          <p className="mt-1 text-sm font-bold text-slate-800">
                            {audit.total_findings}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">Date</p>
                          <p className="mt-1 text-xs font-semibold text-slate-700">
                            {new Date(audit.created_at).toLocaleDateString(
                              "en-US",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/audits/${audit.id}`}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-50 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                      >
                        View Full Report
                        <ArrowUpRight size={16} />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteAudit(audit)}
                        disabled={deletingId !== null}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === audit.id ? (
                          <RefreshCw
                            size={15}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={15} />
                        )}
                        {deletingId === audit.id
                          ? "Deleting..."
                          : "Delete Audit"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer */}
          {!loading && !error && audits.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4">
              <p className="text-center text-xs text-slate-500">
                Showing {filteredAudits.length} of {audits.length} audits
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: "violet" | "emerald" | "amber" | "red";
}) {
  const styles = {
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">
          {label}
        </p>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles[color]}`}>
          <Icon size={18} />
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {value.toLocaleString()}
      </p>
    </div>
  );
}
