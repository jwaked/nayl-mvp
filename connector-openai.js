import { domainFromUrl, safeExternalUrl, truncate } from './lib-text.js';

function responseText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const chunks = [];
  for (const item of payload?.output || []) {
    if (item?.type !== 'message') continue;
    for (const content of item.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

function canonicalUrl(value) {
  const safe = safeExternalUrl(value);
  if (!safe) return null;
  try {
    const url = new URL(safe);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|gclid$|fbclid$|mc_cid$|mc_eid$)/i.test(key)) url.searchParams.delete(key);
    }
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return null;
  }
}

function collectSources(value, output = [], seen = new Set()) {
  if (!value || typeof value !== 'object') return output;
  if (Array.isArray(value)) {
    for (const item of value) collectSources(item, output, seen);
    return output;
  }
  const url = safeExternalUrl(value.url || value.uri || value.link);
  const canonical = canonicalUrl(url);
  if (url && canonical && !seen.has(canonical)) {
    seen.add(canonical);
    output.push({
      url,
      title: String(value.title || value.name || domainFromUrl(url)).trim().slice(0, 240),
      domain: domainFromUrl(url)
    });
  }
  for (const nested of Object.values(value)) collectSources(nested, output, seen);
  return output;
}

async function openAiRequest({ apiKey, timeoutMs, body }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI returned ${response.status}: ${details.slice(0, 300)}`);
  }
  return response.json();
}

export function createOpenAiIntelligence({ apiKey, model, deepModel, timeoutMs, deepTimeoutMs }) {
  const configured = Boolean(apiKey);

  return {
    intentDescriptor: {
      id: 'openai-intent',
      name: 'OpenAI Buyer Intelligence',
      sourceType: 'ai',
      mode: configured ? 'live' : 'not-configured',
      configured,
      description: 'OpenAI Responses API structured intent extraction.'
    },

    deepDescriptor: {
      id: 'openai-deep-search',
      name: 'OpenAI Deep Search',
      sourceType: 'deep-search',
      mode: configured ? 'live' : 'not-configured',
      configured,
      description: 'Agentic web research through the OpenAI Responses API web_search tool.'
    },

    async extractIntent({ query, context, catalogue }) {
      if (!configured) return null;
      const categoryIds = catalogue.categories.map((item) => item.id);
      const marketCodes = catalogue.markets.map((item) => item.code);
      const payload = await openAiRequest({
        apiKey,
        timeoutMs,
        body: {
          model,
          store: false,
          instructions: [
            'You extract a buyer intent for NAYL, a GCC service-buying application.',
            'Use only the supported category and GCC market enums supplied in the schema.',
            'Resolve the city to a real city in the selected GCC market when possible.',
            'Set budget to 0 when the user did not provide one. Do not invent a budget.',
            'Return the user language as en or ar. Keep goal concise and actionable.'
          ].join(' '),
          input: `Buyer request: ${query}\nCurrent context: ${JSON.stringify(context)}\nSupported markets: ${catalogue.markets.map((m) => `${m.code}: ${m.name}, cities ${m.cities.map((c) => c.name).join(', ')}`).join(' | ')}`,
          text: {
            format: {
              type: 'json_schema',
              name: 'nayl_buyer_intent',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  category: { type: 'string', enum: categoryIds },
                  market: { type: 'string', enum: marketCodes },
                  city: { type: 'string' },
                  budget: { type: 'number', minimum: 0 },
                  urgency: { type: 'string', enum: ['now', 'today', 'tomorrow', 'weekend', 'this-week', 'flexible'] },
                  language: { type: 'string', enum: ['en', 'ar'] },
                  confidence: { type: 'integer', minimum: 1, maximum: 99 },
                  goal: { type: 'string' },
                  constraints: { type: 'array', items: { type: 'string' }, maxItems: 8 }
                },
                required: ['category', 'market', 'city', 'budget', 'urgency', 'language', 'confidence', 'goal', 'constraints'],
                additionalProperties: false
              }
            }
          },
          max_output_tokens: 900
        }
      });
      const text = responseText(payload);
      if (!text) throw new Error('OpenAI returned no structured intent');
      return JSON.parse(text);
    },

    deepConnector: {
      id: 'openai-deep-search',
      name: 'OpenAI Deep Search',
      sourceType: 'deep-search',
      mode: configured ? 'live' : 'not-configured',
      configured,
      description: 'Agentic web research through the OpenAI Responses API web_search tool.',

      async search({ intent }) {
        const payload = await openAiRequest({
          apiKey,
          timeoutMs: deepTimeoutMs,
          body: {
            model: deepModel,
            store: false,
            reasoning: { effort: 'high' },
            tools: [{
              type: 'web_search',
              user_location: {
                type: 'approximate',
                country: intent.market,
                city: intent.city
              },
              return_token_budget: 'default'
            }],
            tool_choice: 'required',
            include: ['web_search_call.action.sources'],
            instructions: [
              'You are the sourcing layer for NAYL, a GCC AI buyer.',
              'Search the live web for concrete, commercially actionable providers, service pages, or official marketplace listings relevant to the request.',
              'Prioritize the requested city and country. Prefer official provider pages and reputable marketplaces.',
              'Never invent a provider, URL, price, rating, availability, or claim.',
              'Return at most eight results. Use an empty string for unknown price or availability.',
              'Every result URL must be a page actually found during web search.'
            ].join(' '),
            input: `Find providers for this buyer demand: ${intent.query}\nResolved intent: ${JSON.stringify({
              category: intent.category,
              market: intent.market,
              marketName: intent.marketName,
              city: intent.city,
              budget: intent.budget,
              currency: intent.currency,
              urgency: intent.urgency,
              language: intent.language
            })}`,
            text: {
              format: {
                type: 'json_schema',
                name: 'nayl_deep_search_results',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    answer: { type: 'string' },
                    results: {
                      type: 'array',
                      maxItems: 8,
                      items: {
                        type: 'object',
                        properties: {
                          title: { type: 'string' },
                          url: { type: 'string' },
                          summary: { type: 'string' },
                          sourceName: { type: 'string' },
                          priceLabel: { type: 'string' },
                          availability: { type: 'string' }
                        },
                        required: ['title', 'url', 'summary', 'sourceName', 'priceLabel', 'availability'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ['answer', 'results'],
                  additionalProperties: false
                }
              }
            },
            max_output_tokens: 2600
          }
        });

        const sources = collectSources(payload);
        const sourceByUrl = new Map(sources.flatMap((source) => {
          const canonical = canonicalUrl(source.url);
          return canonical ? [[canonical, source]] : [];
        }));
        const text = responseText(payload);
        const parsed = text ? JSON.parse(text) : { answer: '', results: [] };
        const results = (parsed.results || []).flatMap((item, index) => {
          const requestedUrl = safeExternalUrl(item.url);
          const source = sourceByUrl.get(canonicalUrl(requestedUrl));
          if (!source) return [];
          const url = source.url;
          return [{
            id: `openai-deep-${index}-${Buffer.from(url).toString('base64url').slice(0, 16)}`,
            source: 'OpenAI Deep Search',
            sourceType: 'deep-search',
            sourceMode: 'live',
            title: truncate(item.title, 180),
            subtitle: truncate(item.summary, 360),
            price: null,
            currency: intent.currency,
            priceLabel: item.priceLabel || null,
            rating: null,
            reviews: null,
            availability: item.availability || null,
            score: 0,
            action: intent.language === 'ar' ? 'افتح المصدر' : 'Open source',
            actionType: 'external-link',
            url,
            attribution: item.sourceName || source.title || domainFromUrl(url),
            requestable: true,
            meta: {
              categories: intent.category === 'general' ? [] : [intent.category],
              serviceAreas: intent.city ? [intent.city] : [],
              researched: true,
              citationUrl: url
            }
          }];
        });

        return {
          results,
          summary: truncate(parsed.answer || `Deep search reviewed ${sources.length} sources.`, 600),
          sources: sources.slice(0, 30)
        };
      }
    }
  };
}
