import type { ChangeEvent } from 'react';
import { STATUS_LABELS } from '../constants';
import type { ReportStatus } from '../types';
import { StrokeIcon } from './Icons';

const STATUS_COLORS: Record<ReportStatus, string> = {
  live: 'var(--live)',
  building: 'var(--building)',
  proposed: 'var(--proposed)',
  noplan: 'var(--noplan)',
};

interface HeaderProps {
  khoiCount: number;
  reportCount: number;
  statusCounts: Record<ReportStatus, number>;
  query: string;
  userName: string;
  onQueryChange: (query: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

const SUPPORT_REQUEST_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScc4eT3XEch2zEJpbmhF7lJfzQiGAi9UDt-RPyIuEoGHxGpCg/viewform?usp=dialog';

const STATUS_ORDER =Object.keys(STATUS_LABELS) as ReportStatus[];

export function Header(props: HeaderProps) {
  const { statusCounts } = props;
  return (
    <header>
      <div className="brand">
        <h1>ICOOL RASA TACO · Bản đồ Dashboard</h1>
        <p>Cấu trúc báo cáo &amp; KPI đề xuất theo Khối — Team Data</p>
      </div>
      <div className="stats">
        <div className="stat">
          <b>{props.khoiCount}</b>
          <span>Khối</span>
        </div>
        <div className="stat">
          <b>{props.reportCount}</b>
          <span>Báo cáo</span>
        </div>
        <div className="status-box">
          <div className="sbar">
            {STATUS_ORDER.filter((key) => statusCounts[key] > 0).map((key) => (
              <i
                key={key}
                title={`${STATUS_LABELS[key]}: ${statusCounts[key]}`}
                style={{
                  flex: statusCounts[key],
                  background: STATUS_COLORS[key],
                  opacity: key === 'noplan' ? 0.45 : undefined,
                }}
              />
            ))}
          </div>
          <div className="sitems">
            {STATUS_ORDER.map((key) => (
              <span key={key} className="sitem">
                <i className={`dot ${key}`} />
                <b>{statusCounts[key]}</b>
                {STATUS_LABELS[key]}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="tools">
        <label className="search">
          <StrokeIcon>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </StrokeIcon>
          <input
            type="search"
            placeholder="Tìm khối, báo cáo, KPI…"
            autoComplete="off"
            value={props.query}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              props.onQueryChange(event.target.value)
            }
          />
        </label>
        <button className="btn" title="Mở tất cả" onClick={props.onExpandAll}>
          <StrokeIcon>
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </StrokeIcon>
          <span className="lbl">Mở tất cả</span>
        </button>
        <button className="btn" title="Thu gọn" onClick={props.onCollapseAll}>
          <StrokeIcon>
            <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
          </StrokeIcon>
          <span className="lbl">Thu gọn</span>
        </button>
        <a
          className="btn"
          title="Hướng dẫn sử dụng (video + PDF)"
          href="/huong-dan"
          target="_blank"
          rel="noopener noreferrer"
        >
          <StrokeIcon>
            <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5z" />
            <path d="M4 19a2 2 0 0 1 2-2h12M9 7h5M9 11h5" />
          </StrokeIcon>
          <span className="lbl">Hướng dẫn</span>
        </a>
        <a
          className="btn"
          title="Điền thông tin yêu cầu hỗ trợ - Team DATA"
          href={SUPPORT_REQUEST_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <StrokeIcon>
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
            <path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.5.2-.7.6-.7 1.1M12 16h.01" />
          </StrokeIcon>
          <span className="lbl">Yêu cầu hỗ trợ</span>
        </a>
        <button className="btn icon" title="Đổi giao diện sáng/tối" onClick={props.onToggleTheme}>
          <StrokeIcon>
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </StrokeIcon>
        </button>
        <button className="btn" title={`Đăng xuất (${props.userName})`} onClick={props.onLogout}>
          <StrokeIcon>
            <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9" />
          </StrokeIcon>
          <span className="lbl">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}
