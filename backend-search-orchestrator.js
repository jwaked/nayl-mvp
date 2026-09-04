import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { extractIntent, mergeAiIntent } from './backend-intent.js';
import { rankAndDedupe } from './backend-ranking.js';

function publicConnector(connector, overrides = {}) {
  return {
    id: connector.id,
    name: connector.name,
    sourceType: connector.sourceType,
    mode: connector.mode,
    configured: connector.configured,
    description: connector.description,
    ...overrides
  };
}

function unavailableStatus(connector) {
  return connector.configured ? 'ready' : 'setup-required';
}

export class SearchOrchestrator {
  constructor({ store, getRuntime, defaultMarket, defaultCity }) {
    this.store = store;
    this.getRuntime = getRuntime;
    this.defaultMarket = defaultMarket;
    this.defaultCity = defaultCity;
  }

  async connectorDescriptors() {
    const { openAi, connectors } = await this.getRuntime();
    return [
      { ...openAi.intentDescriptor, status: unavailableStatus(openAi.intentDescriptor) },
      ...connectors.map((connector) => publicConnector(connector, { status: unavailableStatus(connector) })),
      { ...openAi.deepDescriptor, status: unavailableStatus(openAi.deepDescriptor) }
    ];
  }

  async search(input) {
    const requestId = randomUUID();
    const data = await this.store.snapshot();
    const { openAi, connectors } = await this.getRuntime();
    const context = {
      market: input.market || this.defaultMarket,
      city: input.city || this.defaultCity,
      locale: input.locale === 'ar' ? 'ar' : 'en'
    };
    const localIntent = extractIntent(input.query, context, {
      markets: data.markets,
      categories: data.categories
    });

    let intent = localIntent;
    let intentExecution;
    if (openAi.intentDescriptor.configured) {
      const startedAt = performance.now();
      try {
        const aiIntent = await openAi.extractIntent({
          query: input.query,
          context,
          catalogue: { markets: data.markets, categories: data.categories }
        });
        intent = mergeAiIntent(localIntent, aiIntent, { markets: data.markets, categories: data.categories });
        intentExecution = {
          ...openAi.intentDescriptor,
          status: 'live',
          durationMs: Math.round(performance.now() - startedAt),
          resultCount: 1,
          message: 'Intent extracted with a structured OpenAI response.'
        };
      } catch (error) {
        intentExecution = {
          ...openAi.intentDescriptor,
          status: 'error',
          durationMs: Math.round(performance.now() - startedAt),
          resultCount: 0,
          message: `Local extraction used because OpenAI failed: ${error instanceof Error ? error.message.slice(0, 180) : 'unknown error'}`
        };
      }
    } else {
      intentExecution = {
        ...openAi.intentDescriptor,
        status: 'setup-required',
        durationMs: 0,
        resultCount: 0,
        message: 'Local deterministic intent extraction is active. Add an OpenAI API key in /admin to enable AI extraction.'
      };
    }

    const activeConnectors = [...connectors];
    if (input.deep === true) activeConnectors.push(openAi.deepConnector);

    const executions = await Promise.all(activeConnectors.map(async (connector) => {
      if (!connector.configured) {
        return {
          descriptor: publicConnector(connector, {
            status: 'setup-required',
            durationMs: 0,
            resultCount: 0,
            message: 'Add this provider credential in the protected /admin connector console.'
          }),
          results: [],
          summary: '',
          sources: []
        };
      }
      const startedAt = performance.now();
      try {
        const output = await connector.search({ intent, context, requestId });
        const normalized = Array.isArray(output) ? { results: output } : output || { results: [] };
        return {
          descriptor: publicConnector(connector, {
            status: 'live',
            durationMs: Math.round(performance.now() - startedAt),
            resultCount: normalized.results?.length || 0,
            message: normalized.summary || 'Connector completed successfully.'
          }),
          results: normalized.results || [],
          summary: normalized.summary || '',
          sources: normalized.sources || []
        };
      } catch (error) {
        return {
          descriptor: publicConnector(connector, {
            status: 'error',
            durationMs: Math.round(performance.now() - startedAt),
            resultCount: 0,
            message: error instanceof Error ? error.message.slice(0, 240) : 'Connector failed.'
          }),
          results: [],
          summary: '',
          sources: []
        };
      }
    }));

    if (!input.deep) {
      executions.push({
        descriptor: {
          ...openAi.deepDescriptor,
          status: openAi.deepDescriptor.configured ? 'skipped' : 'setup-required',
          durationMs: 0,
          resultCount: 0,
          message: openAi.deepDescriptor.configured
            ? 'Deep Search was available but not requested.'
            : 'Add an OpenAI API key in /admin to enable Deep Search.'
        },
        results: [],
        summary: '',
        sources: []
      });
    }

    const results = rankAndDedupe(executions.flatMap((execution) => execution.results), intent);
    const generatedAt = new Date().toISOString();
    const event = {
      id: requestId,
      query: intent.query,
      market: intent.market,
      city: intent.city,
      category: intent.category,
      urgency: intent.urgency,
      budget: intent.budget,
      currency: intent.currency,
      deep: input.deep === true,
      resultCount: results.length,
      connectors: [intentExecution, ...executions.map((execution) => execution.descriptor)].map((descriptor) => ({
        id: descriptor.id,
        status: descriptor.status,
        resultCount: descriptor.resultCount
      })),
      createdAt: generatedAt
    };

    await this.store.transact((db) => {
      db.searchEvents.unshift(event);
      db.searchEvents = db.searchEvents.slice(0, 500);
      return event;
    }).catch(() => undefined);

    const deepExecution = executions.find((execution) => execution.descriptor.id === 'openai-deep-search');
    return {
      requestId,
      generatedAt,
      query: intent.query,
      context: {
        requested: context,
        resolved: { market: intent.market, city: intent.city, locale: intent.language }
      },
      intent,
      summary: deepExecution?.summary || buildSummary(intent, results.length, input.deep === true),
      connectors: [intentExecution, ...executions.map((execution) => execution.descriptor)],
      sources: deepExecution?.sources || [],
      results,
      resultCount: results.length
    };
  }
}

function buildSummary(intent, count, deep) {
  if (intent.language === 'ar') {
    return count
      ? `وجدت NAYL ${count} خياراً لـ ${intent.categoryLabel || 'طلبك'} في ${intent.city}. يمكنك فتح طلب عرض سعر من أي نتيجة.`
      : `لم يظهر مزود مباشر بعد. افتح طلب عرض سعر ليصل إلى الشركات المسجلة المطابقة في ${intent.city}.`;
  }
  return count
    ? `NAYL found ${count} options for ${intent.categoryLabel || 'your request'} in ${intent.city}${deep ? ' using deep web research' : ''}. You can open a real quote request from any result.`
    : `No direct provider surfaced yet. Open a quote request and NAYL will route it to matching registered businesses in ${intent.city}.`;
}
