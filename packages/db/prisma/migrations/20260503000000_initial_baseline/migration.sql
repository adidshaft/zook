-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLATFORM_ADMIN', 'OWNER', 'ADMIN', 'RECEPTIONIST', 'TRAINER', 'MEMBER');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('ORG_MANAGE_BILLING', 'ORG_MANAGE_STAFF', 'ORG_MANAGE_PERMISSIONS', 'ORG_MANAGE_PROFILE', 'ORG_MANAGE_LOCATION', 'ORG_VIEW_REPORTS', 'MEMBERS_VIEW', 'MEMBERS_MANAGE', 'MEMBERSHIP_PLAN_MANAGE', 'MEMBERSHIP_SUBSCRIPTION_MANAGE', 'PAYMENTS_VIEW', 'PAYMENTS_RECORD_OFFLINE', 'PAYMENTS_REFUND', 'COUPONS_MANAGE', 'REFERRALS_MANAGE', 'ATTENDANCE_QR_DISPLAY', 'ATTENDANCE_APPROVE', 'ATTENDANCE_MANUAL_OVERRIDE', 'TRAINERS_MANAGE', 'PT_RECORD', 'PLANS_CREATE', 'PLANS_PUBLISH_ALL', 'PLANS_PUBLISH_ASSIGNED', 'AI_USE_TEXT', 'AI_GENERATE_PLAN', 'AI_GENERATE_IMAGE', 'AI_MANAGE_SETTINGS', 'SHOP_MANAGE_PRODUCTS', 'SHOP_FULFILL_ORDER', 'NOTIFICATION_CREATE_DRAFT', 'NOTIFICATION_SEND_SELECTED', 'NOTIFICATION_SEND_ASSIGNED', 'NOTIFICATION_SEND_OPERATIONAL', 'NOTIFICATION_SEND_PROMOTIONAL', 'NOTIFICATION_SEND_RENEWAL', 'NOTIFICATION_SEND_PLAN', 'NOTIFICATION_APPROVE_BROADCAST', 'NOTIFICATION_MANAGE_TEMPLATES', 'NOTIFICATION_VIEW_ANALYTICS', 'PRIVACY_VIEW_AUDIT', 'PLATFORM_MANAGE_ORGS', 'PLATFORM_VIEW_AI_USAGE', 'PLATFORM_MANAGE_SETTINGS');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('TRIAL_ACTIVE', 'TRIAL_EXPIRING', 'TRIAL_EXPIRED', 'PAYMENT_PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GymVisibility" AS ENUM ('PUBLIC', 'INVITE_ONLY', 'HIDDEN');

