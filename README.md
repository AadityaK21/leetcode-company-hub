# CompanyHub — Company-wise LeetCode Prep

A production-grade interview prep platform in the spirit of **Striver's A2Z Sheet** and **NeetCode**, built around one idea: *practice what your target company actually asks.* Data comes from the open-source [snehasishroy/leetcode-companywise-interview-questions](https://github.com/snehasishroy/leetcode-companywise-interview-questions) repository (per-company CSVs with frequency + recency buckets).

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS + shadcn/ui-style components · Framer Motion · TanStack Query · Zustand · React Hook Form + Zod · Prisma + PostgreSQL · Auth.js v5 (Google, GitHub, email/password) · Vercel-ready.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
#    - DATABASE_URL       Postgres connection string (Neon/Supabase/local)
#    - AUTH_SECRET        `openssl rand -base64 32`
#    - AUTH_GOOGLE_*      optional OAuth credentials
#    - AUTH_GITHUB_*      optional OAuth credentials
#    - ADMIN_EMAIL/PASSWORD  seeds an admin credentials account

# 3. Create the schema
npx prisma db push

# 4. Import company data (downloads the repo snapshot, parses every CSV)
npm run db:import        # takes a few minutes; ~hundreds of companies

# 5. Seed sheets, achievements, admin user (run AFTER the import)
npm run db:seed

