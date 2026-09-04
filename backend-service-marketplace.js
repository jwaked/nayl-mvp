import { randomUUID } from 'node:crypto';
import { HttpError } from './backend-lib-http.js';
import { matchingBusinesses } from './backend-service-matching.js';

function publicRequest(opportunity) {
  return {
    id: opportunity.id,
    query: opportunity.query,
    category: opportunity.category,
    market: opportunity.market,
    city: opportunity.city,
    budget: opportunity.budget,
    currency: opportunity.currency,
    urgency: opportunity.urgency,
    details: opportunity.details,
    sourceResult: opportunity.sourceResult,
    status: opportunity.status,
    quotes: opportunity.quotes,
    bookedQuoteId: opportunity.bookedQuoteId || null,
    bookingId: opportunity.bookingId || null,
    matchedBusinessCount: opportunity.matchedBusinessCount || 0,
    createdAt: opportunity.createdAt,
    updatedAt: opportunity.updatedAt
  };
}

export class MarketplaceService {
  constructor({ store, notification }) {
    this.store = store;
    this.notification = notification;
  }

  async createRequest(input) {
    const now = new Date().toISOString();
    const outcome = await this.store.transact((data) => {
      const market = data.markets.find((item) => item.code === input.market);
      if (!market) throw new HttpError(400, 'Unsupported market');
      const category = data.categories.find((item) => item.id === input.category);
      if (!category) throw new HttpError(400, 'Unsupported category');
      const city = market.cities.find((item) => item.name === input.city);
      if (!city) throw new HttpError(400, 'Unsupported city for the selected market');
      const currency = market.currency;
      const requestedBusinessId = input.sourceResult?.sourceType === 'marketplace'
        ? input.sourceResult?.meta?.businessId
        : null;
      const preferredBusiness = requestedBusinessId
        ? data.businesses.find((item) => item.id === requestedBusinessId)
        : null;
      const safePreferredBusinessId = preferredBusiness
        && preferredBusiness.status === 'verified'
        && preferredBusiness.acceptingLeads !== false
        && preferredBusiness.market === market.code
        && (input.category === 'general' || preferredBusiness.categories.includes(input.category))
        && preferredBusiness.serviceAreas.includes(input.city)
        ? preferredBusiness.id
        : null;
      const opportunity = {
        id: `req-${randomUUID()}`,
        consumerId: input.consumerId,
        contact: input.contact,
        query: input.query,
        category: input.category,
        market: market.code,
        city: input.city,
        budget: input.budget,
        currency,
        urgency: input.urgency,
        details: input.details || '',
        sourceResult: input.sourceResult || null,
        preferredBusinessId: safePreferredBusinessId,
        status: 'open',
        quotes: [],
        bookedQuoteId: null,
        bookingId: null,
        matchedBusinessCount: 0,
        createdAt: now,
        updatedAt: now
      };
      const matches = matchingBusinesses(data, opportunity);
      opportunity.matchedBusinessCount = matches.length;
      data.opportunities.unshift(opportunity);
      data.auditEvents.unshift({
        id: `audit-${randomUUID()}`,
        type: 'request.created',
        actor: input.consumerId,
        summary: `Quote request created for ${input.category} in ${input.city}`,
        entityId: opportunity.id,
        createdAt: now
      });
      data.auditEvents = data.auditEvents.slice(0, 1000);
      return { opportunity, matches };
    });

    await Promise.allSettled(outcome.matches.map((business) => this.notification.send({
      to: business.email,
      subject: `New NAYL opportunity in ${outcome.opportunity.city}`,
      heading: `A buyer needs ${outcome.opportunity.category}`,
      body: `${outcome.opportunity.query}${outcome.opportunity.budget ? ` Budget: ${outcome.opportunity.currency} ${outcome.opportunity.budget}.` : ''}`,
      buttonLabel: 'Open opportunity',
      buttonPath: '/business'
    })));

    return publicRequest(outcome.opportunity);
  }

