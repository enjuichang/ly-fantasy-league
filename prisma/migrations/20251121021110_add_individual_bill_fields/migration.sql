/*
  Warnings:

  - You are about to drop the column `reason` on the `Score` table. All the data in the column will be lost.
  - Added the required column `description` to the `Score` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legislatorId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "points" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "billNumber" TEXT,
    "billTitle" TEXT,
    "votePosition" TEXT,
    "rollcallNumber" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Score_legislatorId_fkey" FOREIGN KEY ("legislatorId") REFERENCES "Legislator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Score" ("category", "createdAt", "date", "id", "legislatorId", "points", "updatedAt") SELECT "category", "createdAt", "date", "id", "legislatorId", "points", "updatedAt" FROM "Score";
DROP TABLE "Score";
ALTER TABLE "new_Score" RENAME TO "Score";
CREATE INDEX "Score_legislatorId_date_idx" ON "Score"("legislatorId", "date");
CREATE INDEX "Score_legislatorId_category_idx" ON "Score"("legislatorId", "category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
