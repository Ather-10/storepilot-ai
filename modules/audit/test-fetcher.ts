import { fetchWebsite } from "./services/website-fetcher";
import { parseWebsiteHtml } from "./services/html-parser";
import { runSeoRules } from "./rules/seo-rules";
import { calculateAuditScore } from "./services/audit-scoring";

async function main() {
  const result = await fetchWebsite("https://www.wikipedia.org");

  if (!result.success || !result.html || !result.url) {
    console.error("FETCH FAILED:", result.error);
    return;
  }

        const parsed = parseWebsiteHtml(
        result.html,
        result.url
  );

 const findings = runSeoRules(parsed);

 const auditScore = calculateAuditScore(findings);

console.log("\nSTOREPILOT AI — WEBSITE HEALTH SCORE");
console.log("--------------------------------");
console.log("Score:", auditScore.score, "/ 100");
console.log("Total Findings:", auditScore.summary.totalFindings);
console.log("Critical:", auditScore.summary.critical);
console.log("High:", auditScore.summary.high);
console.log("Medium:", auditScore.summary.medium);
console.log("Low:", auditScore.summary.low);
console.log("Info:", auditScore.summary.info);

console.log("\nSTOREPILOT AI — SEO FINDINGS");
console.log("--------------------------------");

console.log("Total findings:", findings.length);

for (const finding of findings) {
  console.log(`\n[${finding.severity.toUpperCase()}] ${finding.title}`);
  console.log("Description:", finding.description);
  console.log("Recommendation:", finding.recommendation);
  console.log("Evidence:", finding.evidence.detectedValue);
}

  console.log("\nSTOREPILOT AI — PARSED WEBSITE");
  console.log("--------------------------------");
  console.log("URL:", parsed.pageUrl);
  console.log("Title:", parsed.title);
  console.log("Meta Description:", parsed.metaDescription);
  console.log("Canonical:", parsed.canonicalUrl);

  console.log("\nHEADINGS");
  console.log("H1:", parsed.headings.h1);
  console.log("H2:", parsed.headings.h2);
  console.log("H3:", parsed.headings.h3);

  console.log("\nIMAGES:", parsed.images.length);
  console.log("INTERNAL LINKS:", parsed.links.internal.length);
  console.log("EXTERNAL LINKS:", parsed.links.external.length);

  console.log("\nFULL PARSED DATA:");
  console.dir(parsed, { depth: null });
}

main();