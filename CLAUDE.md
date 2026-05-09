# CLAUDE.md — OceanicCoder Portfolio

Instructions for Claude Code when working in this repository.

---

## Commit Messages

Follow Conventional Commits. Always use this format:

```
<type>(OC-<n>): <short description>

<optional body>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

**Types:** `feat` | `fix` | `chore` | `refactor` | `docs` | `style` | `test` | `perf`

**Examples:**

```
feat(OC-12): add Google Meet link to booking confirmation
fix(OC-7): resolve VITE_FUNCTIONS_BASE_URL not baking into Azure build
chore(OC-3): update PR template to professional format
refactor(OC-9): extract BookingSection into sub-components
```

Use `OC-0` when there is no associated ticket.

---

## Pull Requests

**Title format:** `<type>(OC-<number>): <short description>`

Always use the PR template at `.github/PULL_REQUEST_TEMPLATE.md`. Fill in all sections — never leave placeholders.

---

## Branch Naming

```
feat/OC-<n>-short-description
fix/OC-<n>-short-description
chore/OC-<n>-short-description
refactor/OC-<n>-short-description
```

---

## Code Quality Gates

Before committing, these must pass:

```bash
npm run type-check    # TypeScript — no errors
npm run lint          # ESLint — no errors
npm run format:check  # Prettier — no formatting violations
npm run build         # Vite build — must succeed
```

Husky runs `lint-staged` automatically on every commit.
To run manually: `npx lint-staged`

---

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend/DB:** Appwrite (browser SDK — no server)
- **Serverless functions:** Netlify Functions (`netlify/functions/*.mjs`)
- **Hosting:** Azure Static Web Apps (domain) + Netlify (functions)
- **Auth:** Appwrite session-based admin auth
- **Testing:** Vitest + Testing Library

---

## Environment Variables

All `VITE_*` vars are **baked at build time** by GitHub Actions — Azure never reads them at runtime.

| Variable                    | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `VITE_APPWRITE_ENDPOINT`    | Appwrite API endpoint                       |
| `VITE_APPWRITE_PROJECT_ID`  | Appwrite project                            |
| `VITE_APPWRITE_DATABASE_ID` | Appwrite database                           |
| `VITE_APPWRITE_BUCKET_ID`   | Appwrite storage bucket                     |
| `VITE_ADMIN_EMAIL`          | Admin account email                         |
| `VITE_ADMIN_PASSWORD_HASH`  | SHA-256 fallback hash                       |
| `VITE_FUNCTIONS_BASE_URL`   | Netlify site URL for cross-origin API calls |

Set all in: **GitHub → Settings → Secrets and variables → Actions**

---

## Project Structure

```
src/
  components/         # UI components (sub-folders for complex ones)
  services/api/       # Appwrite data layer (one file per domain)
  hooks/              # Shared React hooks
  utils/              # Pure utilities
  lib/                # SDK setup (appwrite.ts)
  types/              # Shared TypeScript types
netlify/functions/    # Serverless functions (chat, create-booking, get-availability)
.github/
  workflows/          # CI (ci.yml) + Azure deploy (azure-static-web-apps.yml)
  PULL_REQUEST_TEMPLATE.md
  ISSUE_TEMPLATE/
  CODEOWNERS
```

---

## Key Rules

- Never commit `.env` files or secrets
- Never use `any` TypeScript type without a comment explaining why
- Never push directly to `main` without CI passing — always use a PR
- New UI components must be tested in the browser before marking done
- API calls to Netlify functions go through `src/utils/apiUrl.ts` — never hardcode URLs
- Admin routes are protected by Appwrite session — do not add client-side-only guards
- The public `/dashboard` route is intentionally read-only — keep `isReadOnly` prop respected

---

## Running Locally

```bash
npm install
npm run dev           # Vite dev server on :5173

# For full local testing with Netlify functions:
npx netlify dev       # proxies both Vite + functions
```
