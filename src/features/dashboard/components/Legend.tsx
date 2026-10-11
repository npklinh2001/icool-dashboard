import { STATUS_LABELS } from '../constants';
import type { ReportStatus } from '../types';

// Always show the two most common states, plus any other state actually in use
const ALWAYS_SHOWN: ReportStatus[] = ['live', 'building'];

export function Legend({ usedStatuses }: { usedStatuses: ReadonlySet<ReportStatus> }) {
  const shown = (Object.keys(STATUS_LABELS) as ReportStatus[]).filter(
    (status) => usedStatuses.has(status) || ALWAYS_SHOWN.includes(status),
  );
  return (
    <div className="legend">
      {shown.map((status) => (
        <span key={status}>
          <i className={`dot ${status}`} />
          {STATUS_LABELS[status]}
        </span>
      ))}
    </div>
  );
}
