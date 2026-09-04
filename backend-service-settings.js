import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { HttpError } from './backend-lib-http.js';

const PROVIDERS = new Set(['openai', 'google', 'brave', 'resend']);
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,98}[A-Za-z0-9]$/;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeModel(value, fallback, field) {
  if (value == null || value === '') return fallback;
  const model = String(value).trim();
  if (!MODEL_PATTERN.test(model)) throw new HttpError(400, `${field} is not a valid model identifier`);
  return model;
}

function normalizeEmailFrom(value, fallback = '') {
  if (value == null) return fallback;
  const output = String(value).trim();
  if (output.length > 240) throw new HttpError(400, 'emailFrom is too long');
  if (output && !output.includes('@')) throw new HttpError(400, 'emailFrom must contain a sender email address');
  return output;
}

function keyHint(value) {
  const secret = String(value || '');
  if (!secret) return '';
  if (secret.length <= 8) return `${secret.slice(0, 2)}••••`;
  return `${secret.slice(0, 4)}••••${secret.slice(-4)}`;
}

function storageSettings(data) {
  data.systemSettings ||= {};
  data.systemSettings.connectors ||= {};
  data.systemSettings.marketplace ||= {};
  return data.systemSettings;
}

export class ConnectorSettingsService {
  constructor({ store, sessionSecret, config }) {
    this.store = store;
    this.config = config;
    this.key = createHash('sha256').update(String(sessionSecret)).digest();
  }

  encrypt(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return {
      version: 1,
      algorithm: 'aes-256-gcm',
      iv: iv.toString('base64url'),
      tag: cipher.getAuthTag().toString('base64url'),
      data: encrypted.toString('base64url')
    };
  }

