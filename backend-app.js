import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createStore } from './lib-store.js';
import { createSessionToken, requireRole } from './lib-auth.js';
import {
  HttpError,
  applySecurityHeaders,
  createRateLimiter,
  optionalFutureDateTime,
  optionalPositiveNumber,
  optionalString,
  optionalUrl,
  parseUrl,
  readJsonBody,
  requireEmail,
  requirePositiveNumber,
  requireString,
  requireStringArray,
  routeMatch,
  sendError,
  sendJson,
  serveStatic
} from './lib-http.js';
import { createMarketplaceConnector } from './connector-marketplace.js';
import { createBraveConnector } from './connector-brave.js';
import { createGooglePlacesConnector } from './connector-google-places.js';
import { createOpenAiIntelligence } from './connector-openai.js';
import { createEmailConnector } from './connector-email.js';
import { SearchOrchestrator } from './search-orchestrator.js';
import { MarketplaceService } from './service-marketplace.js';
import { BusinessService } from './service-business.js';
import { AdminService } from './service-admin.js';

function cleanLocale(value) {
  return value === 'ar' ? 'ar' : 'en';
}

function cleanMarket(value, fallback) {
  const market = String(value || fallback).toUpperCase();
  if (!/^[A-Z]{2}$/.test(market)) throw new HttpError(400, 'market must be a two-letter code');
  return market;
}

function cleanUrgency(value) {
  const urgency = String(value || 'flexible');
  if (!['now', 'today', 'tomorrow', 'weekend', 'this-week', 'flexible'].includes(urgency)) {
    throw new HttpError(400, 'Unsupported urgency');
  }
  return urgency;
}

function sanitizeSourceResult(value) {
  if (!value || typeof value !== 'object') return null;
  const url = value.url ? optionalUrl(value.url, 'sourceResult.url') : null;
  return {
    id: optionalString(value.id, { max: 180 }),
    source: optionalString(value.source, { max: 100 }),
    sourceType: optionalString(value.sourceType, { max: 60 }),
    title: optionalString(value.title, { max: 220 }),
    subtitle: optionalString(value.subtitle, { max: 500 }),
    url,
    attribution: optionalString(value.attribution, { max: 180 }),
    meta: {
      businessId: optionalString(value.meta?.businessId, { max: 160 }),
      placeId: optionalString(value.meta?.placeId, { max: 220 })
    }
  };
}

function password(value) {
  const output = requireString(value, 'password', { min: 8, max: 200 });
  if (!/[A-Za-z]/.test(output) || !/\d/.test(output)) {
    throw new HttpError(400, 'password must contain at least one letter and one number');
  }
  return output;
}

function normalizeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

