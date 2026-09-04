const PRICE_LABELS = {
  PRICE_LEVEL_FREE: ['Free', 'مجاني'],
  PRICE_LEVEL_INEXPENSIVE: ['Inexpensive', 'اقتصادي'],
  PRICE_LEVEL_MODERATE: ['Moderate', 'متوسط'],
  PRICE_LEVEL_EXPENSIVE: ['Expensive', 'مرتفع'],
  PRICE_LEVEL_VERY_EXPENSIVE: ['Very expensive', 'مرتفع جداً']
};

export function createGooglePlacesConnector({ apiKey, timeoutMs }) {
  return {
    id: 'google-places',
    name: 'Google Places',
    sourceType: 'places',
    mode: apiKey ? 'live' : 'not-configured',
    configured: Boolean(apiKey),
    description: 'Live local-business discovery through Google Places Text Search (New).',

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
            'places.primaryTypeDisplayName',
            'places.businessStatus'
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
      const places = (payload.places || []).filter((place) => place.businessStatus !== 'CLOSED_PERMANENTLY');
      return {
        results: places.slice(0, 8).map((place, index) => {
          const openNow = place.regularOpeningHours?.openNow;
          const priceText = place.priceLevel ? PRICE_LABELS[place.priceLevel]?.[intent.language === 'ar' ? 1 : 0] : null;
          return {
            id: place.id || `google-place-${index}`,
            source: 'Google Places',
            sourceType: 'places',
            sourceMode: 'live',
            title: place.displayName?.text || 'Local business',
            subtitle: [place.primaryTypeDisplayName?.text, place.formattedAddress].filter(Boolean).join(' · '),
            price: null,
            currency: intent.currency,
            priceLabel: priceText ? (intent.language === 'ar' ? `مستوى السعر: ${priceText}` : `Price level: ${priceText}`) : null,
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
            requestable: true,
            meta: {
              categories: intent.category === 'general' ? [] : [intent.category],
              serviceAreas: intent.city ? [intent.city] : [],
              googleMapsUri: place.googleMapsUri || null,
              placeId: place.id || null
            }
          };
        }),
        summary: `Google Places returned ${places.length} live local-business results.`
      };
    }
  };
}
