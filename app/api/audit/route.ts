
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

    // 3. Validate optional idempotency key
    const idempotencyKey =
      "idempotencyKey" in body
        ? body.idempotencyKey
        : undefined;

    if (
      idempotencyKey !== undefined &&
      (
        typeof idempotencyKey !== "string" ||
        !/^guest-audit-v1:\d{4}-\d{2}-\d{2}T/.test(idempotencyKey) ||
        idempotencyKey.length > 128
      )
    ) {
      return NextResponse.json(
        { error: "Invalid idempotency key." },
        { status: 400 }
      );
    }

    // 4. Validate URL
    const validation = validateWebsiteUrl(body.url);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 5. Fetch website
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

    // 6. Parse HTML
    const parsedWebsite = parseWebsiteHtml(
      fetchResult.html,
      fetchResult.url
    );

    // 7. Run SEO rules
    const findings = runSeoRules(parsedWebsite);

    // 8. Calculate audit score
    const auditScore = calculateAuditScore(findings);

    // 9. Identify website domain
    const websiteUrl = new URL(parsedWebsite.pageUrl);

    const domain = websiteUrl.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    // 10. Create or reactivate the user's website record
    const { error: websiteUpsertError } = await supabase
      .from("websites")
      .upsert(
        {
          user_id: user.id,
          domain,
          website_url: parsedWebsite.pageUrl,
          archived_at: null,
        },
        {
          onConflict: "user_id,domain",
          ignoreDuplicates: false,
        }
      );

    if (websiteUpsertError) {
      console.error(
        "Website registration error:",
        websiteUpsertError
      );

      return NextResponse.json(
        { error: "Unable to register this website." },
        { status: 500 }
      );
    }

    // 11. Fetch the existing or newly created website ID
    const { data: website, error: websiteFetchError } =
      await supabase
        .from("websites")
        .select("id")
        .eq("user_id", user.id)
        .eq("domain", domain)
        .single();

    if (websiteFetchError || !website) {
      console.error(
        "Website lookup error:",
        websiteFetchError
      );

      return NextResponse.json(
        { error: "Unable to find the registered website." },
        { status: 500 }
      );
    }

    // 12. Save audit and findings
    if (idempotencyKey) {
      // Guest migration: atomic database operation
      const { data: migrationResult, error: migrationError } =
        await supabase.rpc("save_audit_idempotently", {
          p_user_id: user.id,
          p_website_id: website.id,
          p_website_url: parsedWebsite.pageUrl,
          p_score: auditScore.score,
          p_total_findings: auditScore.summary.totalFindings,
          p_critical: auditScore.summary.critical,
          p_high: auditScore.summary.high,
          p_medium: auditScore.summary.medium,
          p_low: auditScore.summary.low,
          p_info: auditScore.summary.info,
          p_idempotency_key: idempotencyKey,
          p_findings: findings.map((finding) => ({
            category: finding.category,
            severity: finding.severity,
            title: finding.title,
            description: finding.description,
            recommendation: finding.recommendation,
            evidence: finding.evidence ?? null,
          })),
        });

      if (
        migrationError ||
        !migrationResult ||
        migrationResult.length === 0 ||
        !migrationResult[0].audit_id
      ) {
        console.error(
          "Guest migration save error:",
          migrationError
        );

        return NextResponse.json(
          { error: "Unable to save migrated audit." },
          { status: 500 }
        );
      }

      savedAuditId = migrationResult[0].audit_id;
    } else {
      // Normal authenticated audit: preserve existing behaviour
      const { data: savedAudit, error: auditError } =
        await supabase
          .from("audits")
          .insert({
            user_id: user.id,
            website_id: website.id,
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

      // Save findings linked to the audit
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
          console.error(
            "Findings database error:",
            findingsError
          );

          // Remove audit if findings could not be saved
          const { error: cleanupError } = await supabase
            .from("audits")
            .delete()
            .eq("id", savedAuditId)
            .eq("user_id", user.id);

          if (cleanupError) {
            console.error(
              "Audit cleanup error:",
              cleanupError
            );
          }

          return NextResponse.json(
            { error: "Unable to save audit findings." },
            { status: 500 }
          );
        }
      }
    }

    // 13. Return completed audit
    return NextResponse.json({
      success: true,
      data: {
        auditId: savedAuditId,
        websiteId: website.id,
        websiteDomain: domain,
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
