export { cn } from "cn";

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

export function formatPay(
  min?: number | null,
  max?: number | null,
  payUnit?: string | null,
  currency: string = "USD"
): string {
  const actualUnit = payUnit || "hour";
  const symbol = currency === "USD" ? "$" : currency + " ";
  const unit =
    actualUnit === "hour" || actualUnit === "hourly"
      ? "/hr"
      : actualUnit === "fixed"
      ? " fixed"
      : actualUnit === "month" || actualUnit === "monthly"
      ? "/mo"
      : `/${actualUnit}`;

  if (min != null && max != null) {
    if (Number(min) === Number(max)) {
      return `${symbol}${min}${unit}`;
    }
    return `${symbol}${min} – ${symbol}${max}${unit}`;
  } else if (min != null) {
    return `From ${symbol}${min}${unit}`;
  } else if (max != null) {
    return `Up to ${symbol}${max}${unit}`;
  }
  return "Competitive";
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCents(cents?: number | null, currency: string = "USD"): string {
  if (cents == null) return "$0.00";
  const amount = (cents / 100).toFixed(2);
  return currency === "USD" ? `$${amount}` : `${currency} ${amount}`;
}

export function maskDetails(type: string, details: Record<string, any>): string {
  if (!details) return "";
  if (type === "mpesa" && details.phone) {
    const p = String(details.phone);
    if (p.length > 7) {
      return `${p.slice(0, 5)}****${p.slice(-3)}`;
    }
    return p;
  }
  if ((type === "wise" || type === "payoneer") && details.email) {
    const email = String(details.email);
    const [name, domain] = email.split("@");
    if (!domain) return email;
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}*`;
    return `${maskedName}@${domain}`;
  }
  return JSON.stringify(details);
}

export function formatMinutes(mins?: number | null): string {
  if (mins == null || mins === 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
