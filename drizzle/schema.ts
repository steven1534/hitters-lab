import { boolean, integer, json, text, pgEnum, pgTable, varchar, timestamp, serial } from "drizzle-orm/pg-core";

// ============================================================
// Enums
// ============================================================
export const roleEnum = pgEnum("role", ["user", "admin", "athlete", "coach", "parent"]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["assigned", "in-progress", "completed"]);
export const inviteRoleEnum = pgEnum("invite_role", ["user", "admin", "athlete", "coach"]);
export const inviteStatusEnum = pgEnum("invite_status", ["pending", "accepted", "expired"]);
export const notificationTypeEnum = pgEnum("notification_type", ["submission", "feedback", "badge", "assignment", "system"]);
export const activityTypeEnum = pgEnum("activity_type", ["portal_login", "drill_view", "assignment_view", "drill_start", "drill_complete", "video_submit", "message_sent", "profile_update"]);
export const blockTypeEnum = pgEnum("block_type", ["drill", "warmup", "cooldown", "break", "custom"]);
export const intensityEnum = pgEnum("intensity", ["low", "medium", "high"]);
export const practicePlanStatusEnum = pgEnum("practice_plan_status", ["draft", "scheduled", "completed", "cancelled"]);
export const reportStatusEnum = pgEnum("report_status", ["draft", "reviewed", "sent"]);
export const batsEnum = pgEnum("bats", ["L", "R", "S"]);
export const throwsEnum = pgEnum("throws", ["L", "R"]);
export const quizDifficultyEnum = pgEnum("quiz_difficulty", ["beginner", "intermediate", "advanced"]);
export const quizTypeEnum = pgEnum("quiz_type", ["standard", "adaptive"]);
export const videoAnalysisStatusEnum = pgEnum("video_analysis_status", ["pending", "analyzing", "complete", "failed"]);
export const messageStatusEnum = pgEnum("message_status", ["sent", "delivered", "read"]);

// ============================================================
// Users
// ============================================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  /** Email used as primary auth identifier (replaces Manus openId) */
  email: varchar("email", { length: 320 }).notNull().unique(),
  /** Hashed password */
  passwordHash: text("password"),
  name: text("name"),
  loginMethod: varchar("loginMethod", { length: 64 }).default("email"),
  role: roleEnum("role").default("user").notNull(),
  isActiveClient: integer("isActiveClient").default(0).notNull(),
  emailVerified: integer("emailVerified").default(0).notNull(),
  emailVerificationToken: varchar("emailVerificationToken", { length: 255 }),
  sentWelcomeEmail: integer("sentWelcomeEmail").default(0).notNull(),
  parentId: integer("parentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// Drill Assignments
// ============================================================
export const drillAssignments = pgTable("drillAssignments", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  inviteId: integer("inviteId"),
  drillId: varchar("drillId", { length: 255 }).notNull(),
  drillName: varchar("drillName", { length: 255 }).notNull(),
  status: assignmentStatusEnum("status").default("assigned").notNull(),
  notes: text("notes"),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DrillAssignment = typeof drillAssignments.$inferSelect;
export type InsertDrillAssignment = typeof drillAssignments.$inferInsert;

// ============================================================
// Assignment Progress
// ============================================================
export const assignmentProgress = pgTable("assignmentProgress", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignmentId").notNull(),
  userId: integer("userId").notNull(),
  repsCompleted: integer("repsCompleted").default(0).notNull(),
  notes: text("notes"),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type AssignmentProgress = typeof assignmentProgress.$inferSelect;
export type InsertAssignmentProgress = typeof assignmentProgress.$inferInsert;

// ============================================================
// Invites
// ============================================================
export const invites = pgTable("invites", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }).notNull(),
  inviteToken: varchar("inviteToken", { length: 255 }).notNull().unique(),
  role: inviteRoleEnum("role").default("user").notNull(),
  status: inviteStatusEnum("status").default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  acceptedByUserId: integer("acceptedByUserId"),
  reminderSent: integer("reminderSent").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  createdByUserId: integer("createdByUserId").notNull(),
});

export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;

