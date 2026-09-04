# NAYL validation report

Validated on 4 September 2026 with Node.js 22.

## Automated validation

- `npm run check`: passed for 29 JavaScript files, required routes, and embedded-secret patterns.
- `npm test`: 12 tests passed, 0 failed.

The suite covers:

1. Dedicated consumer, business, and admin routes.
2. Truthful connector states and an empty non-fabricated marketplace.
3. Consumer request → business quote → acceptance → confirmed booking.
4. Consumer, business, and admin role isolation.
5. Invalid request and expired quote rejection.
6. Current and legacy Supabase server-key header behavior.
7. First-run owner setup and permanent setup closure.
8. Encrypted admin-vault connector persistence with no raw-key leakage.
9. Protected connector credential tests for OpenAI, Google, Brave, and Resend.
10. Google Places request and result mapping.
11. Brave Search request and result mapping.
12. OpenAI structured intent, source-verified Deep Search, and Resend email contracts.

## Direct HTTP lifecycle validation

A clean application instance was started without external provider credentials or a preconfigured administrator. The following completed successfully over the running HTTP server:

```text
create owner
→ register provider
→ provider automatically verified under direct-pilot policy
→ register buyer
→ marketplace search returns provider
→ create persisted quote request
→ provider receives opportunity
→ provider submits quote
→ buyer accepts quote
→ confirmed booking created
→ admin KPI records booking
```

Observed states:

```text
Business: verified
Request: open → quoted → booked
Quote: submitted → accepted
Booking: confirmed
NAYL Marketplace: live
Local persistent storage: ready
```

## Connector validation boundary

No user-owned OpenAI, Google, Brave, Resend, or Supabase credentials were supplied. Therefore, authenticated production calls were not executed during packaging. Provider HTTP contracts and the protected credential-test paths were exercised with controlled mock responses.

At runtime, the owner can enter real credentials at `/admin`. The value is encrypted before persistence, a masked state is returned, and connector factories use the new value immediately without redeployment.

## Browser-rendering boundary

The execution environment's Chromium policy blocked loopback navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`, so new browser screenshots could not be captured from the local HTTP service. HTML, CSS, and client JavaScript passed syntax checks, API routes were exercised directly, and the portal files were served successfully.

## Docker boundary

A Docker engine was not available in the packaging environment. The Dockerfile uses Node.js 22 Alpine and the same server entrypoint validated directly under Node.js.

## Flat GitHub package validation

The no-folder GitHub package was independently validated after import and asset-path rewriting:

- 29 JavaScript files passed syntax and secret-pattern checks.
- 12 automated tests passed, 0 failed.
- `/`, `/business`, `/admin`, and `/api/health` returned HTTP 200.
- Backend and configuration files including `/server.js`, `/backend-app.js`, `/.env.example`, and `/README.md` returned HTTP 404.
- A fresh owner → provider → buyer → request → quote → booking lifecycle completed over HTTP.
