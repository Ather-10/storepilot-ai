
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Overview } from "@/components/dashboard/overview";
import { createClient } from "@/lib/supabase/server";
import { connection } from "next/server";

function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8fc]">
      <p className="text-sm text-slate-500">
        Loading your workspace...
      </p>
    </div>
  );
}

async function AuthenticatedDashboard() {
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
      <Sidebar />
      <Overview />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <AuthenticatedDashboard />
    </Suspense>
  );
}
