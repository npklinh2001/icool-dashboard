import { DEFAULT_NODE_COLOR, DEFAULT_STATUS } from './constants';
import type { Kpi, KpiInput, NodeKind, SourceNode, TreeNode } from './types';

export const isBranch = (node: TreeNode): boolean => node.children.length > 0;

export const normalizeKpi = (kpi: KpiInput): Kpi => (typeof kpi === 'string' ? { t: kpi } : kpi);

function resolveKind(depth: number, hasChildren: boolean): NodeKind {
  if (depth === 0) return 'root';
  if (depth === 1) return 'khoi';
  return hasChildren ? 'group' : 'leaf';
}

// Walks the source tree, assigning stable ids and inheriting color/status from ancestors
export function buildTree(source: SourceNode): TreeNode {
  let nextId = 0;

  const build = (
    raw: SourceNode,
    depth: number,
    parent: TreeNode | null,
    inheritedStatus: SourceNode['status'],
  ): TreeNode => {
    const children = raw.children ?? [];
    const status = raw.status ?? inheritedStatus;
    const node: TreeNode = {
      id: `n${nextId++}`,
      depth,
      kind: resolveKind(depth, children.length > 0),
      name: raw.name,
      sub: raw.sub,
      color:
        depth === 1 ? (raw.color ?? DEFAULT_NODE_COLOR) : (parent?.color ?? DEFAULT_NODE_COLOR),
      icon: raw.icon,
      status: status ?? DEFAULT_STATUS,
      parentId: parent?.id ?? null,
      children: [],
      author: raw.author,
      viewers: [raw.viewers ?? []].flat().filter(Boolean),
      contact: raw.contact,
      report: raw.report,
      info: raw.info,
      kpis: (raw.kpis ?? []).map(normalizeKpi),
      note: raw.note,
      owner: raw.owner,
      tool: raw.tool,
      refresh: raw.refresh,
      source: raw.source,
      url: raw.url || undefined,
    };
    node.children = children.map((child) => build(child, depth + 1, node, status));
    return node;
  };

  return build(source, 0, null, undefined);
}

export function collectLeaves(node: TreeNode): TreeNode[] {
  return isBranch(node) ? node.children.flatMap(collectLeaves) : [node];
}

export function indexById(root: TreeNode): Map<string, TreeNode> {
  const index = new Map<string, TreeNode>();
  const visit = (node: TreeNode) => {
    index.set(node.id, node);
    node.children.forEach(visit);
  };
  visit(root);
  return index;
}
