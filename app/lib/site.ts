// One place decides what this deployment tells the outside world about itself.
// Nothing here falls back to a hardcoded marketing domain: a private,
// account-gated space has no public origin, and therefore asks not to be
// indexed. Set NEXT_PUBLIC_SITE_ORIGIN (e.g. https://example.com) at build time
// only for a deployment that really is public.

/** A usable origin, or "" when the value is missing, relative or malformed. */
export function publicOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(raw) ? raw : "";
}

export function isPublicSeo(): boolean {
  return publicOrigin() !== "";
}
