'use client';

import { signOut } from 'next-auth/react';
import s from './admin.module.css';

export function AdminSignOut() {
  return (
    <button
      className={s.signOutBtn}
      onClick={() => signOut({ callbackUrl: '/admin/login' })}
    >
      Sign out
    </button>
  );
}
