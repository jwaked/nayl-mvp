import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { extractIntent } from './intent.js';
import { rankAndDedupe } from './ranking.js';

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

export class SearchOrchestrator {
  constructor({ store, connectors, defaultMarket, defaultCity }) {
    this.store = store;
    this.connectors = connectors;
    this.defaultMarket = defaultMarket;
    this.defaultCity = defaultCity;
  }

  connectorDescriptors() {
    return this.connectors.map((connector) => publicConnector(connector, {
      status: connector.mode === 'not-configured' ? 'not-configured' : 'ready'
    }));
  }

  async search(input) {
    const requestId = randomUUID();
    const data = await this.store.snapshot();
    const context = {
      market: input.market || this.defaultMarket,
      city: input.city || this.defaultCity,
      locale: input.locale === 'ar' ? 'ar' : 'en'
    };
    const intent = extractIntent(input.query, context, {
      markets: data.markets,
      categories: data.categories
    });

    const executions = await Promise.all(this.connectors.map(async (connector) => {
      if (connector.mode === 'not-configured' || !connector.configured) {
        return {
          descriptor: publicConnector(connector, {
            status: 'not-configured',
            durationMs: 0,
            resultCount: 0,
            message: 'Connector credentials or configuration are not present.'
          }),
          results: []
        };
      }

      const startedAt = performance.now();
      try {
        const results = await connector.search({ intent, context, requestId });
        return {
          descriptor: publicConnector(connector, {
            status: connector.mode === 'demo' ? 'demo' : 'live',
            durationMs: Math.round(performance.now() - startedAt),
            resultCount: results.length,
            message: connector.mode === 'demo'
              ? 'Illustrative data; no production partner integration is active.'
              : 'Connector completed successfully.'
          }),
          results
        };
      } catch (error) {
        return {
          descriptor: publicConnector(connector, {
            status: 'error',
            durationMs: Math.round(performance.now() - startedAt),
            resultCount: 0,
            message: error instanceof Error ? error.message.slice(0, 240) : 'Connector failed.'
          }),
          results: []
        };
      }
    }));

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
      resultCount: results.length,
      connectors: executions.map((execution) => ({
        id: execution.descriptor.id,
        status: execution.descriptor.status,
        resultCount: execution.descriptor.resultCount
      })),
      createdAt: generatedAt
    };

    await this.store.transact((db) => {
      db.searchEvents.unshift(event);
      db.searchEvents = db.searchEvents.slice(0, 200);
      return event;
    }).catch(() => undefined);

    return {
      requestId,
      generatedAt,
      query: intent.query,
      context: {
        requested: context,
        resolved: { market: intent.market, city: intent.city, locale: intent.language }
      },
      intent,
      connectors: executions.map((execution) => execution.descriptor),
      results,
      resultCount: results.length
    };
  }
}
