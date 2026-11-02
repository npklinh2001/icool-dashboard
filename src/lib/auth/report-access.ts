export function isSaleAllowed(sale: string, allowedSales: readonly string[]): boolean {
  const normalized = sale.trim();
  return allowedSales.some((allowed) => allowed.trim() === normalized);
}
