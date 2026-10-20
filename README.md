# FPT Lost & Found

Vietnamese campus lost-and-found application built with React, TypeScript, Supabase and TanStack Query.

Posts appear immediately. Administrators can hide or restore posts afterward; ownership claims require admin review, approval and handover confirmation.

## Requirements

- Node.js 22.12 or newer and npm.
- A Supabase project with Auth, Postgres and Storage enabled.
- Optional: Supabase CLI + Docker for a fully local backend.

## Hosted Supabase setup

1. Create a Supabase project. Apply the SQL files in supabase/migrations in filename order using the SQL editor (or link the Supabase CLI and run supabase db push). Apply supabase/seed.sql afterward for categories and locations. Do not put the private schema in the API's exposed schemas.
2. In Auth settings, enable email/password signup and email confirmation; set minimum password length to 8. Set the Site URL to http://localhost:5173 and allow http://localhost:5173/auth/callback and http://localhost:5173/reset-password as redirect URLs. Use your actual origin if the dev port changes. Production redirect URLs must be configured before deployment.
3. Configure email delivery for confirmation and recovery. The hosted project's default mail service has delivery/rate restrictions; use configured SMTP for real users.
4. Copy .env.example to .env.local. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the project URL and its publishable/anon key. These frontend keys are public; database and storage permissions protect data. Never use a secret or service-role key in a VITE_ variable.
5. Run npm install, then npm run dev. Restart the frontend after changing environment variables.
6. Register and confirm an account. Bootstrap the first admin once in the SQL editor with: update public.profiles set role = 'admin' where id = '<confirmed auth user UUID>'; Subsequent role changes use the admin Accounts tab. The last admin cannot be demoted through the app.

Without configuration the app displays a setup message. No localStorage demo fallback is used.

## Optional local Supabase

Run supabase start, then supabase db reset for a NEW local development database. db reset is destructive; never point it at a database whose data you need to preserve. The committed config enables confirmation, and the local mail inbox is available on http://localhost:54324. Copy the local API URL and anon key reported by the CLI into .env.local.

## Development demo data

The reference seed contains no accounts or user reports and can be used in production. The separate demo script is for a development project only:

1. Copy .env.demo.example to .env.demo.local.
2. Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, three distinct demo email addresses and your own DEMO_PASSWORD (8+ characters).
3. Set ALLOW_DEMO_SEED=true after checking the project URL, then run npm run seed:demo.

The script creates or updates three confirmed accounts (one admin, two members), adds three reports and two competing pending claims, and can be rerun without deleting records. Demo passwords remain in ignored local configuration and are never printed or committed. Existing demo users have their passwords reset to the configured password on rerun. Do not run this against production. There is no reset/reseed endpoint in the application.

## Permissions and workflows

- Login is required to browse or act. Users read their own profile and claims; admins can review all profiles and claims.
- Reports have separate workflow and moderation statuses. VISIBLE posts appear in feeds and matching. HIDDEN posts are accessible only to admins, their author and claimants with a related claim; tracking preserves the claim history.
- Authors and admins can edit eligible reports. Report kind, owner, timestamps, moderation and claim-controlled statuses cannot be supplied through ordinary edits. Reviewing, approved or completed claims lock both linked reports against content/photo changes. Closed and returned reports cannot be edited.
- Found-report verification information is stored separately and readable only by admins. Authors may replace it without retrieving the old value; leaving the field empty during editing preserves it.
- Claims start PENDING, move to UNDER_REVIEW, then APPROVED and COMPLETED. Pending/reviewing/approved claims may be rejected. Rejected claims may reopen if the reports are still open and visible. Completed claims cannot reopen.
- Claim submission, review and completion execute in database transactions. Row locks, a shared workflow transaction lock and unique indexes prevent conflicting winners. Completing a claim returns both reports, rejects competing claims and recomputes other affected report statuses. Timestamps prevent stale decisions.
- Hiding stops new claims/matches and preserves current review. Closing also stops new claims; an approved handover must be rejected before closing. Reopening a closed report recomputes its status from existing claims. Returned items cannot ordinarily reopen.
- Reports referenced by any claim cannot be deleted. Categories and locations cannot be deleted while used. Account deletion is outside v1.
- Staff notes are feedback visible to the claimant. Confidential evidence belongs in the separate private verification field.

## Images and data refresh

Images use a private bucket, unique user/report-specific paths, JPEG/PNG/WebP MIME restrictions and a 5 MB cap. Uploading a replacement creates a new object; existing objects cannot be overwritten. Database references change only after a successful upload. Failed saves and superseded/deleted report images receive best-effort cleanup; orphaned uploads are acceptable in v1.

Image links expire after 10 minutes and refresh while visible and on window focus. A link already issued before hiding a report may continue working until it expires. Put ownership secrets in the private verification field, not public descriptions or item photographs.

Reports and reference data are fetched in batches to avoid silently truncating the matching dataset at the API row limit. Matching remains deterministic and client-side. Mutations invalidate relevant queries, returning to the window refreshes data, and logout/account changes cancel queries and clear caches. Realtime push updates and large-scale matching are outside v1.

Existing browser demo data is not automatically imported.

## Validation

- npm run typecheck — TypeScript checks.
- npm run build — production bundle.
- npm test — PostgreSQL permission/workflow tests, native concurrency test when available, and frontend tests.
- npm run db:types — regenerate src/lib/database.types.ts from the committed migrations in an isolated PostgreSQL runtime.
- npm run test:e2e — browser smoke tests (run npx playwright install chromium once if Chromium is unavailable).

Database tests use PGlite's real PostgreSQL engine with minimal Supabase-owned Auth/Storage schema fixtures. They test RLS, grants, triggers, transactions, forged identities/fields, moderation, image ownership, winner constraints and history preservation. They do not exercise hosted Auth/Storage HTTP services.

The concurrency test starts a disposable native PostgreSQL server and uses two separate connections. It automatically detects PostgreSQL binaries via psql, or you can set PG_BIN to the binary directory. Without native PostgreSQL it is reported as skipped; the remaining database tests still run. No shared or hosted database is used or reset by the tests.

Frontend tests cover session/profile resolution, account-switch cache isolation, guards, confirmation, password recovery, matching, pagination and image validation. Browser smoke tests cover startup configuration and responsive rendering with a simulated backend; they do not replace live-project acceptance.

If you already have Microsoft Edge installed, set PLAYWRIGHT_CHANNEL=msedge before npm run test:e2e to use it instead of downloading Chromium. The application, database tests and frontend tests do not require a browser download.

### Live-project acceptance

After configuring a project, verify signup and confirmation, password recovery, login/logout, reporting with images, refresh/device persistence, browse/filter/matching, author editing, admin hiding/restoring and user role changes. Use both members to create competing claims; review/approve/complete as admin and confirm both linked reports are returned, competitors are rejected and private evidence never appears in member responses. Check invalid file uploads, image replacements/removal and forbidden direct API operations.

Live email delivery, cross-device persistence and hosted Storage behavior require configured project credentials and should be checked before deployment.
