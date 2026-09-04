import { clamp, domainFromUrl, normalizeText } from './text.js';

const SOURCE_BONUS = {
  marketplace: 20,
  places: 12,
  web: 5,
  partner: 0
};

function availabilityBonus(availability, urgency) {
  const value = normalizeText(availability || '');
  if (!value) return 0;
  if (urgency === 'now' && (value.includes('minute') || value.includes('emergency') || value.includes('now'))) return 7;
  if (urgency === 'today' && (value.includes('today') || value.includes('same day') || value.includes('afternoon'))) return 5;
  if (urgency === 'tomorrow' && value.includes('tomorrow')) return 5;
  if (urgency === 'weekend' && value.includes('weekend')) return 5;
  return 1;
}

function budgetScore(price, budget) {
  if (!price || !budget) return 0;
  if (price <= budget) {
    const closeness = price / budget;
    return closeness >= 0.55 ? 8 : 6;
  }
  const over = (price - budget) / budget;
  return -Math.min(14, 4 + over * 20);
}

export function scoreResult(result, intent) {
  let score = 48 + (SOURCE_BONUS[result.sourceType] || 0);

  if (Number.isFinite(result.rating)) score += Math.max(0, (result.rating - 3.5) * 5);
  if (Number.isFinite(result.reviews) && result.reviews > 0) score += Math.min(5, Math.log10(result.reviews + 1) * 2);

  const metaCategories = result.meta?.categories || [];
  if (intent.category !== 'general' && metaCategories.includes(intent.category)) score += 9;

  const serviceAreas = result.meta?.serviceAreas || [];
  if (intent.city && serviceAreas.some((city) => normalizeText(city) === normalizeText(intent.city))) score += 7;

  if (result.currency === intent.currency || !result.currency) score += 1;
  score += budgetScore(result.price, intent.budget);
  score += availabilityBonus(result.availability, intent.urgency);

  if (result.sourceMode === 'demo') score -= 13;
  if (result.sourceMode === 'live-mvp') score += 2;
  if (!result.url && result.sourceType !== 'marketplace') score -= 3;

  return Math.round(clamp(score, 1, 99));
}

function dedupeKey(result) {
  const domain = domainFromUrl(result.url || '');
  return `${normalizeText(result.title)}|${domain}`;
}

export function rankAndDedupe(results, intent, limit = 24) {
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
