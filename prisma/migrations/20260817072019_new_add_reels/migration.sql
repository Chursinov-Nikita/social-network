/*
  Warnings:

  - You are about to drop the column `thumbnaulUrl` on the `Reel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Reel" DROP COLUMN "thumbnaulUrl",
ADD COLUMN     "thumbnailUrl" TEXT;
