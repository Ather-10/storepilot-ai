import type { AuditFinding } from "../audit.types";
import type { ParsedWebsite } from "../services/html-parser";

export function runSeoRules(
  website: ParsedWebsite
): AuditFinding[] {
  const findings: AuditFinding[] = [];

  // Rule 1: Missing page title
  if (!website.title) {
    findings.push({
      id: "missing-title",
      category: "seo",
      severity: "high",
      title: "Missing page title",
      description: "This page does not have an HTML title tag.",
      recommendation:
        "Add a unique and descriptive title tag to this page.",
      evidence: {
        pageUrl: website.pageUrl,
        detectedValue: null,
        expectedValue: "A descriptive page title",
      },
    });
  }

  // Rule 2: Missing meta description
  if (!website.metaDescription) {
    findings.push({
      id: "missing-meta-description",
      category: "seo",
      severity: "medium",
      title: "Missing meta description",
      description: "This page does not have a meta description.",
      recommendation:
        "Add a concise description that accurately summarizes the page.",
      evidence: {
        pageUrl: website.pageUrl,
        detectedValue: null,
        expectedValue: "A relevant meta description",
      },
    });
  }

  // Rule 3: Missing H1
  if (website.headings.h1.length === 0) {
    findings.push({
      id: "missing-h1",
      category: "content",
      severity: "high",
      title: "Missing H1 heading",
      description: "No H1 heading was found on this page.",
      recommendation:
        "Add a clear H1 heading that describes the main page topic.",
      evidence: {
        pageUrl: website.pageUrl,
        detectedValue: "0 H1 headings",
        expectedValue: "At least one meaningful H1",
      },
    });
  }

  // Rule 4: Multiple H1 headings
  if (website.headings.h1.length > 1) {
    findings.push({
      id: "multiple-h1",
      category: "content",
      severity: "low",
      title: "Multiple H1 headings",
      description:
        "More than one H1 heading was detected on this page.",
      recommendation:
        "Review the heading structure and ensure the main page topic is clear.",
      evidence: {
        pageUrl: website.pageUrl,
        detectedValue: `${website.headings.h1.length} H1 headings`,
        expectedValue: "A clear heading hierarchy",
      },
    });
  }

  // Rule 5: Images missing alt attributes
  const imagesWithoutAlt = website.images.filter(
    (image) => image.alt === null
  );

  if (imagesWithoutAlt.length > 0) {
    findings.push({
      id: "images-missing-alt",
      category: "accessibility",
      severity: "medium",
      title: "Images missing alt text",
      description:
        `${imagesWithoutAlt.length} images do not have alt text.`,
      recommendation:
        "Add meaningful alt text to informative images. Use empty alt text for decorative images.",
      evidence: {
        pageUrl: website.pageUrl,
        detectedValue: `${imagesWithoutAlt.length} images without alt text`,
        expectedValue: "Appropriate alt attributes",
        details: {
          affectedImages: imagesWithoutAlt.map((image) => image.src),
        },
      },
    });
  }

  // Rule 6: Missing canonical URL
  if (!website.canonicalUrl) {
    findings.push({
      id: "missing-canonical",
      category: "technical",
      severity: "low",
      title: "Missing canonical URL",
      description:
        "No canonical link was found in the page HTML.",
      recommendation:
        "Consider adding a canonical URL to identify the preferred page version.",
      evidence: {
        pageUrl: website.pageUrl,
        detectedValue: null,
        expectedValue: "A valid canonical URL",
      },
    });
  }

  // Rule 7: Empty headings
  const emptyHeadings = [
    ...website.headings.h1,
    ...website.headings.h2,
    ...website.headings.h3,
  ].filter((heading) => !heading.trim());

  if (emptyHeadings.length > 0) {
    findings.push({
      id: "empty-headings",
      category: "content",
      severity: "low",
      title: "Empty headings detected",
      description:
        `${emptyHeadings.length} heading elements contain no text.`,
      recommendation:
        "Add meaningful text to headings or remove empty heading elements.",
      evidence: {
        pageUrl: website.pageUrl,
        detectedValue: `${emptyHeadings.length} empty headings`,
        expectedValue: "Meaningful heading text",
      },
    });
  }

  return findings;
}