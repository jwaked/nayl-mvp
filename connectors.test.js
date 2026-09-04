import test from 'node:test';
import assert from 'node:assert/strict';
import { createGooglePlacesConnector } from './backend-connector-google-places.js';
import { createBraveConnector } from './backend-connector-brave.js';
import { createOpenAiIntelligence } from './backend-connector-openai.js';
import { MARKETS, CATEGORIES } from './backend-data-seed.js';

const intent = {
  query: 'AC repair in Dubai today under AED 500',
  category: 'ac-repair',
  categoryLabel: 'AC repair',
  market: 'AE',
  marketName: 'United Arab Emirates',
  city: 'Dubai',
  budget: 500,
  currency: 'AED',
  urgency: 'today',
  language: 'en'
};

test('builds and parses the live Google Places request contract', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let captured;
  globalThis.fetch = async (input, init) => {
    captured = { input: String(input), init };
    return new Response(JSON.stringify({
      places: [{
        id: 'places/abc',
        displayName: { text: 'Verified Cooling LLC' },
        formattedAddress: 'Dubai, United Arab Emirates',
        rating: 4.8,
        userRatingCount: 210,
        googleMapsUri: 'https://maps.google.com/?cid=123',
        websiteUri: 'https://cooling.example/services',
        regularOpeningHours: { openNow: true },
        primaryTypeDisplayName: { text: 'Air conditioning repair service' },
        businessStatus: 'OPERATIONAL'
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const connector = createGooglePlacesConnector({ apiKey: 'google-test-key', timeoutMs: 2_000 });
  const output = await connector.search({ intent });
  assert.equal(captured.input, 'https://places.googleapis.com/v1/places:searchText');
  assert.equal(captured.init.method, 'POST');
  assert.equal(captured.init.headers['X-Goog-Api-Key'], 'google-test-key');
  assert.match(captured.init.headers['X-Goog-FieldMask'], /places\.displayName/);
  const body = JSON.parse(captured.init.body);
  assert.match(body.textQuery, /Dubai/);
  assert.equal(body.regionCode, 'AE');
  assert.equal(output.results.length, 1);
  assert.equal(output.results[0].sourceMode, 'live');
  assert.equal(output.results[0].title, 'Verified Cooling LLC');
});

test('builds and parses the live Brave Search request contract', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let captured;
  globalThis.fetch = async (input, init) => {
    captured = { input: String(input), init };
    return new Response(JSON.stringify({
      web: {
        results: [{
          id: 'brave-1',
          title: '<strong>Cooling Provider</strong>',
          url: 'https://provider.example/ac-repair?utm_source=test',
          description: 'Residential AC diagnosis and repair in Dubai.',
          language: 'en'
        }]
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const connector = createBraveConnector({ apiKey: 'brave-test-key', timeoutMs: 2_000 });
  const output = await connector.search({ intent });
  const requestUrl = new URL(captured.input);
  assert.equal(requestUrl.origin + requestUrl.pathname, 'https://api.search.brave.com/res/v1/web/search');
  assert.match(requestUrl.searchParams.get('q'), /Dubai/);
  assert.equal(captured.init.headers['X-Subscription-Token'], 'brave-test-key');
  assert.equal(output.results.length, 1);
  assert.equal(output.results[0].title, 'Cooling Provider');
  assert.equal(output.results[0].sourceMode, 'live');
});

test('uses OpenAI structured intent and source-verified Responses API deep search', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const requestBodies = [];
  let call = 0;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://api.openai.com/v1/responses');
    assert.equal(init.headers.Authorization, 'Bearer openai-test-key');
    requestBodies.push(JSON.parse(init.body));
    call += 1;
    if (call === 1) {
      return new Response(JSON.stringify({
        output_text: JSON.stringify({
          category: 'ac-repair',
          market: 'AE',
          city: 'Dubai',
          budget: 500,
          urgency: 'today',
          language: 'en',
          confidence: 96,
          goal: 'Book AC repair in Dubai today',
          constraints: ['Budget AED 500']
        })
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      output_text: JSON.stringify({
        answer: 'One verified source was found.',
        results: [{
          title: 'Official Cooling Provider',
          url: 'https://official-provider.example/ac-repair?utm_source=openai',
          summary: 'Official service page for AC repair in Dubai.',
          sourceName: 'Official Cooling Provider',
          priceLabel: '',
          availability: 'Contact provider'
        }, {
          title: 'Invented URL must be discarded',
          url: 'https://not-in-sources.example/',
          summary: 'This URL was not returned as a source.',
          sourceName: 'Unknown',
          priceLabel: '',
          availability: ''
        }]
      }),
      output: [{
        type: 'web_search_call',
        status: 'completed',
        action: {
          type: 'search',
          sources: [{
            type: 'url',
            url: 'https://official-provider.example/ac-repair',
            title: 'Official Cooling Provider'
          }]
        }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const openAi = createOpenAiIntelligence({
    apiKey: 'openai-test-key',
    model: 'gpt-5-mini',
    deepModel: 'gpt-5.5',
    timeoutMs: 2_000,
    deepTimeoutMs: 3_000
  });

  const extracted = await openAi.extractIntent({
    query: intent.query,
    context: { market: 'AE', city: 'Dubai', locale: 'en' },
    catalogue: { markets: MARKETS, categories: CATEGORIES }
  });
  assert.equal(extracted.category, 'ac-repair');
  assert.equal(requestBodies[0].text.format.type, 'json_schema');
  assert.equal(requestBodies[0].text.format.strict, true);

  const deep = await openAi.deepConnector.search({ intent });
  assert.equal(requestBodies[1].tools[0].type, 'web_search');
  assert.equal(requestBodies[1].tools[0].user_location.country, 'AE');
  assert.equal(requestBodies[1].tool_choice, 'required');
  assert.deepEqual(requestBodies[1].include, ['web_search_call.action.sources']);
  assert.equal(deep.results.length, 1, 'only URLs present in actual web-search sources should survive');
  assert.equal(deep.results[0].title, 'Official Cooling Provider');
  assert.equal(deep.results[0].sourceMode, 'live');
  assert.equal(deep.sources.length, 1);
});

test('builds the live Resend notification request without exposing credentials to the browser', async (t) => {
  const { createEmailConnector } = await import('./backend-connector-email.js');
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let captured;
  globalThis.fetch = async (input, init) => {
    captured = { input: String(input), init };
    return new Response(JSON.stringify({ id: 'email_123' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const email = createEmailConnector({
    apiKey: 'resend-test-key',
    from: 'NAYL <quotes@example.com>',
    appBaseUrl: 'https://nayl.example',
    timeoutMs: 2_000
  });
  const result = await email.send({
    to: 'buyer@example.com',
    subject: 'New quote',
    heading: 'A provider sent a quote',
    body: 'Open NAYL to compare it.',
    buttonLabel: 'Review quote',
    buttonPath: '/#requests'
  });

  assert.equal(result.sent, true);
  assert.equal(captured.input, 'https://api.resend.com/emails');
  assert.equal(captured.init.headers.Authorization, 'Bearer resend-test-key');
  const body = JSON.parse(captured.init.body);
  assert.deepEqual(body.to, ['buyer@example.com']);
  assert.match(body.html, /https:\/\/nayl\.example\/#requests/);
});
