'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { THEME_STORAGE_KEY } from '../constants';
import { usePanZoom } from '../hooks/usePanZoom';
import { computeLayout } from '../layout';
import { findMatchingIds } from '../search';
import { buildTree, collectLeaves, indexById, isBranch } from '../tree';
import type { ReportStatus, SourceNode, TreeNode } from '../types';
import { Canvas } from './Canvas';
import { DetailPanel } from './DetailPanel';
import { Header } from './Header';
import { Legend } from './Legend';
import { NodeCard } from './NodeCard';
import { ZoomControls } from './ZoomControls';

const FIT_AFTER_TOGGLE_DELAY_MS = 50;

interface DashboardProps {
  data: SourceNode;
  userName: string;
}

const EMPTY_SET: ReadonlySet<string> = new Set();

// By default only the first "khoi" is expanded
function initialCollapsedIds(root: TreeNode): Set<string> {
  return new Set(root.children.slice(1).map((khoi) => khoi.id));
}

function countByStatus(leaves: TreeNode[]): Record<ReportStatus, number> {
  const counts: Record<ReportStatus, number> = { live: 0, building: 0, proposed: 0, noplan: 0 };
  leaves.forEach((leaf) => (counts[leaf.status] += 1));
  return counts;
}

function ancestorsOf(node: TreeNode, byId: ReadonlyMap<string, TreeNode>): TreeNode[] {
  const chain: TreeNode[] = [];
  for (let id = node.parentId; id; id = byId.get(id)?.parentId ?? null) {
    const ancestor = byId.get(id);
    if (ancestor && ancestor.depth > 0) chain.unshift(ancestor);
  }
  return chain;
}

function toggleTheme(): void {
  const root = document.documentElement;
  const current =
    root.dataset.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.dataset.theme = current === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(THEME_STORAGE_KEY, root.dataset.theme);
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this visit
  }
}

export function Dashboard({ data, userName }: DashboardProps) {
  const router = useRouter();
  const root = useMemo(() => buildTree(data), [data]);
  const byId = useMemo(() => indexById(root), [root]);
  const leaves = useMemo(() => collectLeaves(root), [root]);
  const statusCounts = useMemo(() => countByStatus(leaves), [leaves]);
  const usedStatuses = useMemo(() => new Set(leaves.map((leaf) => leaf.status)), [leaves]);

  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => initialCollapsedIds(root));
  const [query, setQuery] = useState('');
  const [panelNodeId, setPanelNodeId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const layout = useMemo(() => computeLayout(root, collapsed), [root, collapsed]);
  const matchingIds = useMemo(() => findMatchingIds(root, byId, query), [root, byId, query]);
  const hasQuery = query.trim() !== '';

  const viewportRef = useRef<HTMLDivElement>(null);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const { view, animate, panning, fit, zoomIn, zoomOut, resetZoom, pointerHandlers } = usePanZoom({
    viewportRef,
    bounds: layout,
    onBackgroundClick: closePanel,
  });

  useLayoutEffect(() => {
    fit(false);
    const onResize = () => fit(false);
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, [fit]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved) document.documentElement.dataset.theme = saved;
    } catch {
      // Storage unavailable: fall back to the system color scheme
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
    };
    addEventListener('keydown', onKeyDown);
    return () => removeEventListener('keydown', onKeyDown);
  }, [closePanel]);

  const refitSoon = () => setTimeout(() => fit(true), FIT_AFTER_TOGGLE_DELAY_MS);

  const handleQueryChange = (next: string) => {
    setQuery(next);
    // Reveal collapsed branches that contain a match
    const hits = findMatchingIds(root, byId, next);
    setCollapsed((current) => new Set([...current].filter((id) => !hits.has(id))));
  };

  const handleNodeClick = (node: TreeNode) => {
    if (node.kind === 'root') {
      const anyOpen = root.children.some((khoi) => !collapsed.has(khoi.id));
      setCollapsed(anyOpen ? new Set(root.children.map((khoi) => khoi.id)) : EMPTY_SET);
      return;
    }
    if (isBranch(node)) {
      setCollapsed((current) => {
        const next = new Set(current);
        if (!next.delete(node.id)) next.add(node.id);
        return next;
      });
      return;
    }
    setPanelNodeId(node.id);
    setPanelOpen(true);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  };

  // Highlight the path from the hovered node up to the root, plus its direct children
  const highlightedLinkIds = useMemo(() => {
    const ids = new Set<string>();
    const hovered = hoveredId ? byId.get(hoveredId) : undefined;
    if (!hovered) return ids;
    if (isBranch(hovered) && !collapsed.has(hovered.id))
      hovered.children.forEach((c) => ids.add(c.id));
    for (let node: TreeNode | undefined = hovered; node?.parentId; node = byId.get(node.parentId)) {
      ids.add(node.id);
    }
    return ids;
  }, [hoveredId, byId, collapsed]);

  const dimmedLinkIds = useMemo(
    () =>
      hasQuery
        ? new Set(layout.links.filter((l) => !matchingIds.has(l.id)).map((l) => l.id))
        : EMPTY_SET,
    [hasQuery, layout.links, matchingIds],
  );

  const panelNode = panelNodeId ? (byId.get(panelNodeId) ?? null) : null;

  return (
    <>
      <Header
        khoiCount={root.children.length}
        reportCount={leaves.length}
        statusCounts={statusCounts}
        query={query}
        userName={userName}
        onQueryChange={handleQueryChange}
        onExpandAll={() => {
          setCollapsed(EMPTY_SET);
          refitSoon();
        }}
        onCollapseAll={() => {
          setCollapsed(new Set(root.children.map((khoi) => khoi.id)));
          refitSoon();
        }}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />
      <Canvas
        layout={layout}
        view={view}
        animate={animate}
        panning={panning}
        highlightedLinkIds={highlightedLinkIds}
        dimmedLinkIds={dimmedLinkIds}
        pointerHandlers={pointerHandlers}
        viewportRef={viewportRef}
      >
        {layout.nodes.map((positioned) => {
          const { node } = positioned;
          return (
            <NodeCard
              key={node.id}
              positioned={positioned}
              collapsed={collapsed.has(node.id)}
              matched={hasQuery && !isBranch(node) && matchingIds.has(node.id)}
              dimmed={hasQuery && node.depth > 0 && !matchingIds.has(node.id)}
              active={panelOpen && panelNodeId === node.id}
              onClick={() => handleNodeClick(node)}
              onHover={(hovering) => setHoveredId(hovering ? node.id : null)}
            />
          );
        })}
      </Canvas>
      <Legend usedStatuses={usedStatuses} />
      <div className="hint">
        Kéo để di chuyển · Cuộn để phóng to · Bấm Khối để mở/thu gọn · Bấm báo cáo để xem KPI
      </div>
      <ZoomControls
        zoom={view.k}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onFit={() => fit(true)}
      />
      <DetailPanel
        node={panelNode}
        ancestors={panelNode ? ancestorsOf(panelNode, byId) : []}
        open={panelOpen}
        onClose={closePanel}
      />
    </>
  );
}
