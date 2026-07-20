-- AlterTable
ALTER TABLE "PaymentNotice" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "Receivable" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD';
