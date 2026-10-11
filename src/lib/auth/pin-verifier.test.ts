import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import { verifyPin } from './pin-verifier';

describe('verifyPin', () => {
  it('should_return_true_when_plain_pin_matches', async () => {
    expect(await verifyPin('1234', '1234')).toBe(true);
  });

  it('should_return_false_when_plain_pin_differs', async () => {
    expect(await verifyPin('1234', '4321')).toBe(false);
  });

  it('should_return_false_when_plain_pin_differs_only_in_length', async () => {
    expect(await verifyPin('123', '1234')).toBe(false);
  });

  it('should_return_true_when_bcrypt_hash_matches', async () => {
    const hash = await bcrypt.hash('9876', 4);
    expect(await verifyPin('9876', hash)).toBe(true);
  });

  it('should_return_false_when_bcrypt_hash_does_not_match', async () => {
    const hash = await bcrypt.hash('9876', 4);
    expect(await verifyPin('0000', hash)).toBe(false);
  });

  it('should_return_false_when_stored_pin_is_missing', async () => {
    expect(await verifyPin('1234', null)).toBe(false);
    expect(await verifyPin('1234', '')).toBe(false);
  });
});
