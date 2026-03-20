CREATE TYPE "public"."activity_type" AS ENUM('portal_login', 'drill_view', 'assignment_view', 'drill_start', 'drill_complete', 'video_submit', 'message_sent', 'profile_update');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('assigned', 'in-progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."bats" AS ENUM('L', 'R', 'S');--> statement-breakpoint
CREATE TYPE "public"."block_type" AS ENUM('drill', 'warmup', 'cooldown', 'break', 'custom');--> statement-breakpoint
CREATE TYPE "public"."intensity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."invite_role" AS ENUM('user', 'admin', 'athlete', 'coach');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('sent', 'delivered', 'read');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('submission', 'feedback', 'badge', 'assignment', 'system');--> statement-breakpoint
CREATE TYPE "public"."practice_plan_status" AS ENUM('draft', 'scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."quiz_difficulty" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."quiz_type" AS ENUM('standard', 'adaptive');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('draft', 'reviewed', 'sent');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin', 'athlete', 'coach');--> statement-breakpoint
CREATE TYPE "public"."throws" AS ENUM('L', 'R');--> statement-breakpoint
CREATE TYPE "public"."video_analysis_status" AS ENUM('pending', 'analyzing', 'complete', 'failed');--> statement-breakpoint
CREATE TABLE "assignmentProgress" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignmentId" integer NOT NULL,
	"userId" integer NOT NULL,
	"repsCompleted" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"recordedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athleteActivity" (
	"id" serial PRIMARY KEY NOT NULL,
	"athleteId" integer NOT NULL,
	"athleteName" varchar(255),
	"activityType" "activity_type" NOT NULL,
	"relatedId" varchar(255),
	"relatedType" varchar(50),
	"metadata" json,
	"ipAddress" varchar(45),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athleteProfiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"birthDate" timestamp,
	"position" varchar(50),
	"secondaryPosition" varchar(50),
	"bats" "bats",
	"throws" "throws",
	"teamName" varchar(255),
	"focusAreas" json,
	"gradYear" integer,
	"height" varchar(20),
	"weight" varchar(20),
	"school" varchar(255),
	"gpa" varchar(10),
	"commitmentStatus" varchar(100),
	"committedTo" varchar(255),
	"profileImageUrl" text,
	"bio" text,
	"goals" text,
	"parentName" varchar(255),
	"parentEmail" varchar(320),
	"parentPhone" varchar(30),
	"emergencyContact" varchar(255),
	"emergencyPhone" varchar(30),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "athleteProfiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"badgeType" varchar(100) NOT NULL,
	"badgeName" varchar(255) NOT NULL,
	"badgeDescription" text,
	"badgeIcon" varchar(50),
	"earnedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blastMetrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" varchar(36) NOT NULL,
	"batSpeedMph" varchar(10),
	"onPlaneEfficiencyPercent" varchar(10),
	"attackAngleDeg" varchar(10),
	"exitVelocityMph" varchar(10)
);
--> statement-breakpoint
CREATE TABLE "blastPlayers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"fullName" varchar(255) NOT NULL,
	"userId" integer,
	"blastEmail" varchar(320),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blastSessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"playerId" varchar(36) NOT NULL,
	"sessionDate" timestamp NOT NULL,
	"sessionType" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coachAlertPreferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"coachId" integer NOT NULL,
	"alertOnPortalLogin" integer DEFAULT 1 NOT NULL,
	"alertOnDrillView" integer DEFAULT 1 NOT NULL,
	"alertOnAssignmentView" integer DEFAULT 1 NOT NULL,
	"alertOnDrillStart" integer DEFAULT 1 NOT NULL,
	"alertOnDrillComplete" integer DEFAULT 1 NOT NULL,
	"alertOnVideoSubmit" integer DEFAULT 1 NOT NULL,
	"alertOnMessageSent" integer DEFAULT 1 NOT NULL,
	"alertOnInactivity" integer DEFAULT 1 NOT NULL,
	"inactivityDays" integer DEFAULT 3 NOT NULL,
	"inAppAlerts" integer DEFAULT 1 NOT NULL,
	"emailAlerts" integer DEFAULT 1 NOT NULL,
	"emailDigest" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coachAlertPreferences_coachId_unique" UNIQUE("coachId")
);
--> statement-breakpoint
CREATE TABLE "coachFeedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"submissionId" integer NOT NULL,
	"coachId" integer NOT NULL,
	"userId" integer NOT NULL,
	"drillId" varchar(255) NOT NULL,
	"feedback" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coachNotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"athleteId" integer NOT NULL,
	"coachId" integer NOT NULL,
	"note" text NOT NULL,
	"meetingDate" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customDrills" (
	"id" serial PRIMARY KEY NOT NULL,
	"drillId" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"difficulty" varchar(50) NOT NULL,
	"category" varchar(100) NOT NULL,
	"duration" varchar(50) NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customDrills_drillId_unique" UNIQUE("drillId")
);
--> statement-breakpoint
CREATE TABLE "drillAnswers" (
	"id" serial PRIMARY KEY NOT NULL,
	"questionId" integer NOT NULL,
	"coachId" integer NOT NULL,
	"answer" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drillAssignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"inviteId" integer,
	"drillId" varchar(255) NOT NULL,
	"drillName" varchar(255) NOT NULL,
	"status" "assignment_status" DEFAULT 'assigned' NOT NULL,
	"notes" text,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drillCustomizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"drillId" varchar(255) NOT NULL,
	"thumbnailUrl" text,
	"imageBase64" text,
	"imageMimeType" varchar(50),
	"briefDescription" text,
	"difficulty" varchar(50),
	"category" varchar(100),
	"updatedBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drillCustomizations_drillId_unique" UNIQUE("drillId")
);
--> statement-breakpoint
CREATE TABLE "drillDetails" (
	"id" serial PRIMARY KEY NOT NULL,
	"drillId" varchar(255) NOT NULL,
	"skillSet" varchar(255) NOT NULL,
	"difficulty" varchar(50) NOT NULL,
	"athletes" varchar(255) NOT NULL,
	"time" varchar(50) NOT NULL,
	"equipment" varchar(255) NOT NULL,
	"goal" text NOT NULL,
	"description" json NOT NULL,
	"commonMistakes" json,
	"progressions" json,
	"instructions" text,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drillDetails_drillId_unique" UNIQUE("drillId")
);
--> statement-breakpoint
CREATE TABLE "drillFavorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"drillId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drillPageLayouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"drillId" varchar(255) NOT NULL,
	"blocks" json NOT NULL,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drillPageLayouts_drillId_unique" UNIQUE("drillId")
);
--> statement-breakpoint
CREATE TABLE "drillPageTemplates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"blocks" json NOT NULL,
	"createdBy" integer NOT NULL,
	"isSystem" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drillQuestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"athleteId" integer NOT NULL,
	"drillId" varchar(255) NOT NULL,
	"question" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drillStatCards" (
	"id" serial PRIMARY KEY NOT NULL,
	"drillId" varchar(128) NOT NULL,
	"label" varchar(128) NOT NULL,
	"value" varchar(512) DEFAULT '' NOT NULL,
	"icon" varchar(64) DEFAULT 'info',
	"position" integer DEFAULT 0 NOT NULL,
	"isVisible" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drillSubmissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignmentId" integer NOT NULL,
	"userId" integer NOT NULL,
	"drillId" varchar(255) NOT NULL,
	"notes" text,
	"videoUrl" text,
	"submittedAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drillVideos" (
	"id" serial PRIMARY KEY NOT NULL,
	"drillId" varchar(255) NOT NULL,
	"videoUrl" text NOT NULL,
	"uploadedBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drillVideos_drillId_unique" UNIQUE("drillId")
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"inviteToken" varchar(255) NOT NULL,
	"role" "invite_role" DEFAULT 'user' NOT NULL,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"acceptedAt" timestamp,
	"acceptedByUserId" integer,
	"reminderSent" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdByUserId" integer NOT NULL,
	CONSTRAINT "invites_inviteToken_unique" UNIQUE("inviteToken")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"senderId" integer NOT NULL,
	"recipientId" integer NOT NULL,
	"content" text NOT NULL,
	"status" "message_status" DEFAULT 'sent' NOT NULL,
	"parentMessageId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificationPreferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"submissionNotifications" integer DEFAULT 1 NOT NULL,
	"feedbackNotifications" integer DEFAULT 1 NOT NULL,
	"badgeNotifications" integer DEFAULT 1 NOT NULL,
	"assignmentNotifications" integer DEFAULT 1 NOT NULL,
	"systemNotifications" integer DEFAULT 1 NOT NULL,
	"emailNotifications" integer DEFAULT 1 NOT NULL,
	"inAppNotifications" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notificationPreferences_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"relatedId" integer,
	"relatedType" varchar(50),
	"isRead" integer DEFAULT 0 NOT NULL,
	"actionUrl" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"readAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "pendingEmailAlerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"coachId" integer NOT NULL,
	"athleteId" integer NOT NULL,
	"athleteName" varchar(255),
	"activityType" varchar(50) NOT NULL,
	"activityMessage" text NOT NULL,
	"actionUrl" varchar(500),
	"metadata" json,
	"batchKey" varchar(100) NOT NULL,
	"scheduledSendAt" timestamp NOT NULL,
	"isSent" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practicePlanBlocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"planId" integer NOT NULL,
	"sortOrder" integer NOT NULL,
	"blockType" "block_type" NOT NULL,
	"drillId" varchar(255),
	"title" varchar(255) NOT NULL,
	"duration" integer NOT NULL,
	"sets" integer,
	"reps" integer,
	"notes" text,
	"coachingCues" text,
	"keyPoints" text,
	"equipment" varchar(500),
	"intensity" "intensity",
	"goal" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practicePlans" (
	"id" serial PRIMARY KEY NOT NULL,
	"coachId" integer NOT NULL,
	"athleteId" integer,
	"inviteId" integer,
	"title" varchar(255) NOT NULL,
	"sessionDate" timestamp,
	"duration" integer NOT NULL,
	"sessionNotes" text,
	"focusAreas" json,
	"status" "practice_plan_status" DEFAULT 'draft' NOT NULL,
	"isShared" integer DEFAULT 0 NOT NULL,
	"isTemplate" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progressReports" (
	"id" serial PRIMARY KEY NOT NULL,
	"coachId" integer NOT NULL,
	"athleteId" integer NOT NULL,
	"sessionNoteId" integer,
	"title" varchar(500) NOT NULL,
	"reportContent" json NOT NULL,
	"reportHtml" text,
	"status" "report_status" DEFAULT 'draft' NOT NULL,
	"sentAt" timestamp,
	"sentToEmail" varchar(320),
	"sentToName" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizAttempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"score" integer NOT NULL,
	"totalQuestions" integer NOT NULL,
	"percentage" integer NOT NULL,
	"quizType" "quiz_type" DEFAULT 'standard' NOT NULL,
	"targetCategory" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizQuestionResults" (
	"id" serial PRIMARY KEY NOT NULL,
	"attemptId" integer NOT NULL,
	"userId" integer NOT NULL,
	"questionId" integer NOT NULL,
	"selectedAnswerIndex" integer NOT NULL,
	"isCorrect" integer NOT NULL,
	"category" varchar(100) NOT NULL,
	"subcategory" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizQuestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario" text NOT NULL,
	"answers" json NOT NULL,
	"correctIndex" integer NOT NULL,
	"explanation" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"subcategory" varchar(100),
	"difficulty" "quiz_difficulty" DEFAULT 'intermediate' NOT NULL,
	"isAiGenerated" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessionNotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"coachId" integer NOT NULL,
	"athleteId" integer NOT NULL,
	"sessionNumber" integer NOT NULL,
	"sessionLabel" varchar(200),
	"sessionDate" timestamp NOT NULL,
	"duration" integer,
	"skillsWorked" json NOT NULL,
	"whatImproved" text NOT NULL,
	"whatNeedsWork" text NOT NULL,
	"homeworkDrills" json,
	"overallRating" integer,
	"privateNotes" text,
	"practicePlanId" integer,
	"blastSessionId" varchar(36),
	"sharedWithAthlete" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siteContent" (
	"id" serial PRIMARY KEY NOT NULL,
	"contentKey" varchar(500) NOT NULL,
	"value" text NOT NULL,
	"updatedBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "siteContent_contentKey_unique" UNIQUE("contentKey")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"passwordHash" text,
	"name" text,
	"loginMethod" varchar(64) DEFAULT 'email',
	"role" "role" DEFAULT 'user' NOT NULL,
	"isActiveClient" integer DEFAULT 0 NOT NULL,
	"emailVerified" integer DEFAULT 0 NOT NULL,
	"emailVerificationToken" varchar(255),
	"sentWelcomeEmail" integer DEFAULT 0 NOT NULL,
	"parentId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "videoAnalysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"athleteId" integer NOT NULL,
	"coachId" integer,
	"videoUrl" text NOT NULL,
	"thumbnailUrl" text,
	"title" varchar(255),
	"analysisType" varchar(100),
	"status" "video_analysis_status" DEFAULT 'pending' NOT NULL,
	"aiAnalysis" text,
	"coachFeedbackText" text,
	"analyzedAt" timestamp,
	"reviewedAt" timestamp,
	"approvedAt" timestamp,
	"sentAt" timestamp,
	"sentToEmail" varchar(320),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weeklyGoals" (
	"id" serial PRIMARY KEY NOT NULL,
	"athleteId" integer NOT NULL,
	"coachId" integer NOT NULL,
	"weekStartDate" timestamp NOT NULL,
	"weekEndDate" timestamp NOT NULL,
	"targetDrillCount" integer NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
