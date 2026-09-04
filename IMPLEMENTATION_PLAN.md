# NAYL implementation and rollout plan

## 1. Product outcome

Build a trusted GCC demand-orchestration product that starts with a consumer outcome rather than a marketplace category tree. NAYL should understand the request, search only permitted sources, disclose every source, create qualified first-party opportunities, enable businesses to quote, and let consumers compare and book.

The product principle is **truth before coverage**: an unavailable commercial connector appears as **Not configured**; an illustrative adapter appears as **Demo**; only functioning sources appear as **Live**.

## 2. Delivered in this MVP

The repository already provides:

- Responsive Consumer, Business, and Admin & Operations portals.
- English and Arabic layout, including RTL behavior.
- Six GCC market records and local currencies.
- Bilingual heuristic intent extraction for category, market, city, budget, currency, and urgency.
- One shared result contract across Marketplace, Brave, Google Places, and Partner Demo adapters.
- Concurrent connector orchestration with failure isolation, timeouts, source state, and audit records.
- Result ranking, budget fit, category/location matching, deduplication, and source disclosure.
- Saved-result foundation in browser storage.
- Working request → opportunity → quote → comparison → booking flow.
- Business profile and service-area foundation.
- Admin KPIs, connector state, rollout state, demand audit, and future operations queues.
- Atomic JSON persistence, basic rate limiting, security headers, Docker support, CI, and automated tests.

## 3. Delivery assumptions

- Initial commercial pilot is one country and a small number of service verticals, rather than all six markets at once.
- UAE is the default MVP market in this seed; Saudi Arabia is the next logical pilot configuration. Actual sequencing remains a business decision.
- External sources require signed terms or a clearly permitted public/API route before activation.
- Regulated verticals remain disabled until legal, licensing, advertising, consumer-protection, data, and operational controls are approved.
- Arabic parity is an acceptance criterion, not a post-launch enhancement.

## 4. Twelve-week production path

### Phase 0 — Decisions and activation gates (Weeks 1–2)

**Product and commercial**

- Select launch country, launch cities, and no more than three initial categories.
- Define which journeys terminate in NAYL booking versus external handoff.
- Obtain written connector/affiliate/deep-link permissions and branding rules.
- Set marketplace commission, lead fee, cancellation, refund, and dispute principles.
- Define service-level expectations for business quote response and fulfilment.

**Legal and risk**

- Complete market-specific review for privacy, consent, consumer terms, payments, tax, licensing, advertising, electronic transactions, record retention, and regulated services.
- Create a connector data-processing inventory and retention schedule.
- Create a prohibited-content and prohibited-service taxonomy.

**Exit criteria**

- Signed product scope and target KPIs.
- Approved market/vertical activation matrix.
- Named owner for each live connector.
- Approved data map and legal basis/consent design.

### Phase 1 — Identity, consent, and business onboarding (Weeks 2–4)

- Add consumer identity with passwordless login or federated identity.
- Add consent records, privacy preferences, and account deletion/export workflows.
- Add business organization, branch, user, role, catalogue, service area, and availability models.
- Implement KYB/verification workflow with evidence, reviewer, decision, expiry, and audit history.
- Add Admin RBAC with least privilege and immutable security/audit events.

**Exit criteria**

- A consumer can create and recover an account.
- A business can onboard, submit evidence, and receive a review decision.
- Every privileged action has actor, timestamp, object, decision, and before/after audit data.

### Phase 2 — Transaction-grade marketplace loop (Weeks 3–6)

- Replace the JSON store with PostgreSQL and migrations.
- Implement quote expiry, revision, withdrawal, consumer questions, and provider decline reasons.
- Implement an explicit booking/order state machine, for example:

```text
DRAFT → REQUESTED → QUOTED → ACCEPTED → CONFIRMED
      → CANCELLED / EXPIRED / FAILED
CONFIRMED → IN_PROGRESS → COMPLETED
          → CANCELLED / DISPUTED / REFUNDED
```

