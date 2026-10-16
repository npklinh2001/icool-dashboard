export type ReportStatus = 'live' | 'building' | 'proposed' | 'noplan';

export type IconName =
  'chart' | 'users' | 'truck' | 'wrench' | 'shield' | 'cap' | 'cpu' | 'wallet' | 'scale' | 'grid';

export type KpiInput = string | { t: string; hl?: boolean; warn?: boolean; note?: string };

export interface Kpi {
  t: string;
  hl?: boolean;
  warn?: boolean;
  note?: string;
}

// Raw, hand-edited data: a root, "khoi" (depth 1), optional groups, and report leaves
export interface SourceNode {
  name: string;
  sub?: string;
  color?: string;
  icon?: IconName;
  status?: ReportStatus;
  children?: SourceNode[];
  author?: string;
  viewers?: string | string[];
  contact?: string;
  report?: string;
  info?: string;
  kpis?: KpiInput[];
  note?: string;
  owner?: string;
  tool?: string;
  refresh?: string;
  source?: string;
  url?: string;
  // Only these sale codes see the node (and its children); omitted means everyone
  allowedSales?: readonly string[];
}

export type NodeKind = 'root' | 'khoi' | 'group' | 'leaf';

export interface TreeNode {
  id: string;
  depth: number;
  kind: NodeKind;
  name: string;
  sub?: string;
  color: string;
  icon?: IconName;
  status: ReportStatus;
  parentId: string | null;
  children: TreeNode[];
  author?: string;
  viewers: string[];
  contact?: string;
  report?: string;
  info?: string;
  kpis: Kpi[];
  note?: string;
  owner?: string;
  tool?: string;
  refresh?: string;
  source?: string;
  url?: string;
}

export interface PositionedNode {
  node: TreeNode;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Link {
  id: string;
  parent: PositionedNode;
  child: PositionedNode;
}

export interface LayoutResult {
  nodes: PositionedNode[];
  links: Link[];
  width: number;
  height: number;
}
