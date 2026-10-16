import { describe, expect, it } from 'vitest';
import { filterSourceForSale } from './access';
import type { SourceNode } from './types';

const source: SourceNode = {
  name: 'Root',
  children: [
    {
      name: 'Khoi A',
      children: [
        { name: 'Public' },
        {
          name: 'Restricted group',
          children: [{ name: 'Secret', allowedSales: ['2923', '250475'] }],
        },
      ],
    },
  ],
};

const names = (node: SourceNode): string[] => [node.name, ...(node.children ?? []).flatMap(names)];

describe('filterSourceForSale', () => {
  it('keeps restricted reports for allowed sale codes, ignoring surrounding spaces', () => {
    expect(names(filterSourceForSale(source, '2923'))).toContain('Secret');
    expect(names(filterSourceForSale(source, ' 250475 '))).toContain('Secret');
  });

  it('removes restricted reports and the branches they leave empty for everyone else', () => {
    const visible = names(filterSourceForSale(source, '1111'));
    expect(visible).toEqual(['Root', 'Khoi A', 'Public']);
  });

  it('does not send the allow list to the browser', () => {
    expect(JSON.stringify(filterSourceForSale(source, '2923'))).not.toContain('allowedSales');
  });
});
