import { load } from "cheerio";

export interface ParsedWebsite {
  pageUrl: string;
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  images: {
    src: string;
    alt: string | null;
  }[];
  links: {
    internal: string[];
    external: string[];
  };
}

export function parseWebsiteHtml(
  html: string,
  pageUrl: string
): ParsedWebsite {
  const $ = load(html);
  const baseUrl = new URL(pageUrl);

const title =
  $("title").first().text().replace(/\s+/g, " ").trim() || null;
  
  const metaDescription =
    $('meta[name="description"]')
      .attr("content")
      ?.trim() || null;

  const canonicalHref =
    $('link[rel="canonical"]').attr("href") || null;

  let canonicalUrl: string | null = null;

  if (canonicalHref) {
    try {
      canonicalUrl = new URL(
        canonicalHref,
        baseUrl
      ).toString();
    } catch {
      canonicalUrl = null;
    }
  }

  const extractHeadings = (selector: string): string[] => {
  return $(selector)
    .map((_, element) =>
      $(element).text().replace(/\s+/g, " ").trim()
    )
    .get()
    .filter(Boolean);
};

  const images = $("img")
    .map((_, element) => {
      const image = $(element);
      const src = image.attr("src")?.trim();

      if (!src) return null;

      try {
        return {
          src: new URL(src, baseUrl).toString(),
          alt: image.attr("alt")?.trim() || null,
        };
      } catch {
        return null;
      }
    })
    .get()
    .filter(
      (image): image is { src: string; alt: string | null } =>
        image !== null
    );

  const internalLinks = new Set<string>();
  const externalLinks = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href")?.trim();

    if (
      !href ||
      href.startsWith("#") ||
      /^(mailto:|tel:|javascript:|data:)/i.test(href)
    ) {
      return;
    }

    try {
      const linkUrl = new URL(href, baseUrl);

      if (!["http:", "https:"].includes(linkUrl.protocol)) {
        return;
      }

      linkUrl.hash = "";

      if (linkUrl.origin === baseUrl.origin) {
        internalLinks.add(linkUrl.toString());
      } else {
        externalLinks.add(linkUrl.toString());
      }
    } catch {
      // Ignore malformed links.
    }
  });

  return {
    pageUrl: baseUrl.toString(),
    title,
    metaDescription,
    canonicalUrl,
    headings: {
      h1: extractHeadings("h1"),
      h2: extractHeadings("h2"),
      h3: extractHeadings("h3"),
    },
    images,
    links: {
      internal: [...internalLinks],
      external: [...externalLinks],
    },
  };
}