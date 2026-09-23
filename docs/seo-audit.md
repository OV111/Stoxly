# SEO Audit — Stoxly

_Generated 2026-09-23. Read-only audit, no code changes in this stage._

## Router

**App Router** (Next.js 16.1.6, `app/*` with `layout.tsx`/`page.tsx` files, route groups). No `pages/` directory exists.

## Site type & context (from `Vision.md`)

SaaS web app — "a portfolio intelligence engine that explains what actually happened to your investments." Not deployed yet, no production URL. English only for now, other languages planned later (hreflang not needed yet, but metadata will be structured so it's easy to add).

## All routes

**Public / marketing (should be indexable):**
| Route | File |
|---|---|
| `/` | `app/page.tsx` (landing: Hero, Features, Summary, Footer) |

**Auth (should be `noindex`, not indexable but still crawlable-safe):**
| Route | File |
|---|---|
| `/sign-in` | `app/(auth)/sign-in/page.tsx` |
| `/sign-up` | `app/(auth)/sign-up/page.tsx` |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` |

**Protected app shell — everything under `(protected)` (must be `noindex, nofollow`):**
| Route | File |
|---|---|
| `/dashboard` | `app/(protected)/dashboard/page.tsx` |
| `/ai` | `app/(protected)/ai/page.tsx` |
| `/alerts` | `app/(protected)/alerts/page.tsx` |
| `/billing` | `app/(protected)/billing/page.tsx` |
| `/crypto` | `app/(protected)/crypto/page.tsx` |
| `/intelligence` | `app/(protected)/intelligence/page.tsx` |
| `/journal` | `app/(protected)/journal/page.tsx` |
| `/news` | `app/(protected)/news/page.tsx` |
| `/profile` | `app/(protected)/profile/page.tsx` |
| `/search` | `app/(protected)/search/page.tsx` |
| `/settings` | `app/(protected)/settings/page.tsx` |
| `/watchlist` | `app/(protected)/watchlist/page.tsx` |

**Special:**
| Route | File |
|---|---|
| 404 | `app/not-found.tsx` — exists, plain UI, no metadata |

Note: `CLAUDE.md` describes routes as `app/root/*` and `middleware.ts` — both stale. The actual repo uses `app/(protected)/*` and `proxy.ts`. Treating the live repo as source of truth throughout.

## What SEO already exists

- **Root metadata** (`app/layout.tsx`): static `title: "Stoxly"` and a generic `description`, applied site-wide via the Next.js Metadata API. No `metadataBase`, no canonical, no Open Graph, no Twitter card, no `robots` directives.
- No `sitemap.xml` or `robots.txt` (static or dynamic route handlers) anywhere in `app/`.
- No per-page `metadata` exports on any route — every page (including the 404) inherits the single root title/description, so search results for `/dashboard`, `/sign-in`, etc. would all show "Stoxly" with the same generic description.
- No JSON-LD structured data anywhere.
- No Open Graph image generation (`opengraph-image.tsx` or static asset).
- `favicon`/icons not checked yet in this pass — confirm in Stage 5 (OG images) alongside icon audit.
- Images: dashboard/crypto panels render logos from CoinGecko via `next/image` (per `Vision.md`, hosts are allowlisted in `next.config.ts`) — good baseline already, needs an alt-text check in Stage 7.
- `proxy.ts` exists for route protection (redirects unauthenticated users away from `(protected)/*`) — relevant to Stage 8 (auth pages shouldn't be indexed, and protected routes already 300-redirect unauthenticated crawlers, which is fine but still needs explicit `noindex` since a redirect alone isn't a reliable signal).

## Plan for remaining stages

1. ~~Audit~~ (this doc)
2. **Metadata** — add per-page `metadata` exports (title template, description, canonical) to `/` and all `(auth)` pages; add blanket `robots: noindex, nofollow` metadata to the `(protected)` layout (single change point) and to each `(auth)` page individually. Add `metadataBase` in the root layout once a real or placeholder URL is set.
3. **sitemap/robots/404/redirects** — `app/sitemap.ts` (only public marketing routes for now — just `/`), `app/robots.ts` (allow `/`, disallow `(protected)` and auth paths), improve `not-found.tsx` metadata title, no hreflang yet per your answer.
4. **JSON-LD** — `SoftwareApplication` schema on `/` (site type = SaaS/web app).
5. **OG images** — one static/dynamic `opengraph-image` for the landing page.
6. **Performance** — spot-check `next/image` usage, unnecessary `"use client"` on pages that don't need it, font loading (already using `next/font/google` — good).
7. **On-page** — confirm single `<h1>` and heading hierarchy on `/`, alt text on images.
8. **Edge cases** — confirm `(protected)` noindex covers all sub-pages, auth pages noindexed, no query-param pages need canonicalization yet (none found).
9. **SEO check script** — small script to assert robots/sitemap/metadata exist and protected routes carry `noindex`.

Waiting for you to say "continue" before Stage 2.