  async listConsumerRequests(consumerId) {
    const data = await this.store.snapshot();
    return data.opportunities
      .filter((item) => item.consumerId === consumerId)
      .map(publicRequest)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async acceptQuote({ opportunityId, consumerId, quoteId }) {
    const now = new Date().toISOString();
    const outcome = await this.store.transact((data) => {
      const opportunity = data.opportunities.find((item) => item.id === opportunityId);
      if (!opportunity || opportunity.consumerId !== consumerId) throw new HttpError(404, 'Quote request not found');
      if (opportunity.status === 'booked') throw new HttpError(409, 'A quote has already been accepted');
      if (opportunity.status === 'cancelled') throw new HttpError(409, 'This request was cancelled');
      const quote = opportunity.quotes.find((item) => item.id === quoteId);
      if (!quote) throw new HttpError(404, 'Quote not found');
      if (quote.status !== 'submitted') throw new HttpError(409, 'This quote is no longer available');
      if (quote.validUntil && new Date(quote.validUntil) < new Date()) throw new HttpError(409, 'This quote has expired');

      const business = data.businesses.find((item) => item.id === quote.businessId);
      if (!business || business.status !== 'verified' || business.acceptingLeads === false) {
        throw new HttpError(409, 'The provider is not currently active on NAYL');
      }

      for (const item of opportunity.quotes) item.status = item.id === quote.id ? 'accepted' : 'declined';
      opportunity.status = 'booked';
      opportunity.bookedQuoteId = quote.id;
      opportunity.bookingId = `booking-${randomUUID()}`;
      opportunity.updatedAt = now;
      const booking = {
        id: opportunity.bookingId,
        opportunityId: opportunity.id,
        quoteId: quote.id,
        businessId: quote.businessId,
        consumerId,
        amount: quote.amount,
        currency: quote.currency,
        status: 'confirmed',
        createdAt: now
      };
      data.bookings.unshift(booking);
      data.auditEvents.unshift({
        id: `audit-${randomUUID()}`,
        type: 'booking.confirmed',
        actor: consumerId,
        summary: `Booking confirmed with ${quote.providerName} for ${quote.currency} ${quote.amount}`,
        entityId: opportunity.id,
        createdAt: now
      });
      data.auditEvents = data.auditEvents.slice(0, 1000);
      return { opportunity, booking, quote, business };
    });

    await Promise.allSettled([
      this.notification.send({
        to: outcome.opportunity.contact?.email,
        subject: `NAYL booking confirmed: ${outcome.booking.id}`,
        heading: 'Your booking is confirmed',
        body: `${outcome.quote.providerName} · ${outcome.quote.currency} ${outcome.quote.amount} · ${outcome.quote.availableAt}.`,
        buttonLabel: 'View booking',
        buttonPath: '/#requests'
      }),
      this.notification.send({
        to: outcome.business?.email,
        subject: `You won a NAYL booking: ${outcome.booking.id}`,
        heading: 'The buyer accepted your quote',
        body: `Open the business console to see the confirmed customer contact and booking details.`,
        buttonLabel: 'Open business console',
        buttonPath: '/business'
      })
    ]);

    return { request: publicRequest(outcome.opportunity), booking: outcome.booking };
  }

  async cancelRequest({ opportunityId, consumerId }) {
    const now = new Date().toISOString();
    return this.store.transact((data) => {
      const opportunity = data.opportunities.find((item) => item.id === opportunityId);
      if (!opportunity || opportunity.consumerId !== consumerId) throw new HttpError(404, 'Quote request not found');
      if (opportunity.status === 'booked') throw new HttpError(409, 'A booked request cannot be cancelled here');
      opportunity.status = 'cancelled';
      opportunity.updatedAt = now;
      data.auditEvents.unshift({
        id: `audit-${randomUUID()}`,
        type: 'request.cancelled',
        actor: consumerId,
        summary: `Quote request ${opportunity.id} cancelled`,
        entityId: opportunity.id,
        createdAt: now
      });
      return publicRequest(opportunity);
    });
  }
}
