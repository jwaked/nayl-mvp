import { randomUUID, timingSafeEqual } from 'node:crypto';
import { createSessionToken, hashPassword, verifyPassword } from './backend-lib-auth.js';
import { HttpError } from './backend-lib-http.js';
import { publicBusiness } from './backend-service-business.js';
import { publicConsumer } from './backend-service-consumer.js';

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

function dayKey(value) {
  return String(value || '').slice(0, 10);
}

function publicAdmin(admin) {
  if (!admin) return null;
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt
  };
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

  async status() {
    const data = await this.store.snapshot();
    const storedAdmins = data.admins || [];
    const environmentAdminConfigured = Boolean(this.adminEmail && this.adminPassword);
    return {
      setupRequired: storedAdmins.length === 0 && !environmentAdminConfigured,
      adminConfigured: storedAdmins.length > 0 || environmentAdminConfigured,
      storedAdminCount: storedAdmins.length,
      environmentAdminConfigured
    };
  }

  async setup({ name, email, password }) {
    const credentials = await hashPassword(password);
    const now = new Date().toISOString();
    const admin = await this.store.transact((data) => {
      data.admins ||= [];
      if (data.admins.length > 0 || (this.adminEmail && this.adminPassword)) {
        throw new HttpError(409, 'Admin setup has already been completed');
      }
      const created = {
        id: `admin-${randomUUID()}`,
        name,
        email,
        passwordSalt: credentials.salt,
        passwordHash: credentials.hash,
        createdAt: now,
        updatedAt: now
      };
      data.admins.push(created);
      data.auditEvents.unshift({
        id: `audit-${randomUUID()}`,
        type: 'admin.owner.created',
        actor: created.id,
        summary: `NAYL owner account created for ${created.email}`,
        entityId: created.id,
        createdAt: now
      });
      data.auditEvents = data.auditEvents.slice(0, 1000);
      return created;
    });
    return {
      token: createSessionToken({ role: 'admin', adminId: admin.id, email: admin.email }, this.sessionSecret, 60 * 60 * 12),
      admin: publicAdmin(admin)
    };
  }

  async login(email, password) {
    const data = await this.store.snapshot();
    const storedAdmin = (data.admins || []).find((item) => item.email === email.toLowerCase());
    if (storedAdmin) {
      const valid = await verifyPassword(password, storedAdmin.passwordSalt, storedAdmin.passwordHash);
      if (!valid) throw new HttpError(401, 'Invalid admin credentials');
      return {
        token: createSessionToken({ role: 'admin', adminId: storedAdmin.id, email: storedAdmin.email }, this.sessionSecret, 60 * 60 * 12),
        admin: publicAdmin(storedAdmin)
      };
    }

    if (this.adminEmail && this.adminPassword
      && safeEqual(email.toLowerCase(), this.adminEmail)
      && safeEqual(password, this.adminPassword)) {
      return {
        token: createSessionToken({ role: 'admin', email: this.adminEmail, source: 'environment' }, this.sessionSecret, 60 * 60 * 12),
        admin: { id: 'environment-admin', name: 'NAYL Owner', email: this.adminEmail, source: 'environment' }
      };
    }

    if (!(data.admins || []).length && !(this.adminEmail && this.adminPassword)) {
      throw new HttpError(409, 'Create the owner account before signing in');
    }
    throw new HttpError(401, 'Invalid admin credentials');
  }

  async getProfile(identity) {
    if (identity.adminId) {
      const data = await this.store.snapshot();
      const admin = (data.admins || []).find((item) => item.id === identity.adminId);
      if (!admin) throw new HttpError(404, 'Admin account not found');
      return publicAdmin(admin);
    }
    if (identity.email === this.adminEmail && this.adminEmail) {
      return { id: 'environment-admin', name: 'NAYL Owner', email: this.adminEmail, source: 'environment' };
    }
    throw new HttpError(404, 'Admin account not found');
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
        registeredConsumers: (data.consumers || []).length,
        registeredBusinesses: data.businesses.length,
        pendingBusinesses: data.businesses.filter((item) => item.status === 'pending').length,
        gmvByCurrency
      },
      connectors: await this.getConnectors(),
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

  async listConsumers() {
    const data = await this.store.snapshot();
    return (data.consumers || [])
      .map(publicConsumer)
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
