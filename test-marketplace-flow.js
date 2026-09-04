import test from 'node:test';
import assert from 'node:assert/strict';
import { requestJson, startTestApp } from './test-helpers.js';

test('consumer demand becomes opportunity, quote, comparison, and booking', async (t) => {
  const { baseUrl } = await startTestApp(t);
  const consumerId = 'integration-consumer';

  const created = await requestJson(baseUrl, '/api/marketplace/requests', {
    method: 'POST',
    body: JSON.stringify({
      consumerId,
      query: 'Need apartment cleaning in Dubai tomorrow under AED 500',
      category: 'cleaning',
      market: 'AE',
      city: 'Dubai',
      budget: 500,
      currency: 'AED',
      urgency: 'tomorrow',
      sourceResult: {
        id: 'provider-baytcare-cleaning',
        title: 'BaytCare Home Cleaning',
        meta: { businessId: 'biz-baytcare' }
      }
    })
  });

  assert.equal(created.response.status, 201);
  const opportunityId = created.payload.request.id;
  assert.equal(created.payload.request.status, 'open');

  const opportunities = await requestJson(baseUrl, '/api/business/opportunities?businessId=biz-baytcare');
  assert.equal(opportunities.response.status, 200);
  assert.ok(opportunities.payload.opportunities.some((item) => item.id === opportunityId && item.isPreferred));

  const quoted = await requestJson(baseUrl, `/api/business/opportunities/${encodeURIComponent(opportunityId)}/quotes`, {
    method: 'POST',
    body: JSON.stringify({
      businessId: 'biz-baytcare',
      amount: 420,
      currency: 'AED',
      message: 'Two cleaners, supplies included, four-hour service window.',
      availableAt: 'Tomorrow, 10:00 AM'
    })
  });

  assert.equal(quoted.response.status, 201);
  const quoteId = quoted.payload.quote.id;

  const comparison = await requestJson(baseUrl, `/api/marketplace/requests?consumerId=${consumerId}`);
  assert.equal(comparison.response.status, 200);
  const request = comparison.payload.requests.find((item) => item.id === opportunityId);
  assert.equal(request.status, 'quoted');
  assert.equal(request.quotes.length, 1);
  assert.equal(request.quotes[0].amount, 420);

  const booked = await requestJson(baseUrl, `/api/marketplace/requests/${encodeURIComponent(opportunityId)}/book`, {
    method: 'POST',
    body: JSON.stringify({ consumerId, quoteId })
  });

  assert.equal(booked.response.status, 200);
  assert.equal(booked.payload.request.status, 'booked');
  assert.equal(booked.payload.request.bookedQuoteId, quoteId);
  assert.equal(booked.payload.request.quotes[0].status, 'accepted');

  const admin = await requestJson(baseUrl, '/api/admin/overview');
  assert.equal(admin.response.status, 200);
  assert.ok(admin.payload.kpis.bookings >= 1);
  assert.equal(admin.payload.kpis.gmvByCurrency.AED, 420);
});
