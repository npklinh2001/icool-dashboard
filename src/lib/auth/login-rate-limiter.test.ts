import { describe, expect, it } from 'vitest';
import { createLoginRateLimiter } from './login-rate-limiter';

const LOCKOUT_MS = 1000;

function failTimes(limiter: ReturnType<typeof createLoginRateLimiter>, key: string, times: number) {
  for (let i = 0; i < times; i++) limiter.recordFailure(key);
}

describe('createLoginRateLimiter', () => {
  it('should_block_when_failures_reach_the_limit', () => {
    const limiter = createLoginRateLimiter(3, LOCKOUT_MS, () => 0);
    failTimes(limiter, 'k', 3);
    expect(limiter.isBlocked('k')).toBe(true);
  });

  it('should_not_block_when_failures_are_below_the_limit', () => {
    const limiter = createLoginRateLimiter(3, LOCKOUT_MS, () => 0);
    failTimes(limiter, 'k', 2);
    expect(limiter.isBlocked('k')).toBe(false);
  });

  it('should_unblock_when_lockout_has_elapsed', () => {
    let now = 0;
    const limiter = createLoginRateLimiter(1, LOCKOUT_MS, () => now);
    limiter.recordFailure('k');
    now = LOCKOUT_MS;
    expect(limiter.isBlocked('k')).toBe(false);
  });

  it('should_block_again_when_limit_is_reached_after_a_lockout', () => {
    let now = 0;
    const limiter = createLoginRateLimiter(2, LOCKOUT_MS, () => now);
    failTimes(limiter, 'k', 2);
    now = LOCKOUT_MS;
    limiter.recordFailure('k');
    expect(limiter.isBlocked('k')).toBe(false);
    limiter.recordFailure('k');
    expect(limiter.isBlocked('k')).toBe(true);
  });

  it('should_unblock_when_reset_is_called', () => {
    const limiter = createLoginRateLimiter(1, LOCKOUT_MS, () => 0);
    limiter.recordFailure('k');
    limiter.reset('k');
    expect(limiter.isBlocked('k')).toBe(false);
  });

  it('should_track_keys_independently', () => {
    const limiter = createLoginRateLimiter(1, LOCKOUT_MS, () => 0);
    limiter.recordFailure('a');
    expect(limiter.isBlocked('b')).toBe(false);
  });
});
