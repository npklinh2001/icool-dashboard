import type { CSSProperties, HTMLAttributes, ReactNode, RefObject } from 'react';
import { buildLinkPath } from '../layout';
import type { LayoutResult } from '../types';
import type { ViewState } from '../hooks/usePanZoom';

const LINK_MIX_PERCENT = { fromRoot: 35, other: 22, highlighted: 80 } as const;

interface CanvasProps {
  layout: LayoutResult;
  view: ViewState;
  animate: boolean;
  panning: boolean;
  highlightedLinkIds: ReadonlySet<string>;
  dimmedLinkIds: ReadonlySet<string>;
  pointerHandlers: HTMLAttributes<HTMLDivElement>;
  viewportRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

export function Canvas(props: CanvasProps) {
  const { layout, view, animate, panning, highlightedLinkIds, dimmedLinkIds, viewportRef } = props;
  const stageStyle: CSSProperties = {
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
  };

  return (
    <div
      id="viewport"
      ref={viewportRef}
      className={panning ? 'panning' : undefined}
      {...props.pointerHandlers}
    >
      <div id="stage" className={animate ? 'animate' : undefined} style={stageStyle}>
        <svg id="links" width={layout.width} height={layout.height}>
          {layout.links.map((link) => {
            const highlighted = highlightedLinkIds.has(link.id);
            const mix = highlighted
              ? LINK_MIX_PERCENT.highlighted
              : link.parent.node.depth === 0
                ? LINK_MIX_PERCENT.fromRoot
                : LINK_MIX_PERCENT.other;
            return (
              <path
                key={link.id}
                d={buildLinkPath(link.parent, link.child)}
                className={[highlighted && 'hl', dimmedLinkIds.has(link.id) && 'dim']
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  stroke: `color-mix(in srgb, ${link.child.node.color} ${mix}%, var(--link))`,
                }}
              />
            );
          })}
        </svg>
        <div id="nodes">{props.children}</div>
      </div>
    </div>
  );
}
