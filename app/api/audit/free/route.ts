
import { NextRequest, NextResponse } from "next/server";

import { validateWebsiteUrl } from "@/modules/audit/services/url-validator";
import { fetchWebsite } from "@/modules/audit/services/website-fetcher";
import { parseWebsiteHtml } from "@/modules/audit/services/html-parser";
import { runSeoRules } from "@/modules/audit/rules/seo-rules";
import { calculateAuditScore } from "@/modules/audit/services/audit-scoring";


const RATE_LIMIT_WINDOW = 10 * 60 * 1000;
const MAX_REQUESTS = 5;

const rateLimitStore = new Map<
  string,
  { count: number; resetAt: number }
>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return (
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const current = rateLimitStore.get(ip);

  if (!current || now >= current.resetAt) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    });

    return true;
  }

  if (current.count >= MAX_REQUESTS) {
    return false;
  }

  current.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Basic request validation
    const contentLength = Number(
      request.headers.get("content-length") || 0
    );

    if (contentLength > 5_000) {
      return NextResponse.json(
        { error: "Request body is too large." },
        { status: 413 }
      );
    }

    // 2. Rate limiting
    const clientIp = getClientIp(request);

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error:
            "Free audit limit reached. Please try again in 10 minutes.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(RATE_LIMIT_WINDOW / 1000),
          },
        }
      );
    }

    // 3. Read request body
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
      typeof body.url !== "string" ||
      body.url.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Please provide a valid website URL." },
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
          error:
            fetchResult.error || "Unable to fetch website.",
        },
        { status: 422 }
      );
    }

    // 6. Parse website HTML
    const parsedWebsite = parseWebsiteHtml(
      fetchResult.html,
      fetchResult.url
    );

    // 7. Run SEO checks
    const findings = runSeoRules(parsedWebsite);

    // 8. Calculate score
    const auditScore = calculateAuditScore(findings);

    // 9. Return report without saving anything to Supabase
    const websiteUrl = new URL(parsedWebsite.pageUrl);

    const domain = websiteUrl.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    return NextResponse.json(
      {
        success: true,
        data: {
          websiteDomain: domain,
          websiteUrl: parsedWebsite.pageUrl,
          score: auditScore.score,
          summary: auditScore.summary,
          findings,
          parsedData: parsedWebsite,
          isFreeAudit: true,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Free Audit API Error:", error);

    return NextResponse.json(
      {
        error: "An unexpected error occurred during the free audit.",
      },
      { status: 500 }
    );
  }
}