// ============================================================
// Drill Videos
// ============================================================
export const drillVideos = pgTable("drillVideos", {
  id: serial("id").primaryKey(),
  drillId: varchar("drillId", { length: 255 }).notNull().unique(),
  videoUrl: text("videoUrl").notNull(),
  uploadedBy: integer("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DrillVideo = typeof drillVideos.$inferSelect;
export type InsertDrillVideo = typeof drillVideos.$inferInsert;

// ============================================================
// Drill Details
// ============================================================
export const drillDetails = pgTable("drillDetails", {
  id: serial("id").primaryKey(),
  drillId: varchar("drillId", { length: 255 }).notNull().unique(),
  skillSet: varchar("skillSet", { length: 255 }).notNull(),
  difficulty: varchar("difficulty", { length: 50 }).notNull(),
  athletes: varchar("athletes", { length: 255 }).notNull(),
  time: varchar("time", { length: 50 }).notNull(),
  equipment: varchar("equipment", { length: 255 }).notNull(),
  goal: text("goal").notNull(),
  description: json("description").$type<string[]>().notNull(),
  commonMistakes: json("commonMistakes").$type<string[]>(),
  progressions: json("progressions").$type<string[]>(),
  instructions: text("instructions"),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DrillDetail = typeof drillDetails.$inferSelect;
export type InsertDrillDetail = typeof drillDetails.$inferInsert;

// ============================================================
// Badges
// ============================================================
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  badgeType: varchar("badgeType", { length: 100 }).notNull(),
  badgeName: varchar("badgeName", { length: 255 }).notNull(),
  badgeDescription: text("badgeDescription"),
  badgeIcon: varchar("badgeIcon", { length: 50 }),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = typeof badges.$inferInsert;

// ============================================================
// Drill Submissions & Coach Feedback
// ============================================================
export const drillSubmissions = pgTable("drillSubmissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignmentId").notNull(),
  userId: integer("userId").notNull(),
  drillId: varchar("drillId", { length: 255 }).notNull(),
  notes: text("notes"),
  videoUrl: text("videoUrl"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DrillSubmission = typeof drillSubmissions.$inferSelect;
export type InsertDrillSubmission = typeof drillSubmissions.$inferInsert;

export const coachFeedback = pgTable("coachFeedback", {
  id: serial("id").primaryKey(),
  submissionId: integer("submissionId").notNull(),
  coachId: integer("coachId").notNull(),
  userId: integer("userId").notNull(),
  drillId: varchar("drillId", { length: 255 }).notNull(),
  feedback: text("feedback").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CoachFeedback = typeof coachFeedback.$inferSelect;
export type InsertCoachFeedback = typeof coachFeedback.$inferInsert;

// ============================================================
// Notifications
// ============================================================
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedId: integer("relatedId"),
  relatedType: varchar("relatedType", { length: 50 }),
  isRead: integer("isRead").default(0).notNull(),
  actionUrl: varchar("actionUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const notificationPreferences = pgTable("notificationPreferences", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  submissionNotifications: integer("submissionNotifications").default(1).notNull(),
  feedbackNotifications: integer("feedbackNotifications").default(1).notNull(),
  badgeNotifications: integer("badgeNotifications").default(1).notNull(),
  assignmentNotifications: integer("assignmentNotifications").default(1).notNull(),
  systemNotifications: integer("systemNotifications").default(1).notNull(),
  emailNotifications: integer("emailNotifications").default(1).notNull(),
  inAppNotifications: integer("inAppNotifications").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

// ============================================================
// Drill Q&A
// ============================================================
export const drillQuestions = pgTable("drillQuestions", {
  id: serial("id").primaryKey(),
  athleteId: integer("athleteId").notNull(),
  drillId: varchar("drillId", { length: 255 }).notNull(),
  question: text("question").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DrillQuestion = typeof drillQuestions.$inferSelect;
export type InsertDrillQuestion = typeof drillQuestions.$inferInsert;

export const drillAnswers = pgTable("drillAnswers", {
  id: serial("id").primaryKey(),
  questionId: integer("questionId").notNull(),
  coachId: integer("coachId").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DrillAnswer = typeof drillAnswers.$inferSelect;
export type InsertDrillAnswer = typeof drillAnswers.$inferInsert;

// ============================================================
// Custom Drills & Customizations
// ============================================================
export const customDrills = pgTable("customDrills", {
  id: serial("id").primaryKey(),
  drillId: varchar("drillId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  difficulty: varchar("difficulty", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  duration: varchar("duration", { length: 50 }).notNull(),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CustomDrill = typeof customDrills.$inferSelect;
export type InsertCustomDrill = typeof customDrills.$inferInsert;

export const drillCustomizations = pgTable("drillCustomizations", {
  id: serial("id").primaryKey(),
  drillId: varchar("drillId", { length: 255 }).notNull().unique(),
  thumbnailUrl: text("thumbnailUrl"),
  imageBase64: text("imageBase64"),
  imageMimeType: varchar("imageMimeType", { length: 50 }),
  briefDescription: text("briefDescription"),
  difficulty: varchar("difficulty", { length: 50 }),
  category: varchar("category", { length: 100 }),
  updatedBy: integer("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DrillCustomization = typeof drillCustomizations.$inferSelect;
export type InsertDrillCustomization = typeof drillCustomizations.$inferInsert;

// ============================================================
// Coach Notes & Weekly Goals
// ============================================================
export const coachNotes = pgTable("coachNotes", {
  id: serial("id").primaryKey(),
  athleteId: integer("athleteId").notNull(),
  coachId: integer("coachId").notNull(),
  note: text("note").notNull(),
  meetingDate: timestamp("meetingDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CoachNote = typeof coachNotes.$inferSelect;
export type InsertCoachNote = typeof coachNotes.$inferInsert;

export const weeklyGoals = pgTable("weeklyGoals", {
  id: serial("id").primaryKey(),
  athleteId: integer("athleteId").notNull(),
  coachId: integer("coachId").notNull(),
  weekStartDate: timestamp("weekStartDate").notNull(),
  weekEndDate: timestamp("weekEndDate").notNull(),
  targetDrillCount: integer("targetDrillCount").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type WeeklyGoal = typeof weeklyGoals.$inferSelect;
export type InsertWeeklyGoal = typeof weeklyGoals.$inferInsert;

// ============================================================
// Drill Page Layouts & Templates
// ============================================================
export const drillPageLayouts = pgTable("drillPageLayouts", {
  id: serial("id").primaryKey(),
  drillId: varchar("drillId", { length: 255 }).notNull().unique(),
  blocks: json("blocks").notNull(),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DrillPageLayout = typeof drillPageLayouts.$inferSelect;
export type InsertDrillPageLayout = typeof drillPageLayouts.$inferInsert;

export const drillPageTemplates = pgTable("drillPageTemplates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  blocks: json("blocks").notNull(),
  createdBy: integer("createdBy").notNull(),
  isSystem: integer("isSystem").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DrillPageTemplate = typeof drillPageTemplates.$inferSelect;
export type InsertDrillPageTemplate = typeof drillPageTemplates.$inferInsert;

// ============================================================
// Athlete Activity Tracking
// ============================================================
export const athleteActivity = pgTable("athleteActivity", {
  id: serial("id").primaryKey(),
  athleteId: integer("athleteId").notNull(),
  athleteName: varchar("athleteName", { length: 255 }),
  activityType: activityTypeEnum("activityType").notNull(),
  relatedId: varchar("relatedId", { length: 255 }),
  relatedType: varchar("relatedType", { length: 50 }),
  metadata: json("metadata"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AthleteActivity = typeof athleteActivity.$inferSelect;
export type InsertAthleteActivity = typeof athleteActivity.$inferInsert;

export const coachAlertPreferences = pgTable("coachAlertPreferences", {
  id: serial("id").primaryKey(),
  coachId: integer("coachId").notNull().unique(),
  alertOnPortalLogin: integer("alertOnPortalLogin").default(1).notNull(),
  alertOnDrillView: integer("alertOnDrillView").default(1).notNull(),
  alertOnAssignmentView: integer("alertOnAssignmentView").default(1).notNull(),
  alertOnDrillStart: integer("alertOnDrillStart").default(1).notNull(),
  alertOnDrillComplete: integer("alertOnDrillComplete").default(1).notNull(),
  alertOnVideoSubmit: integer("alertOnVideoSubmit").default(1).notNull(),
  alertOnMessageSent: integer("alertOnMessageSent").default(1).notNull(),
  alertOnInactivity: integer("alertOnInactivity").default(1).notNull(),
  inactivityDays: integer("inactivityDays").default(3).notNull(),
  inAppAlerts: integer("inAppAlerts").default(1).notNull(),
  emailAlerts: integer("emailAlerts").default(1).notNull(),
  emailDigest: integer("emailDigest").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CoachAlertPreference = typeof coachAlertPreferences.$inferSelect;
export type InsertCoachAlertPreference = typeof coachAlertPreferences.$inferInsert;

export const pendingEmailAlerts = pgTable("pendingEmailAlerts", {
  id: serial("id").primaryKey(),
  coachId: integer("coachId").notNull(),
  athleteId: integer("athleteId").notNull(),
  athleteName: varchar("athleteName", { length: 255 }),
  activityType: varchar("activityType", { length: 50 }).notNull(),
  activityMessage: text("activityMessage").notNull(),
  actionUrl: varchar("actionUrl", { length: 500 }),
  metadata: json("metadata"),
  batchKey: varchar("batchKey", { length: 100 }).notNull(),
  scheduledSendAt: timestamp("scheduledSendAt").notNull(),
  isSent: integer("isSent").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PendingEmailAlert = typeof pendingEmailAlerts.$inferSelect;
export type InsertPendingEmailAlert = typeof pendingEmailAlerts.$inferInsert;

// ============================================================
// Drill Favorites
// ============================================================
export const drillFavorites = pgTable("drillFavorites", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  drillId: integer("drillId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DrillFavorite = typeof drillFavorites.$inferSelect;
export type InsertDrillFavorite = typeof drillFavorites.$inferInsert;

// ============================================================
// Smart Baseball Quiz
// ============================================================
export const quizQuestions = pgTable("quizQuestions", {
  id: serial("id").primaryKey(),
  scenario: text("scenario").notNull(),
  answers: json("answers").notNull(),
  correctIndex: integer("correctIndex").notNull(),
  explanation: text("explanation").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  subcategory: varchar("subcategory", { length: 100 }),
  difficulty: quizDifficultyEnum("difficulty").default("intermediate").notNull(),
  isAiGenerated: integer("isAiGenerated").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertQuizQuestion = typeof quizQuestions.$inferInsert;

export const quizAttempts = pgTable("quizAttempts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("totalQuestions").notNull(),
  percentage: integer("percentage").notNull(),
  quizType: quizTypeEnum("quizType").default("standard").notNull(),
  targetCategory: varchar("targetCategory", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = typeof quizAttempts.$inferInsert;

export const quizQuestionResults = pgTable("quizQuestionResults", {
  id: serial("id").primaryKey(),
  attemptId: integer("attemptId").notNull(),
  userId: integer("userId").notNull(),
  questionId: integer("questionId").notNull(),
  selectedAnswerIndex: integer("selectedAnswerIndex").notNull(),
  isCorrect: integer("isCorrect").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  subcategory: varchar("subcategory", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuizQuestionResult = typeof quizQuestionResults.$inferSelect;
export type InsertQuizQuestionResult = typeof quizQuestionResults.$inferInsert;

// ============================================================
// Practice Plans
// ============================================================
export const practicePlans = pgTable("practicePlans", {
  id: serial("id").primaryKey(),
  coachId: integer("coachId").notNull(),
  athleteId: integer("athleteId"),
  inviteId: integer("inviteId"),
  title: varchar("title", { length: 255 }).notNull(),
  sessionDate: timestamp("sessionDate"),
  duration: integer("duration").notNull(),
  sessionNotes: text("sessionNotes"),
  focusAreas: json("focusAreas"),
  status: practicePlanStatusEnum("status").default("draft").notNull(),
  isShared: integer("isShared").default(0).notNull(),
  isTemplate: integer("isTemplate").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PracticePlan = typeof practicePlans.$inferSelect;
export type InsertPracticePlan = typeof practicePlans.$inferInsert;

export const practicePlanBlocks = pgTable("practicePlanBlocks", {
  id: serial("id").primaryKey(),
  planId: integer("planId").notNull(),
  sortOrder: integer("sortOrder").notNull(),
  blockType: blockTypeEnum("blockType").notNull(),
  drillId: varchar("drillId", { length: 255 }),
  title: varchar("title", { length: 255 }).notNull(),
  duration: integer("duration").notNull(),
  sets: integer("sets"),
  reps: integer("reps"),
  notes: text("notes"),
  coachingCues: text("coachingCues"),
  keyPoints: text("keyPoints"),
  equipment: varchar("equipment", { length: 500 }),
  intensity: intensityEnum("intensity"),
  goal: varchar("goal", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PracticePlanBlock = typeof practicePlanBlocks.$inferSelect;
export type InsertPracticePlanBlock = typeof practicePlanBlocks.$inferInsert;

// ============================================================
// Session Notes & Progress Reports
// ============================================================
export const sessionNotes = pgTable("sessionNotes", {
  id: serial("id").primaryKey(),
  coachId: integer("coachId").notNull(),
  athleteId: integer("athleteId").notNull(),
  sessionNumber: integer("sessionNumber").notNull(),
  sessionLabel: varchar("sessionLabel", { length: 200 }),
  sessionDate: timestamp("sessionDate").notNull(),
  duration: integer("duration"),
  skillsWorked: json("skillsWorked").notNull(),
  whatImproved: text("whatImproved").notNull(),
  whatNeedsWork: text("whatNeedsWork").notNull(),
  homeworkDrills: json("homeworkDrills"),
  overallRating: integer("overallRating"),
  privateNotes: text("privateNotes"),
  practicePlanId: integer("practicePlanId"),
  blastSessionId: varchar("blastSessionId", { length: 36 }),
  sharedWithAthlete: boolean("sharedWithAthlete").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SessionNote = typeof sessionNotes.$inferSelect;
export type InsertSessionNote = typeof sessionNotes.$inferInsert;

export const progressReports = pgTable("progressReports", {
  id: serial("id").primaryKey(),
  coachId: integer("coachId").notNull(),
  athleteId: integer("athleteId").notNull(),
  sessionNoteId: integer("sessionNoteId"),
  title: varchar("title", { length: 500 }).notNull(),
  reportContent: json("reportContent").notNull(),
  reportHtml: text("reportHtml"),
  status: reportStatusEnum("status").default("draft").notNull(),
  sentAt: timestamp("sentAt"),
  sentToEmail: varchar("sentToEmail", { length: 320 }),
  sentToName: varchar("sentToName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ProgressReport = typeof progressReports.$inferSelect;
export type InsertProgressReport = typeof progressReports.$inferInsert;

// ============================================================
// Athlete Profiles
// ============================================================
export const athleteProfiles = pgTable("athleteProfiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  birthDate: timestamp("birthDate"),
  position: varchar("position", { length: 50 }),
  secondaryPosition: varchar("secondaryPosition", { length: 50 }),
  bats: batsEnum("bats"),
  throws: throwsEnum("throws"),
  teamName: varchar("teamName", { length: 255 }),
  focusAreas: json("focusAreas").$type<string[]>(),
  gradYear: integer("gradYear"),
  height: varchar("height", { length: 20 }),
  weight: varchar("weight", { length: 20 }),
  school: varchar("school", { length: 255 }),
  gpa: varchar("gpa", { length: 10 }),
  commitmentStatus: varchar("commitmentStatus", { length: 100 }),
  committedTo: varchar("committedTo", { length: 255 }),
  profileImageUrl: text("profileImageUrl"),
  bio: text("bio"),
  goals: text("goals"),
  coachProfileNotes: text("coachProfileNotes"),
  parentName: varchar("parentName", { length: 255 }),
  parentEmail: varchar("parentEmail", { length: 320 }),
  parentPhone: varchar("parentPhone", { length: 30 }),
  emergencyContact: varchar("emergencyContact", { length: 255 }),
  emergencyPhone: varchar("emergencyPhone", { length: 30 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AthleteProfile = typeof athleteProfiles.$inferSelect;
export type InsertAthleteProfile = typeof athleteProfiles.$inferInsert;

// ============================================================
// Messaging
// ============================================================
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("senderId").notNull(),
  recipientId: integer("recipientId").notNull(),
  content: text("content").notNull(),
  status: messageStatusEnum("status").default("sent").notNull(),
  parentMessageId: integer("parentMessageId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ============================================================
// Video Analysis
// ============================================================
export const videoAnalysis = pgTable("videoAnalysis", {
  id: serial("id").primaryKey(),
  athleteId: integer("athleteId").notNull(),
  coachId: integer("coachId"),
  videoUrl: text("videoUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  title: varchar("title", { length: 255 }),
  analysisType: varchar("analysisType", { length: 100 }),
  swingType: varchar("swingType", { length: 50 }),
  drillId: varchar("drillId", { length: 255 }),
  isStandalone: integer("isStandalone").default(0),
  athleteNotes: text("athleteNotes"),
  status: videoAnalysisStatusEnum("status").default("pending").notNull(),
  aiAnalysis: text("aiAnalysis"),
  coachFeedbackText: text("coachFeedbackText"),
  analyzedAt: timestamp("analyzedAt"),
  reviewedAt: timestamp("reviewedAt"),
  approvedAt: timestamp("approvedAt"),
  sentAt: timestamp("sentAt"),
  sentToEmail: varchar("sentToEmail", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type VideoAnalysisRecord = typeof videoAnalysis.$inferSelect;
export type InsertVideoAnalysis = typeof videoAnalysis.$inferInsert;

// ============================================================
// Blast Motion
// ============================================================
export const blastPlayers = pgTable("blastPlayers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  userId: integer("userId"),
  blastEmail: varchar("blastEmail", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlastPlayer = typeof blastPlayers.$inferSelect;
export type InsertBlastPlayer = typeof blastPlayers.$inferInsert;

export const blastSessions = pgTable("blastSessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  playerId: varchar("playerId", { length: 36 }).notNull(),
  sessionDate: timestamp("sessionDate").notNull(),
  sessionType: varchar("sessionType", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlastSession = typeof blastSessions.$inferSelect;
export type InsertBlastSession = typeof blastSessions.$inferInsert;

export const blastMetrics = pgTable("blastMetrics", {
  id: serial("id").primaryKey(),
  sessionId: varchar("sessionId", { length: 36 }).notNull(),
  batSpeedMph: varchar("batSpeedMph", { length: 10 }),
  onPlaneEfficiencyPercent: varchar("onPlaneEfficiencyPercent", { length: 10 }),
  attackAngleDeg: varchar("attackAngleDeg", { length: 10 }),
  exitVelocityMph: varchar("exitVelocityMph", { length: 10 }),
});

export type BlastMetric = typeof blastMetrics.$inferSelect;
export type InsertBlastMetric = typeof blastMetrics.$inferInsert;

// ============================================================
// Site Content & Drill Stat Cards
// ============================================================
export const siteContent = pgTable("siteContent", {
  id: serial("id").primaryKey(),
  contentKey: varchar("contentKey", { length: 500 }).notNull().unique(),
  value: text("value").notNull(),
  updatedBy: integer("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SiteContent = typeof siteContent.$inferSelect;
export type InsertSiteContent = typeof siteContent.$inferInsert;

export const drillStatCards = pgTable("drillStatCards", {
  id: serial("id").primaryKey(),
  drillId: varchar("drillId", { length: 128 }).notNull(),
  label: varchar("label", { length: 128 }).notNull(),
  value: varchar("value", { length: 512 }).notNull().default(""),
  icon: varchar("icon", { length: 64 }).default("info"),
  position: integer("position").notNull().default(0),
  isVisible: integer("isVisible").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DrillStatCard = typeof drillStatCards.$inferSelect;
export type InsertDrillStatCard = typeof drillStatCards.$inferInsert;

// ============================================================
// Player Reports
// ============================================================
export const playerReports = pgTable("playerReports", {
  id: serial("id").primaryKey(),
  athleteId: integer("athleteId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull().default(""),
  reportDate: timestamp("reportDate").notNull(),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PlayerReport = typeof playerReports.$inferSelect;
export type InsertPlayerReport = typeof playerReports.$inferInsert;

// ============================================================
// Parent-Child Relationships
// ============================================================
export const parentChildren = pgTable("parentChildren", {
  id: serial("id").primaryKey(),
  parentId: integer("parentId").notNull(),
  childId: integer("childId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ParentChild = typeof parentChildren.$inferSelect;
export type InsertParentChild = typeof parentChildren.$inferInsert;
