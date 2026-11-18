/** Live site. Used whenever no non-local URL is configured. */
export const PRODUCTION_SITE_URL = "https://joinreviveai.com";

function isLocalUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "localhost" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("127.") ||
      hostname.endsWith(".local")
    );
  } catch {
    return true; // malformed values are never safe to put in a link
  }
}

/**
 * Public base URL for links that leave the app — emails, Supabase auth
 * redirects, third-party callbacks. Never returns a localhost URL, so links
 * sent while running locally (or with a dev .env) still open the live site.
 *
 * Override with PUBLIC_SITE_URL (e.g. a staging domain) if needed.
 */
export function getPublicSiteUrl(): string {
  const candidates = [
    process.env.PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && !isLocalUrl(value)) return value.replace(/\/+$/, "");
  }
  return PRODUCTION_SITE_URL;
}
