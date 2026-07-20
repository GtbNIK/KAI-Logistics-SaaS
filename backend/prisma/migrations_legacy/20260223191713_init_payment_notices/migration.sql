-- AlterTable
ALTER TABLE "PaymentNotice" ADD COLUMN     "notes" TEXT;

-- CreateTable
CREATE TABLE "PaymentNoticeItem" (
    "id" TEXT NOT NULL,
    "paymentNoticeId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PaymentNoticeItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PaymentNoticeItem" ADD CONSTRAINT "PaymentNoticeItem_paymentNoticeId_fkey" FOREIGN KEY ("paymentNoticeId") REFERENCES "PaymentNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
