'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import s from '../portal.module.css';
import { actionSignUp } from './actions';

export default function SignUpPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const result = await actionSignUp(email, password, displayName);

    if (result.status === 'error') {
      setError(result.message);
      setLoading(false);
      return;
    }

    // Account created — sign in automatically.
    const signInResult = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!signInResult || signInResult.error) {
      setError('Account created. Please sign in.');
      return;
    }

    router.push('/portal/dashboard');
    router.refresh();
  }

  return (
    <div className={s.loginWrap}>
      <div className={s.loginCard}>
        <div className={s.loginTitle}>Client Portal</div>
        <div className={s.loginSubtitle}>Create your account</div>

        <form onSubmit={handleSubmit}>
          {error && <div className={s.loginError}>{error}</div>}

          <div className={s.field}>
            <label className={s.label} htmlFor="displayName">
              Full name
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              required
              className={s.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

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
              autoComplete="new-password"
              required
              minLength={8}
              className={s.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={s.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className={s.loginBtn}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div className={s.loginAuthSwitch}>
          Already have an account?{' '}
          <Link href="/portal/login" className={s.loginAuthLink}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
