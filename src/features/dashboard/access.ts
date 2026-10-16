import { isSaleAllowed } from '@/lib/auth/report-access';
import type { SourceNode } from './types';

// Server-side: drops nodes the user may not see, plus branches left empty by that,
// and strips the allow lists so they never reach the browser
export function filterSourceForSale(source: SourceNode, sale: string): SourceNode {
  const visit = (node: SourceNode): SourceNode | null => {
    const { allowedSales, children, ...rest } = node;
    if (allowedSales && !isSaleAllowed(sale, allowedSales)) return null;
    if (!children) return rest;

    const visible = children.map(visit).filter((child): child is SourceNode => child !== null);
    if (children.length > 0 && visible.length === 0) return null;
    return { ...rest, children: visible };
  };

  return visit(source) ?? { ...source, children: [] };
}
