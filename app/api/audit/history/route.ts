
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";

export async function GET() {
  try {
    await connection();
    // 1. Authenticate user
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to view your audit history." },
        { status: 401 }
      );
    }

    // 2. Fetch only this user's audits
    const { data: audits, error: auditError } = await supabase
      .from("audits")
      .select(
        "id, website_url, score, status, total_findings, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (auditError) {
      console.error("Audit history database error:", auditError);

      return NextResponse.json(
        { error: "Unable to load audit history." },
        { status: 500 }
      );
    }

    // 3. Return history
    return NextResponse.json({
      success: true,
      data: audits ?? [],
    });
  }  catch (error) {
  unstable_rethrow(error);

  console.error("Audit History API Error:", error);

  return NextResponse.json(
    { error: "An unexpected error occurred." },
    { status: 500 }
  );
  }
}
