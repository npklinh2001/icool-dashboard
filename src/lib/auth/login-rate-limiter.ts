const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_LOCKOUT_MS = 5 * 60 * 1000;

interface AttemptRecord {
  failures: number;
  lockedUntil: number;
}

export interface LoginRateLimiter {
  isBlocked(key: string): boolean;
  recordFailure(key: string): void;
  reset(key: string): void;
}

// Every maxAttempts failures start a fresh lockout, so the cycle repeats until a login succeeds.
// In-memory limiter: counts are per server process, so use a shared store if you scale out
export function createLoginRateLimiter(
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  lockoutMs = DEFAULT_LOCKOUT_MS,
  now: () => number = Date.now,
): LoginRateLimiter {
  const records = new Map<string, AttemptRecord>();

  return {
    isBlocked: (key) => (records.get(key)?.lockedUntil ?? 0) > now(),
    recordFailure: (key) => {
      const record = records.get(key) ?? { failures: 0, lockedUntil: 0 };
      record.failures += 1;
      if (record.failures >= maxAttempts) {
        record.failures = 0;
        record.lockedUntil = now() + lockoutMs;
      }
      records.set(key, record);
    },
    reset: (key) => {
      records.delete(key);
    },
  };
}

export const loginRateLimiter = createLoginRateLimiter();