export async function createNaylApp(config) {
  const store = createStore(config);
  await store.init();

  const openAi = createOpenAiIntelligence({
    apiKey: config.openaiApiKey,
    model: config.openaiModel,
    deepModel: config.openaiDeepModel,
    timeoutMs: config.connectorTimeoutMs,
    deepTimeoutMs: config.deepSearchTimeoutMs
  });
  const resultConnectors = [
    createMarketplaceConnector({ store }),
    createGooglePlacesConnector({ apiKey: config.googleMapsApiKey, timeoutMs: config.connectorTimeoutMs }),
    createBraveConnector({ apiKey: config.braveSearchApiKey, timeoutMs: config.connectorTimeoutMs })
  ];
  const email = createEmailConnector({
    apiKey: config.resendApiKey,
    from: config.emailFrom,
    appBaseUrl: config.appBaseUrl,
    timeoutMs: config.connectorTimeoutMs
  });
  const orchestrator = new SearchOrchestrator({
    store,
    connectors: resultConnectors,
    openAi,
    defaultMarket: config.defaultMarket,
    defaultCity: config.defaultCity
  });
  const allConnectorDescriptors = () => [
    ...orchestrator.connectorDescriptors(),
    email.descriptor,
    {
      id: 'persistent-storage',
      name: store.mode === 'supabase-postgres' ? 'Supabase PostgreSQL Storage' : 'Local JSON Storage',
      sourceType: 'storage',
      mode: store.mode === 'supabase-postgres' ? 'live' : 'local-only',
      configured: true,
      status: store.mode === 'supabase-postgres' ? 'ready' : 'local-only',
      description: store.mode === 'supabase-postgres'
        ? 'Persistent state is stored in Supabase PostgreSQL with optimistic transactions.'
        : 'Local JSON state is active. Configure SUPABASE_URL and SUPABASE_SECRET_KEY before public use.'
    }
  ];

  const marketplaceService = new MarketplaceService({ store, notification: email });
  const businessService = new BusinessService({
    store,
    sessionSecret: config.sessionSecret,
    autoVerifyBusinesses: config.autoVerifyBusinesses,
    notification: email,
    appBaseUrl: config.appBaseUrl,
    adminEmail: config.adminEmail
  });
  const adminService = new AdminService({
    store,
    sessionSecret: config.sessionSecret,
    adminEmail: config.adminEmail,
    adminPassword: config.adminPassword,
    getConnectors: allConnectorDescriptors,
    notification: email
  });
  const rateLimit = createRateLimiter({ windowMs: config.rateLimitWindowMs, max: config.rateLimitMax });

  const server = http.createServer(async (req, res) => {
    const requestId = String(req.headers['x-request-id'] || randomUUID());
    const startedAt = Date.now();
    applySecurityHeaders(res, { production: config.nodeEnv === 'production' });
    res.setHeader('X-Request-Id', requestId);

    try {
      const url = parseUrl(req);
      const { pathname } = url;

      if (pathname.startsWith('/api/')) {
        const limit = rateLimit(req);
        res.setHeader('X-RateLimit-Limit', String(config.rateLimitMax));
        res.setHeader('X-RateLimit-Remaining', String(limit.remaining));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(limit.resetAt / 1000)));
        if (!limit.allowed) throw new HttpError(429, 'Too many requests. Please retry shortly.');
      }

      if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method === 'GET' && pathname === '/api/health') {
        sendJson(res, 200, {
          status: 'ok',
          service: 'nayl-production-v1',
          version: '1.0.0',
          storage: store.mode,
          timestamp: new Date().toISOString(),
          requestId
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/config') {
        const data = await store.snapshot();
        sendJson(res, 200, {
          product: 'NAYL',
          version: '1.0.0',
          defaults: { market: config.defaultMarket, city: config.defaultCity },
          markets: data.markets,
          categories: data.categories.map(({ id, label, labelAr }) => ({ id, label, labelAr })),
          connectors: allConnectorDescriptors(),
          adminConfigured: Boolean(config.adminEmail && config.adminPassword),
          storageMode: store.mode,
          requestId
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/search') {
        const body = await readJsonBody(req);
        const result = await orchestrator.search({
          query: requireString(body.query, 'query', { min: 2, max: 800 }),
          market: cleanMarket(body.market, config.defaultMarket),
          city: optionalString(body.city, { max: 100 }) || config.defaultCity,
          locale: cleanLocale(body.locale),
          deep: normalizeBoolean(body.deep, false)
        });
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/consumer/session') {
        const consumerId = `consumer-${randomUUID()}`;
        const token = createSessionToken({ role: 'consumer', consumerId }, config.sessionSecret, 60 * 60 * 24 * 180);
        sendJson(res, 201, { token, consumerId, requestId });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/consumer/requests') {
        const identity = requireRole(req, config.sessionSecret, 'consumer');
        const requests = await marketplaceService.listConsumerRequests(identity.consumerId);
        sendJson(res, 200, { requests, requestId });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/consumer/requests') {
        const identity = requireRole(req, config.sessionSecret, 'consumer');
        const body = await readJsonBody(req);
        const request = await marketplaceService.createRequest({
          consumerId: identity.consumerId,
          contact: {
            name: requireString(body.contact?.name, 'contact.name', { min: 2, max: 120 }),
            email: requireEmail(body.contact?.email, 'contact.email'),
            phone: optionalString(body.contact?.phone, { max: 60 }) || ''
          },
          query: requireString(body.query, 'query', { min: 2, max: 800 }),
          category: requireString(body.category || 'general', 'category', { min: 2, max: 80 }),
          market: cleanMarket(body.market, config.defaultMarket),
          city: requireString(body.city, 'city', { min: 2, max: 100 }),
          budget: optionalPositiveNumber(body.budget, 'budget'),
          urgency: cleanUrgency(body.urgency),
          details: optionalString(body.details, { max: 1500 }) || '',
          sourceResult: sanitizeSourceResult(body.sourceResult)
        });
        sendJson(res, 201, { request, requestId });
        return;
      }

      let params = routeMatch(pathname, /^\/api\/consumer\/requests\/([^/]+)\/accept$/);
      if (req.method === 'POST' && params) {
        const identity = requireRole(req, config.sessionSecret, 'consumer');
        const body = await readJsonBody(req);
        const result = await marketplaceService.acceptQuote({
          opportunityId: params[0],
          consumerId: identity.consumerId,
          quoteId: requireString(body.quoteId, 'quoteId', { min: 2, max: 180 })
        });
        sendJson(res, 200, { ...result, requestId });
        return;
      }

      params = routeMatch(pathname, /^\/api\/consumer\/requests\/([^/]+)\/cancel$/);
      if (req.method === 'POST' && params) {
        const identity = requireRole(req, config.sessionSecret, 'consumer');
        const request = await marketplaceService.cancelRequest({ opportunityId: params[0], consumerId: identity.consumerId });
        sendJson(res, 200, { request, requestId });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/business/register') {
        const body = await readJsonBody(req);
        const output = await businessService.register({
          name: requireString(body.name, 'name', { min: 2, max: 160 }),
          nameAr: optionalString(body.nameAr, { max: 160 }) || '',
          email: requireEmail(body.email),
          password: password(body.password),
          phone: optionalString(body.phone, { max: 60 }) || '',
          website: optionalUrl(body.website),
          market: cleanMarket(body.market, config.defaultMarket),
          serviceAreas: requireStringArray(body.serviceAreas, 'serviceAreas', { min: 1, max: 20 }),
          categories: requireStringArray(body.categories, 'categories', { min: 1, max: 12 }),
          description: requireString(body.description, 'description', { min: 20, max: 1200 }),
          priceFrom: optionalPositiveNumber(body.priceFrom, 'priceFrom')
        });
        sendJson(res, 201, { ...output, requestId });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/business/login') {
        const body = await readJsonBody(req);
        const output = await businessService.login(requireEmail(body.email), requireString(body.password, 'password', { min: 1, max: 200 }));
        sendJson(res, 200, { ...output, requestId });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/business/me') {
        const identity = requireRole(req, config.sessionSecret, 'business');
        const business = await businessService.getProfile(identity.businessId);
        sendJson(res, 200, { business, requestId });
        return;
      }

      if (req.method === 'PUT' && pathname === '/api/business/me') {
        const identity = requireRole(req, config.sessionSecret, 'business');
        const body = await readJsonBody(req);
        const business = await businessService.updateProfile(identity.businessId, {
          name: body.name === undefined ? undefined : requireString(body.name, 'name', { min: 2, max: 160 }),
          nameAr: body.nameAr === undefined ? undefined : optionalString(body.nameAr, { max: 160 }) || '',
          phone: body.phone === undefined ? undefined : optionalString(body.phone, { max: 60 }) || '',
          website: body.website === undefined ? undefined : optionalUrl(body.website),
          description: body.description === undefined ? undefined : requireString(body.description, 'description', { min: 20, max: 1200 }),
          priceFrom: body.priceFrom === undefined ? undefined : optionalPositiveNumber(body.priceFrom, 'priceFrom'),
          categories: body.categories === undefined ? undefined : requireStringArray(body.categories, 'categories', { min: 1, max: 12 }),
          serviceAreas: body.serviceAreas === undefined ? undefined : requireStringArray(body.serviceAreas, 'serviceAreas', { min: 1, max: 20 }),
          acceptingLeads: body.acceptingLeads
        });
        sendJson(res, 200, { business, requestId });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/business/opportunities') {
        const identity = requireRole(req, config.sessionSecret, 'business');
        const opportunities = await businessService.listOpportunities(identity.businessId);
        sendJson(res, 200, { opportunities, requestId });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/business/kpis') {
        const identity = requireRole(req, config.sessionSecret, 'business');
        const kpis = await businessService.getKpis(identity.businessId);
        sendJson(res, 200, { kpis, requestId });
        return;
      }

      params = routeMatch(pathname, /^\/api\/business\/opportunities\/([^/]+)\/quotes$/);
      if (req.method === 'POST' && params) {
        const identity = requireRole(req, config.sessionSecret, 'business');
        const body = await readJsonBody(req);
        const quote = await businessService.submitQuote({
          businessId: identity.businessId,
          opportunityId: params[0],
          amount: requirePositiveNumber(body.amount, 'amount'),
          currency: requireString(body.currency, 'currency', { min: 3, max: 3 }).toUpperCase(),
          message: requireString(body.message, 'message', { min: 10, max: 1000 }),
          availableAt: requireString(body.availableAt, 'availableAt', { min: 2, max: 160 }),
          validUntil: optionalFutureDateTime(body.validUntil, 'validUntil')
        });
        sendJson(res, 201, { quote, requestId });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/admin/login') {
        const body = await readJsonBody(req);
        const output = adminService.login(requireEmail(body.email), requireString(body.password, 'password', { min: 1, max: 200 }));
        sendJson(res, 200, { ...output, requestId });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/admin/overview') {
        requireRole(req, config.sessionSecret, 'admin');
        const overview = await adminService.overview();
        sendJson(res, 200, { ...overview, requestId });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/admin/businesses') {
        requireRole(req, config.sessionSecret, 'admin');
        const businesses = await adminService.listBusinesses();
        sendJson(res, 200, { businesses, requestId });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/admin/requests') {
        requireRole(req, config.sessionSecret, 'admin');
        const requests = await adminService.listRequests();
        sendJson(res, 200, { requests, requestId });
        return;
      }

      params = routeMatch(pathname, /^\/api\/admin\/businesses\/([^/]+)\/status$/);
      if (req.method === 'PATCH' && params) {
        const identity = requireRole(req, config.sessionSecret, 'admin');
        const body = await readJsonBody(req);
        const business = await adminService.setBusinessStatus({
          businessId: params[0],
          status: requireString(body.status, 'status', { min: 4, max: 20 }),
          actor: identity.email
        });
        sendJson(res, 200, { business, requestId });
        return;
      }

      if (pathname.startsWith('/api/')) throw new HttpError(404, 'API route not found');
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed');
      const served = await serveStatic(req, res, pathname);
      if (!served) throw new HttpError(404, 'Page not found');
    } catch (error) {
      if (!(error instanceof HttpError)) {
        console.error(JSON.stringify({
          level: 'error',
          requestId,
          method: req.method,
          path: req.url,
          message: error instanceof Error ? error.message : String(error),
          stack: config.nodeEnv === 'development' && error instanceof Error ? error.stack : undefined
        }));
      }
      if (!res.headersSent) sendError(res, error, requestId);
      else res.end();
    } finally {
      if (config.nodeEnv !== 'test') {
        console.log(JSON.stringify({
          level: 'info',
          requestId,
          method: req.method,
          path: req.url,
          status: res.statusCode,
          durationMs: Date.now() - startedAt
        }));
      }
    }
  });

  return { server, store, services: { marketplaceService, businessService, adminService }, orchestrator };
}