- Add idempotency keys for all money- or state-changing operations.
- Add optimistic locking/version checks for quote and booking updates.
- Add service scope, address, scheduled window, cancellation policy, and evidence attachments.

**Exit criteria**

- Duplicate client retries cannot create duplicate requests, quotes, bookings, or payments.
- Every state transition is validated, authorized, and audited.
- Consumer and business see the same canonical transaction state.

### Phase 3 — Payments, ledger, refunds, and notifications (Weeks 5–8)

- Select licensed payment providers appropriate to the launch market and marketplace model.
- Implement payment intents/authorization, capture, payout instruction, refund, fee, tax, and reconciliation records.
- Create a double-entry or equivalent auditable ledger; never derive balances only from mutable order rows.
- Add refund and dispute case handling with reason, evidence, reviewer, decision, and SLA.
- Add template-managed email, SMS, push, and permitted WhatsApp notifications.
- Store message consent, delivery status, provider message ID, and failure reason.

**Exit criteria**

- Finance can reconcile provider reports to internal ledger entries.
- Refunds and cancellations produce deterministic order and ledger outcomes.
- Notification failure does not corrupt transaction state.

### Phase 4 — Connector and ranking hardening (Weeks 5–9)

- Move credentials to a managed secret vault and rotate them.
- Add connector-specific rate limits, budgets, cache policy, freshness, attribution, and terms metadata.
- Add circuit breakers, retries with jitter, health checks, and per-connector observability.
- Add URL/deep-link allowlists and destination validation.
- Add a connector certification checklist covering commercial authorization, branding, fields, freshness, deletion, and incident owner.
- Replace or complement heuristic intent extraction with a governed model adapter using structured output and deterministic fallback.
- Train/evaluate ranking against labelled GCC demand while preserving explainability and source diversity.

**Exit criteria**

- A connector cannot become Live without a signed configuration record and successful conformance tests.
- Search remains usable when any external connector fails.
- Ranking has offline quality metrics, online guardrails, and rollback capability.

### Phase 5 — Operations, Arabic parity, security, and reliability (Weeks 7–10)

- Build real operations queues for user/business verification, content review, disputes, payments, and connector incidents.
- Add case ownership, SLA, priority, notes, evidence, decision reasons, and escalation.
- Complete professional Arabic content review for product, transactional, legal, and notification copy.
- Test RTL layouts, mixed Arabic/Latin text, currencies, numbers, date/time, addresses, and screen readers.
- Add WAF/API gateway controls, centralized authorization, abuse detection, vulnerability scanning, dependency scanning, backup/restore, and incident runbooks.
- Add structured logs, traces, metrics, dashboards, alerting, and synthetic buyer-loop monitoring.

**Exit criteria**

- Critical user journeys pass accessibility and bilingual acceptance testing.
- Backup restoration and incident exercises are completed.
- Operations can resolve pilot cases without engineering database edits.

### Phase 6 — Controlled pilot and scale decision (Weeks 10–12)

- Onboard a deliberately small, responsive provider cohort in selected cities/categories.
- Use invite-only or traffic-capped consumer access.
- Run daily liquidity, quality, complaint, connector, and fulfilment reviews.
- Compare NAYL-ranked choices to consumer selections and fulfilment outcomes.
- Conduct go/no-go review for broader UAE activation and a separate Saudi activation gate.

**Exit criteria**

- Pilot KPI thresholds are met for four consecutive weeks or a documented remediation plan is accepted.
- No unresolved critical security, legal, payment, or consumer-safety issue.
- Supply coverage and response time support the planned demand volume.

## 5. Recommended production services

The MVP can first be modularized in one codebase, then separated where scale, ownership, data boundaries, or failure isolation justify it.

1. API gateway / BFF
2. Identity, sessions, consent, and authorization
3. Consumer profile
4. Business onboarding, KYB, organization, branch, and catalogue
5. Demand and opportunity service
6. Quote service
7. Booking/order state machine
8. Payment orchestration and ledger
9. Refund/dispute service
10. Notification service
11. Search orchestration and connector workers
12. Intent and ranking service
13. Reviews and reputation
14. Fraud, abuse, and risk controls
15. Admin operations and case management
16. Analytics, experimentation, and feature flags
17. Arabic content/localization tooling

