-- CreateTable
CREATE TABLE "Matchup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "team1Id" TEXT NOT NULL,
    "team2Id" TEXT,
    "team1Score" REAL,
    "team2Score" REAL,
    "winnerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Matchup_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Matchup_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Matchup_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_League" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "commissionerId" TEXT NOT NULL,
    "seasonStart" DATETIME NOT NULL,
    "seasonEnd" DATETIME,
    "totalWeeks" INTEGER NOT NULL DEFAULT 12,
    "draftStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "League_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_League" ("commissionerId", "createdAt", "draftStatus", "id", "name", "seasonEnd", "seasonStart", "updatedAt") SELECT "commissionerId", "createdAt", "draftStatus", "id", "name", "seasonEnd", "seasonStart", "updatedAt" FROM "League";
DROP TABLE "League";
ALTER TABLE "new_League" RENAME TO "League";
CREATE TABLE "new_Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Team" ("createdAt", "id", "leagueId", "name", "ownerId", "updatedAt") SELECT "createdAt", "id", "leagueId", "name", "ownerId", "updatedAt" FROM "Team";
DROP TABLE "Team";
ALTER TABLE "new_Team" RENAME TO "Team";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Matchup_leagueId_week_idx" ON "Matchup"("leagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "Matchup_leagueId_week_team1Id_key" ON "Matchup"("leagueId", "week", "team1Id");
