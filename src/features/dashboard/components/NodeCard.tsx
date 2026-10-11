import type { CSSProperties } from 'react';
import { STATUS_LABELS } from '../constants';
import { collectLeaves, isBranch } from '../tree';
import type { PositionedNode } from '../types';
import { ChevronIcon, Icon, PowerBiIcon } from './Icons';

interface NodeCardProps {
  positioned: PositionedNode;
  collapsed: boolean;
  matched: boolean;
  dimmed: boolean;
  active: boolean;
  onClick: () => void;
  onHover: (hovering: boolean) => void;
}

function NodeBody({ positioned }: Pick<NodeCardProps, 'positioned'>) {
  const { node } = positioned;
  const reportCount = collectLeaves(node).length;
  const count = (
    <div className="count" title={`${reportCount} báo cáo`}>
      {reportCount}
    </div>
  );

  if (node.kind === 'root') {
    return (
      <>
        <div className="mark">
          <Icon name="grid" size={18} />
        </div>
        <div className="txt">
          <div className="t">{node.name}</div>
          <div className="s">{node.sub}</div>
        </div>
      </>
    );
  }

  if (node.kind === 'khoi') {
    const kpiCount = collectLeaves(node).reduce((sum, leaf) => sum + leaf.kpis.length, 0);
    const subtitle =
      node.status === 'noplan'
        ? STATUS_LABELS.noplan
        : `${node.children.length} bộ phận · ${kpiCount} KPI`;
    return (
      <>
        <div className="ico">
          <Icon name={node.icon} />
        </div>
        <div className="txt">
          <div className="t">{node.name}</div>
          <div className="s">{subtitle}</div>
        </div>
        {count}
        <ChevronIcon />
      </>
    );
  }

  if (isBranch(node)) {
    return (
      <>
        <i className="gdot" />
        <div className="txt">
          <div className="t">{node.name}</div>
        </div>
        {count}
        <ChevronIcon />
      </>
    );
  }

  const subtitle = [node.report, `${node.kpis.length} KPI`].filter(Boolean).join(' · ');
  return (
    <>
      <div className="txt">
        <div className="t" title={node.name}>
          {node.name}
        </div>
        <div className="s" title={subtitle}>
          {subtitle}
        </div>
      </div>
      {node.url && (
        <a
          className="quick"
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`Mở trên ${node.tool ?? 'dashboard'}`}
          onClick={(event) => event.stopPropagation()}
        >
          <PowerBiIcon size={13} />
          Mở
        </a>
      )}
      <i className={`dot ${node.status}`} title={STATUS_LABELS[node.status]} />
    </>
  );
}

export function NodeCard(props: NodeCardProps) {
  const { positioned, collapsed, matched, dimmed, active, onClick, onHover } = props;
  const { node, x, y, w, h } = positioned;
  const classNames = [
    'node',
    node.kind,
    node.status,
    collapsed && 'collapsed',
    matched && 'match',
    active && 'active',
    dimmed && 'dim',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      style={
        {
          '--c': node.color,
          width: w,
          height: h,
          transform: `translate(${x}px, ${y}px)`,
        } as CSSProperties
      }
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <NodeBody positioned={positioned} />
    </div>
  );
}
