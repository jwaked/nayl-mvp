import { randomUUID } from 'node:crypto';
import { HttpError } from './http.js';

function matchesBusiness(opportunity, business) {
  if (opportunity.market !== business.market) return false;
  if (!business.profile?.acceptingLeads && opportunity.status !== 'booked') return false;
  if (opportunity.category !== 'general' && !business.categories.includes(opportunity.category)) return false;
  if (opportunity.city && !business.serviceAreas.includes(opportunity.city)) return false;
  return true;
}

function newestFirst(a, b) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export class BusinessService {
  constructor({ store }) {
    this.store = store;
  }

  async getProfile(businessId) {
    const data = await this.store.snapshot();
    const business = data.businesses.find((item) => item.id === businessId);
    if (!business) throw new HttpError(404, 'Business profile not found');
    return business;
  }

  async updateProfile(businessId, patch) {
    const now = new Date().toISOString();
    return this.store.transact((data) => {
      const business = data.businesses.find((item) => item.id === businessId);
      if (!business) throw new HttpError(404, 'Business profile not found');

      if (patch.contactName != null) business.profile.contactName = patch.contactName;
      if (patch.email != null) business.profile.email = patch.email;
      if (patch.phone != null) business.profile.phone = patch.phone;
      if (patch.description != null) business.profile.description = patch.description;
      if (patch.acceptingLeads != null) business.profile.acceptingLeads = Boolean(patch.acceptingLeads);
      if (Array.isArray(patch.serviceAreas)) {
        const market = data.markets.find((item) => item.code === business.market);
        const allowed = new Set((market?.cities || []).map((city) => city.name));
        const clean = [...new Set(patch.serviceAreas.filter((city) => allowed.has(city)))];
        if (clean.length > 0) business.serviceAreas = clean;
      }

      data.auditEvents.unshift({
        id: `audit-${randomUUID()}`,
        type: 'business.profile.updated',
        actor: businessId,
        summary: `${business.name} updated its marketplace profile`,
        entityId: businessId,
        createdAt: now
      });
      data.auditEvents = data.auditEvents.slice(0, 300);
      return business;
    });
  }

  async listOpportunities(businessId) {
    const data = await this.store.snapshot();
    const business = data.businesses.find((item) => item.id === businessId);
    if (!business) throw new HttpError(404, 'Business profile not found');

    return data.opportunities
      .filter((opportunity) => matchesBusiness(opportunity, business))
      .map((opportunity) => ({
        ...opportunity,
        myQuote: opportunity.quotes.find((quote) => quote.businessId === businessId) || null,
        quoteCount: opportunity.quotes.length,
        isPreferred: opportunity.preferredBusinessId === businessId
      }))
      .sort(newestFirst);
  }

  async submitQuote({ businessId, opportunityId, amount, currency, message, availableAt }) {
    const now = new Date().toISOString();
    return this.store.transact((data) => {
      const business = data.businesses.find((item) => item.id === businessId);
      if (!business) throw new HttpError(404, 'Business profile not found');
      const opportunity = data.opportunities.find((item) => item.id === opportunityId);
      if (!opportunity) throw new HttpError(404, 'Opportunity not found');
      if (!matchesBusiness(opportunity, business)) throw new HttpError(403, 'This opportunity is outside the business service profile');
      if (opportunity.status === 'booked') throw new HttpError(409, 'This opportunity is already booked');
      if (currency !== opportunity.currency) throw new HttpError(400, `Quote currency must be ${opportunity.currency}`);

      let quote = opportunity.quotes.find((item) => item.businessId === businessId);
      if (quote) {
        quote.amount = amount;
        quote.currency = currency;
        quote.message = message;
        quote.availableAt = availableAt;
        quote.updatedAt = now;
      } else {
        quote = {
          id: `quote-${randomUUID()}`,
          businessId,
          providerName: business.name,
          amount,
          currency,
          message,
          availableAt,
          status: 'submitted',
          createdAt: now
        };
        opportunity.quotes.push(quote);
      }

      opportunity.status = 'quoted';
      data.auditEvents.unshift({
        id: `audit-${randomUUID()}`,
        type: 'quote.submitted',
        actor: businessId,
        summary: `${business.name} quoted ${currency} ${amount}`,
        entityId: opportunity.id,
        createdAt: now
      });
      data.auditEvents = data.auditEvents.slice(0, 300);
      return quote;
    });
  }

  async getKpis(businessId) {
    const data = await this.store.snapshot();
    const business = data.businesses.find((item) => item.id === businessId);
    if (!business) throw new HttpError(404, 'Business profile not found');

    const qualified = data.opportunities.filter((opportunity) => matchesBusiness(opportunity, business));
    const quotes = qualified.flatMap((opportunity) => opportunity.quotes.filter((quote) => quote.businessId === businessId));
    const wins = qualified.filter((opportunity) => {
      const booked = opportunity.quotes.find((quote) => quote.id === opportunity.bookedQuoteId);
      return booked?.businessId === businessId;
    });

    return {
      qualifiedOpportunities: qualified.filter((item) => item.status !== 'booked').length,
      quotesSubmitted: quotes.length,
      wins: wins.length,
      quotedValue: Math.round(quotes.reduce((sum, quote) => sum + quote.amount, 0) * 100) / 100,
      currency: data.markets.find((market) => market.code === business.market)?.currency || 'AED',
      responseRate: business.responseRate,
      avgResponseMinutes: business.avgResponseMinutes,
      rating: business.rating
    };
  }
}
