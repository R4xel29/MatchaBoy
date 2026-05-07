-- AlterTable: User - Add loyalty columns
ALTER TABLE "User" ADD COLUMN "points" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN "referredById" TEXT;
ALTER TABLE "User" ADD COLUMN "referralBonusPaid" BOOLEAN NOT NULL DEFAULT false;

-- Populate referralCode for existing users with unique values
UPDATE "User" SET "referralCode" = 'REF-' || SUBSTRING(id FROM 1 FOR 8) || '-' || FLOOR(RANDOM() * 10000)::TEXT WHERE "referralCode" IS NULL;

-- Now make referralCode required
ALTER TABLE "User" ALTER COLUMN "referralCode" SET NOT NULL;

-- Add unique constraint
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- Add foreign key for referredById
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Order - Add loyalty columns
ALTER TABLE "Order" ADD COLUMN "hasTumbler" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "pointsEarned" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "pointsAwarded" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: PointHistory
CREATE TABLE "PointHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Voucher
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "fromReferralUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LoyaltySettings
CREATE TABLE "LoyaltySettings" (
    "id" TEXT NOT NULL,
    "milestone1Points" INTEGER NOT NULL DEFAULT 5,
    "milestone1Reward" TEXT NOT NULL DEFAULT 'FREE_TOPPING',
    "milestone1Desc" TEXT NOT NULL DEFAULT 'Gratis 1 Topping',
    "milestone1Enabled" BOOLEAN NOT NULL DEFAULT true,
    "milestone2Points" INTEGER NOT NULL DEFAULT 10,
    "milestone2Reward" TEXT NOT NULL DEFAULT 'UPGRADE_SIZE',
    "milestone2Desc" TEXT NOT NULL DEFAULT 'Free Upgrade Size',
    "milestone2Enabled" BOOLEAN NOT NULL DEFAULT true,
    "milestone3Points" INTEGER NOT NULL DEFAULT 15,
    "milestone3Reward" TEXT NOT NULL DEFAULT 'FREE_DRINK',
    "milestone3Desc" TEXT NOT NULL DEFAULT '1 Minuman Gratis Pilihan',
    "milestone3Enabled" BOOLEAN NOT NULL DEFAULT true,
    "milestone3ResetPoints" BOOLEAN NOT NULL DEFAULT true,
    "tumblerBonusEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tumblerBonusPoints" INTEGER NOT NULL DEFAULT 1,
    "tumblerDiscountPct" INTEGER NOT NULL DEFAULT 0,
    "referralEnabled" BOOLEAN NOT NULL DEFAULT true,
    "referralRewardType" TEXT NOT NULL DEFAULT 'VOUCHER',
    "referralRewardPoints" INTEGER NOT NULL DEFAULT 5,
    "referralRewardVoucher" TEXT NOT NULL DEFAULT 'FREE_DRINK',
    "referralRewardDesc" TEXT NOT NULL DEFAULT '1 Minuman Gratis (Hadiah Referral)',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");

-- AddForeignKey
ALTER TABLE "PointHistory" ADD CONSTRAINT "PointHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default LoyaltySettings
INSERT INTO "LoyaltySettings" ("id", "updatedAt") VALUES ('default-loyalty-settings', CURRENT_TIMESTAMP);
