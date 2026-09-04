# NAYL validation report

Validated on 4 September 2026 with Node.js 22.16.0.

## Automated validation

- `npm ci --omit=dev`: completed; npm reported 0 vulnerabilities.
- `npm run check`: validated 27 JavaScript files, required routes, and embedded-secret patterns.
- `npm test`: 10 tests passed, 0 failed.

The automated suite covers:

1. Dedicated consumer, business, and admin routes.
2. Honest connector states and an empty non-fabricated marketplace.
3. Consumer request → admin-verified business → quote → acceptance → confirmed booking.
4. Consumer, business, and admin role isolation.
5. Invalid request and expired quote rejection.
6. Current and legacy Supabase server-key header behavior.
7. Google Places Text Search request and response mapping.
8. Brave Search request and response mapping.
9. OpenAI structured intent and source-verified Responses API web search mapping.
10. Resend transactional-email request mapping without browser credential exposure.

## HTTP smoke validation

The application started cleanly and returned HTTP 200 for:

- `/api/health`
- `/`
- `/business`
- `/admin`

The flat edition additionally returned HTTP 404 for direct requests to backend and configuration files such as `/server.js`, `/backend-app.js`, `/.env.example`, and `/README.md`.

## External-service validation boundary

No private API credentials were supplied. Therefore, authenticated calls to OpenAI, Google Places, Brave Search, Supabase, and Resend were not made from this environment. Their current HTTP request/response contracts are covered by isolated tests. At runtime, a connector without a valid credential is shown as `not-configured`; it does not return fabricated results.

## Container validation boundary

A Docker engine was not available in the build environment, so the Docker image itself was not executed here. Both packages were executed directly under Node.js, and their Dockerfiles use Node.js 22 Alpine with the tested server entrypoint.
