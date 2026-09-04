import { randomUUID } from 'node:crypto';
import { createSessionToken, hashPassword, verifyPassword } from './backend-lib-auth.js';
import { HttpError } from './backend-lib-http.js';
import { businessMatchesOpportunity } from './backend-service-matching.js';

export function publicBusiness(business, { includePrivate = false } = {}) {
  if (!business) return null;
  const output = {
    id: business.id,
    name: business.name,
    nameAr: business.nameAr || '',
    market: business.market,
    currency: business.currency,
    categories: business.categories,
    serviceAreas: business.serviceAreas,
    description: business.description,
    website: business.website,
    priceFrom: business.priceFrom,
    acceptingLeads: business.acceptingLeads,
    status: business.status,
    rating: business.rating,
    reviewCount: business.reviewCount,
    responseTimeMinutes: business.responseTimeMinutes,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt
  };
  if (includePrivate) {
    output.email = business.email;
    output.phone = business.phone;
  }
  return output;
}

function assertVerified(business) {
  if (business.status !== 'verified') {
    throw new HttpError(403, business.status === 'pending'
      ? 'Your business is pending admin verification.'
      : 'Your business is not active.');
  }
}

export class BusinessService {
  constructor({ store, sessionSecret, getAutoVerifyBusinesses, notification, appBaseUrl, adminEmail }) {
    this.store = store;
    this.sessionSecret = sessionSecret;
    this.getAutoVerifyBusinesses = getAutoVerifyBusinesses || (async () => false);
    this.notification = notification;
    this.appBaseUrl = appBaseUrl;
    this.adminEmail = adminEmail;
  }

  async register(input) {
    const autoVerifyBusinesses = Boolean(await this.getAutoVerifyBusinesses());
    const password = input.password;
    const credentials = await hashPassword(password);
    const now = new Date().toISOString();
    const business = await this.store.transact((data) => {
      if (data.businesses.some((item) => item.email === input.email)) {
        throw new HttpError(409, 'A business account already exists for this email address');
      }
      const market = data.markets.find((item) => item.code === input.market);
      if (!market) throw new HttpError(400, 'Unsupported market');
      const allowedCities = new Set(market.cities.map((city) => city.name));
      if (input.serviceAreas.some((city) => !allowedCities.has(city))) throw new HttpError(400, 'One or more service areas are invalid');
      const allowedCategories = new Set(data.categories.map((category) => category.id));
      if (input.categories.some((category) => !allowedCategories.has(category))) throw new HttpError(400, 'One or more categories are invalid');

      const created = {
        id: `biz-${randomUUID()}`,
        name: input.name,
        nameAr: input.nameAr || '',
        email: input.email,
        phone: input.phone || '',
        website: input.website || null,
        passwordSalt: credentials.salt,
        passwordHash: credentials.hash,
        market: market.code,
        currency: market.currency,
        categories: input.categories,
        serviceAreas: input.serviceAreas,
        description: input.description,
        priceFrom: input.priceFrom,
        acceptingLeads: true,
        status: autoVerifyBusinesses ? 'verified' : 'pending',
        rating: null,
        reviewCount: 0,
        responseTimeMinutes: null,
        createdAt: now,
        updatedAt: now
      };
      data.businesses.push(created);
      data.auditEvents.unshift({
        id: `audit-${randomUUID()}`,
        type: 'business.registered',
        actor: created.id,
        summary: `${created.name} registered in ${created.market}`,
        entityId: created.id,
        createdAt: now
      });
      data.auditEvents = data.auditEvents.slice(0, 1000);
      return created;
    });

    await Promise.allSettled([
      this.notification.send({
        to: business.email,
        subject: 'Your NAYL business account was created',
        heading: autoVerifyBusinesses ? 'Your NAYL profile is live' : 'Your profile is awaiting verification',
        body: autoVerifyBusinesses
          ? 'Your approved services and service areas can now receive matching buyer opportunities.'
          : 'NAYL operations will review the profile before it appears in search and receives opportunities.',
        buttonLabel: 'Open business console',
        buttonPath: '/business'
      }),
      this.notification.send({
        to: this.adminEmail,
        subject: `New NAYL business verification: ${business.name}`,
        heading: 'A business profile needs review',
        body: `${business.name} registered for ${business.categories.join(', ')} in ${business.serviceAreas.join(', ')}.`,
        buttonLabel: 'Review business',
        buttonPath: '/admin'
      })
    ]);

    const token = createSessionToken({ role: 'business', businessId: business.id }, this.sessionSecret, 60 * 60 * 24 * 30);
    return { business: publicBusiness(business, { includePrivate: true }), token };
  }

