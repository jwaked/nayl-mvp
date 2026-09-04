import { createHash, createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { HttpError } from './lib-http.js';

const scrypt = promisify(scryptCallback);

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return { salt, hash: Buffer.from(derived).toString('hex') };
}

export async function verifyPassword(password, salt, expectedHex) {
  if (!salt || !expectedHex) return false;
  const derived = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(expectedHex, 'hex');
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function createSessionToken(payload, secret, ttlSeconds = 60 * 60 * 24 * 30) {
  const now = Math.floor(Date.now() / 1000);
  const body = encode({
    ...payload,
    jti: randomUUID(),
    iat: now,
    exp: now + ttlSeconds
  });
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

export function verifySessionToken(token, secret) {
  if (!token || typeof token !== 'string') throw new HttpError(401, 'Authentication required');
  const [body, supplied] = token.split('.');
  if (!body || !supplied) throw new HttpError(401, 'Invalid session token');
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, 'Invalid session token');

  let payload;
  try {
    payload = decode(body);
  } catch {
    throw new HttpError(401, 'Invalid session token');
  }
  if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new HttpError(401, 'Session expired');
  }
  return payload;
}

export function bearerToken(req) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

export function requireRole(req, secret, roles) {
  const payload = verifySessionToken(bearerToken(req), secret);
  const accepted = Array.isArray(roles) ? roles : [roles];
  if (!accepted.includes(payload.role)) throw new HttpError(403, 'You do not have permission for this action');
  return payload;
}

export function tokenFingerprint(token) {
  return createHash('sha256').update(String(token || '')).digest('hex').slice(0, 16);
}
