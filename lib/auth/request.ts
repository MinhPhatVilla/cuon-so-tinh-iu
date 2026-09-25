import type { NextRequest } from "next/server";

export function isSameOriginPost(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin && !fetchSite) return false;
  if (origin && origin !== new URL(request.url).origin) return false;
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;
  return true;
}

export function safeNext(value: string | null | undefined) {
  return value === "/join" ? "/join" : "/welcome";
}

export function normalizedEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
