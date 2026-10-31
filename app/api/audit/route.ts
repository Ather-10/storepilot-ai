
import { NextRequest, NextResponse } from "next/server";

import { validateWebsiteUrl } from "@/modules/audit/services/url-validator";
import { fetchWebsite } from "@/modules/audit/services/website-fetcher";
import { parseWebsiteHtml } from "@/modules/audit/services/html-parser";
import { runSeoRules } from "@/modules/audit/rules/seo-rules";
import { calculateAuditScore } from "@/modules/audit/services/audit-scoring";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let savedAuditId: string | null = null;

  try {
    // 1. Authenticate the current user
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to perform a website audit." },
        { status: 401 }
      );
    }

    // 2. Read and validate request body
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
      !("url" in body) ||
      typeof body.url !== "string"
    ) {
      return NextResponse.json(
        { error: "Please provide a valid website URL." },
        { status: 400 }
      );
    }

    // 3. Validate URL
    const validation = validateWebsiteUrl(body.url);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 4. Fetch website
    const fetchResult = await fetchWebsite(
      validation.url.toString()
    );

    if (
      !fetchResult.success ||
      !fetchResult.html ||
      !fetchResult.url
    ) {
      return NextResponse.json(
        {
          error: fetchResult.error || "Unable to fetch website.",
        },
        { status: 422 }
      );
    }

    // 5. Parse HTML
    const parsedWebsite = parseWebsiteHtml(
      fetchResult.html,
      fetchResult.url
    );

    // 6. Run SEO rules
    const findings = runSeoRules(parsedWebsite);

    // 7. Calculate audit score
    const auditScore = calculateAuditScore(findings);

    // 8. Save audit with authenticated user's ID
    const { data: savedAudit, error: auditError } =
      await supabase
        .from("audits")
        .insert({
          user_id: user.id,
          website_url: parsedWebsite.pageUrl,
          score: auditScore.score,
          status: "completed",
          total_findings: auditScore.summary.totalFindings,
          critical: auditScore.summary.critical,
          high: auditScore.summary.high,
          medium: auditScore.summary.medium,
          low: auditScore.summary.low,
          info: auditScore.summary.info,
        })
        .select("id")
        .single();

    if (auditError || !savedAudit) {
      console.error("Audit database error:", auditError);

      return NextResponse.json(
        { error: "Unable to save audit to the database." },
        { status: 500 }
      );
    }

    savedAuditId = savedAudit.id;

    // 9. Save findings linked to the audit
    if (findings.length > 0) {
      const findingsToInsert = findings.map((finding) => ({
        audit_id: savedAuditId,
        category: finding.category,
        severity: finding.severity,
        title: finding.title,
        description: finding.description,
        recommendation: finding.recommendation,
        evidence: finding.evidence,
      }));

      const { error: findingsError } = await supabase
        .from("audit_findings")
        .insert(findingsToInsert);

      if (findingsError) {
        console.error("Findings database error:", findingsError);

        // Remove the audit if its findings could not be saved.
        const { error: cleanupError } = await supabase
          .from("audits")
          .delete()
          .eq("id", savedAuditId);

        if (cleanupError) {
          console.error("Audit cleanup error:", cleanupError);
        }

        return NextResponse.json(
          { error: "Unable to save audit findings." },
          { status: 500 }
        );
      }
    }

    // 10. Return completed audit
    return NextResponse.json({
      success: true,
      data: {
        auditId: savedAuditId,
        websiteUrl: parsedWebsite.pageUrl,
        score: auditScore.score,
        summary: auditScore.summary,
        findings,
        parsedData: parsedWebsite,
      },
    });
  } catch (error) {
    console.error("Audit API Error:", error);

    return NextResponse.json(
      {
        error: "An unexpected error occurred during the audit.",
      },
      { status: 500 }
    );
  }
}