  async login(email, password) {
    const data = await this.store.snapshot();
    const business = data.businesses.find((item) => item.email === email);
    const valid = business && await verifyPassword(password, business.passwordSalt, business.passwordHash);
    if (!valid) throw new HttpError(401, 'Invalid email or password');
    const token = createSessionToken({ role: 'business', businessId: business.id }, this.sessionSecret, 60 * 60 * 24 * 30);
    return { business: publicBusiness(business, { includePrivate: true }), token };
  }

  async getProfile(businessId) {
    const data = await this.store.snapshot();
    const business = data.businesses.find((item) => item.id === businessId);
    if (!business) throw new HttpError(404, 'Business profile not found');
    return publicBusiness(business, { includePrivate: true });
  }

  async updateProfile(businessId, patch) {
    return this.store.transact((data) => {
      const business = data.businesses.find((item) => item.id === businessId);
      if (!business) throw new HttpError(404, 'Business profile not found');
      const market = data.markets.find((item) => item.code === business.market);
      if (!market) throw new HttpError(409, 'Business market configuration is unavailable');
      if (patch.categories !== undefined) {
        const allowedCategories = new Set(data.categories.map((category) => category.id));
        if (patch.categories.some((category) => !allowedCategories.has(category))) {
          throw new HttpError(400, 'One or more categories are invalid');
        }
      }
      if (patch.serviceAreas !== undefined) {
        const allowedCities = new Set(market.cities.map((city) => city.name));
        if (patch.serviceAreas.some((city) => !allowedCities.has(city))) {
          throw new HttpError(400, 'One or more service areas are invalid');
        }
      }
      if (patch.name !== undefined) business.name = patch.name;
      if (patch.nameAr !== undefined) business.nameAr = patch.nameAr;
      if (patch.phone !== undefined) business.phone = patch.phone;
      if (patch.website !== undefined) business.website = patch.website;
      if (patch.description !== undefined) business.description = patch.description;
      if (patch.priceFrom !== undefined) business.priceFrom = patch.priceFrom;
      if (patch.categories !== undefined) business.categories = patch.categories;
      if (patch.serviceAreas !== undefined) business.serviceAreas = patch.serviceAreas;
      if (patch.acceptingLeads !== undefined) business.acceptingLeads = Boolean(patch.acceptingLeads);
      business.updatedAt = new Date().toISOString();
      return publicBusiness(business, { includePrivate: true });
    });
  }

