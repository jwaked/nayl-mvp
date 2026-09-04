import { randomUUID, timingSafeEqual } from 'node:crypto';
import { createSessionToken } from './lib-auth.js';
import { HttpError } from './lib-http.js';
import { publicBusiness } from './service-business.js';

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

function dayKey(value) {
  return String(value || '').slice(0, 10);
}

export class AdminService {
  constructor({ store, sessionSecret, adminEmail, adminPassword, getConnectors, notification }) {
    this.store = store;
    this.sessionSecret = sessionSecret;
    this.adminEmail = adminEmail;
    this.adminPassword = adminPassword;
    this.getConnectors = getConnectors;
    this.notification = notification;
  }

  login(email, password) {
    if (!this.adminEmail || !this.adminPassword) throw new HttpError(503, 'Admin login is not configured on the server');
    if (!safeEqual(email.toLowerCase(), this.adminEmail) || !safeEqual(password, this.adminPassword)) {
      throw new HttpError(401, 'Invalid admin credentials');
    }
    return {
      token: createSessionToken({ role: 'admin', email: this.adminEmail }, this.sessionSecret, 60 * 60 * 12),
      admin: { email: this.adminEmail }
    };
  }

  async overview() {
    const data = await this.store.snapshot();
    const today = dayKey(new Date().toISOString());
    const todaySearches = data.searchEvents.filter((event) => dayKey(event.createdAt) === today);
    const bookings = data.bookings || [];
    const gmvByCurrency = bookings.reduce((totals, booking) => {
      totals[booking.currency] = Math.round(((totals[booking.currency] || 0) + booking.amount) * 100) / 100;
      return totals;
    }, {});
    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        searchesToday: todaySearches.length,
        totalSearches: data.searchEvents.length,
        quoteRequests: data.opportunities.length,
        openRequests: data.opportunities.filter((item) => !['booked', 'cancelled'].includes(item.status)).length,
        quotesSubmitted: data.opportunities.reduce((sum, item) => sum + item.quotes.length, 0),
        bookings: bookings.length,
        registeredBusinesses: data.businesses.length,
        pendingBusinesses: data.businesses.filter((item) => item.status === 'pending').length,
        gmvByCurrency
      },
      connectors: this.getConnectors(),
      markets: data.markets,
      recentSearches: data.searchEvents.slice(0, 20),
      recentAudit: data.auditEvents.slice(0, 30)
    };
  }

  async listBusinesses() {
    const data = await this.store.snapshot();
    return data.businesses
      .map((item) => publicBusiness(item, { includePrivate: true }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async setBusinessStatus({ businessId, status, actor }) {
    if (!['pending', 'verified', 'suspended'].includes(status)) throw new HttpError(400, 'Invalid business status');
    const business = await this.store.transact((data) => {
      const business = data.businesses.find((item) => item.id === businessId);
      if (!business) throw new HttpError(404, 'Business not found');
      business.status = status;
      business.updatedAt = new Date().toISOString();
      data.auditEvents.unshift({
        id: `audit-${randomUUID()}`,
        type: 'business.status.changed',
        actor,
        summary: `${business.name} status changed to ${status}`,
        entityId: business.id,
        createdAt: business.updatedAt
      });
      return publicBusiness(business, { includePrivate: true });
    });
    await this.notification.send({
      to: business.email,
      subject: `Your NAYL business status is now ${status}`,
      heading: status === 'verified' ? 'Your NAYL profile is live' : `Profile status: ${status}`,
      body: status === 'verified'
        ? 'Your business can now appear in consumer search and receive matched quote opportunities.'
        : status === 'suspended'
          ? 'Your profile is not receiving new opportunities. Contact NAYL operations for review.'
          : 'Your profile is awaiting an operations review.',
      buttonLabel: 'Open business console',
      buttonPath: '/business'
    }).catch(() => undefined);
    return business;
  }

  async listRequests() {
    const data = await this.store.snapshot();
    return data.opportunities.map((item) => ({
      id: item.id,
      query: item.query,
      category: item.category,
      market: item.market,
      city: item.city,
      budget: item.budget,
      currency: item.currency,
      urgency: item.urgency,
      status: item.status,
      quoteCount: item.quotes.length,
      matchedBusinessCount: item.matchedBusinessCount,
      contact: item.contact,
      sourceResult: item.sourceResult,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}
