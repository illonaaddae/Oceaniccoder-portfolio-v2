# OceanicCoder Portfolio — Onboarding

Practical guide for working in this repo. Pairs with `CLAUDE.md` (conventions) — read that too.

## Stack

- **Frontend:** React 19 + TypeScript + Vite, Tailwind CSS
- **Data/Auth:** Appwrite (browser SDK, session-based admin auth)
- **Serverless:** Azure Functions in `api/*/index.js`, served at `oceaniccoder.dev/api/*`
- **Hosting:** Azure Static Web Apps (app + functions), production = `main` branch
- **Email:** Resend (all Azure Functions). Env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (set in Azure app settings)
- **Testing:** Vitest + Testing Library

## Repo flow (important)

- **Never push to `main`.** Branch → PR → CI green → squash-merge. Merging `main` auto-deploys to production.
- Branch names: `feat|fix|chore|refactor/OC-<n>-short-desc`. Use `OC-0` when no ticket.
- Conventional Commits. **Never** add a `Co-Authored-By: Claude` trailer or "Generated with Claude Code" footer (overrides global defaults).
- Gates before commit: `npm run type-check`, `npm run lint` (0 errors), `npm run format:check`, `npm run build`. Husky runs lint-staged on commit.
- CI checks on PRs: Lint & Type Check, Run Tests, Build Check, Security Audit, Build and Deploy. "Contact Email Notification" check (Appwrite function build) can fail independently of your change — it's infra, not a gate on app code.

## Local dev gotcha

- `npm run dev` → Vite on `:3000`. **`vite.config.ts` has no `/api` proxy**, so `/api/*` calls do NOT work locally against the dev server. Anything hitting an Azure Function (email sends, chat, bookings) can only be validated in production (or via the SWA emulator + `func start` + a local `api/local.settings.json` holding the Resend keys). Appwrite reads (messages, bookings, comments) DO work locally — they go straight to Appwrite, not `/api`.

## Layout landmarks

- `src/services/api/*` — one file per data domain (Appwrite). ~23 domains.
- `src/components/AdminDashboard/` — admin panel. `useDashboardCore.ts` = central state; `useAdminData.ts` loads most collections; tabs under `tabs/`.
- `api/*/index.js` — each folder = one Azure Function (`function.json` binding + `index.js`). Email functions all POST to `api.resend.com/emails` via a shared `httpsPost` helper.
- `src/utils/apiUrl.ts` — `apiUrl(path)` = `VITE_FUNCTIONS_BASE_URL + path` (unset → same-domain relative). Always route function calls through it; never hardcode URLs.
- Public site is a single-page scroll (`/`) whose sections are ALSO standalone routes (`/skills`, `/projects`, `/booking`, …).

## Changes shipped today (2026-07-18)

- **#84 — Certifications:** custom platform logo now persists. The API layer was dropping `platformIconUrl` when building the save payload (`src/services/api/certifications.ts`). Also added **Boot.dev** and **DataCamp** as first-class platforms (`CertificationForm/constants.ts`, `platformLogos.js`; DataCamp via Simple Icons, Boot.dev via its favicon). Certs now sort **newest first** (by date obtained, `$createdAt` tiebreak) in `getCertifications`. Note: the `certifications` Appwrite collection already has a `platformIconUrl` attribute (string, 512).
- **#85 — Dashboard Recent Activity:** now aggregates all entity types, not just projects/messages. `tabs/Overview/buildActivity.ts` merges projects, messages, certifications, skills, gallery, education, journey, blog posts, testimonials → newest-first, top 8, rows clickable to their tab. Status pills match the Certifications table (teal outline; Project "Featured" keeps its gradient). Also fixed floating-navbar overlap on section titles (`pt-28` + `scroll-mt-24/28` on Skills/Projects/Contact/Booking/Blog, matching About/Hero).
- **#86 — Message reply:** replaced the `mailto:` reply with an in-app composer. New Azure Function `api/send-message-reply` sends via Resend; the message is marked `replied` (green pill) only on HTTP 200 — so REPLIED means a real email went out. `MessageDetailModal.tsx` holds the composer.
- **#87 — Notification bell:** header bell is now a real notification center. `useNotifications.ts` aggregates unread messages + pending bookings + new inquiries + unapproved comments (polls the non-message sources every 30s); `NotificationsMenu.tsx` renders the badge total + a dropdown of recent items, each navigating to its tab. Clicking a notification navigates but does not itself clear it — the count reflects still-actionable items and drops when their status changes.

## Message/status conventions worth knowing

- Message `status`: `new | read | replied`. Unread = `new` or unset.
- Booking actionable = `status === "pending"`. Inquiry actionable = `status === "new"`. Comment actionable = `!isApproved`.
- These drive both the notification bell and the activity feed.
