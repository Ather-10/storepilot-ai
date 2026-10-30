import { isIP } from "node:net";

export type UrlValidationResult =
  | {
      valid: true;
      url: URL;
    }
  | {
      valid: false;
      error: string;
    };

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
]);

export function validateWebsiteUrl(
  input: string
): UrlValidationResult {
  const value = input.trim();

  if (!value) {
    return {
      valid: false,
      error: "Please enter a website URL.",
    };
  }

  let url: URL;

  try {
    url = new URL(
      /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value)
        ? value
        : `https://${value}`
    );
  } catch {
    return {
      valid: false,
      error: "Please enter a valid website URL.",
    };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return {
      valid: false,
      error: "Only HTTP and HTTPS websites are supported.",
    };
  }

  if (url.username || url.password) {
    return {
      valid: false,
      error: "URLs containing login credentials are not allowed.",
    };
  }

  const hostname = url.hostname
    .toLowerCase()
    .replace(/\.$/, "");

  if (!hostname || BLOCKED_HOSTNAMES.has(hostname)) {
    return {
      valid: false,
      error: "This hostname is not allowed.",
    };
  }

  if (
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return {
      valid: false,
      error: "Local and internal hostnames are not allowed.",
    };
  }

  if (isIP(hostname)) {
    return {
      valid: false,
      error: "Direct IP addresses are not supported. Enter a website domain.",
    };
  }

  if (url.port && !["80", "443"].includes(url.port)) {
    return {
      valid: false,
      error: "Only standard HTTP and HTTPS ports are supported.",
    };
  }

  return {
    valid: true,
    url,
  };
}