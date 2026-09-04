import fs from 'node:fs';
import path from 'node:path';

function asPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function asBoolean(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function readDotEnv(filePath) {
  try {
    const values = {};
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const sourceLine of raw.split(/\r?\n/)) {
      const line = sourceLine.trim();
      if (!line || line.startsWith('#')) continue;
      const separator = line.indexOf('=');
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      values[key] = value;
    }
    return values;
  } catch {
    return {};
  }
}

const cwd = process.cwd();
const defaultEnv = { ...readDotEnv(path.resolve(cwd, '.env')), ...process.env };

export function loadConfig(env = defaultEnv) {
  const host = env.HOST || '0.0.0.0';
  const port = asPositiveInt(env.PORT, 8787);
  const publicHost = ['0.0.0.0', '::'].includes(host) ? 'localhost' : host;

  return {
    nodeEnv: env.NODE_ENV || 'development',
    host,
    port,
    appBaseUrl: env.APP_BASE_URL || `http://${publicHost}:${port}`,
    dataFile: path.resolve(cwd, env.DATA_FILE || '.data/nayl.json'),
    defaultMarket: (env.DEFAULT_MARKET || 'AE').toUpperCase(),
    defaultCity: env.DEFAULT_CITY || 'Dubai',
    demoBusinessId: env.DEMO_BUSINESS_ID || 'biz-baytcare',
    braveSearchApiKey: env.BRAVE_SEARCH_API_KEY || '',
    googleMapsApiKey: env.GOOGLE_MAPS_API_KEY || '',
    enablePartnerDemo: asBoolean(env.ENABLE_PARTNER_DEMO, true),
    connectorTimeoutMs: asPositiveInt(env.CONNECTOR_TIMEOUT_MS, 7000),
    rateLimitWindowMs: asPositiveInt(env.RATE_LIMIT_WINDOW_MS, 60_000),
    rateLimitMax: asPositiveInt(env.RATE_LIMIT_MAX, 120)
  };
}
