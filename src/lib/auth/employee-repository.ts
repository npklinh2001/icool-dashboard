import { getPool, sql } from '@/lib/db/connection';

const SALE_MAX_LENGTH = 50;

export interface Employee {
  id: string;
  code: string | null;
  name: string | null;
  sale: string;
  pin: string | null;
  isLocked: boolean;
  isActive: boolean;
}

// Abstraction so the login logic does not depend on SQL Server
export interface EmployeeRepository {
  findBySale(sale: string): Promise<Employee | null>;
}

interface EmployeeRow {
  id: string;
  code: string | null;
  name: string | null;
  sale: string;
  pin: string | null;
  is_locked: boolean | null;
  active: boolean | null;
}

export const sqlServerEmployeeRepository: EmployeeRepository = {
  async findBySale(sale) {
    const pool = await getPool();
    // TOP 1 keeps this compatible with SQL Server 2012 (no STRING_AGG/JSON features needed)
    const result = await pool
      .request()
      .input('sale', sql.VarChar(SALE_MAX_LENGTH), sale)
      .query<EmployeeRow>(
        `SELECT TOP 1 id, code, name, sale, pin, is_locked, active
         FROM dbo.NhanVien2
         WHERE sale = @sale`,
      );

    const row = result.recordset[0];
    if (!row) return null;

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      sale: row.sale,
      pin: row.pin,
      isLocked: row.is_locked === true,
      isActive: row.active === true,
    };
  },
};
