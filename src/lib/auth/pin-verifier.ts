import { timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';

// bcrypt hashes always start with $2a$, $2b$ or $2y$
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

function equalsConstantTime(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// The PIN column may hold either a bcrypt hash or a legacy plain-text PIN
export async function verifyPin(inputPin: string, storedPin: string | null): Promise<boolean> {
  if (!storedPin) return false;
  if (BCRYPT_HASH_PATTERN.test(storedPin)) {
    return bcrypt.compare(inputPin, storedPin);
  }
  return equalsConstantTime(inputPin, storedPin);
}
