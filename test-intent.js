import test from 'node:test';
import assert from 'node:assert/strict';
import { extractIntent } from './intent.js';
import { MARKETS, CATEGORIES } from './seed.js';

const catalogue = { markets: MARKETS, categories: CATEGORIES };

test('extracts English category, city, budget, and urgency', () => {
  const intent = extractIntent(
    'I need a reliable cleaner in Dubai today under AED 250',
    { market: 'AE', city: 'Dubai', locale: 'en' },
    catalogue
  );

  assert.equal(intent.category, 'cleaning');
  assert.equal(intent.market, 'AE');
  assert.equal(intent.city, 'Dubai');
  assert.equal(intent.budget, 250);
  assert.equal(intent.currency, 'AED');
  assert.equal(intent.urgency, 'today');
  assert.ok(intent.confidence >= 90);
});

test('extracts Arabic AC-repair demand in Riyadh', () => {
  const intent = extractIntent(
    'أحتاج فني تكييف في الرياض اليوم بأقل من 350 SAR',
    { market: 'AE', city: 'Dubai', locale: 'ar' },
    catalogue
  );

  assert.equal(intent.language, 'ar');
  assert.equal(intent.category, 'ac-repair');
  assert.equal(intent.market, 'SA');
  assert.equal(intent.city, 'Riyadh');
  assert.equal(intent.budget, 350);
  assert.equal(intent.currency, 'SAR');
  assert.equal(intent.urgency, 'today');
});

test('uses selected GCC context when location is not explicit', () => {
  const intent = extractIntent(
    'Need a photographer this weekend',
    { market: 'QA', city: 'Doha', locale: 'en' },
    catalogue
  );

  assert.equal(intent.category, 'photography');
  assert.equal(intent.market, 'QA');
  assert.equal(intent.city, 'Doha');
  assert.equal(intent.urgency, 'weekend');
  assert.equal(intent.usedContext.market, true);
  assert.equal(intent.usedContext.city, true);
});

test('does not confuse the phrase a cleaner with the AC alias a/c', () => {
  const intent = extractIntent(
    'Need a cleaner in Dubai today under AED 250',
    { market: 'AE', city: 'Dubai', locale: 'en' },
    catalogue
  );

  assert.equal(intent.category, 'cleaning');
});
