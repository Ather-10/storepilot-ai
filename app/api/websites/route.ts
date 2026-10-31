
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to view your websites." },
        { status: 401 }
      );
    }

    const view = request.nextUrl.searchParams.get("view");

    const archivedOnly = view === "archived";

    let websiteQuery = supabase
      .from("websites")
      .select("id, domain, website_url, created_at, archived_at")
      .eq("user_id", user.id);

    websiteQuery = archivedOnly
      ? websiteQuery.not("archived_at", "is", null)
      : websiteQuery.is("archived_at", null);

    const { data: websites, error: websiteError } =
      await websiteQuery.order("created_at", { ascending: false });

    if (websiteError) {
      console.error("Website list error:", websiteError);

      return NextResponse.json(
        { error: "Unable to load your websites." },
        { status: 500 }
      );
    }

    const websiteIds = (websites ?? []).map((website) => website.id);

    if (websiteIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const { data: audits, error: auditError } = await supabase
      .from("audits")
      .select(
        "id, website_id, website_url, score, status, total_findings, created_at"
      )
      .eq("user_id", user.id)
      .in("website_id", websiteIds)
      .order("created_at", { ascending: false });

    if (auditError) {
      console.error("Website audits error:", auditError);

      return NextResponse.json(
        { error: "Unable to load website audit data." },
        { status: 500 }
      );
    }

    const result = (websites ?? []).map((website) => {
      const websiteAudits = (audits ?? []).filter(
        (audit) => audit.website_id === website.id
      );

      const completedScores = websiteAudits
        .filter(
          (audit) =>
            audit.status === "completed" && audit.score !== null
        )
        .map((audit) => audit.score as number);

      const averageScore =
        completedScores.length > 0
          ? Math.round(
              completedScores.reduce((sum, score) => sum + score, 0) /
                completedScores.length
            )
          : null;

      return {
        ...website,
        totalAudits: websiteAudits.length,
        latestAudit: websiteAudits[0] ?? null,
        averageScore,
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Websites API Error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
