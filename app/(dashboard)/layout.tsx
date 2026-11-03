
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { createClient } from "@/lib/supabase/server";
import { GuestAuditMigration } from "@/components/audit/guest-audit-migration";

async function AuthenticatedDashboard({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fc] lg:flex-row">
          <GuestAuditMigration />
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f7f8fc]">
          <p className="text-sm text-slate-500">
            Loading your workspace...
          </p>
        </div>
      }
    >
      <AuthenticatedDashboard>{children}</AuthenticatedDashboard>
    </Suspense>
  );
}
