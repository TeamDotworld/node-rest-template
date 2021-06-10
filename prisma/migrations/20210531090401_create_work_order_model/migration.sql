-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('LIVE', 'CONTENT', 'PLAYLIST');

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "work_order_id" TEXT;

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "type" "WorkType" NOT NULL,
    "content_id" TEXT NOT NULL,
    "schedule_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schedule_end" TIMESTAMP(3),

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Device" ADD FOREIGN KEY ("work_order_id") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
