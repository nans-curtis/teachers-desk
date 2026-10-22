# Teacher's Desk

Recovered from the deployed Cloudflare Worker on 22 October 2026.

Live app: https://teachers-desk.nandini-teachers-desk.workers.dev

## Contents

- `src/worker.js`: exact deployed JavaScript bundle, including the HTML, CSS, client code, backend and bundled dependencies.
- `wrangler.json`: recovered runtime configuration and existing D1 binding.
- `schema.sql`: database structure and initialization for a new database. No student records, audit entries or other database contents are included.

This is a deployment snapshot. The original unbundled source files, dependency manifests, source maps and migration history were not available from the deployed Worker.

## Deployment

Use the Cloudflare Wrangler CLI. Authenticate to the account owning the Worker, and set the required owner email before deploying:

```sh
npx wrangler login
npx wrangler secret put OWNER_EMAIL
npx wrangler deploy
```

The configuration targets the existing live Worker and database. Deploying updates the live app. Cloudflare Access must retain its existing application configuration; `AUTH_DOMAIN` and `AUTH_AUD` are public authentication identifiers, not credentials. The owner email is intentionally not committed.

For a separate installation, change the Worker name, create a D1 database, update its binding ID and authentication identifiers, and run `schema.sql` only against the new database. Keep the existing database unchanged when restoring this deployment.

No continuous deployment connection to GitHub has been configured by this copy.

## Editing the redesigned Payments page

The payment UI is maintained in `src/payments.js` and `src/payments.css`. Run `node tools/build-payments.cjs` to embed changes in the recovered Worker without changing its backend. Run `node --test tests/payments.test.cjs` for collection calculations and filter checks. `node tools/preview-payments.cjs` generates an interactive sample-data preview after building. Click a student row to open the right panel and record a sample payment; sample changes stay in memory. Event management and the legacy edit dialog are available only in the live app.

## Shared app design

The app-wide visual system is maintained in `src/refinement.css`; presentation helpers and student detail panels live in `src/refinement.js`. It retains the existing backend, calculation rules and storage model.

```sh
npm ci
npm test
```

`npm run build` embeds both payment and shared design changes into `src/worker.js`. `npm run preview:generate` produces `preview/app.html`, an interactive preview of every page using sample records. Preview payments and other edits stay in memory and never reach Cloudflare. The page links at the top open each flow directly.

Design patterns were studied through Appllama: Superlist's title and list hierarchy, Sorted's grouped navigation, Todoist's grouped controls, and Calendars/Timepage's date context. Those patterns are adapted to this desktop table-based school workspace.

## Consistent visual system

The shared stylesheet defines the semantic palette, typography, 4px spacing scale, radii, and component treatments for all pages. Light mode uses ivory and white surfaces with a deep green accent; dark mode uses charcoal green surfaces with a lighter accent. Status colours retain their semantic roles. Overview metrics use a simple divided row; data tables, forms, and detail panels share the same control and label styles.

Validation: `npm test` builds the Worker and sample previews and runs the automated checks covering page rendering, both appearances, navigation, forms, attendance, and payment history. Desktop and mobile layouts have also been checked in headless Chrome.

## Daily assistant

`src/shell.js`, `src/attendance.js` and the shared presentation styles provide the sidebar workspace and independent register. `src/daily.js` provides the Today agenda, attendance progress and work requiring attention. Teaching schedules use the school calendar. Attendance is an independent class register: staff can choose any valid date and add sessions without calendar, timetable or academic-year date restrictions. Reports count saved entries only, leaving unrecorded dates blank.

The shared context bar retains the chosen class, subject and date between tasks. Optional student details and notes are grouped in an expandable form section; fields and save handlers are preserved. The Today class directory remains available below the agenda.

## Integration API

The separate `teachers-desk-api` Worker supports secret-key attendance and marks upserts using the same validation and audit history. See [API setup and examples](api/README.md). `npm test` builds the API core and verifies authentication, permitted operations, atomic writes, revision conflicts, and validation. API secrets and student data must never be committed.
