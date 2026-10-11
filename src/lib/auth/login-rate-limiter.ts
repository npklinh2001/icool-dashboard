const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

interface AttemptRecord {
  failures: number;
  windowStart: number;
}

export interface LoginRateLimiter {
  isBlocked(key: string): boolean;
  recordFailure(key: string): void;
  reset(key: string): void;
}

// In-memory limiter: counts are per server process, so use a shared store if you scale out
export function createLoginRateLimiter(
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  windowMs = DEFAULT_WINDOW_MS,
  now: () => number = Date.now,
): LoginRateLimiter {
  const records = new Map<string, AttemptRecord>();

  const activeRecord = (key: string): AttemptRecord | undefined => {
    const record = records.get(key);
    if (record && now() - record.windowStart >= windowMs) {
      records.delete(key);
      return undefined;
    }
    return record;
  };

  return {
    isBlocked: (key) => (activeRecord(key)?.failures ?? 0) >= maxAttempts,
    recordFailure: (key) => {
      const record = activeRecord(key);
      if (record) record.failures += 1;
      else records.set(key, { failures: 1, windowStart: now() });
    },
    reset: (key) => {
      records.delete(key);
    },
  };
}

export const loginRateLimiter = createLoginRateLimiter();
