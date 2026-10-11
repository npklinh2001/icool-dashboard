import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { LoginForm } from '@/features/auth/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/');

  return (
    <main className="login-page">
      <LoginForm />
    </main>
  );
}
