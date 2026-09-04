const PRICE_LABELS = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: 'Inexpensive',
  PRICE_LEVEL_MODERATE: 'Moderate',
  PRICE_LEVEL_EXPENSIVE: 'Expensive',
  PRICE_LEVEL_VERY_EXPENSIVE: 'Very expensive'
};

const PRICE_LABELS_AR = {
  PRICE_LEVEL_FREE: 'مجاني',
  PRICE_LEVEL_INEXPENSIVE: 'اقتصادي',
  PRICE_LEVEL_MODERATE: 'متوسط',
  PRICE_LEVEL_EXPENSIVE: 'مرتفع',
  PRICE_LEVEL_VERY_EXPENSIVE: 'مرتفع جداً'
};

export function createGooglePlacesConnector({ apiKey, timeoutMs }) {
  return {
    id: 'google-places',
    name: 'Local Places',
    sourceType: 'places',
    mode: apiKey ? 'live' : 'not-configured',
    configured: Boolean(apiKey),
    description: 'Google Places Text Search with explicit field masks.',

    async search({ intent }) {
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': [
            'places.id',
            'places.displayName',
            'places.formattedAddress',
            'places.rating',
            'places.userRatingCount',
            'places.priceLevel',
            'places.googleMapsUri',
            'places.websiteUri',
            'places.regularOpeningHours.openNow',
            'places.primaryTypeDisplayName'
          ].join(',')
        },
        body: JSON.stringify({
          textQuery: [intent.query, intent.city, intent.marketName].filter(Boolean).join(' '),
          languageCode: intent.language,
          regionCode: intent.market,
          pageSize: 8,
          includePureServiceAreaBusinesses: true
        }),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Google Places returned ${response.status}: ${details.slice(0, 180)}`);
      }

      const payload = await response.json();
      return (payload.places || []).slice(0, 8).map((place, index) => {
        const openNow = place.regularOpeningHours?.openNow;
        const priceLabel = place.priceLevel
          ? (intent.language === 'ar' ? PRICE_LABELS_AR[place.priceLevel] : PRICE_LABELS[place.priceLevel])
          : null;

        return {
          id: place.id || `place-${index}`,
          source: 'Local Places',
          sourceType: 'places',
          sourceMode: 'live',
          title: place.displayName?.text || 'Local place',
          subtitle: [place.primaryTypeDisplayName?.text, place.formattedAddress].filter(Boolean).join(' · '),
          price: null,
          currency: intent.currency,
          priceLabel: priceLabel
            ? (intent.language === 'ar' ? `مستوى السعر: ${priceLabel}` : `Price level: ${priceLabel}`)
            : null,
          rating: Number.isFinite(place.rating) ? place.rating : null,
          reviews: Number.isFinite(place.userRatingCount) ? place.userRatingCount : null,
          availability: openNow === true
            ? (intent.language === 'ar' ? 'مفتوح الآن' : 'Open now')
            : (intent.language === 'ar' ? 'تحقق من المواعيد' : 'Check availability'),
          score: 0,
          action: intent.language === 'ar' ? 'اعرض المكان' : 'View place',
          actionType: 'external-link',
          url: place.websiteUri || place.googleMapsUri || null,
          attribution: 'Google Places',
          meta: {
            categories: intent.category === 'general' ? [] : [intent.category],
            serviceAreas: intent.city ? [intent.city] : [],
            googleMapsUri: place.googleMapsUri || null
          }
        };
      });
    }
  };
}
