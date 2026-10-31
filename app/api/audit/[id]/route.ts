
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Validate audit ID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid audit ID." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to view this audit." },
        { status: 401 }
      );
    }

    // Fetch audit owned by the authenticated user
    const { data: audit, error: auditError } = await supabase
      .from("audits")
      .select(`
        id,
        website_url,
        score,
        status,
        total_findings,
        critical,
        high,
        medium,
        low,
        info,
        created_at
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (auditError) {
      console.error("Audit details database error:", auditError);

      return NextResponse.json(
        { error: "Unable to load audit details." },
        { status: 500 }
      );
    }

    if (!audit) {
      return NextResponse.json(
        { error: "Audit not found." },
        { status: 404 }
      );
    }

    // Fetch findings belonging to this audit
    const { data: findings, error: findingsError } = await supabase
      .from("audit_findings")
      .select(`
        id,
        category,
        severity,
        title,
        description,
        recommendation,
        evidence,
        created_at
      `)
      .eq("audit_id", id)
      .order("created_at", { ascending: true });

    if (findingsError) {
      console.error("Audit findings database error:", findingsError);

      return NextResponse.json(
        { error: "Unable to load audit findings." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        audit,
        findings: findings ?? [],
      },
    });
  } catch (error) {
    console.error("Audit Details API Error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
