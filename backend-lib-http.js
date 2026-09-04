import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = __dirname;

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.webmanifest', 'application/manifest+json']
]);

export class HttpError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export function applySecurityHeaders(res, { production = false } = {}) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (production) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
  );
}

export function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

export function sendError(res, error, requestId) {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof HttpError ? error.message : 'Unexpected server error';
  sendJson(res, status, {
    error: {
      code: status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message,
      details: error instanceof HttpError ? error.details : undefined,
      requestId
    }
  });
}

export async function readJsonBody(req, { maxBytes = 512_000 } = {}) {
  let received = 0;
  const chunks = [];
  for await (const chunk of req) {
    received += chunk.length;
    if (received > maxBytes) throw new HttpError(413, 'Request body is too large');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON');
  }
}

export function requireString(value, field, { min = 1, max = 500 } = {}) {
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be a string`);
  const clean = value.trim();
  if (clean.length < min || clean.length > max) {
    throw new HttpError(400, `${field} must be between ${min} and ${max} characters`);
  }
  return clean;
}

export function optionalString(value, { max = 500 } = {}) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new HttpError(400, 'Expected a string value');
  return value.trim().slice(0, max);
}

export function requireEmail(value, field = 'email') {
  const email = requireString(value, field, { min: 5, max: 180 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, `${field} must be a valid email address`);
  return email;
}

export function optionalUrl(value, field = 'website') {
  if (value == null || value === '') return null;
  const raw = requireString(value, field, { min: 4, max: 500 });
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
    return url.toString();
  } catch {
    throw new HttpError(400, `${field} must be a valid http or https URL`);
  }
}

export function requirePositiveNumber(value, field, { max = 10_000_000, allowZero = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || (allowZero ? number < 0 : number <= 0) || number > max) {
    throw new HttpError(400, `${field} must be ${allowZero ? 'zero or ' : ''}a positive number`);
  }
  return Math.round(number * 100) / 100;
}

export function optionalPositiveNumber(value, field, options = {}) {
  if (value == null || value === '') return null;
  return requirePositiveNumber(value, field, options);
}

export function optionalFutureDateTime(value, field = 'date') {
  if (value == null || value === '') return null;
  const raw = requireString(value, field, { min: 10, max: 80 });
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) throw new HttpError(400, `${field} must be a valid date and time`);
  if (date.getTime() <= Date.now()) throw new HttpError(400, `${field} must be in the future`);
  return date.toISOString();
}

export function requireStringArray(value, field, { min = 1, max = 30, itemMax = 100 } = {}) {
  if (!Array.isArray(value)) throw new HttpError(400, `${field} must be an array`);
  const items = [...new Set(value.map((item) => requireString(item, `${field} item`, { min: 1, max: itemMax })))];
  if (items.length < min || items.length > max) throw new HttpError(400, `${field} must include between ${min} and ${max} items`);
  return items;
}

export function parseUrl(req) {
  return new URL(req.url, 'http://localhost');
}

export function routeMatch(pathname, pattern) {
  const match = pathname.match(pattern);
  return match ? match.slice(1).map(decodeURIComponent) : null;
}

export async function serveStatic(req, res, pathname) {
  const routeMap = new Map([
    ['/', 'index.html'],
    ['/business', 'business.html'],
    ['/business/', 'business.html'],
    ['/admin', 'admin.html'],
    ['/admin/', 'admin.html']
  ]);
  const allowed = new Set([
    'index.html', 'business.html', 'admin.html', 'styles.css',
    'consumer.js', 'business.js', 'admin.js', 'shared.js', 'nayl-mark.svg'
  ]);
  const requested = routeMap.get(pathname) || pathname.replace(/^\/+/, '');
  const normalized = path.posix.normalize(requested).replace(/^\.\.(\/|\\)/g, '');
  if (!allowed.has(normalized)) return false;
  const filePath = path.resolve(PUBLIC_DIR, normalized);
  if (!filePath.startsWith(PUBLIC_DIR)) return false;

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME_TYPES.get(ext) || 'application/octet-stream');
    res.setHeader('Cache-Control', ext === '.html' ? 'no-cache' : 'public, max-age=3600');
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

export function createRateLimiter({ windowMs, max }) {
  const buckets = new Map();
  return function rateLimit(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = String(Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket.remoteAddress || 'unknown')
      .split(',')[0]
      .trim();
    const now = Date.now();
    const current = buckets.get(ip);
    if (!current || current.resetAt <= now) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
    }
    current.count += 1;
    if (current.count > max) return { allowed: false, remaining: 0, resetAt: current.resetAt };
    return { allowed: true, remaining: max - current.count, resetAt: current.resetAt };
  };
}
