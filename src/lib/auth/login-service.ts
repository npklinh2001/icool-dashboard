import type { EmployeeRepository } from './employee-repository';
import { verifyPin } from './pin-verifier';

export interface LoginCredentials {
  sale: string;
  pin: string;
}

export interface AuthenticatedUser {
  id: string;
  sale: string;
  name: string;
}

export type LoginFailureReason = 'invalid_credentials' | 'account_disabled';

export type LoginResult =
  { ok: true; user: AuthenticatedUser } | { ok: false; reason: LoginFailureReason };

// Unknown user and wrong PIN share one reason so callers cannot enumerate accounts
export async function authenticateEmployee(
  repository: EmployeeRepository,
  credentials: LoginCredentials,
): Promise<LoginResult> {
  const employee = await repository.findBySale(credentials.sale);
  if (!employee) return { ok: false, reason: 'invalid_credentials' };

  const pinMatches = await verifyPin(credentials.pin, employee.pin);
  if (!pinMatches) return { ok: false, reason: 'invalid_credentials' };

  if (!employee.isActive || employee.isLocked) return { ok: false, reason: 'account_disabled' };

  return {
    ok: true,
    user: { id: employee.id, sale: employee.sale, name: employee.name ?? employee.sale },
  };
}
