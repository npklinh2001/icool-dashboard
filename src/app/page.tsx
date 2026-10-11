import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { DASHBOARD_DATA } from '@/data/dashboard-data';
import { Dashboard } from '@/features/dashboard/components/Dashboard';

// Always evaluated per request so the session cookie is checked every time
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // The report data is only handed to the browser after the session check passes
  return <Dashboard data={DASHBOARD_DATA} userName={user.name} />;
}
