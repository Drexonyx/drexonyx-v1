// DR 0120: Credit package queries — read-only access to the global credit product catalog.

import { db } from '@/db/index';
import { creditPackages } from '@/db/schema/financial';
import { asc, isNull, eq, and } from 'drizzle-orm';

export type CreditPackageRow = {
  id: string;
  name: string;
  credits: number;
  price_aed: string;
  display_order: number;
};

export async function getActiveCreditPackages(): Promise<CreditPackageRow[]> {
  return db
    .select({
      id: creditPackages.id,
      name: creditPackages.name,
      credits: creditPackages.credits,
      price_aed: creditPackages.price_aed,
      display_order: creditPackages.display_order,
    })
    .from(creditPackages)
    .where(and(eq(creditPackages.is_active, true), isNull(creditPackages.archived_at)))
    .orderBy(asc(creditPackages.display_order));
}

export async function getCreditPackageById(id: string): Promise<CreditPackageRow | null> {
  const rows = await db
    .select({
      id: creditPackages.id,
      name: creditPackages.name,
      credits: creditPackages.credits,
      price_aed: creditPackages.price_aed,
      display_order: creditPackages.display_order,
    })
    .from(creditPackages)
    .where(eq(creditPackages.id, id))
    .limit(1);
  return rows[0] ?? null;
}
