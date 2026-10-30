import { NextRequest, NextResponse } from "next/server";

import { validateWebsiteUrl } from "@/modules/audit/services/url-validator";
import { fetchWebsite } from "@/modules/audit/services/website-fetcher";
import { parseWebsiteHtml } from "@/modules/audit/services/html-parser";
import { runSeoRules } from "@/modules/audit/rules/seo-rules";
import { calculateAuditScore } from "@/modules/audit/services/audit-scoring";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { url } = body;

    if (typeof url !== "string") {
      return NextResponse.json(
        { error: "Please provide a valid website URL." },
        { status: 400 }
      );
    }

    // 1. Validate URL
    const validation = validateWebsiteUrl(url);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 2. Fetch website
    const fetchResult = await fetchWebsite(validation.url.toString());

    if (!fetchResult.success || !fetchResult.html || !fetchResult.url) {
      return NextResponse.json(
        { error: fetchResult.error || "Unable to fetch website." },
        { status: 422 }
      );
    }

    // 3. Parse HTML
    const parsedWebsite = parseWebsiteHtml(
      fetchResult.html,
      fetchResult.url
    );

    // 4. Run SEO rules
    const findings = runSeoRules(parsedWebsite);

    // 5. Calculate score
    const auditScore = calculateAuditScore(findings);

    // 6. Return audit result
    return NextResponse.json({
      success: true,
      data: {
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
      { error: "An unexpected error occurred during the audit." },
      { status: 500 }
    );
  }
}