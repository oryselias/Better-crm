// Simple in-memory rate limiter for webhook protection
// For production, use Redis or Supabase

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipLimits = new Map<string, RateLimitEntry>();
const phoneLimits = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_MESSAGES_PER_PHONE = 10;

function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of ipLimits) {
    if (entry.resetAt < now) ipLimits.delete(key);
  }
  for (const [key, entry] of phoneLimits) {
    if (entry.resetAt < now) phoneLimits.delete(key);
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  cleanupExpired();
  
  const now = Date.now();
  const entry = ipLimits.get(ip);

  if (!entry || entry.resetAt < now) {
    // New window
    ipLimits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: WINDOW_MS };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - entry.count, resetIn: entry.resetAt - now };
}

export function checkPhoneRateLimit(phone: string): { allowed: boolean; remaining: number; resetIn: number } {
  cleanupExpired();
  
  const now = Date.now();
  const entry = phoneLimits.get(phone);

  if (!entry || entry.resetAt < now) {
    phoneLimits.set(phone, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_MESSAGES_PER_PHONE - 1, resetIn: WINDOW_MS };
  }

  if (entry.count >= MAX_MESSAGES_PER_PHONE) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_MESSAGES_PER_PHONE - entry.count, resetIn: entry.resetAt - now };
}

export function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         request.headers.get('x-real-ip') ||
         'unknown';
}
