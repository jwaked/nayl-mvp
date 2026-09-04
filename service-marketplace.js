import { randomUUID } from 'node:crypto';
import { HttpError } from './http.js';

function newestFirst(a, b) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export class MarketplaceService {
  constructor({ store }) {
    this.store = store;
  }

  async listConsumerRequests(consumerId) {
    const data = await this.store.snapshot();
    return data.opportunities
      .filter((opportunity) => opportunity.consumerId === consumerId)
      .sort(newestFirst);
  }

  async createRequest(input) {
    const now = new Date().toISOString();
    const opportunity = {
      id: `opp-${randomUUID()}`,
      consumerId: input.consumerId,
      query: input.query,
      category: input.category || 'general',
      market: input.market,
      city: input.city,
      budget: input.budget || null,
      currency: input.currency,
      urgency: input.urgency || 'flexible',
      status: 'open',
      sourceResultId: input.sourceResult?.id || null,
      sourceTitle: input.sourceResult?.title || null,
      preferredBusinessId: input.sourceResult?.meta?.businessId || null,
      createdAt: now,
      quotes: []
    };

    return this.store.transact((data) => {
      const market = data.markets.find((item) => item.code === opportunity.market);
      if (!market) throw new HttpError(400, 'Unsupported GCC market');
      if (!market.cities.some((city) => city.name === opportunity.city)) {
        throw new HttpError(400, 'City is not configured for the selected market');
      }

      data.opportunities.unshift(opportunity);
      data.auditEvents.unshift({
        id: `audit-${randomUUID()}`,
        type: 'opportunity.created',
        actor: opportunity.consumerId,
        summary: `${opportunity.category} request in ${opportunity.city}`,
        entityId: opportunity.id,
        createdAt: now
      });
      data.auditEvents = data.auditEvents.slice(0, 300);
      return opportunity;
    });
  }

  async bookQuote({ opportunityId, consumerId, quoteId }) {
    const now = new Date().toISOString();
    return this.store.transact((data) => {
      const opportunity = data.opportunities.find((item) => item.id === opportunityId);
      if (!opportunity) throw new HttpError(404, 'Marketplace request not found');
      if (opportunity.consumerId !== consumerId) throw new HttpError(403, 'This request belongs to another consumer');
      if (opportunity.status === 'booked') throw new HttpError(409, 'A quote has already been booked');

      const quote = opportunity.quotes.find((item) => item.id === quoteId);
      if (!quote) throw new HttpError(404, 'Quote not found');

      for (const candidate of opportunity.quotes) {
        candidate.status = candidate.id === quoteId ? 'accepted' : 'declined';
      }
      opportunity.status = 'booked';
      opportunity.bookedQuoteId = quoteId;
      opportunity.bookedAt = now;

      data.auditEvents.unshift({
        id: `audit-${randomUUID()}`,
        type: 'booking.created',
        actor: consumerId,
        summary: `Booked ${quote.providerName} for ${quote.currency} ${quote.amount}`,
        entityId: opportunity.id,
        createdAt: now
      });
      data.auditEvents = data.auditEvents.slice(0, 300);
      return opportunity;
    });
  }
}
