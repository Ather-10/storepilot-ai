
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Globe,
  Search,
  RefreshCw,
  ExternalLink,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Plus,
  CalendarDays,
  FileSearch,
  Archive,
  Trash2,
  X,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";

type Audit = {
  id: string;
  website_url: string;
  score: number | null;
  status: "pending" | "running" | "completed" | "failed";
  total_findings: number;
  created_at: string;
};

type Website = {
  id: string;
  domain: string;
  website_url: string;
  archived_at: string | null;
  totalAudits: number;
  latestAudit: Audit | null;
  averageScore: number | null;
};

type WebsiteAction = "archive" | "delete" | "restore";
type WebsiteView = "active" | "archived";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getScoreColor(score: number | null) {
  if (score === null) return "text-slate-400";
  if (score >= 90) return "text-emerald-600";
  if (score >= 70) return "text-amber-600";
  return "text-red-600";
}

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [archivedWebsites, setArchivedWebsites] = useState<Website[]>([]);
  const [view, setView] = useState<WebsiteView>("active");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [pendingAction, setPendingAction] = useState<WebsiteAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const loadWebsites = useCallback(async () => {
    try {
     setError("")

      const [activeResponse, archivedResponse] = await Promise.all([
        fetch("/api/websites", { cache: "no-store" }),
        fetch("/api/websites?view=archived", { cache: "no-store" }),
      ]);

      const [activeResult, archivedResult] = await Promise.all([
        activeResponse.json(),
        archivedResponse.json(),
      ]);

      if (!activeResponse.ok) {
        throw new Error(activeResult.error || "Unable to load websites.");
      }

      if (!archivedResponse.ok) {
        throw new Error(
          archivedResult.error || "Unable to load archived websites."
        );
      }

      setWebsites(activeResult.data ?? []);
      setArchivedWebsites(archivedResult.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

   useEffect(() => {
  let ignore = false;

  async function fetchWebsites() {
    const [activeResponse, archivedResponse] = await Promise.all([
      fetch("/api/websites", { cache: "no-store" }),
      fetch("/api/websites?view=archived", { cache: "no-store" }),
    ]);

    const [activeResult, archivedResult] = await Promise.all([
      activeResponse.json(),
      archivedResponse.json(),
    ]);

    if (!activeResponse.ok) {
      throw new Error(activeResult.error || "Unable to load websites.");
    }

    if (!archivedResponse.ok) {
      throw new Error(
        archivedResult.error || "Unable to load archived websites."
      );
    }

    return {
      activeWebsites: activeResult.data ?? [],
      archivedWebsites: archivedResult.data ?? [],
    };
  }

  fetchWebsites()
    .then((result) => {
      if (ignore) return;

      setWebsites(result.activeWebsites);
      setArchivedWebsites(result.archivedWebsites);
    })
    .catch((err) => {
      if (ignore) return;

      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    })
    .finally(() => {
      if (!ignore) {
        setLoading(false);
      }
    });

  return () => {
    ignore = true;
  };
}, []);

  const currentWebsites =
    view === "active" ? websites : archivedWebsites;

  const filteredWebsites = useMemo(
    () =>
      currentWebsites.filter((website) =>
        website.domain.toLowerCase().includes(search.toLowerCase().trim())
      ),
    [currentWebsites, search]
  );

  const completedWebsites = websites.filter(
    (website) => website.latestAudit?.status === "completed"
  ).length;

  const scoredWebsites = websites.filter(
    (website) => website.averageScore !== null
  );

  const averageScore =
    scoredWebsites.length > 0
      ? Math.round(
          scoredWebsites.reduce(
            (sum, website) => sum + (website.averageScore ?? 0),
            0
          ) / scoredWebsites.length
        )
      : null;

  function openManageModal(website: Website) {
    setSelectedWebsite(website);
    setPendingAction(null);
    setActionError("");
  }

  function closeModal() {
    if (actionLoading) return;

    setSelectedWebsite(null);
    setPendingAction(null);
    setActionError("");
  }

  async function confirmAction() {
    if (!selectedWebsite || !pendingAction) return;

    setActionLoading(true);
    setActionError("");

    try {
      const response =
        pendingAction === "delete"
          ? await fetch(`/api/websites/${selectedWebsite.id}`, {
              method: "DELETE",
            })
          : await fetch(`/api/websites/${selectedWebsite.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ action: pendingAction }),
            });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to complete this action."
        );
      }

      setSelectedWebsite(null);
      setPendingAction(null);

      await loadWebsites();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setActionLoading(false);
    }
  }

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
                  <Globe size={19} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-violet-600">
                  StorePilot AI
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                My Websites
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Manage and monitor the websites you have audited.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"
            >
              <Plus size={17} />
              Audit New Website
            </Link>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-3">
          <StatCard
            label="Active Websites"
            value={websites.length.toString()}
            icon={Globe}
            color="violet"
          />

          <StatCard
            label="Recently Completed"
            value={completedWebsites.toString()}
            icon={CheckCircle2}
            color="emerald"
          />

          <StatCard
            label="Average Website Score"
            value={averageScore !== null ? `${averageScore}/100` : "—"}
            icon={ClipboardList}
            color="blue"
          />
        </div>

        {/* Website List */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Your Websites
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Manage your active and archived websites.
                </p>
              </div>

              <div className="relative sm:w-72">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search websites..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setView("active");
                  setSearch("");
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  view === "active"
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Globe size={15} />
                Active
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {websites.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setView("archived");
                  setSearch("");
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  view === "archived"
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Archive size={15} />
                Archived
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">
                  {archivedWebsites.length}
                </span>
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3">
              <RefreshCw className="animate-spin text-violet-600" size={27} />
              <p className="text-sm text-slate-500">
                Loading your websites...
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <AlertCircle size={30} className="text-red-500" />
              <p className="mt-3 text-sm font-medium text-slate-800">
                {error}
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  void loadWebsites();
                }}
                className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && currentWebsites.length === 0 && (
            <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                {view === "active" ? (
                  <FileSearch size={30} />
                ) : (
                  <Archive size={30} />
                )}
              </div>

              <h3 className="text-lg font-semibold text-slate-900">
                {view === "active"
                  ? "No active websites"
                  : "No archived websites"}
              </h3>

              <p className="mt-2 max-w-sm text-sm text-slate-500">
                {view === "active"
                  ? "Websites will automatically appear here when you run your first audit."
                  : "Websites you archive will appear here. You can restore them whenever you need."}
              </p>

              {view === "active" && (
                <Link
                  href="/"
                  className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
                >
                  Audit Your First Website
                </Link>
              )}
            </div>
          )}

          {/* Search Empty State */}
          {!loading &&
            !error &&
            currentWebsites.length > 0 &&
            filteredWebsites.length === 0 && (
              <div className="px-5 py-16 text-center">
                <Search size={28} className="mx-auto text-slate-300" />
                <h3 className="mt-3 font-semibold text-slate-900">
                  No websites found
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Try searching with another domain name.
                </p>
              </div>
            )}

          {/* Website Cards */}
          {!loading && !error && filteredWebsites.length > 0 && (
            <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-2">
              {filteredWebsites.map((website) => {
                const audit = website.latestAudit;
                const completed = audit?.status === "completed";

                return (
                  <article
                    key={website.id}
                    className="rounded-2xl border border-slate-200 p-4 transition hover:border-violet-200 hover:shadow-md sm:p-5"
                  >
                    {/* Website identity */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                          <Globe size={23} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold text-slate-900">
                            {website.domain}
                          </h3>

                          <a
                            href={website.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-slate-400 transition hover:text-violet-600"
                          >
                            Visit website
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          view === "archived"
                            ? "bg-slate-100 text-slate-600"
                            : completed
                              ? "bg-emerald-50 text-emerald-700"
                              : audit?.status === "failed"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {view === "archived"
                          ? "Archived"
                          : audit
                            ? audit.status.charAt(0).toUpperCase() +
                              audit.status.slice(1)
                            : "No audits"}
                      </span>
                    </div>

                    {/* Metrics */}
                    <div className="my-5 grid grid-cols-3 gap-2 border-y border-slate-100 py-4">
                      <div>
                        <p className="text-xs text-slate-400">Latest Score</p>
                        <p
                          className={`mt-1 text-xl font-bold ${getScoreColor(
                            completed ? audit?.score ?? null : null
                          )}`}
                        >
                          {completed && audit?.score !== null
                            ? `${audit.score}/100`
                            : "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Total Audits</p>
                        <p className="mt-1 text-xl font-bold text-slate-900">
                          {website.totalAudits}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Average Score</p>
                        <p className="mt-1 text-xl font-bold text-slate-900">
                          {website.averageScore !== null
                            ? website.averageScore
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Last Audit */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <CalendarDays size={14} />
                      {audit
                        ? `Last audited: ${formatDate(audit.created_at)}`
                        : "No audit history"}
                    </div>

                    {view === "archived" && website.archived_at && (
                      <p className="mt-2 text-xs text-slate-400">
                        Archived on: {formatDate(website.archived_at)}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                      {completed && audit ? (
                        <Link
                          href={`/audits/${audit.id}`}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                        >
                          View Latest Report
                          <ArrowUpRight size={15} />
                        </Link>
                      ) : (
                        <Link
                          href="/audits"
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                        >
                          View Audit History
                          <ArrowUpRight size={15} />
                        </Link>
                      )}

                      {view === "active" && (
                        <Link
                          href="/"
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                        >
                          <RefreshCw size={15} />
                          Run New Audit
                        </Link>
                      )}
                    </div>

                    {/* Manage / Restore */}
                    {view === "active" ? (
                      <button
                        type="button"
                        onClick={() => openManageModal(website)}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50"
                      >
                        <Archive size={15} />
                        Manage Website
                      </button>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWebsite(website);
                            setPendingAction("restore");
                            setActionError("");
                          }}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                        >
                          <RotateCcw size={15} />
                          Restore
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWebsite(website);
                            setPendingAction("delete");
                            setActionError("");
                          }}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-100 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {!loading && !error && currentWebsites.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4">
              <p className="text-center text-xs text-slate-500">
                Showing {filteredWebsites.length} of {currentWebsites.length}{" "}
                {view === "active" ? "active" : "archived"} websites
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Manage Website Modal */}
      {selectedWebsite && !pendingAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Globe size={21} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Manage Website
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedWebsite.domain}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setPendingAction("archive")}
                className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-violet-300 hover:bg-violet-50/50"
              >
                <div className="rounded-lg bg-violet-100 p-2 text-violet-600">
                  <Archive size={19} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Archive Website
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Hide this website from your active list. All audit reports
                    and findings will be preserved.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPendingAction("delete")}
                className="flex w-full items-start gap-3 rounded-xl border border-red-100 p-4 text-left transition hover:border-red-300 hover:bg-red-50"
              >
                <div className="rounded-lg bg-red-100 p-2 text-red-600">
                  <Trash2 size={19} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    Permanently Delete
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Permanently delete this website and all its associated
                    audit reports and findings. This cannot be undone.
                  </p>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={closeModal}
              className="mt-5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedWebsite && pendingAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
                pendingAction === "delete"
                  ? "bg-red-100 text-red-600"
                  : pendingAction === "restore"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-violet-100 text-violet-600"
              }`}
            >
              {pendingAction === "delete" ? (
                <ShieldAlert size={23} />
              ) : pendingAction === "restore" ? (
                <RotateCcw size={23} />
              ) : (
                <Archive size={23} />
              )}
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              {pendingAction === "delete"
                ? "Permanently delete website?"
                : pendingAction === "restore"
                  ? "Restore this website?"
                  : "Archive this website?"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {pendingAction === "delete" ? (
                <>
                  You are about to permanently delete{" "}
                  <strong className="text-slate-800">
                    {selectedWebsite.domain}
                  </strong>{" "}
                  and its {selectedWebsite.totalAudits} audit record(s),
                  including their findings. This action cannot be undone.
                </>
              ) : pendingAction === "restore" ? (
                <>
                  <strong className="text-slate-800">
                    {selectedWebsite.domain}
                  </strong>{" "}
                  will be moved back to your active websites. Its audit
                  reports and findings will remain available.
                </>
              ) : (
                <>
                  <strong className="text-slate-800">
                    {selectedWebsite.domain}
                  </strong>{" "}
                  will be hidden from your active websites. Its{" "}
                  {selectedWebsite.totalAudits} audit record(s) will remain
                  preserved and can be accessed again if the website is
                  restored.
                </>
              )}
            </p>

            {actionError && (
              <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {actionError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setPendingAction(null);
                  setActionError("");
                }}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Back
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void confirmAction()}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  pendingAction === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : pendingAction === "restore"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-violet-600 hover:bg-violet-700"
                }`}
              >
                {actionLoading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Processing...
                  </>
                ) : pendingAction === "delete" ? (
                  <>
                    <Trash2 size={15} />
                    Delete Permanently
                  </>
                ) : pendingAction === "restore" ? (
                  <>
                    <RotateCcw size={15} />
                    Restore Website
                  </>
                ) : (
                  <>
                    <Archive size={15} />
                    Archive Website
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
  value: string;
  icon: React.ElementType;
  color: "violet" | "emerald" | "blue";
}) {
  const styles = {
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">
          {label}
        </p>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles[color]}`}
        >
          <Icon size={18} />
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </p>
    </div>
  );
}
