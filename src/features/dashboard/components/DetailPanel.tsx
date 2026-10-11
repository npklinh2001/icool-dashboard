import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { STATUS_LABELS } from '../constants';
import type { TreeNode } from '../types';
import { Icon, PowerBiIcon, StrokeIcon } from './Icons';

interface DetailPanelProps {
  node: TreeNode | null;
  ancestors: TreeNode[];
  open: boolean;
  onClose: () => void;
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function buildMetaRows(node: TreeNode): [string, ReactNode][] {
  const rows: [string, ReactNode | undefined][] = [
    ['Người làm báo cáo', node.author || '…'],
    ['Người xem báo cáo', node.viewers.join(', ') || '…'],
    [
      'Liên hệ (Zalo)',
      node.contact ? (
        <a
          href={`https://zalo.me/${encodeURIComponent(node.contact)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {node.contact}
        </a>
      ) : (
        '…'
      ),
    ],
    ['Phụ trách', node.owner],
    ['Cập nhật', node.refresh],
    ['Nguồn dữ liệu', node.source],
  ];
  return rows.filter((row): row is [string, ReactNode] => Boolean(row[1]));
}

export function DetailPanel({ node, ancestors, open, onClose }: DetailPanelProps) {
  const khoi = ancestors[0] ?? node;
  return (
    <aside
      id="panel"
      className={open ? 'open' : undefined}
      style={node ? ({ '--c': node.color } as CSSProperties) : undefined}
      aria-live="polite"
    >
      {node && (
        <>
          <button className="btn icon close" title="Đóng" onClick={onClose}>
            <StrokeIcon>
              <path d="M6 6l12 12M18 6 6 18" />
            </StrokeIcon>
          </button>
          <div className="crumb">
            <Icon name={khoi?.icon} size={14} />
            {ancestors.map((ancestor, index) => (
              <span key={ancestor.id}>
                {index > 0 && <span className="sep"> › </span>}
                {ancestor.name}
              </span>
            ))}
          </div>
          <h2>{node.name}</h2>
          {node.report ? (
            <div className="report">{node.report}</div>
          ) : (
            <div style={{ height: 10 }} />
          )}
          <span className="pill">
            <i className={`dot ${node.status}`} />
            {STATUS_LABELS[node.status]}
          </span>
          {node.url && (
            <a className="open-link" href={node.url} target="_blank" rel="noopener noreferrer">
              <span className="pbi">
                <PowerBiIcon size={22} />
              </span>
              <span className="ol-txt">
                <span className="ol-t">Mở báo cáo trên {node.tool ?? 'dashboard'}</span>
                <span className="ol-s">{safeHostname(node.url)}</span>
              </span>
              <span className="ol-go">
                <StrokeIcon strokeWidth={2.4}>
                  <path d="M7 17 17 7M8 7h9v9" />
                </StrokeIcon>
              </span>
            </a>
          )}
          {node.info && (
            <>
              <h3>Thông tin trong báo cáo</h3>
              <p className="info">{node.info}</p>
            </>
          )}
          {node.kpis.length > 0 && (
            <>
              <h3>
                KPI đề xuất <span className="n">{node.kpis.length}</span>
              </h3>
              <ol className="kpis">
                {node.kpis.map((kpi, index) => (
                  <li
                    key={`${index}-${kpi.t}`}
                    className={[kpi.hl && 'hl', kpi.warn && 'warn'].filter(Boolean).join(' ')}
                  >
                    <span className="i">{index + 1}</span>
                    <span>
                      {kpi.hl && <span className="tag">Trọng tâm</span>}
                      {!kpi.hl && kpi.warn && <span className="tag">Lưu ý</span>}
                      <span className="kt">{kpi.t}</span>
                      {kpi.note && <span className="kn">{kpi.note}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
          {node.note && <div className="note">{node.note}</div>}
          <h3>Thông tin dashboard</h3>
          <dl className="meta">
            {buildMetaRows(node).map(([label, value]) => (
              <Fragment key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </Fragment>
            ))}
          </dl>
        </>
      )}
    </aside>
  );
}
