import { domainFromUrl, stripHtml } from './text.js';

export function createBraveConnector({ apiKey, timeoutMs }) {
  return {
    id: 'brave-web',
    name: 'Open Web Search',
    sourceType: 'web',
    mode: apiKey ? 'live' : 'not-configured',
    configured: Boolean(apiKey),
    description: 'Brave Search API web discovery with source attribution.',

    async search({ intent }) {
      const location = [intent.city, intent.marketName].filter(Boolean).join(', ');
      const searchQuery = location ? `${intent.query} ${location}` : intent.query;
      const url = new URL('https://api.search.brave.com/res/v1/web/search');
      url.searchParams.set('q', searchQuery);
      url.searchParams.set('count', '8');
      url.searchParams.set('country', intent.market);
      url.searchParams.set('search_lang', intent.language);
      url.searchParams.set('safesearch', 'moderate');
      url.searchParams.set('text_decorations', 'false');
      url.searchParams.set('spellcheck', 'true');

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': apiKey
        },
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Brave Search returned ${response.status}: ${details.slice(0, 180)}`);
      }

      const payload = await response.json();
      const items = payload?.web?.results || [];
      return items.slice(0, 8).map((item, index) => ({
        id: item.id || `brave-${index}-${Buffer.from(item.url || item.title || '').toString('base64url').slice(0, 18)}`,
        source: 'Open Web Search',
        sourceType: 'web',
        sourceMode: 'live',
        title: stripHtml(item.title || 'Web result'),
        subtitle: stripHtml(item.description || item.extra_snippets?.[0] || ''),
        price: null,
        currency: intent.currency,
        priceLabel: null,
        rating: null,
        reviews: null,
        availability: null,
        score: 0,
        action: intent.language === 'ar' ? 'افتح المصدر' : 'Open source',
        actionType: 'external-link',
        url: item.url || null,
        attribution: domainFromUrl(item.url),
        meta: {
          categories: intent.category === 'general' ? [] : [intent.category],
          serviceAreas: intent.city ? [intent.city] : [],
          language: item.language || null
        }
      }));
    }
  };
}
