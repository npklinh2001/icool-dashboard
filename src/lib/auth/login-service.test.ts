import { describe, expect, it } from 'vitest';
import type { Employee, EmployeeRepository } from './employee-repository';
import { authenticateEmployee } from './login-service';

const baseEmployee: Employee = {
  id: 'id-1',
  code: 'E1',
  name: 'Nguyen Van A',
  sale: 'sale01',
  pin: '1234',
  isLocked: false,
  isActive: true,
};

const repositoryWith = (employee: Employee | null): EmployeeRepository => ({
  findBySale: async () => employee,
});

describe('authenticateEmployee', () => {
  it('should_return_user_when_credentials_are_valid', async () => {
    const result = await authenticateEmployee(repositoryWith(baseEmployee), {
      sale: 'sale01',
      pin: '1234',
    });
    expect(result).toEqual({
      ok: true,
      user: { id: 'id-1', sale: 'sale01', name: 'Nguyen Van A' },
    });
  });

  it('should_fall_back_to_sale_as_name_when_name_is_empty', async () => {
    const result = await authenticateEmployee(repositoryWith({ ...baseEmployee, name: null }), {
      sale: 'sale01',
      pin: '1234',
    });
    expect(result).toMatchObject({ ok: true, user: { name: 'sale01' } });
  });

  it('should_reject_with_invalid_credentials_when_user_is_unknown', async () => {
    const result = await authenticateEmployee(repositoryWith(null), { sale: 'x', pin: '1234' });
    expect(result).toEqual({ ok: false, reason: 'invalid_credentials' });
  });

  it('should_reject_with_invalid_credentials_when_pin_is_wrong', async () => {
    const result = await authenticateEmployee(repositoryWith(baseEmployee), {
      sale: 'sale01',
      pin: '0000',
    });
    expect(result).toEqual({ ok: false, reason: 'invalid_credentials' });
  });

  it('should_reject_as_disabled_when_account_is_locked_and_pin_is_right', async () => {
    const result = await authenticateEmployee(repositoryWith({ ...baseEmployee, isLocked: true }), {
      sale: 'sale01',
      pin: '1234',
    });
    expect(result).toEqual({ ok: false, reason: 'account_disabled' });
  });

  it('should_reject_as_disabled_when_account_is_inactive_and_pin_is_right', async () => {
    const result = await authenticateEmployee(
      repositoryWith({ ...baseEmployee, isActive: false }),
      { sale: 'sale01', pin: '1234' },
    );
    expect(result).toEqual({ ok: false, reason: 'account_disabled' });
  });

  it('should_not_reveal_disabled_state_when_pin_is_wrong', async () => {
    const result = await authenticateEmployee(repositoryWith({ ...baseEmployee, isLocked: true }), {
      sale: 'sale01',
      pin: '0000',
    });
    expect(result).toEqual({ ok: false, reason: 'invalid_credentials' });
  });
});
