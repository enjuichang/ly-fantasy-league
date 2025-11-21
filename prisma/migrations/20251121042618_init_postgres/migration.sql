-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commissionerId" TEXT NOT NULL,
    "seasonStart" TIMESTAMP(3) NOT NULL,
    "seasonEnd" TIMESTAMP(3),
    "totalWeeks" INTEGER NOT NULL DEFAULT 12,
    "draftStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPick" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "legislatorId" TEXT NOT NULL,
    "pickNumber" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPreference" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "legislatorId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,

    CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "benchLegislatorIds" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Legislator" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "nameCh" TEXT NOT NULL,
    "nameEn" TEXT,
    "party" TEXT NOT NULL,
    "region" TEXT,
    "sex" TEXT,
    "picUrl" TEXT,
    "leaveFlag" TEXT,
    "leaveDate" TEXT,
    "errorFlag" TEXT,
    "errorReason" TEXT,
    "areaName" TEXT,
    "leaveReason" TEXT,
    "committee" TEXT,
    "onboardDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Legislator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "legislatorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "billNumber" TEXT,
    "billTitle" TEXT,
    "votePosition" TEXT,
    "rollcallNumber" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matchup" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "team1Id" TEXT NOT NULL,
    "team2Id" TEXT,
    "team1Score" DOUBLE PRECISION,
    "team2Score" DOUBLE PRECISION,
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Matchup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueActivity" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "legislatorAddedId" TEXT,
    "legislatorDroppedId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LegislatorToTeam" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
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
CREATE INDEX "Score_legislatorId_date_idx" ON "Score"("legislatorId", "date");

-- CreateIndex
CREATE INDEX "Score_legislatorId_category_idx" ON "Score"("legislatorId", "category");

-- CreateIndex
CREATE INDEX "Matchup_leagueId_week_idx" ON "Matchup"("leagueId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "Matchup_leagueId_week_team1Id_key" ON "Matchup"("leagueId", "week", "team1Id");

-- CreateIndex
CREATE INDEX "LeagueActivity_leagueId_createdAt_idx" ON "LeagueActivity"("leagueId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_LegislatorToTeam_AB_unique" ON "_LegislatorToTeam"("A", "B");

-- CreateIndex
CREATE INDEX "_LegislatorToTeam_B_index" ON "_LegislatorToTeam"("B");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_legislatorId_fkey" FOREIGN KEY ("legislatorId") REFERENCES "Legislator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPreference" ADD CONSTRAINT "DraftPreference_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPreference" ADD CONSTRAINT "DraftPreference_legislatorId_fkey" FOREIGN KEY ("legislatorId") REFERENCES "Legislator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_legislatorId_fkey" FOREIGN KEY ("legislatorId") REFERENCES "Legislator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matchup" ADD CONSTRAINT "Matchup_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matchup" ADD CONSTRAINT "Matchup_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matchup" ADD CONSTRAINT "Matchup_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueActivity" ADD CONSTRAINT "LeagueActivity_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueActivity" ADD CONSTRAINT "LeagueActivity_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueActivity" ADD CONSTRAINT "LeagueActivity_legislatorAddedId_fkey" FOREIGN KEY ("legislatorAddedId") REFERENCES "Legislator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueActivity" ADD CONSTRAINT "LeagueActivity_legislatorDroppedId_fkey" FOREIGN KEY ("legislatorDroppedId") REFERENCES "Legislator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LegislatorToTeam" ADD CONSTRAINT "_LegislatorToTeam_A_fkey" FOREIGN KEY ("A") REFERENCES "Legislator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LegislatorToTeam" ADD CONSTRAINT "_LegislatorToTeam_B_fkey" FOREIGN KEY ("B") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
