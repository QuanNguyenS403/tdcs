CREATE TABLE "Lead" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "experience" TEXT,
    "preferredFormat" TEXT,
    "consent" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

ALTER TABLE "Order" ALTER COLUMN "courseId" DROP NOT NULL;
ALTER TABLE "Order" ADD COLUMN "packageId" UUID;
CREATE INDEX "Order_packageId_status_idx" ON "Order"("packageId", "status");
ALTER TABLE "Order" ADD CONSTRAINT "Order_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