## 6. Data and platform plan

- **Transactional data:** PostgreSQL with migration control, row-level authorization strategy, encryption, backups, point-in-time recovery, and regional hosting decision.
- **Cache and ephemeral coordination:** Redis or equivalent for rate limits, idempotency, cache, and short-lived workflow coordination.
- **Async work:** managed queue/event bus for connector calls, notifications, reconciliation, analytics, and operations events.
- **Evidence/files:** encrypted object storage with malware scanning, short-lived signed access, retention, and legal-hold behavior.
- **Secrets:** managed vault/KMS; no partner keys in source code, client bundles, logs, or analytics.
- **Analytics:** governed event schema with consent-aware identifiers and separation from operational records.

## 7. KPI framework

### Consumer and search

- Search success rate: searches returning at least one actionable, relevant result.
- Search-to-result-action rate.
- Intent correction rate by field.
- Source attribution coverage: target 100%.
- Connector error and timeout rate.
- Arabic/English quality parity.

### Marketplace liquidity

- Request-to-first-quote time.
- Percentage of requests with 1, 2, and 3+ qualified quotes.
- Business response and decline rate.
- Quote-to-booking conversion.
- Cancellation, no-show, complaint, and refund rate.

### Trust and operations

- Verification turnaround and expiry backlog.
- Dispute and refund resolution time.
- Payment reconciliation exceptions.
- Fraud/abuse review precision and false-positive rate.
- Critical audit coverage and privileged-access review completion.

## 8. Initial pilot targets to agree

Targets must be selected from actual vertical economics and provider capacity. A practical pilot scorecard should at minimum include:

- 95%+ technically successful searches excluding deliberate Not configured connectors.
- 100% result source/mode attribution.
- Median first qualified quote within the agreed vertical SLA.
- A defined minimum share of opportunities receiving two or more quotes.
- A defined request-to-booking target by category.
- Maximum complaint, cancellation, and refund thresholds.
- Zero unauthorized live connector activations.
- Zero critical security or payment reconciliation defects.

## 9. Team shape

A focused pilot team typically needs product ownership, product design/research, frontend, backend/platform, data/ranking, QA automation, DevOps/SRE, security/privacy, legal/commercial partnership support, provider operations, and Arabic content expertise. One person may cover multiple roles during the pilot, but control ownership must remain explicit.

## 10. Top risks and mitigations

| Risk | Mitigation |
|---|---|
| Insufficient provider liquidity | Limit categories/cities; pre-onboard supply; publish response SLA; pause demand when coverage is weak. |
| Unapproved data acquisition | Connector certification; legal/commercial owner; default Not configured; technical allowlist. |
| Misleading ranking | Explainable scoring; source diversity; labelled evaluation; complaint feedback; rollback and experiment guardrails. |
| Fraud or low-quality providers | KYB, evidence, service limits, reputation, anomaly detection, payout holds, case management. |
| Payment/reconciliation gaps | Licensed providers, idempotency, ledger, webhooks with signatures, daily reconciliation, exception queue. |
| Arabic parity defects | Native review, RTL automation, mixed-text tests, content tooling, Arabic pilot cohort. |
| Market-specific regulatory mismatch | Separate activation gate and control matrix for every country and vertical. |
| Premature microservice complexity | Start modular; split by data ownership, scaling, risk, and team boundaries rather than fashion. |

## 11. Definition of public-launch readiness

NAYL is ready for public launch only when identity, consent, KYB, authorization, transactions, payments/ledger, notifications, disputes, fraud, audit, operations, connector contracts, Arabic parity, observability, resilience, and market/vertical approvals are implemented and independently tested. The runnable MVP is a product and architecture foundation, not evidence that those launch obligations are complete.
