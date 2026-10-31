
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Overview } from "@/components/dashboard/overview";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-[#f7f8fc]">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <Overview />
    </div>
  );
}
