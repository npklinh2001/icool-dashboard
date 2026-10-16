import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { DASHBOARD_DATA } from '@/data/dashboard-data';
import { filterSourceForSale } from '@/features/dashboard/access';
import { Dashboard } from '@/features/dashboard/components/Dashboard';

// Always evaluated per request so the session cookie is checked every time
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // The report data is only handed to the browser after the session check passes,
  // minus the reports this user is not allowed to see
  const data = filterSourceForSale(DASHBOARD_DATA, user.sale);
  return <Dashboard data={data} userName={user.name} />;
}