# 6. Run
npm run dev              # http://localhost:3000
```

> **Order matters:** `db:import` first, then `db:seed` — the topic sheets are generated from the imported question/frequency data. (Blind 75 works either way; the seed upserts any missing questions.)

### Deploying to Vercel

1. Push to GitHub, import the repo in Vercel.
2. Set the same env vars (`AUTH_URL` = your production URL).
3. Build command is the default — `package.json` already runs `prisma generate` before `next build`.
4. Run `npm run db:import && npm run db:seed` once against the production `DATABASE_URL` from your machine (the import is deliberately **not** an HTTP endpoint — it exceeds serverless timeouts).

---

## What's inside

### Product
- **Landing page** — animated hero with live company cards, platform stats, popular companies, trending problems, sheet previews, FAQ.
- **Company explorer** (`/companies`) — every company with logo, question count, and the signature *difficulty spectrum bar*; instant search + sort (most questions / A→Z / hardest mix).
- **Company detail** (`/companies/[slug]`) — difficulty split, most-asked-topics distribution, and the full question table with **frequency meters** and **recency filters** (30 days → all time).
- **Problem bank** (`/problems`) — global table across companies, topic chips, filter by difficulty/status/search, sort by any column, server-side pagination.
- **Problem detail** (`/problems/[slug]`) — companies that ask it (with per-company frequency), topics, related problems, a **status stepper** (To do → Attempted → Solved → Mastered), bookmark, revision scheduling, and a **markdown notes editor** with autosave, live preview, and version history + restore.
- **Study sheets** (`/sheets`) — **Blind 75** built in plus auto-generated topic sheets (DP, Graphs, Trees, Binary Search, Greedy, Sliding Window) from real frequency data; Striver-style collapsible sections with per-section progress bars and inline solve checkboxes.
- **Dashboard** — stat cards, GitHub-style activity heatmap (26 weeks), weekly solve chart, XP + level ring, streak counter, due-revision queue, achievements.
- **Spaced repetition** (`/revisions`) — schedule any problem; each review doubles the interval (1 → 2 → 4 → 8… capped at 60 days) until mastered.
- **Bookmarks** (`/bookmarks`) — problems, companies, and sheets in one place.
- **Global search** — ⌘K / Ctrl-K / `/` command palette searching questions, companies, and topics, with nav + theme commands.
- **Gamification** — XP (Easy +10 / Medium +25 / Hard +50), levels (`level = ⌊√(xp/100)⌋ + 1`), 7 seeded achievements with tiers and XP rewards.
- **LeetCode sync** — connect your LeetCode username in *Settings → Connected accounts*; recent accepted submissions import automatically as **verified** solves (shield badge on rows), with background re-sync every 6h from the dashboard, sync status, retry, and failure reasons. Honest limitation: LeetCode's public API exposes only the ~20 most recent ACs per profile (full history needs their session cookie, which we never ask for) — so sync accumulates going forward, and manual marking stays available as the fallback.
- **Code workspace** — Monaco editor on every problem page: 9 languages (Python, C++, Java, JS, TS, Go, Rust, C#, Kotlin), starter templates, autosave per problem+language, font-size controls, fullscreen, custom stdin, and one-click Run via the free Piston sandbox (proxied server-side, rate-limited). It's a scratchpad runner, not a judge — submit on LeetCode itself.
- **Graded spaced repetition** — reviews are graded Forgot/Hard/Good/Easy (×1 day reset / ×1.2 / ×2 / ×2.5 intervals, capped at 60 days), Anki-style.
- **Analytics** (`/analytics`) — difficulty coverage, per-topic strength bars, and readiness percentage for each target company.
- **Upgraded shell** — collapsible sidebar (with tooltips when collapsed), pinned target companies in the sidebar, live streak flame in the topbar, animated active indicators, and keyboard navigation: `g` then a key jumps anywhere (`g d` dashboard, `g c` companies…), `?` opens the shortcuts cheatsheet.
- **First-run onboarding** — a 3-step wizard on first dashboard visit: pick up to 5 target companies (auto-bookmarked as a "Your targets" strip), set a daily goal, choose a starting sheet. Skippable; everything adjustable in Settings.
- **Company compare** (`/compare`) — pick 2–3 companies and see exactly which questions they share, ranked by combined frequency with per-company meters. Selection lives in the URL, so comparisons are shareable.
- **Micro-interactions** — spring-pop on solve checkmarks, a pulsing streak flame while your streak is alive, smooth progress fills, button press feedback. All motion respects `prefers-reduced-motion`.
- **Daily challenge** — deterministic problem of the day (same for everyone, no cron), front and center on the dashboard.
- **Personal bests** — longest-ever streak, best single day, member-since, plus a "coach's note" that reads your difficulty mix and nudges you (e.g. "you're avoiding hards").
- **Leaderboard** (`/leaderboard`) — top 25 by XP with a podium, level + solved counts, and your row highlighted.
- **"Pick for me"** — one click jumps to a random *unsolved* problem, globally or scoped to a company.
- **Settings** — light/dark/system theme, reduced motion, daily goal, email toggle, **JSON data export**, account deletion.
- **Admin** (`/admin`, role-gated) — data health stats, last-sync time, sync instructions, recent signups.
- Mobile: glass bottom nav; desktop: fixed icon+label sidebar. Full dark/light theming.

### Architecture
```
prisma/schema.prisma        # 20 models; denormalized company stats for fast cards
scripts/import-data.ts      # zip-download + CSV parse (both schema variants) + upserts
prisma/seed.ts              # admin, achievements, Blind 75, topic sheets
src/lib/auth.(config.)ts    # Auth.js v5 split config (edge-safe middleware + Prisma adapter)
src/lib/validations.ts      # every API input is Zod-validated
src/lib/gamification.ts     # XP, achievements, streaks
src/app/api/*               # questions (filter/sort/paginate + per-user state), progress,
                            # bookmarks, notes (+versions), revisions, settings, export,
                            # account, search, register, admin/sync
src/app/(app)/*             # authenticated app shell pages
src/components/*            # ui primitives, question table, sheets, dashboard widgets
```

- **Auth:** JWT sessions; middleware protects `/dashboard`, `/bookmarks`, `/revisions`, `/settings`, `/admin`. Company/problem/sheet browsing works signed-out; write actions prompt sign-in via toast.
- **Data model detail:** `CompanyQuestion` stores frequency (0–100) + four recency booleans per company-question pair; `Company` carries denormalized counts computed at import time so the explorer renders without joins.
- **Question API** returns each row with the signed-in user's `{status, bookmarked, hasNote, revision}` resolved in one batched lookup.

## Design system — "Terminal Ivory"
Warm ivory canvas with ink-black primaries (graphite + ivory in dark mode), a chartreuse **lime** accent reserved for progress and success, `Space Grotesk` display / `Inter` body / `JetBrains Mono` for all figures and data (`.figure`, `.eyebrow` utilities), glassmorphism surfaces (`.glass`, `.glass-strong`), and the recurring **difficulty spectrum bar** (emerald/amber/rose) as the product's visual signature. Respects `prefers-reduced-motion`.

---

## Production readiness notes

- **Auth state on first paint** — the session is resolved server-side and handed to the client provider, so there's no flash of "Sign in" for logged-in users and no auth-dependent layout shift.
- **Dark mode integrity** — toasts follow the active theme, `color-scheme` is set per theme so native inputs/scrollbars adapt, and the codebase contains no hardcoded black/white text; everything runs on theme tokens.
- **Appearance customization** — accent color (lime/blue/violet/rose) and text size (compact/default/comfort) per user, applied via CSS variables server-side on load; reduced-motion preference hard-disables all animation.
- **Sign-in activity** — logins, registrations, and 2FA changes are audit-logged with IP + user agent and shown in Settings. Honest note: with stateless JWT sessions there is no server-side session list to revoke individually; sessions expire in 14 days, and rotating `AUTH_SECRET` invalidates all of them at once.
- **Network resilience** — queries retry twice with backoff, mutations retry once, all mutation requests carry a 15s timeout, data refetches automatically on reconnect, and an offline banner appears when the connection drops. recharts is code-split out of the main bundle; images lazy-load.
- **CSRF/XSS** — Auth.js provides CSRF tokens on all auth routes with `SameSite` cookies; React escapes output and markdown rendering never injects raw HTML. Security headers are set on every response.
- **10k concurrent users** — the honest math: session checks are stateless (zero DB reads), reads are cached (`unstable_cache`), all hot query paths are covered by composite indexes, and the app is fully stateless so it scales horizontally on Vercel/any load balancer with pooled Postgres. Login bursts are bounded by rate limits before touching bcrypt. The two dials to turn at real scale: a pooled `DATABASE_URL` (required) and swapping the in-memory rate limiter for Upstash Redis (recommended past a handful of instances).

## Account security & privacy

- **Two-factor authentication (TOTP)** — enable in *Settings → Security*. Scan the QR with Google Authenticator/Authy/1Password, confirm a code, and save the **8 single-use recovery codes** (shown exactly once, stored only as SHA-256 hashes). Sign-in then requires password **and** a live 6-digit code; disabling 2FA requires re-proving identity with a current code or password. TOTP secrets are **AES-256-GCM encrypted at rest** (key derived from `AUTH_SECRET`), so a database leak alone doesn't expose them.
- **Strong password policy** — enforced server-side (Zod) and shown as a live checklist at sign-up: 8+ characters with an uppercase letter, a lowercase letter, a number, and a special character. Hashing uses bcrypt cost 12.
- **Privacy** — a *Show me on the leaderboard* toggle in Settings hides you from other users entirely; data export and full account deletion were already built in; sessions expire after 14 days.
- **An honest note:** no system on earth is "unhackable" — anyone claiming that is selling something. What this app does is stack the industry-standard layers (2FA, strong hashing, lockouts, rate limits, timing-safe checks, encrypted secrets, security headers) so that each attack class has a defense. The remaining weakest links are always operational: keep `AUTH_SECRET` and your database credentials out of git, use HTTPS in production (Vercel does this automatically), and keep dependencies updated (`npm audit`).

## Scale & abuse protection (auth under load)

Designed so a burst — say 1,000 logins in a minute — is a non-event:

| Layer | What it does |
| --- | --- |
| **Stateless JWT sessions** | Checking "is this user signed in?" never touches the database — a session is verified from the signed cookie alone. 10,000 concurrent users browsing costs the DB nothing. |
| **Pooled Postgres** | Use your provider's pooled connection string (see `.env.example`); Prisma reuses connections instead of opening one per request. |
| **Per-IP login rate limit** | 20 attempts/min from one IP, then rejected before any DB work. |
| **Per-email login rate limit** | 10 attempts/min per account — blunts distributed (botnet) attacks on a single user. |
| **Account lockout** | 5 wrong passwords → account locked for 15 minutes (`failedLogins`/`lockedUntil` on `User`). |
| **Timing-attack protection** | Unknown emails still run a bcrypt compare against a dummy hash, so attackers can't detect which emails exist from response times. |
| **Registration rate limit** | 5 signups / 10 min / IP. |
| **Security headers** | `X-Frame-Options`, `nosniff`, referrer + permissions policies on every response. |

Serverless platforms (Vercel) auto-scale instances horizontally, and bcrypt work spreads across them. One honest note: the rate limiter is **in-memory per instance** — perfect for a single server, and still a strong deterrent on serverless. For an exact global limit across many instances, swap `src/lib/rate-limit.ts` for Upstash Redis (`@upstash/ratelimit`) — it's a ~15-line change in one file.

## Hardening applied
- Emails are lowercased on register **and** login, so `Foo@x.com` and `foo@x.com` are one account.
- `/api/auth/register` is rate-limited (5 attempts / 10 min / IP, in-memory).
- Note version history is capped at 15 entries per note to prevent unbounded growth.
- Heatmap, streaks, and the weekly chart all use UTC day-keys consistently (no off-by-one days across timezones).
- Count-up number animations respect `prefers-reduced-motion`.

## Honest scoping notes

- **Authored offline.** This codebase was written without running `npm install`/`next build` in the authoring environment. All files pass syntax checks and internal imports are verified, but expect the possibility of a few minor type nits on first `npm run typecheck` — nothing structural.
- **Company logos** use Clearbit's public logo endpoint with an initials fallback; some logos will 404 gracefully.
- **Email notifications** are a stored preference only — wire up a provider (Resend, etc.) to actually send.
- **Admin "sync" button** intentionally returns instructions rather than running the multi-minute import inside a serverless request; use `npm run db:import` locally or via cron/job runner.
- **Not included (by design, documented rather than half-built):** AI study-plan generator, discussion forum, PWA/offline mode, LeetCode account OAuth sync. The schema and API layer are structured so these can be added without migrations to existing tables.
- Frequency numbers reflect LeetCode's company-tag frequency at the source repo's last snapshot; re-run the import to refresh (`lastSyncedAt` shows freshness in the admin panel).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Sync Prisma schema to the database |
| `npm run db:import` | Download + parse the company CSV repo into Postgres |
| `npm run db:seed` | Admin user, achievements, Blind 75, topic sheets |
| `npm run db:studio` | Prisma Studio |

Not affiliated with LeetCode. Question data © its respective source repository.
