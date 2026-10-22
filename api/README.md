# Attendance and marks API

Base URL: `https://teachers-desk-api.nandini-teachers-desk.workers.dev`

Send the private key as `Authorization: Bearer YOUR_KEY` over HTTPS. Keep it in your source server's environment or secret manager. The key authorizes attendance and marks reads and upserts. It cannot create students, change exams or terms, access payments, delete records, or update submission tracking. Anyone holding the key has this scope; the key does not independently identify a particular machine.

Cloudflare stores only its SHA-256 digest in the secret binding `INTEGRATION_API_KEY_SHA256`. The key is not included in source code, browser JavaScript, logs or this document. Browser sign-in for the main app is unchanged. This is a server-to-server API; cross-origin browser access is not enabled.

## Find IDs and current revision

```bash
export TEACHERS_DESK_API='https://teachers-desk-api.nandini-teachers-desk.workers.dev'
# Set TEACHERS_DESK_API_KEY privately in your source environment.
curl -sS "$TEACHERS_DESK_API/v1/context" \
  -H "Authorization: Bearer $TEACHERS_DESK_API_KEY"

curl -sS "$TEACHERS_DESK_API/v1/context?classId=CLASS_ID&date=2026-10-22" \
  -H "Authorization: Bearer $TEACHERS_DESK_API_KEY"
```

Context returns the current `revision`, class, subject and assessment IDs and maxima. With `classId`, it includes enrolled student IDs, names and roll numbers. With `classId` and `date`, it also returns scheduled session keys. Parent contacts and payment records are excluded.

## Update attendance

```bash
curl -sS "$TEACHERS_DESK_API/v1/attendance" \
  -H "Authorization: Bearer $TEACHERS_DESK_API_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"revision":13,"records":[{"classId":"CLASS_ID","studentId":"STUDENT_ID","date":"2026-10-22","status":"present"}]}'
```

Replace the example revision with the revision from your latest GET response. Status is `present`, `absent`, `late`, `excused` or `half-day`. Optional fields: `session` and `notes`. If exactly one session is scheduled, its key is selected automatically. Otherwise supply a session key from context. The API derives academic year and attendance subject from the class and schedule. Existing entries are updated by class, student, date and session; repeated requests do not create duplicate entries.

Read existing attendance:

`GET /v1/attendance?classId=CLASS_ID&date=2026-10-22`

## Update marks

```bash
curl -sS "$TEACHERS_DESK_API/v1/marks" \
  -H "Authorization: Bearer $TEACHERS_DESK_API_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"revision":14,"records":[{"assessmentId":"ASSESSMENT_ID","studentId":"STUDENT_ID","theory":65,"status":"scored"}]}'
```

Read the assessment maxima from context. For a single-entry exam, send the raw mark in `theory`; `internal` is zero. For assessments with separate theory and internal entries, send both. Existing omitted values are retained. A new component entry remains incomplete until the required values exist. Supplying a numeric `theory` implies `scored` unless you explicitly set status. Send `status: "absent"` to record absence, or `status: "pending"` with `theory: null` to clear the entered score. Optional field: `notes`. Submission fields and ungraded activities cannot be updated through this endpoint.

Read existing marks:

`GET /v1/marks?assessmentId=ASSESSMENT_ID`

## Validation, concurrency and responses

- Send 1–500 records per POST, up to 2 MB of JSON. Each batch is atomic.
- Add `?dryRun=true` to either POST URL to validate without saving or increasing the revision.
- Success: `{"ok":true,"revision":14,"updated":1,"records":[...]}`. Subsequent writes must use the new revision.
- `400`: invalid fields, references, enrollment, score, schedule or duplicate batch identity.
- `401`: missing or incorrect key. `503`: key is not configured.
- `409`: another write has advanced the revision. Fetch current data, reconcile your change and retry; do not blindly overwrite with a new revision.
- Saved updates use the main app's validation, revision control and audit trail, with actor `integration:attendance-marks`.

## Build and rotate

`npm test` regenerates `api/core.mjs` from the main app's backend and runs the API tests. `wrangler.api.json` targets the API Worker and existing D1 database. Do not initialize or replace the database when deploying this Worker.

To rotate the key, generate a new cryptographically random 32-byte key and replace the SHA-256 digest in the API Worker's `INTEGRATION_API_KEY_SHA256` secret, then update the source server. The previous key stops working immediately. Deleting the binding disables authenticated API access.
