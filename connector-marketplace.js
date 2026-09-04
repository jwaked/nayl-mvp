import { normalizeText, tokenize } from './text.js';

function localized(provider, field, language) {
  if (language === 'ar' && provider[`${field}Ar`]) return provider[`${field}Ar`];
  return provider[field];
}

function providerMatch(provider, intent, queryTokens) {
  let score = 0;
  if (provider.market === intent.market) score += 20;
  else return -100;

  if (intent.category === 'general') score += 4;
  else if (provider.categories.includes(intent.category)) score += 18;
  else return -100;

  if (intent.city && provider.serviceAreas.some((area) => normalizeText(area) === normalizeText(intent.city))) score += 15;

  const haystack = normalizeText([
    provider.title,
    provider.titleAr,
    provider.description,
    provider.descriptionAr,
    ...(provider.keywords || []),
    ...(provider.categories || [])
  ].join(' '));
  const overlap = queryTokens.filter((token) => haystack.includes(token)).length;
  score += Math.min(12, overlap * 2);

  if (intent.budget && provider.currency === intent.currency) {
    score += provider.price <= intent.budget ? 10 : -Math.min(10, Math.ceil((provider.price - intent.budget) / Math.max(1, intent.budget) * 10));
  }

  return score;
}

export function createMarketplaceConnector({ store }) {
  return {
    id: 'marketplace',
    name: 'NAYL Marketplace',
    sourceType: 'marketplace',
    mode: 'live-mvp',
    configured: true,
    description: 'First-party seeded providers and marketplace actions.',

    async search({ intent }) {
      const data = await store.snapshot();
      const queryTokens = tokenize(intent.query);
      const matches = data.providers
        .map((provider) => ({ provider, match: providerMatch(provider, intent, queryTokens) }))
        .filter(({ match }) => match > 0)
        .sort((a, b) => b.match - a.match || b.provider.rating - a.provider.rating)
        .slice(0, 8);

      return matches.map(({ provider }) => ({
        id: provider.id,
        source: 'NAYL Marketplace',
        sourceType: 'marketplace',
        sourceMode: 'live-mvp',
        title: localized(provider, 'title', intent.language),
        subtitle: localized(provider, 'description', intent.language),
        price: provider.price,
        currency: provider.currency,
        priceLabel: intent.language === 'ar'
          ? `ابتداءً من ${provider.price} ${provider.currency}`
          : `From ${provider.currency} ${provider.price}`,
        rating: provider.rating,
        reviews: provider.reviews,
        availability: localized(provider, 'availability', intent.language),
        score: 0,
        action: intent.language === 'ar' ? 'اطلب عرض سعر' : 'Request quote',
        actionType: 'marketplace-request',
        url: null,
        attribution: intent.language === 'ar' ? 'مزود ضمن سوق NAYL التجريبي' : 'Provider in the NAYL MVP marketplace',
        meta: {
          businessId: provider.businessId,
          categories: provider.categories,
          serviceAreas: provider.serviceAreas,
          providerId: provider.id
        }
      }));
    }
  };
}
