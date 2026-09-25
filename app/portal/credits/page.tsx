// DR 0120: Customer credit balance + transaction history.
// Reads from the append-only customer_credit_ledger — CLIENT-safe view only.

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCreditBalance, getCreditLedgerHistory } from '@/lib/credits/balance';
import s from '../portal.module.css';

export const metadata = { title: 'Credits — Client Portal' };

function formatCredits(n: number): string {
  return n.toLocaleString('en-US');
}

function entryLabel(entryType: string): string {
  switch (entryType) {
    case 'PURCHASE': return 'Credits purchased';
    case 'RESERVATION': return 'Credits reserved for production';
    case 'RELEASE': return 'Credits returned (production released)';
    case 'ADJUSTMENT': return 'Manual adjustment';
    case 'REFUND': return 'Credits refunded';
    default: return entryType;
  }
}

function signLabel(delta: number): string {
  return delta >= 0 ? `+${formatCredits(delta)}` : formatCredits(delta);
}

export default async function CreditsPage() {
  const session = await auth();
  if (!session) redirect('/portal/login');

  const orgId = session.user.organizationId;
  const [balance, history] = await Promise.all([
    getCreditBalance(orgId),
    getCreditLedgerHistory(orgId, 50),
  ]);

  return (
    <>
      <div className={s.pageHeader}>
        <h1 className={s.pageTitle}>Credits</h1>
        <p className={s.pageSubtitle}>Your credit balance and transaction history</p>
      </div>

      <div className={s.creditBalanceCard}>
        <div className={s.creditBalanceMain}>
          <div className={s.creditBalanceLabel}>Available Balance</div>
          <div className={s.creditBalanceValue}>{formatCredits(balance)}</div>
          <div className={s.creditBalanceUnit}>credits</div>
        </div>
        <div className={s.creditBalanceActions}>
          <Link href="/portal/credits/buy" className={s.creditBuyBtn}>
            Buy More Credits
          </Link>
          {balance > 0 && (
            <Link href="/portal/production/new" className={s.startProductionBtn}>
              Start a Production
            </Link>
          )}
        </div>
      </div>

      <div className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>Transaction History</h2>
      </div>

      {history.length === 0 ? (
        <div className={s.emptyState}>
          <p>No transactions yet. Buy credits to get started.</p>
          <Link href="/portal/credits/buy" className={s.creditBuyBtn}>
            Buy Credits
          </Link>
        </div>
      ) : (
        <div className={s.ledgerList}>
          {history.map((entry) => (
            <div key={entry.id} className={s.ledgerRow}>
              <div className={s.ledgerLeft}>
                <div className={s.ledgerType}>{entryLabel(entry.entry_type)}</div>
                {entry.description && (
                  <div className={s.ledgerDesc}>{entry.description}</div>
                )}
                <div className={s.ledgerDate}>
                  {new Date(entry.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
              <div
                className={
                  entry.credits_delta >= 0
                    ? `${s.ledgerDelta} ${s.ledgerDeltaPositive}`
                    : `${s.ledgerDelta} ${s.ledgerDeltaNegative}`
                }
              >
                {signLabel(entry.credits_delta)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
