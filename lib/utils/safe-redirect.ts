/**
 * Only allow same-origin relative paths as post-login redirect targets,
 * preventing open redirects like `?next=//evil.com` or `?next=https://…`.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.startsWith("/login") || next.startsWith("/auth")) return fallback;
  return next;
}
