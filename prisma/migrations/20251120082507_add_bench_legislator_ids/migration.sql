-- CreateTable
CREATE TABLE "LeagueActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "legislatorAddedId" TEXT,
    "legislatorDroppedId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeagueActivity_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LeagueActivity_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeagueActivity_legislatorAddedId_fkey" FOREIGN KEY ("legislatorAddedId") REFERENCES "Legislator" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LeagueActivity_legislatorDroppedId_fkey" FOREIGN KEY ("legislatorDroppedId") REFERENCES "Legislator" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "benchLegislatorIds" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Team" ("createdAt", "id", "leagueId", "losses", "name", "ownerId", "ties", "updatedAt", "wins") SELECT "createdAt", "id", "leagueId", "losses", "name", "ownerId", "ties", "updatedAt", "wins" FROM "Team";
DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LeagueActivity_leagueId_createdAt_idx" ON "LeagueActivity"("leagueId", "createdAt");
