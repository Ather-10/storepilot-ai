
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  ClipboardList,
  Settings,
  LifeBuoy,
  Sparkles,
  ChevronDown,
  UserRound,
  LogOut,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const navigation = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "#overview", icon: LayoutDashboard },
      { label: "Websites", href: "#websites", icon: Globe },
      { label: "Audit History", href: "#audits", icon: ClipboardList },
    ],
  },
];

export function Sidebar() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (!error) {
        setUser(data.user);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    setLoggingOut(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout failed:", error.message);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  const fullName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "My Account";

  const initial = fullName.charAt(0).toUpperCase();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-[#101522] text-slate-300">
      {/* Brand */}
      <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white">
          <Sparkles size={21} />
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            StorePilot<span className="text-violet-400"> AI</span>
          </h1>
          <p className="text-[10px] tracking-[0.2em] text-slate-500">
            STORE INTELLIGENCE
          </p>
        </div>
      </div>

      {/* Workspace */}
      <div className="border-b border-slate-800 p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-left"
        >
          <div>
            <p className="text-xs text-slate-400">WORKSPACE</p>
            <p className="mt-1 text-sm font-semibold text-white">
              My Workspace
            </p>
          </div>
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-7 overflow-y-auto p-4">
        {navigation.map((group) => (
          <div key={group.title}>
            <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map((item, index) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      index === 0
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-950/30"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="space-y-1 border-t border-slate-800 p-4">
        <Link
          href="#settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <Settings size={18} />
          Settings
        </Link>

        <Link
          href="#support"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <LifeBuoy size={18} />
          Help & Support
        </Link>

        {/* Account Menu */}
        <div className="relative mt-4">
          <button
            type="button"
            onClick={() => setAccountOpen(!accountOpen)}
            className="flex w-full items-center gap-3 rounded-lg bg-slate-800/70 p-3 text-left transition hover:bg-slate-800"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {fullName}
              </p>
              <p className="truncate text-xs text-slate-500">
                {user?.email || "Free workspace"}
              </p>
            </div>

            <ChevronDown
              size={16}
              className={`shrink-0 transition-transform ${
                accountOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {accountOpen && (
            <div className="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-xl border border-slate-700 bg-[#1A2232] p-1 shadow-xl">
              <div className="border-b border-slate-700 px-3 py-3">
                <p className="text-xs text-slate-400">Signed in as</p>
                <p className="mt-1 truncate text-sm font-medium text-white">
                  {user?.email || "Loading account..."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  router.push("/#settings");
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                <UserRound size={16} />
                Account settings
              </button>

              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                {loggingOut ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <LogOut size={16} />
                )}

                {loggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
