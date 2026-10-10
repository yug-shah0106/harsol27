-- Campaign tags (utm_*) of the link a Get started visitor arrived by.
ALTER TABLE "Lead" ADD COLUMN "utm" JSONB;
