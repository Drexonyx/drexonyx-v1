'use client';

import { useRouter } from 'next/navigation';
import s from './admin.module.css';

export function AdminSignOut() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <button className={s.signOutBtn} onClick={handleSignOut}>
      Sign out
    </button>
  );
}
