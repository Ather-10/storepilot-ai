
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json(
        { error: "Invalid website ID." },
        { status: 400 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      !("action" in body) ||
      (body.action !== "archive" && body.action !== "restore")
    ) {
      return NextResponse.json(
        { error: "Choose a valid website action." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to manage websites." },
        { status: 401 }
      );
    }

    const archivedAt =
      body.action === "archive" ? new Date().toISOString() : null;

    const { data: website, error } = await supabase
      .from("websites")
      .update({ archived_at: archivedAt })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, domain, archived_at")
      .maybeSingle();

    if (error) {
      console.error("Website update error:", error);

      return NextResponse.json(
        { error: "Unable to update this website." },
        { status: 500 }
      );
    }

    if (!website) {
      return NextResponse.json(
        { error: "Website not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        body.action === "archive"
          ? "Website archived successfully."
          : "Website restored successfully.",
      data: website,
    });
  } catch (error) {
    console.error("Website action API Error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json(
        { error: "Invalid website ID." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to delete websites." },
        { status: 401 }
      );
    }

    const { data: website, error } = await supabase
      .from("websites")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, domain")
      .maybeSingle();

    if (error) {
      console.error("Permanent website deletion error:", error);

      return NextResponse.json(
        { error: "Unable to permanently delete this website." },
        { status: 500 }
      );
    }

    if (!website) {
      return NextResponse.json(
        { error: "Website not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Website and its associated audit data were permanently deleted.",
      data: website,
    });
  } catch (error) {
    console.error("Website deletion API Error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
