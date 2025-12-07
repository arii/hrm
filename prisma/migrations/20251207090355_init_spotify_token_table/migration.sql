-- CreateTable
CREATE TABLE "SpotifyToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spotifyUserId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessTokenExpiresAt" DATETIME NOT NULL,
    "scope" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SpotifyToken_spotifyUserId_key" ON "SpotifyToken"("spotifyUserId");
