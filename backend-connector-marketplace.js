import { normalizeText } from './backend-lib-text.js';

function matches(business, intent) {
  if (business.status !== 'verified' || !business.acceptingLeads) return false;
  if (business.market !== intent.market) return false;
  if (intent.category !== 'general' && !business.categories.includes(intent.category)) return false;
  if (intent.city && !business.serviceAreas.some((city) => normalizeText(city) === normalizeText(intent.city))) return false;
  return true;
}

export function createMarketplaceConnector({ store }) {
  return {
    id: 'nayl-marketplace',
    name: 'NAYL Marketplace',
    sourceType: 'marketplace',
    mode: 'live',
    configured: true,
    description: 'Verified businesses registered directly with NAYL.',

    async search({ intent }) {
      const data = await store.snapshot();
      const businesses = data.businesses.filter((business) => matches(business, intent));
      return {
        results: businesses.slice(0, 12).map((business) => ({
          id: `business-${business.id}`,
          source: 'NAYL Marketplace',
          sourceType: 'marketplace',
          sourceMode: 'live',
          title: intent.language === 'ar' && business.nameAr ? business.nameAr : business.name,
          subtitle: business.description,
          price: business.priceFrom,
          currency: business.currency,
          priceLabel: business.priceFrom
            ? (intent.language === 'ar' ? `ابتداءً من ${business.currency} ${business.priceFrom}` : `From ${business.currency} ${business.priceFrom}`)
            : null,
          rating: Number.isFinite(business.rating) ? business.rating : null,
          reviews: Number.isFinite(business.reviewCount) ? business.reviewCount : null,
          availability: business.responseTimeMinutes
            ? (intent.language === 'ar' ? `يرد عادة خلال ${business.responseTimeMinutes} دقيقة` : `Usually replies in ${business.responseTimeMinutes} min`)
            : (intent.language === 'ar' ? 'اطلب التوفر' : 'Request availability'),
          score: 0,
          action: intent.language === 'ar' ? 'اطلب عرض سعر' : 'Request quote',
          actionType: 'request-quote',
          url: business.website || null,
          attribution: 'NAYL Marketplace',
          requestable: true,
          meta: {
            businessId: business.id,
            categories: business.categories,
            serviceAreas: business.serviceAreas,
            verified: true
          }
        })),
        summary: businesses.length
          ? `${businesses.length} verified NAYL businesses match this demand.`
          : 'No verified NAYL business currently matches this demand; a request can still be opened for future matching.'
      };
    }
  };
}
