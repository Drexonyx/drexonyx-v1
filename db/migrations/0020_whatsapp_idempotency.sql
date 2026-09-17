-- DR 0125 Phase 1: Unique partial index for WhatsApp message idempotency.
-- Prevents duplicate task creation when Meta retries webhook deliveries.
-- Scoped to ROUTE_WHATSAPP_INQUIRY tasks with a non-null wa_message_id in context.
-- CONCURRENTLY avoids locking the table on creation.

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS agent_tasks_wa_message_id_uidx
  ON orchestration.agent_tasks ((context->>'wa_message_id'))
  WHERE intent_type = 'ROUTE_WHATSAPP_INQUIRY'
    AND context->>'wa_message_id' IS NOT NULL;
