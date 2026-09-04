import { randomUUID } from 'node:crypto';
import { createSessionToken, hashPassword, verifyPassword } from './backend-lib-auth.js';
import { HttpError } from './backend-lib-http.js';

export function publicConsumer(consumer) {
  if (!consumer) return null;
  return {
    id: consumer.id,
    name: consumer.name,
    email: consumer.email,
    phone: consumer.phone || '',
    locale: consumer.locale === 'ar' ? 'ar' : 'en',
    status: consumer.status || 'active',
    createdAt: consumer.createdAt,
    updatedAt: consumer.updatedAt
  };
}

function issueToken(consumer, sessionSecret) {
  return createSessionToken(
    { role: 'consumer', consumerId: consumer.id, email: consumer.email },
    sessionSecret,
    60 * 60 * 24 * 30
  );
}

export class ConsumerService {
  constructor({ store, sessionSecret, notification, appBaseUrl }) {
    this.store = store;
    this.sessionSecret = sessionSecret;
    this.notification = notification;
    this.appBaseUrl = appBaseUrl;
  }

  async register(input) {
    const credentials = await hashPassword(input.password);
    const now = new Date().toISOString();
    const consumer = await this.store.transact((data) => {
      if (data.consumers.some((item) => item.email === input.email)) {
        throw new HttpError(409, 'An account already exists for this email address');
      }
      const created = {
        id: `consumer-${randomUUID()}`,
        name: input.name,
        email: input.email,
        phone: input.phone || '',
        locale: input.locale === 'ar' ? 'ar' : 'en',
        passwordSalt: credentials.salt,
        passwordHash: credentials.hash,
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
      data.consumers.push(created);
      data.auditEvents.unshift({
        id: `audit-${randomUUID()}`,
        type: 'consumer.registered',
        actor: created.id,
        summary: `Consumer account registered for ${created.email}`,
        entityId: created.id,
        createdAt: now
      });
      data.auditEvents = data.auditEvents.slice(0, 1000);
      return created;
    });

    await this.notification.send({
      to: consumer.email,
      subject: 'Welcome to NAYL',
      heading: `Welcome, ${consumer.name}`,
      body: 'Your buyer account is ready. Search once, request quotes, compare providers, and confirm a booking from one place.',
      buttonLabel: 'Open NAYL',
      buttonPath: '/'
    }).catch(() => undefined);

    return {
      consumer: publicConsumer(consumer),
      token: issueToken(consumer, this.sessionSecret)
    };
  }

  async login(email, password) {
    const data = await this.store.snapshot();
    const consumer = data.consumers.find((item) => item.email === email);
    const valid = consumer && consumer.status !== 'suspended'
      && await verifyPassword(password, consumer.passwordSalt, consumer.passwordHash);
    if (!valid) throw new HttpError(401, 'Invalid email or password');
    return {
      consumer: publicConsumer(consumer),
      token: issueToken(consumer, this.sessionSecret)
    };
  }

  async getProfile(consumerId) {
    const data = await this.store.snapshot();
    const consumer = data.consumers.find((item) => item.id === consumerId);
    if (!consumer) throw new HttpError(404, 'Consumer account not found');
    if (consumer.status === 'suspended') throw new HttpError(403, 'This account is suspended');
    return publicConsumer(consumer);
  }

  async updateProfile(consumerId, patch) {
    return this.store.transact((data) => {
      const consumer = data.consumers.find((item) => item.id === consumerId);
      if (!consumer) throw new HttpError(404, 'Consumer account not found');
      if (consumer.status === 'suspended') throw new HttpError(403, 'This account is suspended');
      if (patch.name !== undefined) consumer.name = patch.name;
      if (patch.phone !== undefined) consumer.phone = patch.phone;
      if (patch.locale !== undefined) consumer.locale = patch.locale === 'ar' ? 'ar' : 'en';
      consumer.updatedAt = new Date().toISOString();
      return publicConsumer(consumer);
    });
  }
}