  decrypt(payload) {
    if (!isObject(payload) || payload.algorithm !== 'aes-256-gcm') return '';
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(payload.iv, 'base64url'));
      decipher.setAuthTag(Buffer.from(payload.tag, 'base64url'));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(payload.data, 'base64url')),
        decipher.final()
      ]);
      return decrypted.toString('utf8');
    } catch {
      return '';
    }
  }

  async runtime() {
    const data = await this.store.snapshot();
    const settings = storageSettings(data);
    const openaiStored = settings.connectors.openai || {};
    const googleStored = settings.connectors.google || {};
    const braveStored = settings.connectors.brave || {};
    const resendStored = settings.connectors.resend || {};

    const storedOpenAiKey = this.decrypt(openaiStored.secret);
    const storedGoogleKey = this.decrypt(googleStored.secret);
    const storedBraveKey = this.decrypt(braveStored.secret);
    const storedResendKey = this.decrypt(resendStored.secret);

    return {
      openai: {
        apiKey: storedOpenAiKey || this.config.openaiApiKey || '',
        source: storedOpenAiKey ? 'admin-vault' : this.config.openaiApiKey ? 'environment' : 'none',
        model: normalizeModel(openaiStored.model, this.config.openaiModel, 'OpenAI model'),
        deepModel: normalizeModel(openaiStored.deepModel, this.config.openaiDeepModel, 'OpenAI deep-search model')
      },
      google: {
        apiKey: storedGoogleKey || this.config.googleMapsApiKey || '',
        source: storedGoogleKey ? 'admin-vault' : this.config.googleMapsApiKey ? 'environment' : 'none'
      },
      brave: {
        apiKey: storedBraveKey || this.config.braveSearchApiKey || '',
        source: storedBraveKey ? 'admin-vault' : this.config.braveSearchApiKey ? 'environment' : 'none'
      },
      resend: {
        apiKey: storedResendKey || this.config.resendApiKey || '',
        source: storedResendKey ? 'admin-vault' : this.config.resendApiKey ? 'environment' : 'none',
        emailFrom: normalizeEmailFrom(resendStored.emailFrom, this.config.emailFrom)
      },
      marketplace: {
        autoVerifyBusinesses: typeof settings.marketplace.autoVerifyBusinesses === 'boolean'
          ? settings.marketplace.autoVerifyBusinesses
          : Boolean(this.config.autoVerifyBusinesses)
      }
    };
  }

  async publicState() {
    const runtime = await this.runtime();
    const data = await this.store.snapshot();
    const settings = storageSettings(data);
    const lastTests = settings.connectorTests || {};
    const descriptor = (id, name, configured, source, hint, extra = {}) => ({
      id,
      name,
      configured,
      mode: configured ? 'live' : 'setup-required',
      source,
      keyHint: hint,
      lastTest: lastTests[id] || null,
      ...extra
    });

    return {
      openai: descriptor(
        'openai',
        'OpenAI Buyer Intelligence + Deep Search',
        Boolean(runtime.openai.apiKey),
        runtime.openai.source,
        keyHint(runtime.openai.apiKey),
        { model: runtime.openai.model, deepModel: runtime.openai.deepModel }
      ),
      google: descriptor('google', 'Google Places', Boolean(runtime.google.apiKey), runtime.google.source, keyHint(runtime.google.apiKey)),
      brave: descriptor('brave', 'Brave Web Search', Boolean(runtime.brave.apiKey), runtime.brave.source, keyHint(runtime.brave.apiKey)),
      resend: descriptor(
        'resend',
        'Email Notifications',
        Boolean(runtime.resend.apiKey && runtime.resend.emailFrom),
        runtime.resend.source,
        keyHint(runtime.resend.apiKey),
        { emailFrom: runtime.resend.emailFrom }
      ),
      marketplace: {
        id: 'marketplace',
        name: 'NAYL Marketplace',
        configured: true,
        mode: 'live',
        autoVerifyBusinesses: runtime.marketplace.autoVerifyBusinesses
      }
    };
  }

  async update(input, actor = 'admin') {
    if (!isObject(input)) throw new HttpError(400, 'Connector settings payload must be an object');
    const now = new Date().toISOString();
    await this.store.transact((data) => {
      const settings = storageSettings(data);
      settings.connectorTests ||= {};

      const applyProvider = (provider, patch, extras = {}) => {
        if (!isObject(patch)) return;
        const current = settings.connectors[provider] || {};
        const next = { ...current, ...extras, updatedAt: now, updatedBy: actor };
        if (patch.clearApiKey === true) {
          delete next.secret;
          delete next.keyHint;
        }
        if (typeof patch.apiKey === 'string' && patch.apiKey.trim()) {
          next.secret = this.encrypt(patch.apiKey);
          next.keyHint = keyHint(patch.apiKey);
        }
        settings.connectors[provider] = next;
        delete settings.connectorTests[provider];
      };

      if (isObject(input.openai)) {
        applyProvider('openai', input.openai, {
          model: normalizeModel(input.openai.model, settings.connectors.openai?.model || this.config.openaiModel, 'OpenAI model'),
          deepModel: normalizeModel(input.openai.deepModel, settings.connectors.openai?.deepModel || this.config.openaiDeepModel, 'OpenAI deep-search model')
        });
      }
      applyProvider('google', input.google);
      applyProvider('brave', input.brave);
      if (isObject(input.resend)) {
        applyProvider('resend', input.resend, {
          emailFrom: normalizeEmailFrom(input.resend.emailFrom, settings.connectors.resend?.emailFrom || this.config.emailFrom)
        });
      }
      if (isObject(input.marketplace) && typeof input.marketplace.autoVerifyBusinesses === 'boolean') {
        settings.marketplace.autoVerifyBusinesses = input.marketplace.autoVerifyBusinesses;
        settings.marketplace.updatedAt = now;
        settings.marketplace.updatedBy = actor;
      }

      data.auditEvents.unshift({
        id: `audit-${randomUUID()}`,
        type: 'system.connectors.updated',
        actor,
        summary: 'Connector configuration was updated from the protected admin console.',
        entityId: null,
        createdAt: now
      });
      data.auditEvents = data.auditEvents.slice(0, 1000);
      return true;
    });
    return this.publicState();
  }

  async recordTest(provider, result, actor = 'admin') {
    const now = new Date().toISOString();
    await this.store.transact((data) => {
      const settings = storageSettings(data);
      settings.connectorTests ||= {};
      settings.connectorTests[provider] = {
        ok: Boolean(result.ok),
        message: String(result.message || '').slice(0, 300),
        latencyMs: Number(result.latencyMs || 0),
        testedAt: now,
        testedBy: actor,
        metadata: isObject(result.metadata) ? result.metadata : {}
      };
      data.auditEvents.unshift({
        id: `audit-${randomUUID()}`,
        type: result.ok ? 'system.connector.test.passed' : 'system.connector.test.failed',
        actor,
        summary: `${provider} connector test ${result.ok ? 'passed' : 'failed'}: ${String(result.message || '').slice(0, 180)}`,
        entityId: provider,
        createdAt: now
      });
      data.auditEvents = data.auditEvents.slice(0, 1000);
      return true;
    });
  }

  async test(provider, actor = 'admin') {
    if (!PROVIDERS.has(provider)) throw new HttpError(404, 'Unknown connector');
    const runtime = await this.runtime();
    const startedAt = performance.now();
    let result;
    try {
      if (provider === 'openai') result = await this.#testOpenAi(runtime.openai);
      if (provider === 'google') result = await this.#testGoogle(runtime.google);
      if (provider === 'brave') result = await this.#testBrave(runtime.brave);
      if (provider === 'resend') result = await this.#testResend(runtime.resend);
      result = { ...result, ok: true, latencyMs: Math.round(performance.now() - startedAt) };
    } catch (error) {
      result = {
        ok: false,
        latencyMs: Math.round(performance.now() - startedAt),
        message: error instanceof Error ? error.message.slice(0, 300) : 'Connector test failed',
        metadata: {}
      };
    }
    await this.recordTest(provider, result, actor);
    return result;
  }

  async #testOpenAi(settings) {
    if (!settings.apiKey) throw new Error('Add an OpenAI API key first. A ChatGPT subscription is not an API key.');
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${settings.apiKey}` },
      signal: AbortSignal.timeout(this.config.connectorTimeoutMs)
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`OpenAI returned ${response.status}: ${details.slice(0, 220)}`);
    }
    const payload = await response.json();
    const ids = new Set((payload.data || []).map((item) => item.id));
    const modelVisible = ids.has(settings.model);
    const deepModelVisible = ids.has(settings.deepModel);
    return {
      message: modelVisible && deepModelVisible
        ? 'OpenAI credentials are valid and both configured models are available.'
        : 'OpenAI credentials are valid. One or more configured model aliases were not listed; run a buyer search to verify account access.',
      metadata: {
        model: settings.model,
        modelVisible,
        deepModel: settings.deepModel,
        deepModelVisible
      }
    };
  }

  async #testGoogle(settings) {
    if (!settings.apiKey) throw new Error('Add a Google Maps API key first. Places API (New) and billing must be enabled.');
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': settings.apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName'
      },
      body: JSON.stringify({ textQuery: 'coffee shop in Dubai', regionCode: 'AE', maxResultCount: 1 }),
      signal: AbortSignal.timeout(this.config.connectorTimeoutMs)
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Google Places returned ${response.status}: ${details.slice(0, 220)}`);
    }
    const payload = await response.json();
    return {
      message: 'Google Places credentials are valid and Text Search (New) is reachable.',
      metadata: { resultCount: Array.isArray(payload.places) ? payload.places.length : 0 }
    };
  }

  async #testBrave(settings) {
    if (!settings.apiKey) throw new Error('Add a Brave Search API subscription token first.');
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', 'NAYL GCC buyer');
    url.searchParams.set('count', '1');
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'X-Subscription-Token': settings.apiKey },
      signal: AbortSignal.timeout(this.config.connectorTimeoutMs)
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Brave Search returned ${response.status}: ${details.slice(0, 220)}`);
    }
    const payload = await response.json();
    return {
      message: 'Brave Search credentials are valid and Web Search is reachable.',
      metadata: { resultCount: Array.isArray(payload.web?.results) ? payload.web.results.length : 0 }
    };
  }

  async #testResend(settings) {
    if (!settings.apiKey || !settings.emailFrom) throw new Error('Add a Resend API key and sender address first.');
    const response = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${settings.apiKey}` },
      signal: AbortSignal.timeout(this.config.connectorTimeoutMs)
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Resend returned ${response.status}: ${details.slice(0, 220)}`);
    }
    const payload = await response.json();
    return {
      message: 'Resend credentials are valid. Confirm that EMAIL_FROM uses a verified sending domain before emailing customers.',
      metadata: { domainCount: Array.isArray(payload.data) ? payload.data.length : 0, emailFrom: settings.emailFrom }
    };
  }
}
