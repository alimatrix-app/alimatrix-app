/*
  Warnings:

  - You are about to drop the column `miesiacUrodzenia` on the `Child` table. All the data in the column will be lost.
  - You are about to drop the column `rokUrodzenia` on the `Child` table. All the data in the column will be lost.
  - Added the required column `lastModifiedAt` to the `Child` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastModifiedAt` to the `Dochody` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Child" DROP COLUMN "miesiacUrodzenia",
DROP COLUMN "rokUrodzenia",
ADD COLUMN     "accessRestricted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dataHash" TEXT,
ADD COLUMN     "encryptionKeyId" TEXT,
ADD COLUMN     "lastModifiedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "modifiedBy" TEXT;

-- AlterTable
ALTER TABLE "Dochody" ADD COLUMN     "auditRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dataHash" TEXT,
ADD COLUMN     "encryptionKeyId" TEXT,
ADD COLUMN     "lastModifiedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "EmailSubscription" ADD COLUMN     "consentVersion" TEXT DEFAULT '1.0',
ADD COLUMN     "dataRetentionDate" TIMESTAMP(3),
ADD COLUMN     "emailVerificationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "securityFlags" JSONB,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "FormSubmission" ADD COLUMN     "accessCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "anonymizedAt" TIMESTAMP(3),
ADD COLUMN     "auditLogEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "csrfToken" TEXT,
ADD COLUMN     "dataClassification" TEXT DEFAULT 'sensitive',
ADD COLUMN     "deletionScheduledAt" TIMESTAMP(3),
ADD COLUMN     "encryptionKeyId" TEXT,
ADD COLUMN     "fingerprintId" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "lastAccessedAt" TIMESTAMP(3),
ADD COLUMN     "retentionCategory" TEXT DEFAULT 'standard',
ADD COLUMN     "riskFlags" JSONB,
ADD COLUMN     "securityScore" INTEGER DEFAULT 100,
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "submissionHash" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "sessionId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "formSubmissionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "details" JSONB,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "requestData" JSONB,
    "responseCode" INTEGER,
    "processingTime" INTEGER,
    "geolocation" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityIncident" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incidentType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "sessionId" TEXT,
    "requestData" JSONB,
    "description" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "notes" TEXT,
    "actionTaken" TEXT,
    "affectedResources" JSONB,

    CONSTRAINT "SecurityIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "firstRequestAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRequestAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "fingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "invalidatedAt" TIMESTAMP(3),
    "invalidationReason" TEXT,
    "geolocation" JSONB,
    "securityFlags" JSONB,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRetentionPolicy" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "retentionPeriod" INTEGER NOT NULL,
    "autoDelete" BOOLEAN NOT NULL DEFAULT false,
    "anonymize" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "legalBasis" TEXT,

    CONSTRAINT "DataRetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncryptionKey" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "keyHash" TEXT NOT NULL,

    CONSTRAINT "EncryptionKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");

-- CreateIndex
CREATE INDEX "AuditLog_ipAddress_idx" ON "AuditLog"("ipAddress");

-- CreateIndex
CREATE INDEX "AuditLog_riskLevel_idx" ON "AuditLog"("riskLevel");

-- CreateIndex
CREATE INDEX "AuditLog_formSubmissionId_idx" ON "AuditLog"("formSubmissionId");

-- CreateIndex
CREATE INDEX "SecurityIncident_timestamp_idx" ON "SecurityIncident"("timestamp");

-- CreateIndex
CREATE INDEX "SecurityIncident_incidentType_idx" ON "SecurityIncident"("incidentType");

-- CreateIndex
CREATE INDEX "SecurityIncident_severity_idx" ON "SecurityIncident"("severity");

-- CreateIndex
CREATE INDEX "SecurityIncident_ipAddress_idx" ON "SecurityIncident"("ipAddress");

-- CreateIndex
CREATE INDEX "SecurityIncident_resolved_idx" ON "SecurityIncident"("resolved");

-- CreateIndex
CREATE INDEX "RateLimit_identifier_idx" ON "RateLimit"("identifier");

-- CreateIndex
CREATE INDEX "RateLimit_endpoint_idx" ON "RateLimit"("endpoint");

-- CreateIndex
CREATE INDEX "RateLimit_blockedUntil_idx" ON "RateLimit"("blockedUntil");

-- CreateIndex
CREATE INDEX "RateLimit_lastRequestAt_idx" ON "RateLimit"("lastRequestAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_identifier_endpoint_key" ON "RateLimit"("identifier", "endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_sessionToken_idx" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_ipAddress_idx" ON "Session"("ipAddress");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_active_idx" ON "Session"("active");

-- CreateIndex
CREATE INDEX "Session_lastActivityAt_idx" ON "Session"("lastActivityAt");

-- CreateIndex
CREATE INDEX "DataRetentionPolicy_resourceType_idx" ON "DataRetentionPolicy"("resourceType");

-- CreateIndex
CREATE INDEX "DataRetentionPolicy_category_idx" ON "DataRetentionPolicy"("category");

-- CreateIndex
CREATE UNIQUE INDEX "DataRetentionPolicy_resourceType_category_key" ON "DataRetentionPolicy"("resourceType", "category");

-- CreateIndex
CREATE UNIQUE INDEX "EncryptionKey_keyId_key" ON "EncryptionKey"("keyId");

-- CreateIndex
CREATE INDEX "EncryptionKey_keyId_idx" ON "EncryptionKey"("keyId");

-- CreateIndex
CREATE INDEX "EncryptionKey_purpose_idx" ON "EncryptionKey"("purpose");

-- CreateIndex
CREATE INDEX "EncryptionKey_active_idx" ON "EncryptionKey"("active");

-- CreateIndex
CREATE INDEX "EncryptionKey_expiresAt_idx" ON "EncryptionKey"("expiresAt");

-- CreateIndex
CREATE INDEX "Child_lastModifiedAt_idx" ON "Child"("lastModifiedAt");

-- CreateIndex
CREATE INDEX "Child_accessRestricted_idx" ON "Child"("accessRestricted");

-- CreateIndex
CREATE INDEX "Dochody_lastModifiedAt_idx" ON "Dochody"("lastModifiedAt");

-- CreateIndex
CREATE INDEX "Dochody_auditRequired_idx" ON "Dochody"("auditRequired");

-- CreateIndex
CREATE INDEX "EmailSubscription_email_idx" ON "EmailSubscription"("email");

-- CreateIndex
CREATE INDEX "EmailSubscription_verifiedAt_idx" ON "EmailSubscription"("verifiedAt");

-- CreateIndex
CREATE INDEX "EmailSubscription_dataRetentionDate_idx" ON "EmailSubscription"("dataRetentionDate");

-- CreateIndex
CREATE INDEX "FormSubmission_submittedAt_idx" ON "FormSubmission"("submittedAt");

-- CreateIndex
CREATE INDEX "FormSubmission_ipAddress_idx" ON "FormSubmission"("ipAddress");

-- CreateIndex
CREATE INDEX "FormSubmission_securityScore_idx" ON "FormSubmission"("securityScore");

-- CreateIndex
CREATE INDEX "FormSubmission_dataClassification_idx" ON "FormSubmission"("dataClassification");

-- CreateIndex
CREATE INDEX "FormSubmission_deletionScheduledAt_idx" ON "FormSubmission"("deletionScheduledAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_formSubmissionId_fkey" FOREIGN KEY ("formSubmissionId") REFERENCES "FormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
