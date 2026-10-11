import { describe, expect, it } from 'vitest';
import { computeLayout } from './layout';
import { findMatchingIds, normalizeText } from './search';
import { buildTree, collectLeaves, indexById } from './tree';
import type { SourceNode } from './types';

const source: SourceNode = {
  name: 'Root',
  sub: 'sub',
  children: [
    {
      name: 'Khoi A',
      color: '#111111',
      icon: 'chart',
      status: 'live',
      children: [
        { name: 'Doanh thu', kpis: ['Tỉ lệ A', { t: 'B', hl: true }], viewers: 'Ban Giám đốc' },
        { name: 'Nhóm', children: [{ name: 'Báo cáo con', status: 'building' }] },
      ],
    },
    {
      name: 'Khoi B',
      color: '#222222',
      children: [{ name: 'Đào tạo', info: 'Chứng chỉ' }],
    },
  ],
};

describe('buildTree', () => {
  const root = buildTree(source);
  const byId = indexById(root);

  it('should_inherit_status_from_khoi_when_leaf_has_none', () => {
    const leaf = collectLeaves(root).find((l) => l.name === 'Doanh thu');
    expect(leaf?.status).toBe('live');
  });

  it('should_prefer_own_status_when_leaf_defines_one', () => {
    const leaf = collectLeaves(root).find((l) => l.name === 'Báo cáo con');
    expect(leaf?.status).toBe('building');
  });

  it('should_default_to_proposed_when_no_status_is_inherited', () => {
    const leaf = collectLeaves(root).find((l) => l.name === 'Đào tạo');
    expect(leaf?.status).toBe('proposed');
  });

  it('should_inherit_khoi_color_when_node_is_deeper', () => {
    const leaf = collectLeaves(root).find((l) => l.name === 'Báo cáo con');
    expect(leaf?.color).toBe('#111111');
  });

  it('should_normalize_viewers_and_kpis_when_given_loose_input', () => {
    const leaf = collectLeaves(root).find((l) => l.name === 'Doanh thu');
    expect(leaf?.viewers).toEqual(['Ban Giám đốc']);
    expect(leaf?.kpis).toEqual([{ t: 'Tỉ lệ A' }, { t: 'B', hl: true }]);
  });

  it('should_assign_unique_ids_when_building', () => {
    expect(byId.size).toBe(7);
  });
});

describe('computeLayout', () => {
  const root = buildTree(source);

  it('should_hide_descendants_when_a_branch_is_collapsed', () => {
    const khoiA = root.children[0];
    const open = computeLayout(root, new Set());
    const closed = computeLayout(root, new Set([khoiA.id]));
    expect(closed.nodes.length).toBeLessThan(open.nodes.length);
  });

  it('should_center_parent_on_its_children_when_expanded', () => {
    const { nodes } = computeLayout(root, new Set());
    const khoiB = nodes.find((n) => n.node.name === 'Khoi B')!;
    const child = nodes.find((n) => n.node.name === 'Đào tạo')!;
    expect(khoiB.y + khoiB.h / 2).toBeCloseTo(child.y + child.h / 2);
  });

  it('should_create_one_link_per_visible_child_when_laid_out', () => {
    const { nodes, links } = computeLayout(root, new Set());
    expect(links).toHaveLength(nodes.length - 1);
  });
});

describe('findMatchingIds', () => {
  const root = buildTree(source);
  const byId = indexById(root);

  it('should_match_without_diacritics_when_query_is_ascii', () => {
    const hits = findMatchingIds(root, byId, 'dao tao');
    const leaf = collectLeaves(root).find((l) => l.name === 'Đào tạo')!;
    expect(hits.has(leaf.id)).toBe(true);
  });

  it('should_include_ancestors_when_a_leaf_matches', () => {
    const hits = findMatchingIds(root, byId, 'bao cao con');
    expect(hits.size).toBe(4);
  });

  it('should_return_empty_when_query_is_blank', () => {
    expect(findMatchingIds(root, byId, '   ').size).toBe(0);
  });
});

describe('normalizeText', () => {
  it('should_strip_vietnamese_diacritics_when_normalizing', () => {
    expect(normalizeText('Đặt phòng')).toBe('dat phong');
  });
});
