
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import ipaddr from "ipaddr.js";
import { Agent, fetch as undiciFetch } from "undici";

import { validateWebsiteUrl } from "./url-validator";

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_SIZE = 2 * 1024 * 1024;
const REQUEST_TIMEOUT = 10_000;

export interface WebsiteFetchResult {
  success: boolean;
  url?: string;
  html?: string;
  statusCode?: number;
  error?: string;
}

interface PinnedAddress {
  address: string;
  family: 4 | 6;
}

function isPublicIP(ip: string): boolean {
  try {
    const parsed = ipaddr.parse(ip);

    // Only globally routable unicast addresses are allowed.
    // This rejects private, loopback, link-local, multicast,
    // reserved, mapped and other special-purpose ranges.
    return parsed.range() === "unicast";
  } catch {
    return false;
  }
}

async function resolvePublicHostname(
  hostname: string
): Promise<PinnedAddress[] | null> {
  try {
    // Literal IPs are not accepted as website hostnames.
    if (isIP(hostname)) {
      return null;
    }

    const addresses = await lookup(hostname, {
      all: true,
      verbatim: true,
    });

    if (addresses.length === 0) {
      return null;
    }

    const publicAddresses: PinnedAddress[] = [];

    for (const address of addresses) {
      if (!isPublicIP(address.address)) {
        // Reject the entire hostname if even one result is unsafe.
        return null;
      }

      publicAddresses.push({
        address: address.address,
        family: address.family as 4 | 6,
      });
    }

    return publicAddresses;
  } catch {
    return null;
  }
}

function createPinnedAgent(
  hostname: string,
  addresses: PinnedAddress[]
): Agent {
 type PinnedLookup = NonNullable<
  import("node:net").TcpSocketConnectOpts["lookup"]
>;

const pinnedLookup: PinnedLookup = (
  requestedHostname,
  options,
  callback
) => {
    // Never allow the connector to resolve a different hostname.
    if (
      requestedHostname.toLowerCase() !== hostname.toLowerCase()
    ) {
      callback(
  Object.assign(new Error("Unexpected hostname in DNS lookup."), {
    code: "EHOSTUNREACH",
  }),
  "",
  0
);
      return;
    }

    const matchingAddresses = addresses.filter((address) => {
      return !options.family || options.family === address.family;
    });

    if (matchingAddresses.length === 0) {
callback(
  Object.assign(new Error("No validated IP address is available."), {
    code: "EHOSTUNREACH",
  }),
  "",
  0
);      return;
    }

    if ("all" in options && options.all) {
      callback(null, matchingAddresses);
      return;
    }

    const selected = matchingAddresses[0];

    callback(
      null,
      selected.address,
      selected.family
    );
  };

  return new Agent({
    connect: {
      lookup: pinnedLookup,
    },
    connections: 1,
    pipelining: 0,
  });
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

      // Resolve and validate DNS immediately before connecting.
      const addresses = await resolvePublicHostname(hostname);

      if (!addresses) {
        return {
          success: false,
          error:
            "This website resolves to an unsafe or unavailable IP address.",
        };
      }

      // Pin the connection to the exact IP addresses we validated.
      const dispatcher = createPinnedAgent(hostname, addresses);

      try {
        const response = await undiciFetch(currentUrl, {
          method: "GET",
          dispatcher,
          redirect: "manual",
          signal: AbortSignal.timeout(REQUEST_TIMEOUT),
          headers: {
            "User-Agent": "StorePilotAI-AuditBot/1.0",
            Accept: "text/html,application/xhtml+xml",
          },
        });

        // Validate every redirect separately.
        if ([301, 302, 303, 307, 308].includes(response.status)) {
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

          let redirectUrl: URL;

          try {
            redirectUrl = new URL(location, currentUrl);
          } catch {
            return {
              success: false,
              error: "The website returned an invalid redirect.",
            };
          }

          const redirectValidation = validateWebsiteUrl(
            redirectUrl.toString()
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

        const contentLengthHeader =
          response.headers.get("content-length");

        if (contentLengthHeader !== null) {
          const contentLength = Number(contentLengthHeader);

          if (
            !Number.isFinite(contentLength) ||
            contentLength < 0 ||
            contentLength > MAX_RESPONSE_SIZE
          ) {
            return {
              success: false,
              error: "Website HTML exceeds the 2 MB size limit.",
            };
          }
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

            if (done) {
              break;
            }

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
      } finally {
        // Close the per-request dispatcher so no stale connection
        // or DNS result can be reused for another hostname.
        await dispatcher.destroy().catch(() => {});
      }
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.name === "TimeoutError" ||
        error.name === "AbortError"
      )
    ) {
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
