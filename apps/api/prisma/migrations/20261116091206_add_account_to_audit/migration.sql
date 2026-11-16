/*
  Warnings:

  - Added the required column `accountId` to the `Audit` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Audit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "manualCount" INTEGER NOT NULL DEFAULT 0,
    "importPct" REAL NOT NULL DEFAULT 0,
    "totalIncome" DECIMAL NOT NULL DEFAULT 0,
    "totalExpense" DECIMAL NOT NULL DEFAULT 0,
    "findings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Audit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Audit_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Existing audit rows cannot be migrated (no accountId available) — clear them.
DELETE FROM "Audit";
DROP TABLE "Audit";
ALTER TABLE "new_Audit" RENAME TO "Audit";
CREATE UNIQUE INDEX "Audit_userId_accountId_period_key" ON "Audit"("userId", "accountId", "period");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
