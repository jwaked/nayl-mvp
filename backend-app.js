import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { JsonStore } from './store.js';
import {
  HttpError,
  applySecurityHeaders,
  createRateLimiter,
  optionalString,
  parseUrl,
  readJsonBody,
  requirePositiveNumber,
  requireString,
  sendError,
  sendJson,
  serveStatic
} from './http.js';
import { createMarketplaceConnector } from './connector-marketplace.js';
import { createBraveConnector } from './connector-brave.js';
import { createGooglePlacesConnector } from './connector-google-places.js';
import { createPartnerDemoConnector } from './connector-partner-demo.js';
import { SearchOrchestrator } from './search-orchestrator.js';
import { MarketplaceService } from './service-marketplace.js';
import { BusinessService } from './service-business.js';
import { AdminService } from './service-admin.js';

function routeMatch(pathname, pattern) {
  const match = pathname.match(pattern);
  return match ? match.slice(1).map(decodeURIComponent) : null;
}

function cleanLocale(value) {
  return value === 'ar' ? 'ar' : 'en';
}

function cleanMarket(value, fallback) {
  const market = String(value || fallback).toUpperCase();
  if (!/^[A-Z]{2}$/.test(market)) throw new HttpError(400, 'market must be a two-letter code');
  return market;
}

function cleanOptionalBudget(value) {
  if (value == null || value === '') return null;
  return requirePositiveNumber(value, 'budget');
}

function sanitizeSourceResult(sourceResult) {
  if (!sourceResult || typeof sourceResult !== 'object') return null;
  return {
    id: optionalString(sourceResult.id, { max: 160 }),
    title: optionalString(sourceResult.title, { max: 200 }),
    meta: {
      businessId: optionalString(sourceResult.meta?.businessId, { max: 120 })
    }
  };
}

