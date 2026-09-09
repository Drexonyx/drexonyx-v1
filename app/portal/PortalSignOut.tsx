'use client';

import { signOut } from 'next-auth/react';
import s from './portal.module.css';

export function PortalSignOut() {
  return (
    <button
      className={s.signOutBtn}
      onClick={() => signOut({ callbackUrl: '/portal/login' })}
    >
      Sign out
    </button>
  );
}
