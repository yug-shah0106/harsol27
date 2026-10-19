-- The password an admin issued to a member, encrypted, so admins can see it again on the lead page.
ALTER TABLE "User" ADD COLUMN "issuedPassword" TEXT;
