import { collectLeaves } from './tree';
import type { TreeNode } from './types';

export const normalizeText = (text: string | undefined): string =>
  (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

function buildHaystack(leaf: TreeNode, ancestorNames: string[]): string {
  return normalizeText(
    [
      leaf.name,
      leaf.author,
      ...leaf.viewers,
      leaf.report,
      leaf.info,
      leaf.note,
      leaf.owner,
      leaf.tool,
      ...leaf.kpis.flatMap((kpi) => [kpi.t, kpi.note]),
      ...ancestorNames,
    ].join(' '),
  );
}

// Returns the ids of every matching leaf plus all of its ancestors
export function findMatchingIds(
  root: TreeNode,
  byId: ReadonlyMap<string, TreeNode>,
  rawQuery: string,
): Set<string> {
  const query = normalizeText(rawQuery.trim());
  const hits = new Set<string>();
  if (!query) return hits;

  for (const leaf of collectLeaves(root)) {
    const ancestorNames: string[] = [];
    for (let id = leaf.parentId; id; id = byId.get(id)?.parentId ?? null) {
      ancestorNames.push(byId.get(id)!.name);
    }
    if (!buildHaystack(leaf, ancestorNames).includes(query)) continue;

    hits.add(leaf.id);
    for (let id = leaf.parentId; id; id = byId.get(id)?.parentId ?? null) hits.add(id);
  }
  return hits;
}
