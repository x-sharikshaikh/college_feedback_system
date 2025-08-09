-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false;
