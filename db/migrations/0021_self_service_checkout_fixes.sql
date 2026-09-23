-- DR 0111: Guarantee exactly one CLIENT_PAYMENT ledger entry per payment.
-- Enforced at the database level to prevent duplicate entries under concurrent
-- success-page requests (belt-and-suspenders with the application-level check).
-- CONCURRENTLY avoids a full table lock during migration.

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS financial_ledger_client_payment_once_uidx
  ON financial.financial_ledger (reference_entity_id)
  WHERE entry_type = 'CLIENT_PAYMENT'
    AND reference_entity_type = 'payment'
    AND reference_entity_id IS NOT NULL;
