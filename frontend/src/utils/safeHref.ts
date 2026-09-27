/**
 * Only allow http(s) links for user-supplied URLs (repo/demo links).
 * Anything else (e.g. `javascript:`) renders as a non-navigating link.
 */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url.trim()) ? url : undefined;
}
