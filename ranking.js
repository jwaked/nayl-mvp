import { clamp, domainFromUrl, normalizeText } from './lib-text.js';

const SOURCE_BONUS = {
  marketplace: 22,
  places: 14,
  'deep-search': 10,
  web: 6
};

function availabilityBonus(availability, urgency) {
  const value = normalizeText(availability || '');
  if (!value) return 0;
  if (urgency === 'now' && /(minute|emergency|now|فورا|الان)/.test(value)) return 7;
  if (urgency === 'today' && /(today|same day|اليوم)/.test(value)) return 5;
  if (urgency === 'tomorrow' && /(tomorrow|غدا)/.test(value)) return 5;
  if (urgency === 'weekend' && /(weekend|نهايه الاسبوع)/.test(value)) return 5;
  return 1;
}

function budgetScore(price, budget) {
  if (!price || !budget) return 0;
  if (price <= budget) return price / budget >= 0.55 ? 8 : 6;
  const over = (price - budget) / budget;
  return -Math.min(14, 4 + over * 20);
}

export function scoreResult(result, intent) {
  let score = 46 + (SOURCE_BONUS[result.sourceType] || 0);
  if (Number.isFinite(result.rating)) score += Math.max(0, (result.rating - 3.5) * 5);
  if (Number.isFinite(result.reviews) && result.reviews > 0) score += Math.min(5, Math.log10(result.reviews + 1) * 2);
  const categories = result.meta?.categories || [];
  if (intent.category !== 'general' && categories.includes(intent.category)) score += 9;
  const areas = result.meta?.serviceAreas || [];
  if (intent.city && areas.some((city) => normalizeText(city) === normalizeText(intent.city))) score += 7;
  if (result.currency === intent.currency || !result.currency) score += 1;
  score += budgetScore(result.price, intent.budget);
  score += availabilityBonus(result.availability, intent.urgency);
  if (!result.url && result.sourceType !== 'marketplace') score -= 3;
  return Math.round(clamp(score, 1, 99));
}

function dedupeKey(result) {
  const domain = domainFromUrl(result.url || '');
  const businessId = result.meta?.businessId || '';
  return `${normalizeText(result.title)}|${domain}|${businessId}`;
}

export function rankAndDedupe(results, intent, limit = 28) {
  const seen = new Set();
  const ranked = [];
  for (const result of results) {
    const key = dedupeKey(result);
    if (seen.has(key)) continue;
    seen.add(key);
    ranked.push({ ...result, score: scoreResult(result, intent) });
  }
  return ranked.sort((a, b) => b.score - a.score || (b.rating || 0) - (a.rating || 0)).slice(0, limit);
}
