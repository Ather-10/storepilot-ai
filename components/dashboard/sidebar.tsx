
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const navigation = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Websites", href: "/websites", icon: Globe },
      { label: "Audit History", href: "/audits", icon: ClipboardList },
    ],
  },
];

const bottomLinks = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help & Support", href: "/support", icon: LifeBuoy },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
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

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
  }, [pathname]);

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

  function isActive(href: string) {
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  function Brand() {
    return (
      <div className="flex items-center gap-3">
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
    );
  }

  function NavigationLinks() {
    return (
      <>
        {navigation.map((group) => (
          <div key={group.title}>
            <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              {group.title}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      active
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
      </>
    );
  }

  function AccountActions() {
    return (
      <>
        <div className="border-b border-slate-700 px-3 py-3">
          <p className="text-xs text-slate-400">Signed in as</p>
          <p className="mt-1 truncate text-sm font-medium text-white">
            {user?.email || "Loading account..."}
          </p>
        </div>

        <Link
          href="/settings"
          onClick={() => setAccountOpen(false)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <UserRound size={16} />
          Account settings
        </Link>

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
      </>
    );
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-[#101522] text-slate-300 lg:flex">
        <div className="flex h-20 items-center border-b border-slate-800 px-6">
          <Brand />
        </div>

        <div className="border-b border-slate-800 p-4">
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
            <p className="text-xs text-slate-400">WORKSPACE</p>
            <p className="mt-1 text-sm font-semibold text-white">
              My Workspace
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto p-4">
          <NavigationLinks />
        </nav>

        <div className="space-y-1 border-t border-slate-800 p-4">
          {bottomLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive(item.href)
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}

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
                <AccountActions />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={() => setDrawerOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100"
        >
          <Menu size={23} />
        </button>

        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white">
              <Sparkles size={17} />
            </div>
            <span className="whitespace-nowrap text-base font-bold tracking-tight text-slate-900">
              StorePilot<span className="text-violet-600"> AI</span>
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Open account menu"
            onClick={() => setAccountOpen(!accountOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-700 transition hover:bg-violet-200"
          >
            <UserRound size={20} />
          </button>

          {accountOpen && (
            <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-slate-200 bg-[#1A2232] p-1 shadow-xl">
              <AccountActions />
            </div>
          )}
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-[60] flex w-[280px] max-w-[85vw] flex-col border-r border-slate-800 bg-[#101522] text-slate-300 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!drawerOpen}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-800 px-5">
          <Brand />

          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setDrawerOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={21} />
          </button>
        </div>

        <div className="border-b border-slate-800 p-4">
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
            <p className="text-xs text-slate-400">WORKSPACE</p>
            <p className="mt-1 text-sm font-semibold text-white">
              My Workspace
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto p-4">
          <NavigationLinks />

          <div>
            <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              MORE
            </p>

            <div className="space-y-1">
              {bottomLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      isActive(item.href)
                        ? "bg-violet-600 text-white"
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
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-slate-800/70 p-3">
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
          </div>
        </div>
      </aside>
    </>
  );
}
