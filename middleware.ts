import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// All 54 African sovereign states (ISO 3166-1 alpha-2 codes)
const BLOCKED_AFRICAN_COUNTRIES = new Set([
  "DZ", // Algeria
  "AO", // Angola
  "BJ", // Benin
  "BW", // Botswana
  "BF", // Burkina Faso
  "BI", // Burundi
  "CV", // Cabo Verde
  "CM", // Cameroon
  "CF", // Central African Republic
  "TD", // Chad
  "KM", // Comoros
  "CG", // Congo (Republic of the)
  "CD", // Congo (Democratic Republic of the)
  "CI", // Côte d'Ivoire
  "DJ", // Djibouti
  "EG", // Egypt
  "GQ", // Equatorial Guinea
  "ER", // Eritrea
  "SZ", // Eswatini
  "ET", // Ethiopia
  "GA", // Gabon
  "GM", // Gambia
  "GH", // Ghana
  "GN", // Guinea
  "GW", // Guinea-Bissau
  "KE", // Kenya
  "LS", // Lesotho
  "LR", // Liberia
  "LY", // Libya
  "MG", // Madagascar
  "MW", // Malawi
  "ML", // Mali
  "MR", // Mauritania
  "MU", // Mauritius
  "MA", // Morocco
  "MZ", // Mozambique
  "NA", // Namibia
  "NE", // Niger
  "NG", // Nigeria
  "RW", // Rwanda
  "ST", // São Tomé and Príncipe
  "SN", // Senegal
  "SC", // Seychelles
  "SL", // Sierra Leone
  "SO", // Somalia
  "ZA", // South Africa
  "SS", // South Sudan
  "SD", // Sudan
  "TZ", // Tanzania
  "TG", // Togo
  "TN", // Tunisia
  "UG", // Uganda
  "ZM", // Zambia
  "ZW", // Zimbabwe
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // 1. Allow webhooks (e.g., Didit.me) to bypass geoblocking so server callbacks never fail
  if (
    pathname.startsWith("/api/webhooks") ||
    pathname === "/region-restricted"
  ) {
    return NextResponse.next();
  }

  // 2. Read ISO-2 country code injected by Vercel or Cloudflare at the edge
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    (request as NextRequest & { geo?: { country?: string } }).geo?.country;

  if (country && BLOCKED_AFRICAN_COUNTRIES.has(country.toUpperCase())) {
    const url = request.nextUrl.clone();
    url.pathname = "/region-restricted";
    return NextResponse.rewrite(url, { status: 403 });
  }

  // 3. Proceed with Supabase Auth session refresh
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images and static assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};