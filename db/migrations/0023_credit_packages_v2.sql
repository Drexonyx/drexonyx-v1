-- Credit packages v2: 7-tier ladder replacing the original 5-tier seed.
-- Old packages are archived (soft-deleted) — FK integrity for existing
-- credit_purchases is preserved. New packages use the 10x credit scale
-- where 1 credit ≈ AED 0.20 at the entry tier.

-- Archive all existing packages
UPDATE financial.credit_packages
SET
  is_active  = FALSE,
  archived_at = NOW()
WHERE archived_at IS NULL;

-- Insert 7-tier ladder
INSERT INTO financial.credit_packages
  (id, name, credits, price_aed, is_active, display_order, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Starter Pack',  600,   120.0000, TRUE,  10, NOW(), NOW()),
  (gen_random_uuid(), 'Creator Pack', 2000,   350.0000, TRUE,  20, NOW(), NOW()),
  (gen_random_uuid(), 'Pro Pack',     5000,   800.0000, TRUE,  30, NOW(), NOW()),
  (gen_random_uuid(), 'Growth Pack', 10000,  1500.0000, TRUE,  40, NOW(), NOW()),
  (gen_random_uuid(), 'Studio Pack', 25000,  3250.0000, TRUE,  50, NOW(), NOW()),
  (gen_random_uuid(), 'Scale Pack',  50000,  5500.0000, TRUE,  60, NOW(), NOW()),
  (gen_random_uuid(), 'Power Pack',  75000,  7000.0000, TRUE,  70, NOW(), NOW());
