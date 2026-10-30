import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { validateWebsiteUrl } from "./url-validator";

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_SIZE = 2 * 1024 * 1024; // 2 MB
const REQUEST_TIMEOUT = 10_000; // 10 seconds

export interface WebsiteFetchResult {
  success: boolean;
  url?: string;
  html?: string;
  statusCode?: number;
  error?: string;
}

function isPublicIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);

  if (parts.length !== 4 || parts.some(
    (part) => !Number.isInteger(part) || part < 0 || part > 255
  )) {
    return false;
  }

  const [a, b] = parts;

  if (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0)
  ) {
    return false;
  }

  return true;
}

function isPublicIP(ip: string): boolean {
  const version = isIP(ip);

  if (version === 4) {
    return isPublicIPv4(ip);
  }

  if (version === 6) {
    const normalized = ip.toLowerCase();

    // Allow only global unicast IPv6 addresses.
    return (
      /^2[0-9a-f]{3}:/i.test(normalized) ||
      /^3[0-9a-f]{3}:/i.test(normalized)
    ) && !normalized.startsWith("2001:db8:");
  }

  return false;
}

async function validatePublicHostname(
  hostname: string
): Promise<boolean> {
  try {
    const addresses = await lookup(hostname, {
      all: true,
      verbatim: true,
    });

    if (addresses.length === 0) {
      return false;
    }

    // Reject the hostname if any resolved address is non-public.
    return addresses.every((address) =>
      isPublicIP(address.address)
    );
  } catch {
    return false;
  }
}

export async function fetchWebsite(
  input: string
): Promise<WebsiteFetchResult> {
  const validation = validateWebsiteUrl(input);

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  let currentUrl = validation.url;

  try {
    for (let redirectCount = 0; ; redirectCount++) {
      const hostname = currentUrl.hostname;

      const isSafe = await validatePublicHostname(hostname);

      if (!isSafe) {
        return {
          success: false,
          error: "This website resolves to an unsafe or unavailable IP address.",
        };
      }

      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        headers: {
          "User-Agent": "StorePilotAI-AuditBot/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      // Handle redirects manually so every destination is validated.
      if (
        [301, 302, 303, 307, 308].includes(response.status)
      ) {
        const location = response.headers.get("location");

        if (!location) {
          return {
            success: false,
            error: "The website returned an invalid redirect.",
          };
        }

        if (redirectCount >= MAX_REDIRECTS) {
          return {
            success: false,
            error: "Too many redirects.",
          };
        }

        currentUrl = new URL(location, currentUrl);

        const redirectValidation = validateWebsiteUrl(
          currentUrl.toString()
        );

        if (!redirectValidation.valid) {
          return {
            success: false,
            error: redirectValidation.error,
          };
        }

        currentUrl = redirectValidation.url;

        continue;
      }

      if (!response.ok) {
        return {
          success: false,
          statusCode: response.status,
          error: `Website returned HTTP ${response.status}.`,
        };
      }

      const contentType =
        response.headers.get("content-type")?.toLowerCase() ?? "";

      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml+xml")
      ) {
        return {
          success: false,
          error: "The URL does not return an HTML page.",
        };
      }

      const contentLength = Number(
        response.headers.get("content-length") ?? 0
      );

      if (
        contentLength > MAX_RESPONSE_SIZE
      ) {
        return {
          success: false,
          error: "Website HTML exceeds the 2 MB size limit.",
        };
      }

      if (!response.body) {
        return {
          success: false,
          error: "The website returned an empty response.",
        };
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalSize = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          totalSize += value.byteLength;

          if (totalSize > MAX_RESPONSE_SIZE) {
            await reader.cancel();

            return {
              success: false,
              error: "Website HTML exceeds the 2 MB size limit.",
            };
          }

          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      const html = new TextDecoder("utf-8").decode(
        Buffer.concat(chunks)
      );

      return {
        success: true,
        url: currentUrl.toString(),
        html,
        statusCode: response.status,
      };
    }
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        success: false,
        error: "Website request timed out.",
      };
    }

    return {
      success: false,
      error: "Unable to retrieve this website. Please try again.",
    };
  }
}