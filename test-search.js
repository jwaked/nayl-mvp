import test from 'node:test';
import assert from 'node:assert/strict';
import { requestJson, startTestApp } from './test-helpers.js';

test('search reports live, not-configured, and demo connectors without pretending', async (t) => {
  const { baseUrl } = await startTestApp(t);
  const { response, payload } = await requestJson(baseUrl, '/api/search', {
    method: 'POST',
    body: JSON.stringify({
      query: 'I need a reliable cleaner in Dubai today under AED 250',
      market: 'AE',
      city: 'Dubai',
      locale: 'en'
    })
  });

  assert.equal(response.status, 200);
  assert.equal(payload.intent.category, 'cleaning');
  assert.equal(payload.intent.budget, 250);

  const connectorById = Object.fromEntries(payload.connectors.map((connector) => [connector.id, connector]));
  assert.equal(connectorById.marketplace.mode, 'live-mvp');
  assert.equal(connectorById.marketplace.status, 'live');
  assert.equal(connectorById['brave-web'].status, 'not-configured');
  assert.equal(connectorById['google-places'].status, 'not-configured');
  assert.equal(connectorById['partner-demo'].status, 'demo');

  const marketplaceResults = payload.results.filter((result) => result.sourceType === 'marketplace');
  assert.ok(marketplaceResults.length >= 2);
  assert.ok(marketplaceResults.every((result) => result.meta.categories.includes('cleaning')));
  assert.ok(payload.results.some((result) => result.sourceMode === 'demo'));

  for (const result of payload.results) {
    assert.equal(typeof result.id, 'string');
    assert.equal(typeof result.source, 'string');
    assert.equal(typeof result.sourceType, 'string');
    assert.equal(typeof result.sourceMode, 'string');
    assert.equal(typeof result.title, 'string');
    assert.equal(typeof result.score, 'number');
    assert.ok(result.score >= 1 && result.score <= 99);
  }
});

test('search localizes first-party marketplace results in Arabic', async (t) => {
  const { baseUrl } = await startTestApp(t);
  const { response, payload } = await requestJson(baseUrl, '/api/search', {
    method: 'POST',
    body: JSON.stringify({
      query: 'أحتاج فني تكييف في الرياض اليوم بأقل من 350 SAR',
      market: 'SA',
      city: 'Riyadh',
      locale: 'ar'
    })
  });

  assert.equal(response.status, 200);
  assert.equal(payload.intent.category, 'ac-repair');
  assert.equal(payload.intent.market, 'SA');
  assert.ok(payload.results.some((result) => result.sourceType === 'marketplace' && /[\u0600-\u06FF]/.test(result.title)));
});
