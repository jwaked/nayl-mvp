import { domainFromUrl, safeExternalUrl, stripHtml, truncate } from './backend-lib-text.js';

export function createBraveConnector({ apiKey, timeoutMs }) {
  return {
    id: 'brave-web',
    name: 'Brave Web Search',
    sourceType: 'web',
    mode: apiKey ? 'live' : 'setup-required',
    configured: Boolean(apiKey),
    description: 'Live public-web discovery through Brave Search API.',

    async search({ intent }) {
      const location = [intent.city, intent.marketName].filter(Boolean).join(', ');
      const url = new URL('https://api.search.brave.com/res/v1/web/search');
      url.searchParams.set('q', [intent.query, location].filter(Boolean).join(' '));
      url.searchParams.set('count', '8');
      url.searchParams.set('country', intent.market.toLowerCase());
      url.searchParams.set('search_lang', intent.language);
      url.searchParams.set('safesearch', 'moderate');
      url.searchParams.set('text_decorations', 'false');
      url.searchParams.set('spellcheck', 'true');
      url.searchParams.set('extra_snippets', 'true');

      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Brave Search returned ${response.status}: ${details.slice(0, 180)}`);
      }
      const payload = await response.json();
      const items = payload?.web?.results || [];
      return {
        results: items.slice(0, 8).flatMap((item, index) => {
          const externalUrl = safeExternalUrl(item.url);
          if (!externalUrl) return [];
          return [{
            id: item.id || `brave-${index}-${Buffer.from(externalUrl).toString('base64url').slice(0, 18)}`,
            source: 'Brave Web Search',
            sourceType: 'web',
            sourceMode: 'live',
            title: stripHtml(item.title || 'Web result'),
            subtitle: truncate(stripHtml(item.description || item.extra_snippets?.[0] || ''), 320),
            price: null,
            currency: intent.currency,
            priceLabel: null,
            rating: null,
            reviews: null,
            availability: null,
            score: 0,
            action: intent.language === 'ar' ? 'افتح المصدر' : 'Open source',
            actionType: 'external-link',
            url: externalUrl,
            attribution: domainFromUrl(externalUrl),
            requestable: true,
            meta: {
              categories: intent.category === 'general' ? [] : [intent.category],
              serviceAreas: intent.city ? [intent.city] : [],
              language: item.language || null
            }
          }];
        }),
        summary: `Brave returned ${items.length} public-web results.`
      };
    }
  };
}
