import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = __dirname;
const PUBLIC_FILES = new Set([
  '/index.html',
  '/styles.css',
  '/web-app.js',
  '/i18n.js',
  '/nayl-mark.svg',
  '/manifest.webmanifest'
]);

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
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

export function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
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

export async function readJsonBody(req, { maxBytes = 256_000 } = {}) {
  let received = 0;
  const chunks = [];

  for await (const chunk of req) {
    received += chunk.length;
    if (received > maxBytes) throw new HttpError(413, 'Request body is too large');
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
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

export function requirePositiveNumber(value, field, { max = 10_000_000 } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > max) {
    throw new HttpError(400, `${field} must be a positive number`);
  }
  return Math.round(number * 100) / 100;
}

export function parseUrl(req) {
  return new URL(req.url, 'http://localhost');
}

export async function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const isSpaRoute = !path.extname(pathname);
  const publicPath = isSpaRoute ? '/index.html' : requested;

  if (!PUBLIC_FILES.has(publicPath)) return false;

  const filePath = path.join(PUBLIC_DIR, publicPath.slice(1));
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
