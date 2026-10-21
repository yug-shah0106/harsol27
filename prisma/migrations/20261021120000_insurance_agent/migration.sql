-- The client renamed "LIC Agent" to "Insurance Agent" (2026-10-21). Registrations that chose it keep pointing at
-- it. Its URL changes too: nothing public links to it yet (the site is still in coming-soon mode).
UPDATE "Industry"
SET "name" = 'Insurance Agent', "nameKey" = 'insurance agent', "slug" = 'insurance-agent', "updatedAt" = now()
WHERE "nameKey" = 'lic agent'
  AND NOT EXISTS (SELECT 1 FROM "Industry" WHERE "nameKey" = 'insurance agent' OR "slug" = 'insurance-agent');
