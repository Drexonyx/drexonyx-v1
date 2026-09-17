// Production Funding Check — Financial Section (OWNER instruction 2026-09-17)
// Required core flow: ... → Payment Verification → Financial Ledger → Order Budget
//                         → Production Funding Check → Production Ready
//
// organizationId MUST come from a server-side session token; never from client input.
// All queries are org-scoped. Internal financial data is not exposed to clients.

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db/index';
import { payments } from '@/db/schema/financial';
import { orders } from '@/db/schema/commercial';

// Returns true if the order has a confirmed PAID payment.
// Uses a belt-and-suspenders org-scope on both orders and payments.
export async function isOrderProductionFunded(
  orderId: string,
  organizationId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.order_id, orderId),
        eq(payments.organization_id, organizationId),
        eq(payments.status, 'PAID'),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

// Returns ACTIVE, non-archived orders that have a confirmed PAID payment.
// For admin visibility into orders ready for production kick-off.
// Does not expose internal financial amounts — order-level data only.
export async function getProductionReadyOrders(organizationId: string) {
  const activeOrders = await db
    .select({
      id: orders.id,
      campaign_id: orders.campaign_id,
      quote_id: orders.quote_id,
      status: orders.status,
      created_at: orders.created_at,
      updated_at: orders.updated_at,
    })
    .from(orders)
    .where(
      and(
        eq(orders.organization_id, organizationId),
        eq(orders.status, 'ACTIVE'),
        isNull(orders.archived_at),
      ),
    );

  if (activeOrders.length === 0) return [];

  const orderIds = activeOrders.map((o) => o.id);

  // Fetch PAID payments for these orders in a single query
  const paidPayments = await db
    .select({ order_id: payments.order_id })
    .from(payments)
    .where(
      and(
        eq(payments.organization_id, organizationId),
        eq(payments.status, 'PAID'),
        inArray(payments.order_id, orderIds),
      ),
    );

  const paidOrderIdSet = new Set(paidPayments.map((p) => p.order_id));
  return activeOrders.filter((o) => paidOrderIdSet.has(o.id));
}
