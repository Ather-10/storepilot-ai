
import Link from "next/link";
import {
  LayoutDashboard,
  Globe,
  ClipboardList,
  Settings,
  LifeBuoy,
  Sparkles,
  ChevronDown,
} from "lucide-react";

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
        <button className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-left">
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

        <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-800/70 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
            A
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">My Account</p>
            <p className="truncate text-xs text-slate-500">
              Free workspace
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
