'use server';

import { selfRegisterClient } from '@/lib/auth/self-register';

export type SignUpActionResult = { status: 'success' } | { status: 'error'; message: string };

export async function actionSignUp(
  email: string,
  password: string,
  displayName: string,
): Promise<SignUpActionResult> {
  const result = await selfRegisterClient({ email, password, displayName });
  if (!result.ok) {
    return { status: 'error', message: result.reason };
  }
  return { status: 'success' };
}