export async function createNaylApp(config) {
  const store = new JsonStore(config.dataFile);
  await store.init();

  const connectors = [
    createMarketplaceConnector({ store }),
    createBraveConnector({ apiKey: config.braveSearchApiKey, timeoutMs: config.connectorTimeoutMs }),
    createGooglePlacesConnector({ apiKey: config.googleMapsApiKey, timeoutMs: config.connectorTimeoutMs }),
    createPartnerDemoConnector({ enabled: config.enablePartnerDemo })
  ];

  const orchestrator = new SearchOrchestrator({
    store,
    connectors,
    defaultMarket: config.defaultMarket,
    defaultCity: config.defaultCity
  });
  const marketplaceService = new MarketplaceService({ store });
  const businessService = new BusinessService({ store });
  const adminService = new AdminService({ store, getConnectors: () => orchestrator.connectorDescriptors() });
  const rateLimit = createRateLimiter({ windowMs: config.rateLimitWindowMs, max: config.rateLimitMax });

  const server = http.createServer(async (req, res) => {
    const requestId = req.headers['x-request-id'] || randomUUID();
    const startedAt = Date.now();
    applySecurityHeaders(res);
    res.setHeader('X-Request-Id', requestId);

    try {
      const url = parseUrl(req);
      const { pathname, searchParams } = url;

      if (pathname.startsWith('/api/')) {
        const limit = rateLimit(req);
        res.setHeader('X-RateLimit-Limit', String(config.rateLimitMax));
        res.setHeader('X-RateLimit-Remaining', String(limit.remaining));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(limit.resetAt / 1000)));
        if (!limit.allowed) throw new HttpError(429, 'Too many requests. Please retry after the rate-limit window.');
      }

      if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method === 'GET' && pathname === '/api/health') {
        sendJson(res, 200, {
          status: 'ok',
          service: 'nayl-mvp',
          version: '0.1.0',
          timestamp: new Date().toISOString(),
          requestId
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/config') {
        const data = await store.snapshot();
        sendJson(res, 200, {
          product: 'NAYL',
          version: '0.1.0',
          defaults: {
            market: config.defaultMarket,
            city: config.defaultCity,
            businessId: config.demoBusinessId
          },
          markets: data.markets,
          categories: data.categories.map(({ id, label, labelAr }) => ({ id, label, labelAr })),
          connectors: orchestrator.connectorDescriptors(),
          requestId
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/search') {
        const body = await readJsonBody(req);
        const query = requireString(body.query, 'query', { min: 2, max: 800 });
        const result = await orchestrator.search({
          query,
          market: cleanMarket(body.market, config.defaultMarket),
          city: optionalString(body.city, { max: 100 }) || config.defaultCity,
          locale: cleanLocale(body.locale)
        });
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'GET' && pathname === '/api/marketplace/requests') {
        const consumerId = requireString(searchParams.get('consumerId') || '', 'consumerId', { min: 2, max: 100 });
        const requests = await marketplaceService.listConsumerRequests(consumerId);
        sendJson(res, 200, { requests, requestId });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/marketplace/requests') {
        const body = await readJsonBody(req);
        const request = await marketplaceService.createRequest({
          consumerId: requireString(body.consumerId, 'consumerId', { min: 2, max: 100 }),
          query: requireString(body.query, 'query', { min: 2, max: 800 }),
          category: requireString(body.category || 'general', 'category', { min: 2, max: 80 }),
          market: cleanMarket(body.market, config.defaultMarket),
          city: requireString(body.city, 'city', { min: 2, max: 100 }),
          budget: cleanOptionalBudget(body.budget),
          currency: requireString(body.currency, 'currency', { min: 3, max: 3 }).toUpperCase(),
          urgency: requireString(body.urgency || 'flexible', 'urgency', { min: 2, max: 40 }),
          sourceResult: sanitizeSourceResult(body.sourceResult)
        });
        sendJson(res, 201, { request, requestId });
        return;
      }

      let params = routeMatch(pathname, /^\/api\/marketplace\/requests\/([^/]+)\/book$/);
      if (req.method === 'POST' && params) {
        const body = await readJsonBody(req);
        const request = await marketplaceService.bookQuote({
          opportunityId: params[0],
          consumerId: requireString(body.consumerId, 'consumerId', { min: 2, max: 100 }),
          quoteId: requireString(body.quoteId, 'quoteId', { min: 2, max: 160 })
        });
        sendJson(res, 200, { request, requestId });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/business/profile') {
        const businessId = requireString(searchParams.get('businessId') || config.demoBusinessId, 'businessId', { min: 2, max: 120 });
        const business = await businessService.getProfile(businessId);
        sendJson(res, 200, { business, requestId });
        return;
      }

      if (req.method === 'PUT' && pathname === '/api/business/profile') {
        const body = await readJsonBody(req);
        const businessId = requireString(body.businessId || config.demoBusinessId, 'businessId', { min: 2, max: 120 });
        const business = await businessService.updateProfile(businessId, {
          contactName: body.contactName == null ? undefined : requireString(body.contactName, 'contactName', { min: 2, max: 120 }),
          email: body.email == null ? undefined : requireString(body.email, 'email', { min: 3, max: 180 }),
          phone: body.phone == null ? undefined : optionalString(body.phone, { max: 60 }),
          description: body.description == null ? undefined : requireString(body.description, 'description', { min: 2, max: 800 }),
          acceptingLeads: body.acceptingLeads,
          serviceAreas: Array.isArray(body.serviceAreas) ? body.serviceAreas.map(String) : undefined
        });
        sendJson(res, 200, { business, requestId });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/business/opportunities') {
        const businessId = requireString(searchParams.get('businessId') || config.demoBusinessId, 'businessId', { min: 2, max: 120 });
        const opportunities = await businessService.listOpportunities(businessId);
        sendJson(res, 200, { opportunities, requestId });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/business/kpis') {
        const businessId = requireString(searchParams.get('businessId') || config.demoBusinessId, 'businessId', { min: 2, max: 120 });
        const kpis = await businessService.getKpis(businessId);
        sendJson(res, 200, { kpis, requestId });
        return;
      }

      params = routeMatch(pathname, /^\/api\/business\/opportunities\/([^/]+)\/quotes$/);
      if (req.method === 'POST' && params) {
        const body = await readJsonBody(req);
        const quote = await businessService.submitQuote({
          businessId: requireString(body.businessId || config.demoBusinessId, 'businessId', { min: 2, max: 120 }),
          opportunityId: params[0],
          amount: requirePositiveNumber(body.amount, 'amount'),
          currency: requireString(body.currency, 'currency', { min: 3, max: 3 }).toUpperCase(),
          message: requireString(body.message, 'message', { min: 2, max: 800 }),
          availableAt: requireString(body.availableAt, 'availableAt', { min: 2, max: 120 })
        });
        sendJson(res, 201, { quote, requestId });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/admin/overview') {
        const overview = await adminService.overview();
        sendJson(res, 200, { ...overview, requestId });
        return;
      }

      if (pathname.startsWith('/api/')) throw new HttpError(404, 'API route not found');

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
      sendError(res, error, requestId);
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

  server.on('clientError', (error, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    if (config.nodeEnv === 'development') console.error(error);
  });

  return {
    server,
    store,
    orchestrator,
    services: { marketplaceService, businessService, adminService }
  };
}
