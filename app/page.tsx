
import { Sidebar } from "@/components/dashboard/sidebar";
import { Overview } from "@/components/dashboard/overview";

export default function Home() {
  return (
    <div className="flex min-h-screen bg-[#f7f8fc]">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <Overview />
    </div>
  );
}
