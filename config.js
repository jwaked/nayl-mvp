import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

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
  const nodeEnv = env.NODE_ENV || 'development';
  const providedSessionSecret = env.SESSION_SECRET || '';
  const generatedSessionSecret = randomBytes(32).toString('hex');

  return {
    nodeEnv,
    host,
    port,
    appBaseUrl: env.APP_BASE_URL || `http://${publicHost}:${port}`,
    dataFile: path.resolve(cwd, env.DATA_FILE || '.data/nayl.json'),
    supabaseUrl: env.SUPABASE_URL || '',
    // Supabase introduced backend-only secret keys in 2026. Keep the legacy
    // service_role name as a compatibility fallback for existing projects.
    supabaseSecretKey: env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '',
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || '',
    sessionSecret: providedSessionSecret || generatedSessionSecret,
    sessionSecretWasGenerated: !providedSessionSecret,
    defaultMarket: (env.DEFAULT_MARKET || 'AE').toUpperCase(),
    defaultCity: env.DEFAULT_CITY || 'Dubai',
    adminEmail: String(env.ADMIN_EMAIL || '').trim().toLowerCase(),
    adminPassword: env.ADMIN_PASSWORD || '',
    autoVerifyBusinesses: asBoolean(env.AUTO_VERIFY_BUSINESSES, false),
    openaiApiKey: env.OPENAI_API_KEY || '',
    openaiModel: env.OPENAI_MODEL || 'gpt-5-mini',
    openaiDeepModel: env.OPENAI_DEEP_MODEL || 'gpt-5.5',
    braveSearchApiKey: env.BRAVE_SEARCH_API_KEY || '',
    googleMapsApiKey: env.GOOGLE_MAPS_API_KEY || '',
    resendApiKey: env.RESEND_API_KEY || '',
    emailFrom: env.EMAIL_FROM || '',
    connectorTimeoutMs: asPositiveInt(env.CONNECTOR_TIMEOUT_MS, 20_000),
    deepSearchTimeoutMs: asPositiveInt(env.DEEP_SEARCH_TIMEOUT_MS, 90_000),
    rateLimitWindowMs: asPositiveInt(env.RATE_LIMIT_WINDOW_MS, 60_000),
    rateLimitMax: asPositiveInt(env.RATE_LIMIT_MAX, 160)
  };
}
