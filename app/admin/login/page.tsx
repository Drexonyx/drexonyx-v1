'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import s from '../admin.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('admin', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!result || result.error) {
      setError('Invalid credentials or insufficient permissions.');
      return;
    }

    router.push('/admin/dashboard');
    router.refresh();
  }

  return (
    <div className={s.loginWrap}>
      <div className={s.loginCard}>
        <div className={s.loginTitle}>Admin Access</div>
        <div className={s.loginSubtitle}>Drexonyx internal staff only</div>

        <form onSubmit={handleSubmit}>
          {error && <div className={s.loginError}>{error}</div>}

          <div className={s.field}>
            <label className={s.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className={s.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className={s.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className={s.loginBtn}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
