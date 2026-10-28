/*
  Warnings:

  - The values [READY,FAILED] on the enum `ReelStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `authorId` on the `Reel` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Reel` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `Reel` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail` on the `Reel` table. All the data in the column will be lost.
  - You are about to drop the column `url1080p` on the `Reel` table. All the data in the column will be lost.
  - You are about to drop the column `url360p` on the `Reel` table. All the data in the column will be lost.
  - You are about to drop the column `url720p` on the `Reel` table. All the data in the column will be lost.
  - You are about to drop the column `ip` on the `ReelView` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Reel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `videoUrl` to the `Reel` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `ReelView` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ReelStatus_new" AS ENUM ('PROCESSING', 'PUBLISHED', 'DELETED');
ALTER TABLE "Reel" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Reel" ALTER COLUMN "status" TYPE "ReelStatus_new" USING ("status"::text::"ReelStatus_new");
ALTER TYPE "ReelStatus" RENAME TO "ReelStatus_old";
ALTER TYPE "ReelStatus_new" RENAME TO "ReelStatus";
DROP TYPE "ReelStatus_old";
ALTER TABLE "Reel" ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';
COMMIT;

-- DropForeignKey
ALTER TABLE "Reel" DROP CONSTRAINT "Reel_authorId_fkey";

-- DropForeignKey
ALTER TABLE "ReelView" DROP CONSTRAINT "ReelView_userId_fkey";

-- DropIndex
DROP INDEX "Reel_authorId_createdAt_idx";

-- DropIndex
DROP INDEX "Reel_authorId_idx";

-- DropIndex
DROP INDEX "Reel_deletedAt_idx";

-- DropIndex
DROP INDEX "Reel_status_idx";

-- DropIndex
DROP INDEX "ReelView_reelId_idx";

-- AlterTable
ALTER TABLE "Reel" DROP COLUMN "authorId",
DROP COLUMN "deletedAt",
DROP COLUMN "duration",
DROP COLUMN "thumbnail",
DROP COLUMN "url1080p",
DROP COLUMN "url360p",
DROP COLUMN "url720p",
ADD COLUMN     "caption" TEXT,
ADD COLUMN     "thumbnaulUrl" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL,
ADD COLUMN     "videoUrl" TEXT NOT NULL,
ADD COLUMN     "viewsCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "ReelView" DROP COLUMN "ip",
ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Reel_userId_idx" ON "Reel"("userId");

-- AddForeignKey
ALTER TABLE "Reel" ADD CONSTRAINT "Reel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReelView" ADD CONSTRAINT "ReelView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
