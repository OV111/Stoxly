# How I Work (applies to every project)

I'm a solo developer building this project to learn deeply, not just to ship fast. Follow these rules in every session:

## Process

1. **Work in explicit steps, in order.** Don't jump straight to a full implementation. For any non-trivial feature, go:
   - define/confirm data schema or types first
   - outline the logic/flow in plain language
   - then implement, piece by piece
   - then wire up UI/integration last
     Pause between steps if a decision needs my input (naming, structure, tradeoffs).

2. **Explain before or alongside code — not just after.** For every non-obvious piece, tell me _why_ this approach, not only _what_ it does. Assume I want to understand the mechanism, not just get working output.

3. **Let me write code myself when the goal is learning.** If I say I want to write a piece myself, give me the plan/schema/pseudocode and let me implement it — don't hand me the finished function. Review what I write and correct it rather than replacing it outright.

4. **Always name the modern/idiomatic approach.** When there are multiple ways to do something, tell me which one real companies and current best practice actually use today, and why it's preferred over older patterns. Call out when something I'm using is outdated.

5. **Flag optimization, efficiency, and cleanliness opportunities proactively.** Don't wait for me to ask — mention when code could be more efficient, better structured, or more idiomatic, even if it already "works."

6. **Think portfolio/recruiter-readiness.** Since I'm building to eventually show this work, prefer patterns, tooling, and code style that would read well to another engineer or a recruiter reviewing the repo — not just whatever is fastest to write.

## What NOT to do

- Don't silently do the "fun"/core learning part for me and leave me the boilerplate.
- Don't default to the first working solution if a more current/idiomatic one exists — mention both.
- Don't skip the explanation to save time.

## Response Format

Every non-trivial answer must be structured with numbered sections, in this order (skip a section only if it truly doesn't apply):

```
1. Schema/types
<schema or type code>

2. Plan/logic
<short plain-language explanation of the approach and flow>

3. Code
<implementation, or partial implementation + what I should write myself — followed by a short, simple-words explanation of what the code does, then a more detailed explanation of why and how it works>

4. Best practices
<modern/idiomatic approach, what real companies use, why>

5. Optimization notes
<efficiency, cleanliness, or structural improvements worth knowing>
```

- Keep each section short and scannable — no filler.
- If a step was already agreed on earlier in the session, you can skip re-showing it.
- Code blocks stay inside their labeled section, not floating loose.

## Project Health Rating

When asked to assess the project (or after major milestones), rate it using this format:

```
Overall: X/10

- Architecture & structure: X/10 — <what's good, what needs fixing, how to fix it>
- Code quality & readability: X/10 — <what's good, what needs fixing, how to fix it>
- Type safety & validation: X/10 — <what's good, what needs fixing, how to fix it>
- Performance: X/10 — <what's good, what needs fixing, how to fix it>
- Security: X/10 — <what's good, what needs fixing, how to fix it>
- Testing: X/10 — <what's good, what needs fixing, how to fix it>
- Portfolio/recruiter readiness: X/10 — <what's good, what needs fixing, how to fix it>

Top 3 fixes to prioritize:
1. ...
2. ...
3. ...
```

- Be honest, not encouraging — a real gap gets a low score, not a soft one.
- Every score below 10 must come with a concrete "how to fix it," not just a criticism.
- Skip categories that genuinely don't apply yet (e.g. no backend built = skip security).

---

# Project Context

**Name:** Stoxly — stock market dashboard (working title, from `package.json` name `stock-market`)

**Stack:**
- Next.js 16.1.6 (App Router, Turbopack), React 19.2.3, TypeScript
- Tailwind CSS 4, shadcn/ui + radix-ui primitives, lucide-react icons, framer-motion/motion for animation
- MongoDB via Mongoose 9
- Auth: JWT sessions via `jose` (cookie-based), bcrypt password hashing, Google OAuth (manual flow, not next-auth)
- Email: nodemailer (forgot/reset password)
- Market data: Finnhub API (`FINNHUB_API_KEY` in `.env.local`)

**Folder structure (key paths):**
- `app/(auth)/*` — sign-in, sign-up, forgot-password, reset-password pages
- `app/root/*` — authenticated app shell (dashboard, crypto, stock/[symbol], search)
- `app/api/*` — route handlers (auth, stocks, market, crypto)
- `components/dashboard/*` — dashboard widgets (e.g. `MarketMovers.tsx`)
- `components/landing/*` — marketing/landing page sections
- `components/ui/*` — shared primitives (Header, NavItems, button, skeleton)
- `lib/*` — shared server logic (`mongoose.ts` DB connection, `auth.ts` JWT helpers, `finnhub.ts` market data fetch helpers)
- `models/*` — Mongoose schemas (currently only `User.ts`)
- `middleware.ts` — route protection (legacy name; Next 16 convention is `proxy.ts`, functionally equivalent)

**Conventions:**
- API routes wrap Finnhub calls in per-item try/catch (see `lib/finnhub.ts`) so one failed symbol doesn't 500 the whole route
- Client pages use `useEffect` + `fetch` + `loading`/`error` state (no SWR/react-query yet) — see `app/root/crypto/page.tsx` as the reference pattern
- Dark theme only, Tailwind utility classes inline (gray-800/gray-600 borders, teal-400/red-500 for gain/loss)

**Current focus:** Building out the `app/root/*` dashboard surface — most of it (`page.tsx`, `search/page.tsx`, `stock/[symbol]/page.tsx`) was empty scaffolding; auth and market-data API routes are the most complete subsystem so far.

**Known gaps (see last audit):**
- No Watchlist/Portfolio/Alert models or routes exist yet
- No AI/Claude integration despite README mentioning AI summaries
- `app/api/market/chart/route.ts` is still an empty stub
- No test suite
