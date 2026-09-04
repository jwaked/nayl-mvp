import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createNaylApp } from './backend-app.js';
import { SupabaseStore } from './lib-store.js';

async function createHarness() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nayl-test-'));
  const config = {
    nodeEnv: 'test',
    host: '127.0.0.1',
    port: 0,
    appBaseUrl: 'http://127.0.0.1',
    dataFile: path.join(tempDir, 'nayl.json'),
    supabaseUrl: '',
    supabaseSecretKey: '',
    supabaseServiceRoleKey: '',
    sessionSecret: 'test-session-secret-that-is-at-least-32-characters',
    sessionSecretWasGenerated: false,
    defaultMarket: 'AE',
    defaultCity: 'Dubai',
    adminEmail: 'admin@nayl.test',
    adminPassword: 'Admin1234',
    autoVerifyBusinesses: false,
    openaiApiKey: '',
    openaiModel: 'gpt-5-mini',
    openaiDeepModel: 'gpt-5.5',
    braveSearchApiKey: '',
    googleMapsApiKey: '',
    resendApiKey: '',
    emailFrom: '',
    connectorTimeoutMs: 2_000,
    deepSearchTimeoutMs: 3_000,
    rateLimitWindowMs: 60_000,
    rateLimitMax: 1_000
  };
  const app = await createNaylApp(config);
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function request(url, { token, method = 'GET', body, headers = {} } = {}) {
    const response = await fetch(`${baseUrl}${url}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    return { response, payload };
  }

  async function close() {
    await new Promise((resolve, reject) => app.server.close((error) => error ? reject(error) : resolve()));
    await app.store.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  return { ...app, request, close, baseUrl };
}

test('serves three separate portals at dedicated routes', async (t) => {
  const harness = await createHarness();
  t.after(harness.close);

  const consumer = await harness.request('/');
  assert.equal(consumer.response.status, 200);
  assert.match(consumer.payload, /data-portal="consumer"/);
  assert.doesNotMatch(consumer.payload, /href="\/business"|href="\/admin"/);

  const business = await harness.request('/business');
  assert.equal(business.response.status, 200);
  assert.match(business.payload, /NAYL Business/);
  assert.match(business.payload, /Qualified opportunities/);

  const admin = await harness.request('/admin');
  assert.equal(admin.response.status, 200);
  assert.match(admin.payload, /NAYL Admin/);
  assert.match(admin.payload, /Business verification/);
});

test('discloses connector state and starts without fabricated providers', async (t) => {
  const harness = await createHarness();
  t.after(harness.close);

  const config = await harness.request('/api/config');
  assert.equal(config.response.status, 200);
  assert.equal(config.payload.storageMode, 'json-local');
  assert.equal(config.payload.connectors.find((item) => item.id === 'nayl-marketplace').mode, 'live');
  assert.equal(config.payload.connectors.find((item) => item.id === 'google-places').mode, 'not-configured');
  assert.equal(config.payload.connectors.find((item) => item.id === 'brave-web').mode, 'not-configured');
  assert.equal(config.payload.connectors.find((item) => item.id === 'openai-deep-search').mode, 'not-configured');

  const search = await harness.request('/api/search', {
    method: 'POST',
    body: { query: 'I need AC repair in Dubai today under AED 500', market: 'AE', city: 'Dubai', locale: 'en' }
  });
  assert.equal(search.response.status, 200);
  assert.equal(search.payload.intent.category, 'ac-repair');
  assert.equal(search.payload.intent.city, 'Dubai');
  assert.equal(search.payload.intent.budget, 500);
  assert.deepEqual(search.payload.results, []);
});

test('persists the full consumer request to verified business quote to booking workflow', async (t) => {
  const harness = await createHarness();
  t.after(harness.close);

  const consumerSession = await harness.request('/api/consumer/session', { method: 'POST', body: {} });
  assert.equal(consumerSession.response.status, 201);
  const consumerToken = consumerSession.payload.token;

  const registration = await harness.request('/api/business/register', {
    method: 'POST',
    body: {
      name: 'Al Noor Cooling Services',
      nameAr: 'خدمات النور للتكييف',
      email: 'team@alnoor.example',
      password: 'Service123',
      phone: '+971500000000',
      website: 'https://example.com/',
      market: 'AE',
      serviceAreas: ['Dubai'],
      categories: ['ac-repair'],
      description: 'Licensed technicians providing residential air-conditioning diagnostics and repair across Dubai.',
      priceFrom: 180
    }
  });
  assert.equal(registration.response.status, 201);
  assert.equal(registration.payload.business.status, 'pending');
  const businessToken = registration.payload.token;
  const businessId = registration.payload.business.id;

  const pendingFeed = await harness.request('/api/business/opportunities', { token: businessToken });
  assert.equal(pendingFeed.response.status, 403);

  const adminLogin = await harness.request('/api/admin/login', {
    method: 'POST',
    body: { email: 'admin@nayl.test', password: 'Admin1234' }
  });
  assert.equal(adminLogin.response.status, 200);
  const adminToken = adminLogin.payload.token;

  const verification = await harness.request(`/api/admin/businesses/${encodeURIComponent(businessId)}/status`, {
    token: adminToken,
    method: 'PATCH',
    body: { status: 'verified' }
  });
  assert.equal(verification.response.status, 200);
  assert.equal(verification.payload.business.status, 'verified');

  const liveSearch = await harness.request('/api/search', {
    method: 'POST',
    body: { query: 'AC repair in Dubai today under AED 500', market: 'AE', city: 'Dubai', locale: 'en' }
  });
  assert.equal(liveSearch.response.status, 200);
  const providerResult = liveSearch.payload.results.find((item) => item.meta?.businessId === businessId);
  assert.ok(providerResult, 'verified business should appear in marketplace search');
  assert.equal(providerResult.sourceMode, 'live');

  const created = await harness.request('/api/consumer/requests', {
    token: consumerToken,
    method: 'POST',
    body: {
      contact: { name: 'Sara Ahmed', email: 'sara@example.com', phone: '+971511111111' },
      query: liveSearch.payload.intent.query,
      category: liveSearch.payload.intent.category,
      market: liveSearch.payload.intent.market,
      city: liveSearch.payload.intent.city,
      budget: liveSearch.payload.intent.budget,
      urgency: liveSearch.payload.intent.urgency,
      details: 'The living room unit is blowing warm air.',
      sourceResult: providerResult
    }
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.payload.request.status, 'open');
  assert.equal(created.payload.request.matchedBusinessCount, 1);
  const requestId = created.payload.request.id;

  const opportunities = await harness.request('/api/business/opportunities', { token: businessToken });
  assert.equal(opportunities.response.status, 200);
  assert.equal(opportunities.payload.opportunities.length, 1);
  assert.equal(opportunities.payload.opportunities[0].id, requestId);
  assert.equal(opportunities.payload.opportunities[0].consumerContact, null);

  const quote = await harness.request(`/api/business/opportunities/${encodeURIComponent(requestId)}/quotes`, {
    token: businessToken,
    method: 'POST',
    body: {
      amount: 325,
      currency: 'AED',
      message: 'Includes diagnosis, standard spare parts, labour, and a 30-day service warranty.',
      availableAt: 'Tomorrow, 10:00 AM',
      validUntil: new Date(Date.now() + 86_400_000).toISOString()
    }
  });
  assert.equal(quote.response.status, 201);
  assert.equal(quote.payload.quote.status, 'submitted');

  const consumerRequests = await harness.request('/api/consumer/requests', { token: consumerToken });
  assert.equal(consumerRequests.response.status, 200);
  assert.equal(consumerRequests.payload.requests[0].status, 'quoted');
  assert.equal(consumerRequests.payload.requests[0].quotes.length, 1);

  const acceptance = await harness.request(`/api/consumer/requests/${encodeURIComponent(requestId)}/accept`, {
    token: consumerToken,
    method: 'POST',
    body: { quoteId: quote.payload.quote.id }
  });
  assert.equal(acceptance.response.status, 200);
  assert.equal(acceptance.payload.request.status, 'booked');
  assert.equal(acceptance.payload.booking.status, 'confirmed');
  assert.equal(acceptance.payload.booking.amount, 325);

  const wonFeed = await harness.request('/api/business/opportunities', { token: businessToken });
  assert.equal(wonFeed.response.status, 200);
  assert.equal(wonFeed.payload.opportunities[0].won, true);
  assert.equal(wonFeed.payload.opportunities[0].consumerContact.email, 'sara@example.com');

  const overview = await harness.request('/api/admin/overview', { token: adminToken });
  assert.equal(overview.response.status, 200);
  assert.equal(overview.payload.kpis.registeredBusinesses, 1);
  assert.equal(overview.payload.kpis.quoteRequests, 1);
  assert.equal(overview.payload.kpis.quotesSubmitted, 1);
  assert.equal(overview.payload.kpis.bookings, 1);
  assert.equal(overview.payload.kpis.gmvByCurrency.AED, 325);
});

test('protects business, consumer, and admin data by role', async (t) => {
  const harness = await createHarness();
  t.after(harness.close);

  assert.equal((await harness.request('/api/consumer/requests')).response.status, 401);
  assert.equal((await harness.request('/api/business/me')).response.status, 401);
  assert.equal((await harness.request('/api/admin/overview')).response.status, 401);

  const session = await harness.request('/api/consumer/session', { method: 'POST', body: {} });
  assert.equal((await harness.request('/api/admin/overview', { token: session.payload.token })).response.status, 403);
});


test('rejects invalid request data and expired quote validity', async (t) => {
  const harness = await createHarness();
  t.after(harness.close);

  const consumerSession = await harness.request('/api/consumer/session', { method: 'POST', body: {} });
  const invalidRequest = await harness.request('/api/consumer/requests', {
    token: consumerSession.payload.token,
    method: 'POST',
    body: {
      contact: { name: 'Test Buyer', email: 'buyer@example.com' },
      query: 'Need an electrician',
      category: 'not-a-real-category',
      market: 'AE',
      city: 'Dubai',
      urgency: 'today'
    }
  });
  assert.equal(invalidRequest.response.status, 400);

  const registration = await harness.request('/api/business/register', {
    method: 'POST',
    body: {
      name: 'Fast Cool Technical Services',
      email: 'fastcool@example.com',
      password: 'Service123',
      market: 'AE',
      serviceAreas: ['Dubai'],
      categories: ['ac-repair'],
      description: 'Qualified technicians for residential air-conditioning maintenance and repair in Dubai.'
    }
  });
  const adminLogin = await harness.request('/api/admin/login', {
    method: 'POST',
    body: { email: 'admin@nayl.test', password: 'Admin1234' }
  });
  await harness.request(`/api/admin/businesses/${encodeURIComponent(registration.payload.business.id)}/status`, {
    token: adminLogin.payload.token,
    method: 'PATCH',
    body: { status: 'verified' }
  });
  const validRequest = await harness.request('/api/consumer/requests', {
    token: consumerSession.payload.token,
    method: 'POST',
    body: {
      contact: { name: 'Test Buyer', email: 'buyer@example.com' },
      query: 'Need AC repair in Dubai',
      category: 'ac-repair',
      market: 'AE',
      city: 'Dubai',
      urgency: 'today'
    }
  });
  const expiredQuote = await harness.request(`/api/business/opportunities/${encodeURIComponent(validRequest.payload.request.id)}/quotes`, {
    token: registration.payload.token,
    method: 'POST',
    body: {
      amount: 250,
      currency: 'AED',
      message: 'Diagnosis and repair labour with a written service report included.',
      availableAt: 'Today after 4 PM',
      validUntil: new Date(Date.now() - 60_000).toISOString()
    }
  });
  assert.equal(expiredQuote.response.status, 400);
});

test('uses the correct Supabase authentication header for current and legacy keys', () => {
  const current = new SupabaseStore('https://example.supabase.co', 'sb_secret_example');
  assert.equal(current.headers().apikey, 'sb_secret_example');
  assert.equal(current.headers().Authorization, undefined);

  const legacy = new SupabaseStore('https://example.supabase.co', 'eyJlegacy-service-role');
  assert.equal(legacy.headers().apikey, 'eyJlegacy-service-role');
  assert.equal(legacy.headers().Authorization, 'Bearer eyJlegacy-service-role');
});
