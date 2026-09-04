import fs from 'node:fs/promises';
import path from 'node:path';
import { createSeedData } from './data-seed.js';

function normalizeState(input) {
  const seed = createSeedData();
  const data = input && typeof input === 'object' ? input : seed;
  data.version = 2;
  data.markets = Array.isArray(data.markets) && data.markets.length ? data.markets : seed.markets;
  data.categories = Array.isArray(data.categories) && data.categories.length ? data.categories : seed.categories;
  data.businesses = Array.isArray(data.businesses) ? data.businesses : [];
  data.opportunities = Array.isArray(data.opportunities) ? data.opportunities : [];
  data.bookings = Array.isArray(data.bookings) ? data.bookings : [];
  data.searchEvents = Array.isArray(data.searchEvents) ? data.searchEvents : [];
  data.auditEvents = Array.isArray(data.auditEvents) ? data.auditEvents : [];
  data.createdAt ||= seed.createdAt;
  data.updatedAt ||= seed.updatedAt;
  return data;
}

export class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.queue = Promise.resolve();
    this.initialized = false;
    this.mode = 'json-local';
  }

  async init() {
    if (this.initialized) return;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      await this.#writeFile(normalizeState(JSON.parse(raw)));
    } catch {
      await this.#writeFile(createSeedData());
    }
    this.initialized = true;
  }

  async read() {
    await this.init();
    return normalizeState(JSON.parse(await fs.readFile(this.filePath, 'utf8')));
  }

  async snapshot() {
    return structuredClone(await this.read());
  }

  async transact(mutator) {
    const run = async () => {
      const data = await this.read();
      const result = await mutator(data);
      data.updatedAt = new Date().toISOString();
      await this.#writeFile(data);
      return structuredClone(result);
    };
    const pending = this.queue.then(run, run);
    this.queue = pending.catch(() => undefined);
    return pending;
  }

  async reset() {
    await this.#writeFile(createSeedData());
    this.initialized = true;
  }

  async close() {}

  async #writeFile(data) {
    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await fs.rename(tempPath, this.filePath);
  }
}

export class SupabaseStore {
  constructor(url, serviceRoleKey, { timeoutMs = 15_000 } = {}) {
    this.url = String(url).replace(/\/$/, '');
    this.key = serviceRoleKey;
    this.timeoutMs = timeoutMs;
    this.initialized = false;
    this.mode = 'supabase-postgres';
  }

  headers(prefer = '') {
    const headers = {
      apikey: this.key,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    };

    // Supabase's current opaque sb_secret_* keys belong in the apikey header.
    // Legacy service_role JWTs also require Authorization for PostgREST.
    if (!this.key.startsWith('sb_secret_')) {
      headers.Authorization = `Bearer ${this.key}`;
    }

    return headers;
  }

  async request(pathname, options = {}) {
    const response = await fetch(`${this.url}/rest/v1/${pathname}`, {
      ...options,
      headers: { ...this.headers(options.prefer), ...(options.headers || {}) },
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Supabase storage returned ${response.status}: ${details.slice(0, 300)}`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async getRow() {
    const rows = await this.request('nayl_state?state_key=eq.primary&select=data,revision&limit=1');
    return rows?.[0] || null;
  }

  async init() {
    if (this.initialized) return;
    let row = await this.getRow();
    if (!row) {
      try {
        await this.request('nayl_state', {
          method: 'POST',
          prefer: 'return=minimal',
          body: JSON.stringify({ state_key: 'primary', data: createSeedData(), revision: 1 })
        });
      } catch (error) {
        row = await this.getRow();
        if (!row) throw error;
      }
    }
    this.initialized = true;
  }

  async snapshot() {
    await this.init();
    const row = await this.getRow();
    if (!row) throw new Error('Supabase nayl_state primary row is missing');
    return structuredClone(normalizeState(row.data));
  }

  async transact(mutator) {
    await this.init();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const row = await this.getRow();
      if (!row) throw new Error('Supabase nayl_state primary row is missing');
      const data = normalizeState(structuredClone(row.data));
      const result = await mutator(data);
      data.updatedAt = new Date().toISOString();
      const nextRevision = Number(row.revision || 0) + 1;
      const updated = await this.request(`nayl_state?state_key=eq.primary&revision=eq.${encodeURIComponent(row.revision)}`, {
        method: 'PATCH',
        prefer: 'return=representation',
        body: JSON.stringify({ data, revision: nextRevision, updated_at: data.updatedAt })
      });
      if (Array.isArray(updated) && updated.length === 1) return structuredClone(result);
      await new Promise((resolve) => setTimeout(resolve, 30 * (attempt + 1)));
    }
    throw new Error('Supabase storage transaction conflicted repeatedly; retry the request');
  }

  async reset() {
    await this.init();
    const row = await this.getRow();
    const nextRevision = Number(row?.revision || 0) + 1;
    await this.request('nayl_state?state_key=eq.primary', {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({ data: createSeedData(), revision: nextRevision, updated_at: new Date().toISOString() })
    });
  }

  async close() {}
}

export function createStore(config) {
  const secretKey = config.supabaseSecretKey || config.supabaseServiceRoleKey;
  if (config.supabaseUrl && secretKey) {
    return new SupabaseStore(config.supabaseUrl, secretKey, { timeoutMs: config.connectorTimeoutMs });
  }
  return new JsonStore(config.dataFile);
}
