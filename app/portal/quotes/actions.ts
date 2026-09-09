'use server';

// DR 0046: CLIENT role only. organizationId is from server-side session — never from client input.

import { auth } from '@/auth';
import { acceptQuote } from '@/lib/portal/accept-quote';
import { redirect } from 'next/navigation';

export async function actionAcceptQuote(quoteId: string): Promise<{ ok: false; reason: string } | never> {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const result = await acceptQuote({
    quoteId,
    organizationId: session.user.organizationId,
    actorId: session.user.id ?? '',
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  redirect('/portal/orders');
}