-- CreateEnum
CREATE TYPE "GymJoinMode" AS ENUM ('OPEN_JOIN', 'APPROVAL_REQUIRED', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "LocationSource" AS ENUM ('MANUAL', 'GOOGLE_PLACE', 'GOOGLE_MAPS_LINK', 'MOCK');

-- CreateEnum
CREATE TYPE "MembershipPlanType" AS ENUM ('DURATION', 'VISIT_PACK', 'DATE_RANGE', 'HYBRID', 'TRIAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('MOCK_ONLINE', 'CASH', 'DIRECT_UPI', 'BANK_TRANSFER', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('SAAS_BILLING', 'MEMBERSHIP', 'SHOP_ORDER', 'PERSONAL_TRAINING', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentEventStatus" AS ENUM ('RECEIVED', 'VERIFIED', 'PROCESSING', 'PROCESSED', 'FAILED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "PaymentWebhookAttemptStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "AttendanceMode" AS ENUM ('AUTOMATIC', 'EXCEPTION_APPROVAL', 'MANUAL_APPROVAL');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('QR_SCAN', 'MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TRANSACTIONAL', 'OPERATIONAL', 'PROMOTIONAL', 'ENGAGEMENT', 'PLAN', 'SECURITY');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED', 'FAILED', 'NEEDS_APPROVAL');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('WORKOUT', 'DIET', 'EXERCISE_ROUTINE', 'TRANSFORMATION_PROGRAM', 'TRAINER_NOTE', 'GYM_ADVISORY', 'MACHINE_GUIDE', 'RECOVERY');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AIProviderType" AS ENUM ('MOCK', 'OPENAI');

-- CreateEnum
CREATE TYPE "AIRequestType" AS ENUM ('CHAT', 'STRUCTURED_PLAN', 'IMAGE', 'SCOPE_CLASSIFICATION', 'SAFETY_CLASSIFICATION');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('WATER', 'PROTEIN_SHAKE', 'SHAKER', 'TOWEL', 'SUPPLEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'READY_FOR_PICKUP', 'FULFILLED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('MARKETING', 'AI_PERSONALIZATION', 'PROFILE_PHOTO_ATTENDANCE', 'GUARDIAN', 'NOTIFICATION_PUSH', 'DATA_EXPORT', 'ACCOUNT_DELETION');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'REVOKED', 'DENIED');

-- CreateEnum
CREATE TYPE "AuditRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PushPlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateEnum
CREATE TYPE "PushDeviceStatus" AS ENUM ('ACTIVE', 'MUTED', 'INVALIDATED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PushDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'FAILED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "GuardianConsentChallengeStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GuardianConsentChallengeChannel" AS ENUM ('EMAIL_OTP', 'SMS_OTP', 'MAGIC_LINK');

-- CreateEnum
CREATE TYPE "DataExportFormat" AS ENUM ('JSON', 'CSV', 'PDF');

-- CreateEnum
CREATE TYPE "DataExportJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccountDeletionJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'MONITORING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ProviderHealthDomain" AS ENUM ('PAYMENT', 'PUSH', 'EMAIL', 'AI', 'STORAGE', 'AUTH');

-- CreateEnum
CREATE TYPE "ProviderHealthCheckStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'OUTAGE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TrackingVisibility" AS ENUM ('PRIVATE', 'TRAINER_VISIBLE');

-- CreateEnum
CREATE TYPE "HabitCategory" AS ENUM ('HYDRATION', 'SLEEP', 'STEPS', 'PROTEIN', 'STRETCHING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "HabitFrequency" AS ENUM ('DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "profilePhotoUrl" TEXT,
    "gender" TEXT,
    "fitnessGoal" TEXT,
    "emergencyContact" JSONB,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "guardianPending" BOOLEAN NOT NULL DEFAULT false,
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT true,
    "aiConsent" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceLabel" TEXT,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'login',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "resendCount" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "ownerUserId" TEXT,
    "originalName" TEXT,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "category" TEXT,
    "visibility" TEXT DEFAULT 'private',
    "storageProvider" TEXT DEFAULT 'local',
    "checksum" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "actorUserId" TEXT,
    "requestId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "before" JSONB,
    "after" JSONB,
    "riskLevel" "AuditRiskLevel" NOT NULL DEFAULT 'LOW',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "logoUrl" TEXT,
    "coverImageUrl" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "googlePlaceId" TEXT,
    "originalGoogleMapsUrl" TEXT,
    "locationSource" "LocationSource" NOT NULL DEFAULT 'MANUAL',
    "operatingHours" JSONB,
    "amenities" JSONB,
    "visibility" "GymVisibility" NOT NULL DEFAULT 'PUBLIC',
    "joinMode" "GymJoinMode" NOT NULL DEFAULT 'OPEN_JOIN',
    "status" "OrganizationStatus" NOT NULL DEFAULT 'TRIAL_ACTIVE',
    "trialStartAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndAt" TIMESTAMP(3) NOT NULL,
    "gstNumber" TEXT,
    "legalName" TEXT,
    "attendanceMode" "AttendanceMode" NOT NULL DEFAULT 'EXCEPTION_APPROVAL',
    "multiEntryConsumes" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "createdByUserId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUsernameHistory" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "oldUsername" TEXT NOT NULL,
    "newUsername" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationUsernameHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "locationSource" "LocationSource" NOT NULL DEFAULT 'MANUAL',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUser" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationRoleAssignment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationRolePermission" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permission" "Permission" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "overriddenByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffInvitation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaaSSubscription" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'TRIAL_ACTIVE',
    "trialStartAt" TIMESTAMP(3) NOT NULL,
    "trialEndAt" TIMESTAMP(3) NOT NULL,
    "billingEmail" TEXT,
    "paymentSessionId" TEXT,
    "nextBillingAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaaSSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSetting" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "keyValues" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberProfile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profilePhotoUrl" TEXT,
    "profilePhotoConsentAt" TIMESTAMP(3),
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT true,
    "publicVisibility" BOOLEAN NOT NULL DEFAULT false,
    "joinedViaReferralCodeId" TEXT,
    "emergencyContact" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianConsent" (
    "id" TEXT NOT NULL,
    "minorUserId" TEXT NOT NULL,
    "guardianName" TEXT NOT NULL,
    "guardianEmail" TEXT NOT NULL,
    "guardianPhone" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "otpChallengeId" TEXT,
    "activeChallengeId" TEXT,
    "challengeStatus" "GuardianConsentChallengeStatus",
    "challengedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "consentedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardianConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianConsentChallenge" (
    "id" TEXT NOT NULL,
    "guardianConsentId" TEXT NOT NULL,
    "minorUserId" TEXT NOT NULL,
    "otpChallengeId" TEXT,
    "channel" "GuardianConsentChallengeChannel" NOT NULL DEFAULT 'EMAIL_OTP',
    "status" "GuardianConsentChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "challengeTokenHash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastSentAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardianConsentChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "status" "ConsentStatus" NOT NULL,
    "metadata" JSONB,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataExportRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "requestId" TEXT,
    "latestJobId" TEXT,
    "exportFormat" TEXT NOT NULL DEFAULT 'json',
    "exportUrl" TEXT,
    "notes" TEXT,
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataExportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataExportJob" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "status" "DataExportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "format" "DataExportFormat" NOT NULL DEFAULT 'JSON',
    "storageProvider" TEXT DEFAULT 'local',
    "fileAssetId" TEXT,
    "exportUrl" TEXT,
    "checksum" TEXT,
    "recordCount" INTEGER,
    "requestedById" TEXT,
    "processedById" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountDeletionRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "requestId" TEXT,
    "latestJobId" TEXT,
    "notes" TEXT,
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountDeletionJob" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "status" "AccountDeletionJobStatus" NOT NULL DEFAULT 'QUEUED',
    "requestedById" TEXT,
    "processedById" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "anonymizedAt" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "dryRunReport" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountDeletionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "planAssignmentId" TEXT,
    "attendanceRecordId" TEXT,
    "title" TEXT NOT NULL,
    "workoutType" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "intensity" TEXT,
    "notes" TEXT,
    "mood" TEXT,
    "visibility" "TrackingVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExerciseEntry" (
    "id" TEXT NOT NULL,
    "workoutSessionId" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "muscleGroup" TEXT,
    "equipment" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "setsPlanned" INTEGER,
    "setsCompleted" INTEGER,
    "reps" INTEGER,
    "weightKg" DECIMAL(6,2),
    "durationSeconds" INTEGER,
    "distanceMeters" INTEGER,
    "notes" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutExerciseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyProgressEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "weightKg" DECIMAL(6,2),
    "waistCm" DECIMAL(6,2),
    "chestCm" DECIMAL(6,2),
    "armCm" DECIMAL(6,2),
    "bodyFatPercent" DECIMAL(5,2),
    "photoAssetId" TEXT,
    "notes" TEXT,
    "visibility" "TrackingVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyProgressEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberHabit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "category" "HabitCategory" NOT NULL,
    "targetValue" INTEGER,
    "unit" TEXT,
    "frequency" "HabitFrequency" NOT NULL DEFAULT 'DAILY',
    "visibility" "TrackingVisibility" NOT NULL DEFAULT 'PRIVATE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberHabit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberHabitLog" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberHabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "MembershipPlanType" NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "gstRateBps" INTEGER,
    "joiningFeePaise" INTEGER DEFAULT 0,
    "durationDays" INTEGER,
    "visitLimit" INTEGER,
    "validityDays" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "accessDays" JSONB,
    "maxEntriesPerDay" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "publicVisible" BOOLEAN NOT NULL DEFAULT true,
    "terms" TEXT,
    "cancellationPolicy" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberSubscription" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "memberUserId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "remainingVisits" INTEGER,
    "paymentId" TEXT,
    "couponRedemptionId" TEXT,
    "referralCodeId" TEXT,
    "activatedById" TEXT,
    "pausedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipUsage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "usedVisits" INTEGER NOT NULL DEFAULT 1,
    "usageDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipJoinRequest" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "referralCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "orgId" TEXT,
    "userId" TEXT,
    "purpose" "PaymentPurpose" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "checkoutUrl" TEXT NOT NULL,
    "providerRef" TEXT,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "purpose" "PaymentPurpose" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "provider" TEXT,
    "providerRef" TEXT,
    "receiptNumber" TEXT,
    "notes" TEXT,
    "proofAssetId" TEXT,
    "recordedById" TEXT,
    "recordedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "paymentId" TEXT,
    "status" "PaymentEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventVersion" TEXT,
    "payload" JSONB NOT NULL,
    "headers" JSONB,
    "rawPayloadHash" TEXT,
    "sourceIpAddress" TEXT,
    "signature" TEXT,
    "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
    "signatureVerifiedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "processingError" TEXT,
    "riskFlags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookAttempt" (
    "id" TEXT NOT NULL,
    "paymentEventId" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL,
    "status" "PaymentWebhookAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "processor" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "httpStatusCode" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT,
    "paymentId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "taxPaise" INTEGER NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualPaymentAdjustment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "originalPaymentId" TEXT NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualPaymentAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "valuePaise" INTEGER,
    "valuePercentBps" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "perUserLimit" INTEGER,
    "applicablePlanId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "paymentSessionId" TEXT,
    "discountPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "couponId" TEXT,
    "createdByRole" "Role" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralRedemption" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "referralCodeId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "suspicious" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceQrToken" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "signature" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "AttendanceQrToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "source" "AttendanceSource" NOT NULL DEFAULT 'QR_SCAN',
    "dateKey" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "suspiciousFlags" JSONB,
    "qrTokenId" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceOverride" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "attendanceRecordId" TEXT,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerProfile" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "specialties" JSONB,
    "availability" JSONB,
    "upiId" TEXT,
    "upiQrAssetId" TEXT,
    "visibleToMembers" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerAssignment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "trainerUserId" TEXT NOT NULL,
    "memberUserId" TEXT NOT NULL,
    "assignedById" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalTrainingPlan" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "trainerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationDays" INTEGER,
    "sessionCount" INTEGER,
    "pricePaise" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalTrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalTrainingSubscription" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "memberUserId" TEXT NOT NULL,
    "trainerUserId" TEXT NOT NULL,
    "ptPlanId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "totalSessions" INTEGER,
    "remainingSessions" INTEGER,
    "amountPaise" INTEGER NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "proofAssetId" TEXT,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalTrainingSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalTrainingSessionLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "trainerUserId" TEXT NOT NULL,
    "memberUserId" TEXT NOT NULL,
    "sessionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalTrainingSessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanContent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "type" "PlanType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL,
    "attachments" JSONB,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" TEXT NOT NULL DEFAULT 'selected',
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanVersion" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanAssignment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "audience" TEXT NOT NULL,
    "metadata" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanProgress" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "progressJson" JSONB NOT NULL,
    "completionPct" INTEGER NOT NULL DEFAULT 0,
    "feedback" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceLibraryItem" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "summary" TEXT,
    "content" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceLibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "safetyFlags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "provider" "AIProviderType" NOT NULL,
    "requestType" "AIRequestType" NOT NULL,
    "promptSummary" TEXT NOT NULL,
    "responseSummary" TEXT,
    "tokenEstimate" INTEGER NOT NULL DEFAULT 0,
    "costEstimatePaise" INTEGER NOT NULL DEFAULT 0,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "safetyFlags" JSONB,
    "quotaConsumed" INTEGER NOT NULL DEFAULT 1,
    "createdPlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIQuota" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT,
    "role" "Role",
    "textDailyLimit" INTEGER NOT NULL,
    "textMonthLimit" INTEGER NOT NULL,
    "imageMonthLimit" INTEGER NOT NULL DEFAULT 0,
    "usedTextDaily" INTEGER NOT NULL DEFAULT 0,
    "usedTextMonth" INTEGER NOT NULL DEFAULT 0,
    "usedImagesMonth" INTEGER NOT NULL DEFAULT 0,
    "resetDailyAt" TIMESTAMP(3) NOT NULL,
    "resetMonthAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "createdById" TEXT,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "deliveryStatus" TEXT NOT NULL DEFAULT 'in_app',
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "type" "NotificationType" NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationPreference" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "transactional" BOOLEAN NOT NULL DEFAULT true,
    "operational" BOOLEAN NOT NULL DEFAULT true,
    "promotional" BOOLEAN NOT NULL DEFAULT true,
    "engagement" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushDevice" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "platform" "PushPlatform" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'expo',
    "token" TEXT NOT NULL,
    "status" "PushDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "deviceLabel" TEXT,
    "deviceFingerprint" TEXT,
    "appVersion" TEXT,
    "osVersion" TEXT,
    "locale" TEXT,
    "timezone" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastRegisteredAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushDelivery" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "notificationId" TEXT,
    "notificationRecipientId" TEXT,
    "userId" TEXT,
    "deviceId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'expo',
    "providerMessageId" TEXT,
    "status" "PushDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureReason" TEXT,
    "payload" JSONB,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGoal" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetValue" INTEGER,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitChecklist" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HabitChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitCompletion" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "completedItems" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "optInOnly" BOOLEAN NOT NULL DEFAULT true,
    "leaderboardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeParticipant" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visibleOnLeaderboard" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChallengeParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeProgress" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ProductCategory" NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "taxRateBps" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "orderId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrder" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentSessionId" TEXT,
    "paymentId" TEXT,
    "totalPaise" INTEGER NOT NULL,
    "pickupCode" TEXT,
    "fulfilledById" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrderItem" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPaise" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupCode" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'READY_FOR_PICKUP',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),

    CONSTRAINT "PickupCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationAbuseFlag" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "OrganizationAbuseFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "reportedById" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "provider" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "detectionSource" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolutionSummary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderHealthCheck" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "providerType" "ProviderHealthDomain" NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "ProviderHealthCheckStatus" NOT NULL DEFAULT 'UNKNOWN',
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latencyMs" INTEGER,
    "statusCode" INTEGER,
    "errorCode" TEXT,
    "message" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderHealthCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isPlatformAdmin_idx" ON "User"("isPlatformAdmin");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_email_purpose_idx" ON "OtpChallenge"("email", "purpose");

-- CreateIndex
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "FileAsset_orgId_idx" ON "FileAsset"("orgId");

-- CreateIndex
CREATE INDEX "FileAsset_ownerUserId_idx" ON "FileAsset"("ownerUserId");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_riskLevel_createdAt_idx" ON "AuditLog"("riskLevel", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_username_key" ON "Organization"("username");

-- CreateIndex
CREATE INDEX "Organization_city_idx" ON "Organization"("city");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "Organization_visibility_idx" ON "Organization"("visibility");

-- CreateIndex
CREATE INDEX "Organization_latitude_longitude_idx" ON "Organization"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUsernameHistory_oldUsername_key" ON "OrganizationUsernameHistory"("oldUsername");

-- CreateIndex
CREATE INDEX "OrganizationUsernameHistory_orgId_idx" ON "OrganizationUsernameHistory"("orgId");

-- CreateIndex
CREATE INDEX "Branch_orgId_idx" ON "Branch"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_orgId_name_key" ON "Branch"("orgId", "name");

-- CreateIndex
CREATE INDEX "OrganizationUser_userId_idx" ON "OrganizationUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUser_orgId_userId_key" ON "OrganizationUser"("orgId", "userId");

-- CreateIndex
CREATE INDEX "OrganizationRoleAssignment_orgId_role_idx" ON "OrganizationRoleAssignment"("orgId", "role");

-- CreateIndex
CREATE INDEX "OrganizationRoleAssignment_userId_idx" ON "OrganizationRoleAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRoleAssignment_orgId_userId_role_key" ON "OrganizationRoleAssignment"("orgId", "userId", "role");

-- CreateIndex
CREATE INDEX "OrganizationRolePermission_orgId_idx" ON "OrganizationRolePermission"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRolePermission_orgId_role_permission_key" ON "OrganizationRolePermission"("orgId", "role", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvitation_token_key" ON "StaffInvitation"("token");

-- CreateIndex
CREATE INDEX "StaffInvitation_orgId_email_idx" ON "StaffInvitation"("orgId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "SaaSSubscription_orgId_key" ON "SaaSSubscription"("orgId");

-- CreateIndex
CREATE INDEX "SaaSSubscription_status_idx" ON "SaaSSubscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSetting_orgId_key" ON "OrganizationSetting"("orgId");

-- CreateIndex
CREATE INDEX "MemberProfile_orgId_idx" ON "MemberProfile"("orgId");

-- CreateIndex
CREATE INDEX "MemberProfile_userId_idx" ON "MemberProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberProfile_orgId_userId_key" ON "MemberProfile"("orgId", "userId");

-- CreateIndex
CREATE INDEX "GuardianConsent_minorUserId_idx" ON "GuardianConsent"("minorUserId");

-- CreateIndex
CREATE INDEX "GuardianConsent_guardianEmail_idx" ON "GuardianConsent"("guardianEmail");

-- CreateIndex
CREATE INDEX "GuardianConsentChallenge_guardianConsentId_status_idx" ON "GuardianConsentChallenge"("guardianConsentId", "status");

-- CreateIndex
CREATE INDEX "GuardianConsentChallenge_minorUserId_status_idx" ON "GuardianConsentChallenge"("minorUserId", "status");

-- CreateIndex
CREATE INDEX "ConsentRecord_orgId_idx" ON "ConsentRecord"("orgId");

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_type_idx" ON "ConsentRecord"("userId", "type");

-- CreateIndex
CREATE INDEX "DataExportRequest_userId_status_idx" ON "DataExportRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "DataExportRequest_orgId_status_idx" ON "DataExportRequest"("orgId", "status");

-- CreateIndex
CREATE INDEX "DataExportJob_requestId_status_idx" ON "DataExportJob"("requestId", "status");

-- CreateIndex
CREATE INDEX "DataExportJob_userId_status_createdAt_idx" ON "DataExportJob"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DataExportJob_orgId_status_createdAt_idx" ON "DataExportJob"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_userId_status_idx" ON "AccountDeletionRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_orgId_status_idx" ON "AccountDeletionRequest"("orgId", "status");

-- CreateIndex
CREATE INDEX "AccountDeletionJob_requestId_status_idx" ON "AccountDeletionJob"("requestId", "status");

-- CreateIndex
CREATE INDEX "AccountDeletionJob_userId_status_createdAt_idx" ON "AccountDeletionJob"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AccountDeletionJob_orgId_status_createdAt_idx" ON "AccountDeletionJob"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_startedAt_idx" ON "WorkoutSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "WorkoutSession_organizationId_userId_idx" ON "WorkoutSession"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "WorkoutExerciseEntry_workoutSessionId_orderIndex_idx" ON "WorkoutExerciseEntry"("workoutSessionId", "orderIndex");

-- CreateIndex
CREATE INDEX "BodyProgressEntry_userId_measuredAt_idx" ON "BodyProgressEntry"("userId", "measuredAt");

-- CreateIndex
CREATE INDEX "BodyProgressEntry_organizationId_userId_idx" ON "BodyProgressEntry"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "MemberHabit_userId_active_idx" ON "MemberHabit"("userId", "active");

-- CreateIndex
CREATE INDEX "MemberHabit_organizationId_userId_idx" ON "MemberHabit"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "MemberHabitLog_habitId_loggedAt_idx" ON "MemberHabitLog"("habitId", "loggedAt");

-- CreateIndex
CREATE INDEX "MembershipPlan_orgId_active_idx" ON "MembershipPlan"("orgId", "active");

-- CreateIndex
CREATE INDEX "MembershipPlan_orgId_publicVisible_idx" ON "MembershipPlan"("orgId", "publicVisible");

-- CreateIndex
CREATE INDEX "MemberSubscription_orgId_memberUserId_status_idx" ON "MemberSubscription"("orgId", "memberUserId", "status");

-- CreateIndex
CREATE INDEX "MemberSubscription_orgId_planId_idx" ON "MemberSubscription"("orgId", "planId");

-- CreateIndex
CREATE INDEX "MemberSubscription_endsAt_idx" ON "MemberSubscription"("endsAt");

-- CreateIndex
CREATE INDEX "MembershipUsage_orgId_subscriptionId_idx" ON "MembershipUsage"("orgId", "subscriptionId");

-- CreateIndex
CREATE INDEX "MembershipJoinRequest_orgId_status_idx" ON "MembershipJoinRequest"("orgId", "status");

-- CreateIndex
CREATE INDEX "MembershipJoinRequest_userId_idx" ON "MembershipJoinRequest"("userId");

-- CreateIndex
CREATE INDEX "PaymentSession_orgId_status_idx" ON "PaymentSession"("orgId", "status");

-- CreateIndex
CREATE INDEX "PaymentSession_userId_status_idx" ON "PaymentSession"("userId", "status");

-- CreateIndex
CREATE INDEX "PaymentSession_status_idx" ON "PaymentSession"("status");

-- CreateIndex
CREATE INDEX "Payment_orgId_status_idx" ON "Payment"("orgId", "status");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_sessionId_idx" ON "Payment"("sessionId");

-- CreateIndex
CREATE INDEX "PaymentEvent_paymentId_createdAt_idx" ON "PaymentEvent"("paymentId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_provider_status_createdAt_idx" ON "PaymentEvent"("provider", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_orgId_status_createdAt_idx" ON "PaymentEvent"("orgId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_provider_providerEventId_key" ON "PaymentEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookAttempt_paymentEventId_startedAt_idx" ON "PaymentWebhookAttempt"("paymentEventId", "startedAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookAttempt_status_createdAt_idx" ON "PaymentWebhookAttempt"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookAttempt_paymentEventId_attemptNo_key" ON "PaymentWebhookAttempt"("paymentEventId", "attemptNo");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");

-- CreateIndex
CREATE INDEX "Invoice_orgId_idx" ON "Invoice"("orgId");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "ManualPaymentAdjustment_orgId_originalPaymentId_idx" ON "ManualPaymentAdjustment"("orgId", "originalPaymentId");

-- CreateIndex
CREATE INDEX "Coupon_orgId_active_idx" ON "Coupon"("orgId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_orgId_code_key" ON "Coupon"("orgId", "code");

-- CreateIndex
CREATE INDEX "CouponRedemption_orgId_couponId_idx" ON "CouponRedemption"("orgId", "couponId");

-- CreateIndex
CREATE INDEX "CouponRedemption_orgId_userId_idx" ON "CouponRedemption"("orgId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralCode_orgId_idx" ON "ReferralCode"("orgId");

-- CreateIndex
CREATE INDEX "ReferralCode_referrerUserId_idx" ON "ReferralCode"("referrerUserId");

-- CreateIndex
CREATE INDEX "ReferralRedemption_orgId_referredUserId_idx" ON "ReferralRedemption"("orgId", "referredUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralRedemption_orgId_referralCodeId_referredUserId_key" ON "ReferralRedemption"("orgId", "referralCodeId", "referredUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceQrToken_nonce_key" ON "AttendanceQrToken"("nonce");

-- CreateIndex
CREATE INDEX "AttendanceQrToken_orgId_branchId_expiresAt_idx" ON "AttendanceQrToken"("orgId", "branchId", "expiresAt");

-- CreateIndex
CREATE INDEX "AttendanceRecord_orgId_status_checkedInAt_idx" ON "AttendanceRecord"("orgId", "status", "checkedInAt");

-- CreateIndex
CREATE INDEX "AttendanceRecord_userId_checkedInAt_idx" ON "AttendanceRecord"("userId", "checkedInAt");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_orgId_branchId_userId_dateKey_key" ON "AttendanceRecord"("orgId", "branchId", "userId", "dateKey");

-- CreateIndex
CREATE INDEX "AttendanceOverride_orgId_userId_idx" ON "AttendanceOverride"("orgId", "userId");

-- CreateIndex
CREATE INDEX "TrainerProfile_orgId_idx" ON "TrainerProfile"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerProfile_orgId_userId_key" ON "TrainerProfile"("orgId", "userId");

-- CreateIndex
CREATE INDEX "TrainerAssignment_orgId_trainerUserId_idx" ON "TrainerAssignment"("orgId", "trainerUserId");

-- CreateIndex
CREATE INDEX "TrainerAssignment_orgId_memberUserId_idx" ON "TrainerAssignment"("orgId", "memberUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerAssignment_orgId_trainerUserId_memberUserId_key" ON "TrainerAssignment"("orgId", "trainerUserId", "memberUserId");

-- CreateIndex
CREATE INDEX "PersonalTrainingPlan_orgId_trainerUserId_idx" ON "PersonalTrainingPlan"("orgId", "trainerUserId");

-- CreateIndex
CREATE INDEX "PersonalTrainingSubscription_orgId_trainerUserId_status_idx" ON "PersonalTrainingSubscription"("orgId", "trainerUserId", "status");

-- CreateIndex
CREATE INDEX "PersonalTrainingSubscription_orgId_memberUserId_idx" ON "PersonalTrainingSubscription"("orgId", "memberUserId");

-- CreateIndex
CREATE INDEX "PersonalTrainingSessionLog_orgId_subscriptionId_idx" ON "PersonalTrainingSessionLog"("orgId", "subscriptionId");

-- CreateIndex
CREATE INDEX "PlanContent_orgId_status_idx" ON "PlanContent"("orgId", "status");

-- CreateIndex
CREATE INDEX "PlanContent_creatorUserId_idx" ON "PlanContent"("creatorUserId");

-- CreateIndex
CREATE INDEX "PlanVersion_orgId_planId_idx" ON "PlanVersion"("orgId", "planId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanVersion_planId_versionNo_key" ON "PlanVersion"("planId", "versionNo");

-- CreateIndex
CREATE INDEX "PlanAssignment_orgId_assignedToUserId_idx" ON "PlanAssignment"("orgId", "assignedToUserId");

-- CreateIndex
CREATE INDEX "PlanAssignment_orgId_planId_idx" ON "PlanAssignment"("orgId", "planId");

-- CreateIndex
CREATE INDEX "PlanProgress_orgId_userId_idx" ON "PlanProgress"("orgId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanProgress_assignmentId_userId_key" ON "PlanProgress"("assignmentId", "userId");

-- CreateIndex
CREATE INDEX "ResourceLibraryItem_orgId_approved_idx" ON "ResourceLibraryItem"("orgId", "approved");

-- CreateIndex
CREATE INDEX "AIConversation_orgId_userId_idx" ON "AIConversation"("orgId", "userId");

-- CreateIndex
CREATE INDEX "AIMessage_conversationId_createdAt_idx" ON "AIMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AIUsageLog_orgId_createdAt_idx" ON "AIUsageLog"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AIUsageLog_userId_createdAt_idx" ON "AIUsageLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AIQuota_orgId_idx" ON "AIQuota"("orgId");

-- CreateIndex
CREATE INDEX "AIQuota_userId_idx" ON "AIQuota"("userId");

-- CreateIndex
CREATE INDEX "Notification_orgId_status_idx" ON "Notification"("orgId", "status");

-- CreateIndex
CREATE INDEX "NotificationRecipient_userId_readAt_idx" ON "NotificationRecipient"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_userId_key" ON "NotificationRecipient"("notificationId", "userId");

-- CreateIndex
CREATE INDEX "NotificationTemplate_orgId_active_idx" ON "NotificationTemplate"("orgId", "active");

-- CreateIndex
CREATE INDEX "UserNotificationPreference_userId_idx" ON "UserNotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreference_orgId_userId_key" ON "UserNotificationPreference"("orgId", "userId");

-- CreateIndex
CREATE INDEX "PushDevice_orgId_userId_idx" ON "PushDevice"("orgId", "userId");

-- CreateIndex
CREATE INDEX "PushDevice_userId_status_idx" ON "PushDevice"("userId", "status");

-- CreateIndex
CREATE INDEX "PushDevice_status_updatedAt_idx" ON "PushDevice"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushDevice_provider_token_key" ON "PushDevice"("provider", "token");

-- CreateIndex
CREATE INDEX "PushDelivery_notificationId_status_idx" ON "PushDelivery"("notificationId", "status");

-- CreateIndex
CREATE INDEX "PushDelivery_deviceId_status_createdAt_idx" ON "PushDelivery"("deviceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PushDelivery_userId_status_createdAt_idx" ON "PushDelivery"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "UserGoal_orgId_userId_idx" ON "UserGoal"("orgId", "userId");

-- CreateIndex
CREATE INDEX "HabitChecklist_userId_idx" ON "HabitChecklist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HabitCompletion_habitId_userId_dateKey_key" ON "HabitCompletion"("habitId", "userId", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_code_key" ON "Badge"("code");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_orgId_userId_badgeId_key" ON "UserBadge"("orgId", "userId", "badgeId");

-- CreateIndex
CREATE INDEX "Challenge_orgId_active_idx" ON "Challenge"("orgId", "active");

-- CreateIndex
CREATE INDEX "ChallengeParticipant_orgId_userId_idx" ON "ChallengeParticipant"("orgId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeParticipant_challengeId_userId_key" ON "ChallengeParticipant"("challengeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeProgress_challengeId_userId_key" ON "ChallengeProgress"("challengeId", "userId");

-- CreateIndex
CREATE INDEX "Product_orgId_active_idx" ON "Product"("orgId", "active");

-- CreateIndex
CREATE INDEX "InventoryMovement_orgId_productId_idx" ON "InventoryMovement"("orgId", "productId");

-- CreateIndex
CREATE INDEX "ShopOrder_orgId_status_idx" ON "ShopOrder"("orgId", "status");

-- CreateIndex
CREATE INDEX "ShopOrder_userId_status_idx" ON "ShopOrder"("userId", "status");

-- CreateIndex
CREATE INDEX "ShopOrderItem_orgId_orderId_idx" ON "ShopOrderItem"("orgId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PickupCode_orderId_key" ON "PickupCode"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PickupCode_code_key" ON "PickupCode"("code");

-- CreateIndex
CREATE INDEX "PickupCode_orgId_status_idx" ON "PickupCode"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");

-- CreateIndex
CREATE INDEX "OrganizationAbuseFlag_orgId_status_idx" ON "OrganizationAbuseFlag"("orgId", "status");

-- CreateIndex
CREATE INDEX "IncidentLog_orgId_status_severity_idx" ON "IncidentLog"("orgId", "status", "severity");

-- CreateIndex
CREATE INDEX "IncidentLog_provider_status_createdAt_idx" ON "IncidentLog"("provider", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderHealthCheck_providerType_provider_checkedAt_idx" ON "ProviderHealthCheck"("providerType", "provider", "checkedAt");

-- CreateIndex
CREATE INDEX "ProviderHealthCheck_status_checkedAt_idx" ON "ProviderHealthCheck"("status", "checkedAt");

