
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const GUEST_AUDIT_KEY = "storepilot_guest_audit";

type GuestAuditStorage = {
  version: number;
    savedAt?: string;
  data?: {
    websiteUrl?: string;
  };
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function migrateGuestAudit() {
    try {
      const savedAudit = localStorage.getItem(GUEST_AUDIT_KEY);

      if (!savedAudit) return;

      const parsed: GuestAuditStorage = JSON.parse(savedAudit);

      if (
        parsed.version !== 1 ||
          typeof parsed.savedAt !== "string" ||
           !parsed.savedAt.trim() ||
        typeof parsed.data?.websiteUrl !== "string" ||
        !parsed.data.websiteUrl.trim()
      ) {
        console.warn("Guest audit data is invalid. Keeping local copy.");
        return;
      }

      const response = await fetch("/api/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: parsed.data.websiteUrl,
            idempotencyKey: `guest-audit-v1:${parsed.savedAt}`,
        }),
      });

      if (!response.ok) {
        console.warn("Guest audit migration failed. Local copy preserved.");
        return;
      }

      const result = await response.json();

      if (result.success) {
        localStorage.removeItem(GUEST_AUDIT_KEY);
        console.info("Guest audit migrated successfully.");
      }
    } catch (migrationError) {
      console.warn("Guest audit migration error:", migrationError);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      await migrateGuestAudit();

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            StorePilot<span className="text-indigo-600"> AI</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Welcome back. Sign in to your workspace.
          </p>
        </div>

        <h2 className="mb-6 text-xl font-semibold text-slate-900">
          Sign in to your account
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
