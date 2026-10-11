'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

const GENERIC_ERROR = 'Không thể đăng nhập, vui lòng thử lại';

async function requestLogin(sale: string, pin: string): Promise<string | null> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sale, pin }),
  });
  if (response.ok) return null;
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? GENERIC_ERROR;
}

export function LoginForm() {
  const router = useRouter();
  const [sale, setSale] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const failure = await requestLogin(sale, pin);
      if (failure) {
        setError(failure);
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="login-card" onSubmit={handleSubmit}>
      <div className="login-mark" aria-hidden="true">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="12" width="4" height="9" rx="1" />
          <rect x="10" y="7" width="4" height="14" rx="1" />
          <rect x="17" y="3" width="4" height="18" rx="1" />
        </svg>
      </div>
      <h1>ICOOL RASA TACO</h1>
      <p className="login-sub">Đăng nhập để xem Bản đồ Dashboard</p>
      <label className="login-field">
        Tên đăng nhập
        <input
          value={sale}
          onChange={(event) => setSale(event.target.value)}
          autoComplete="username"
          autoFocus
          required
          maxLength={50}
        />
      </label>
      <label className="login-field">
        Mật khẩu
        <input
          type="password"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          autoComplete="current-password"
          required
          maxLength={50}
        />
      </label>
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn login-submit" type="submit" disabled={submitting}>
        {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </button>
    </form>
  );
}
