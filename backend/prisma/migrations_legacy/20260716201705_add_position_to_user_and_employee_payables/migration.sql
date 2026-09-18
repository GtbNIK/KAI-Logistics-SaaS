-- AlterTable
ALTER TABLE "Payable" ADD COLUMN     "employeeUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "position" TEXT;

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_employeeUserId_fkey" FOREIGN KEY ("employeeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
