# NAYL product demo script

## Preparation

```bash
cp .env.example .env
npm start
```

Open `http://localhost:8787` in a browser. Keep Brave and Google keys empty for the first demonstration so the connector truth model is visible.

## 1. Consumer demand and source truth — 90 seconds

1. Open the **Consumer** portal.
2. Use the prefilled request: “I need a reliable cleaner in Dubai today under AED 250.”
3. Point out the extracted category, city, budget, urgency, and confidence.
4. Show connector states:
   - NAYL Marketplace — Live MVP.
   - Open Web Search — Not configured.
   - Local Places — Not configured.
   - Partner Apps — Demo.
5. Show that every result card includes source and mode, and that the demo card cannot complete an action.
6. Save one result to demonstrate the browser-side saved-result foundation.

## 2. Consumer comparison and booking — 60 seconds

1. In **My marketplace requests**, use the seeded deep-clean request.
2. Compare the two quotes by provider, price, scope message, and availability.
3. Select **Book this quote** on one quote.
4. Show that the request becomes Booked and the selected quote is clearly identified.

## 3. New marketplace opportunity — 45 seconds

1. On a NAYL Marketplace result, select **Request quote**.
2. Explain that the structured search intent becomes a qualified opportunity instead of an anonymous lead.
3. The request appears in the consumer sidebar with Open status.

## 4. Business quote workflow — 90 seconds

1. Open the **Business** portal.
2. Review the KPI cards and BaytCare profile/service areas.
3. Open the newly created matching cleaning opportunity.
4. Submit a quote with amount, availability, and clear scope.
5. Return to Consumer; the quote now appears in the comparison.

## 5. Admin and rollout controls — 60 seconds

1. Open **Admin & Ops**.
2. Show search and marketplace KPIs.
3. Show that connector configuration is operationally visible rather than hidden in logs.
4. Show the six GCC market/currency records and rollout states.
5. Show the recent demand audit and future operations queues.
6. Close on the policy banner: external sources use approved APIs, feeds, or deep links; private mobile apps are not silently scraped.

## Optional live connector demonstration

Add one or both keys to `.env`, restart, and repeat the same consumer search:

```dotenv
BRAVE_SEARCH_API_KEY=...
GOOGLE_MAPS_API_KEY=...
```

The source state changes to Live only when the call is configured and functioning. If a configured connector errors, its execution state becomes Error while other results remain available.
