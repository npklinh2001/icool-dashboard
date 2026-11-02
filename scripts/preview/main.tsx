// Entry for the offline preview built by scripts/build-preview.mjs: renders the real
// dashboard with the full report tree, no login or server needed.
import { createRoot } from 'react-dom/client';
import '@/app/globals.css';
import { DASHBOARD_DATA } from '@/data/dashboard-data';
import { Dashboard } from '@/features/dashboard/components/Dashboard';

const container = document.getElementById('root');
if (container)
  createRoot(container).render(<Dashboard data={DASHBOARD_DATA} userName="Xem trước" />);
