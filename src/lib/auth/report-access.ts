// Sale codes (dbo.NhanVien2.sale) allowed to open the ride map (Cuốc xe) at /cuoc-xe
export const CUOC_XE_ALLOWED_SALES = ['2923', '250475'];

export function isSaleAllowed(sale: string, allowedSales: readonly string[]): boolean {
  const normalized = sale.trim();
  return allowedSales.some((allowed) => allowed.trim() === normalized);
}
