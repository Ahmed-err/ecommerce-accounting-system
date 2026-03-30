-- Add phone verification timestamp to users
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "phoneVerified" TIMESTAMP(3);