  async listOpportunities(businessId) {
    const data = await this.store.snapshot();
    const business = data.businesses.find((item) => item.id === businessId);
    if (!business) throw new HttpError(404, 'Business profile not found');
    assertVerified(business);
    return data.opportunities
      .filter((opportunity) => opportunity.status !== 'cancelled')
      .filter((opportunity) => businessMatchesOpportunity(business, opportunity) || opportunity.preferredBusinessId === businessId)
      .map((opportunity) => {
        const ownQuote = opportunity.quotes.find((quote) => quote.businessId === businessId) || null;
        const won = opportunity.bookedQuoteId && ownQuote?.id === opportunity.bookedQuoteId;
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
          quoteCount: opportunity.quotes.length,
          ownQuote,
          won: Boolean(won),
          consumerContact: won ? opportunity.contact : null,
          createdAt: opportunity.createdAt,
          updatedAt: opportunity.updatedAt
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async submitQuote({ businessId, opportunityId, amount, currency, message, availableAt, validUntil }) {
    const now = new Date().toISOString();
    const outcome = await this.store.transact((data) => {
      const business = data.businesses.find((item) => item.id === businessId);
      if (!business) throw new HttpError(404, 'Business profile not found');
      assertVerified(business);
      const opportunity = data.opportunities.find((item) => item.id === opportunityId);
      if (!opportunity) throw new HttpError(404, 'Quote request not found');
      if (!businessMatchesOpportunity(business, opportunity) && opportunity.preferredBusinessId !== businessId) {
        throw new HttpError(403, 'This request does not match your approved service profile');
      }
      if (['booked', 'cancelled'].includes(opportunity.status)) throw new HttpError(409, 'This request is no longer accepting quotes');
      if (currency !== opportunity.currency) throw new HttpError(400, `Quote currency must be ${opportunity.currency}`);
      if (validUntil && new Date(validUntil).getTime() <= Date.now()) throw new HttpError(400, 'Quote expiry must be in the future');

      let quote = opportunity.quotes.find((item) => item.businessId === businessId);
      if (quote) {
        Object.assign(quote, { amount, currency, message, availableAt, validUntil, updatedAt: now, status: 'submitted' });
      } else {
        quote = {
          id: `quote-${randomUUID()}`,
          businessId,
          providerName: business.name,
          amount,
          currency,
          message,
          availableAt,
          validUntil,
          status: 'submitted',
          createdAt: now,
          updatedAt: now
        };
        opportunity.quotes.push(quote);
      }
      opportunity.status = 'quoted';
      opportunity.updatedAt = now;
      data.auditEvents.unshift({
        id: `audit-${randomUUID()}`,
        type: 'quote.submitted',
        actor: businessId,
        summary: `${business.name} quoted ${currency} ${amount}`,
        entityId: opportunity.id,
        createdAt: now
      });
      data.auditEvents = data.auditEvents.slice(0, 1000);
      return { quote, opportunity, business };
    });

    if (outcome.opportunity.contact?.email) {
      await this.notification.send({
        to: outcome.opportunity.contact.email,
        subject: `New quote for ${outcome.opportunity.query}`,
        heading: `${outcome.business.name} sent you a quote`,
        body: `${outcome.quote.currency} ${outcome.quote.amount} · ${outcome.quote.availableAt}. Open NAYL to compare and accept.`,
        buttonLabel: 'Review quote',
        buttonPath: '/#requests'
      }).catch(() => undefined);
    }
    return outcome.quote;
  }

  async getKpis(businessId) {
    const data = await this.store.snapshot();
    const business = data.businesses.find((item) => item.id === businessId);
    if (!business) throw new HttpError(404, 'Business profile not found');
    const opportunities = data.opportunities.filter((item) => businessMatchesOpportunity(business, item) || item.preferredBusinessId === businessId);
    const quotes = opportunities.flatMap((opportunity) => opportunity.quotes.filter((quote) => quote.businessId === businessId));
    const wins = opportunities.filter((opportunity) => opportunity.quotes.some((quote) => quote.businessId === businessId && quote.id === opportunity.bookedQuoteId));
    const open = opportunities.filter((opportunity) => !['booked', 'cancelled'].includes(opportunity.status));
    return {
      opportunities: opportunities.length,
      openOpportunities: open.length,
      quotesSubmitted: quotes.length,
      wins: wins.length,
      winRate: quotes.length ? Math.round((wins.length / quotes.length) * 1000) / 10 : 0,
      quotedValue: Math.round(quotes.reduce((sum, quote) => sum + quote.amount, 0) * 100) / 100,
      currency: business.currency
    };
  }
}
