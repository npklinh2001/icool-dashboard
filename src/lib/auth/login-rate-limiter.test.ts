import { describe, expect, it } from 'vitest';
import { createLoginRateLimiter } from './login-rate-limiter';

describe('createLoginRateLimiter', () => {
  it('should_block_when_failures_reach_the_limit', () => {
    const limiter = createLoginRateLimiter(3, 1000, () => 0);
    for (let i = 0; i < 3; i++) limiter.recordFailure('k');
    expect(limiter.isBlocked('k')).toBe(true);
  });

  it('should_not_block_when_failures_are_below_the_limit', () => {
    const limiter = createLoginRateLimiter(3, 1000, () => 0);
    limiter.recordFailure('k');
    expect(limiter.isBlocked('k')).toBe(false);
  });

  it('should_unblock_when_window_has_elapsed', () => {
    let now = 0;
    const limiter = createLoginRateLimiter(1, 1000, () => now);
    limiter.recordFailure('k');
    now = 1000;
    expect(limiter.isBlocked('k')).toBe(false);
  });

  it('should_unblock_when_reset_is_called', () => {
    const limiter = createLoginRateLimiter(1, 1000, () => 0);
    limiter.recordFailure('k');
    limiter.reset('k');
    expect(limiter.isBlocked('k')).toBe(false);
  });

  it('should_track_keys_independently', () => {
    const limiter = createLoginRateLimiter(1, 1000, () => 0);
    limiter.recordFailure('a');
    expect(limiter.isBlocked('b')).toBe(false);
  });
});
