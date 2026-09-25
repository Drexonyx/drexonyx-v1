// DR 0120: Customer credit balance — computed from append-only ledger.
// Balance = SUM(credits_delta) for all ledger entries for the given organizationId.

import { db } from '@/db/index';
import { customerCreditLedger } from '@/db/schema/financial';
import { eq, sql, desc } from 'drizzle-orm';

export type CreditBalance = {
  balance: number;
};

export type CreditLedgerEntry = {
  id: string;
  entry_type: string;
  credits_delta: number;
  description: string | null;
  created_at: Date;
};

export async function getCreditBalance(organizationId: string): Promise<number> {
  const rows = await db
    .select({ total: sql<string>`COALESCE(SUM(${customerCreditLedger.credits_delta}), 0)` })
    .from(customerCreditLedger)
    .where(eq(customerCreditLedger.organization_id, organizationId));

  return parseInt(rows[0]?.total ?? '0', 10);
}

export async function getCreditLedgerHistory(
  organizationId: string,
  limit = 50,
): Promise<CreditLedgerEntry[]> {
  return db
    .select({
      id: customerCreditLedger.id,
      entry_type: customerCreditLedger.entry_type,
      credits_delta: customerCreditLedger.credits_delta,
      description: customerCreditLedger.description,
      created_at: customerCreditLedger.created_at,
    })
    .from(customerCreditLedger)
    .where(eq(customerCreditLedger.organization_id, organizationId))
    .orderBy(desc(customerCreditLedger.created_at))
    .limit(limit);
}
