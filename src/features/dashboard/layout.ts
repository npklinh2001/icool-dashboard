import {
  CANVAS_PADDING,
  COLUMN_GAP,
  COLUMN_WIDTHS,
  KHOI_GAP,
  NODE_HEIGHT,
  ROW_GAP,
} from './constants';
import type { LayoutResult, Link, PositionedNode, TreeNode } from './types';

const columnWidth = (depth: number) => COLUMN_WIDTHS[Math.min(depth, COLUMN_WIDTHS.length - 1)];

const columnX = (depth: number) => {
  let x = CANVAS_PADDING;
  for (let i = 0; i < depth; i++) x += columnWidth(i) + COLUMN_GAP;
  return x;
};

const visibleChildren = (node: TreeNode, collapsed: ReadonlySet<string>): TreeNode[] =>
  collapsed.has(node.id) ? [] : node.children;

// Tidy-tree layout: leaves stack top to bottom, each parent is centered on its visible children
export function computeLayout(root: TreeNode, collapsed: ReadonlySet<string>): LayoutResult {
  let cursorY = CANVAS_PADDING;
  let maxDepth = 0;
  const positioned = new Map<string, PositionedNode>();
  const links: Link[] = [];

  const place = (node: TreeNode): PositionedNode => {
    maxDepth = Math.max(maxDepth, node.depth);
    const base = {
      node,
      x: columnX(node.depth),
      w: columnWidth(node.depth),
      h: NODE_HEIGHT[node.kind],
    };
    const kids = visibleChildren(node, collapsed);

    let y: number;
    if (kids.length === 0) {
      y = cursorY;
      cursorY += base.h + ROW_GAP;
    } else {
      const placedKids = kids.map((child, i) => {
        if (node.depth === 0 && i > 0) cursorY += KHOI_GAP;
        return place(child);
      });
      const first = placedKids[0];
      const last = placedKids[placedKids.length - 1];
      y = (first.y + first.h / 2 + last.y + last.h / 2) / 2 - base.h / 2;
      const self = { ...base, y };
      placedKids.forEach((child) => links.push({ id: child.node.id, parent: self, child }));
    }

    const result = { ...base, y };
    positioned.set(node.id, result);
    return result;
  };

  place(root);

  const nodes = [...positioned.values()];
  const top = Math.min(...nodes.map((n) => n.y));
  const shift = top < CANVAS_PADDING ? CANVAS_PADDING - top : 0;
  const shifted = new Map(nodes.map((n) => [n.node.id, { ...n, y: n.y + shift }]));

  return {
    nodes: [...shifted.values()],
    links: links.map((l) => ({
      id: l.id,
      parent: shifted.get(l.parent.node.id)!,
      child: shifted.get(l.child.node.id)!,
    })),
    width: columnX(maxDepth) + columnWidth(maxDepth) + CANVAS_PADDING,
    height: Math.max(...[...shifted.values()].map((n) => n.y + n.h)) + CANVAS_PADDING,
  };
}

export function buildLinkPath(parent: PositionedNode, child: PositionedNode): string {
  const x1 = parent.x + parent.w;
  const y1 = parent.y + parent.h / 2;
  const x2 = child.x;
  const y2 = child.y + child.h / 2;
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}
