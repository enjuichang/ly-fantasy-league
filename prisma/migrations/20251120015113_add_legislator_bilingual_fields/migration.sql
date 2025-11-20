-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "commissionerId" TEXT NOT NULL,
    "seasonStart" DATETIME NOT NULL,
    "seasonEnd" DATETIME,
    "draftStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "League_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DraftPick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "legislatorId" TEXT NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DraftPick_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DraftPick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DraftPick_legislatorId_fkey" FOREIGN KEY ("legislatorId") REFERENCES "Legislator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DraftPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "legislatorId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DraftPreference_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DraftPreference_legislatorId_fkey" FOREIGN KEY ("legislatorId") REFERENCES "Legislator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invitation_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeagueMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Legislator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "nameCh" TEXT NOT NULL,
    "nameEn" TEXT,
    "party" TEXT NOT NULL,
    "region" TEXT,
    "sex" TEXT,
    "picUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "legislatorId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "points" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Score_legislatorId_fkey" FOREIGN KEY ("legislatorId") REFERENCES "Legislator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_LegislatorToTeam" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_LegislatorToTeam_A_fkey" FOREIGN KEY ("A") REFERENCES "Legislator" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LegislatorToTeam_B_fkey" FOREIGN KEY ("B") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_leagueId_pickNumber_key" ON "DraftPick"("leagueId", "pickNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_leagueId_legislatorId_key" ON "DraftPick"("leagueId", "legislatorId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPreference_teamId_legislatorId_key" ON "DraftPreference"("teamId", "legislatorId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPreference_teamId_rank_key" ON "DraftPreference"("teamId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_email_leagueId_key" ON "Invitation"("email", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMember_userId_leagueId_key" ON "LeagueMember"("userId", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "Legislator_externalId_key" ON "Legislator"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "_LegislatorToTeam_AB_unique" ON "_LegislatorToTeam"("A", "B");

-- CreateIndex
CREATE INDEX "_LegislatorToTeam_B_index" ON "_LegislatorToTeam"("B");
