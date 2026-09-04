# NAYL Controlled Launch Plan

The package completes the working production-pilot layer. The plan below turns it into a governed public marketplace without discarding the current architecture or frontend.

## Stage 0 — Working pilot baseline (complete in this package)

- Separate consumer, business, and admin routes
- Live-source search orchestration and explicit connector state
- OpenAI structured buyer intent and optional live deep search
- Google Places and Brave Search connectors
- Real business registration and administrator verification
- Persisted request, matching, quote, acceptance, and booking lifecycle
- Contact disclosure only to the winning business
- Supabase persistence option
- Optional transactional email
- Automated end-to-end workflow and role tests
- English/Arabic interface foundation

## Stage 1 — Controlled UAE pilot

Target: 2–4 weeks after operational and legal decisions.

Deliverables:

- Select one or two service categories and a small city footprint.
- Onboard a curated provider cohort and perform documented KYB manually.
- Add consumer email/phone verification and consent capture.
- Add terms, privacy notice, cancellation policy, and provider agreement.
- Configure a production domain, monitoring, alerting, backups, and key rotation.
- Establish quote response-time SLAs and manual support ownership.
- Instrument funnel events: search → request → first quote → acceptance → fulfillment.
- Run security review and abuse tests before admitting external traffic.

Exit gates:

- no unresolved critical security findings
- recovery test completed
- operations can suspend providers and trace every booking
- provider response rate and customer support process meet agreed thresholds

## Stage 2 — Transaction and operations hardening

Target: 4–8 weeks.

- Replace the single JSONB state row with normalized PostgreSQL tables.
- Introduce managed authentication, MFA for operations, revocable sessions, and granular RBAC.
- Add idempotency keys to writes and an outbox/queue for notifications.
- Build an explicit booking/order state machine: requested, quoted, accepted, scheduled, in-progress, fulfilled, cancelled, disputed, refunded.
- Add payment orchestration and a double-entry ledger only after legal/commercial design.
- Add provider availability, branch/service-area management, attachments, and structured quote line items.
- Add notification retries and delivery tracking for email/SMS/WhatsApp where permitted.
- Add case management for complaints, disputes, refunds, and content moderation.

## Stage 3 — Risk, quality, and recommendation systems

Target: 8–12 weeks.

- Fraud and abuse signals for consumer requests, provider accounts, quote manipulation, and referral misuse.
- Verified reviews linked to fulfilled bookings.
- Ranking features based on fit, response speed, conversion, quality, price, cancellation, and fraud signals.
- Experimentation and feature flags with holdouts.
- Connector freshness SLAs, credential vaulting, quotas, and automated circuit breakers.
- Arabic content operations and terminology governance.
- Data classification, retention, deletion, DSAR, and consent evidence.

## Stage 4 — GCC expansion

Activate one country and vertical at a time. For each launch, complete:

- local licensing and regulated-sector review
- consumer-protection and e-commerce obligations
- tax and invoicing design
- payment-method and funds-flow design
- data/privacy and cross-border transfer assessment
- advertising, ranking, and source-branding requirements
- provider KYB and professional-license checks
- Arabic and local terminology QA
- incident, refund, dispute, and regulator-contact procedures

## Recommended team

A focused pilot can be operated by:

- product owner / marketplace lead
- full-stack engineer
- backend/integration engineer
- product designer
- QA/security engineer
- provider operations/KYB lead
- customer operations lead
- legal/privacy/payments counsel as part-time specialists

## Pilot KPI set

Measure at minimum:

- searches with useful results
- search-to-request conversion
- requests with at least one matched verified provider
- median time to first quote
- quote response rate
- request-to-booking conversion
- median quotes per request
- provider win distribution
- cancellation and complaint rates
- fulfilled-booking rate
- connector success/latency/error rate
- acquisition cost, take rate, and contribution margin after payments/support
