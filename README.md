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
