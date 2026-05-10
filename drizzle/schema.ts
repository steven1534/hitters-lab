import { bigint, boolean, integer, json, text, pgEnum, pgTable, varchar, timestamp, serial } from "drizzle-orm/pg-core";

// ============================================================
// Enums
// ============================================================
export const roleEnum = pgEnum("role", ["user", "admin", "athlete", "coach", "parent"]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["assigned", "in-progress", "completed"]);
export const inviteRoleEnum = pgEnum("invite_role", ["user", "admin", "athlete", "coach"]);
export const inviteStatusEnum = pgEnum("invite_status", ["pending", "accepted", "expired"]);
export const notificationTypeEnum = pgEnum("notification_type", ["submission", "feedback", "badge", "assignment", "system"]);
export const batsEnum = pgEnum("bats", ["L", "R", "S"]);
export const throwsEnum = pgEnum("throws", ["L", "R"]);

// ============================================================
// Drills (unified — single source of truth in Supabase)
// ============================================================
export const drills = pgTable("drills", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  drillId: text("drillId").unique(),
  name: text("name"),
  skillSet: text("skillSet"),
  difficulty: text("difficulty"),
  goal: text("goal"),
  commonMistakes: text("commonMistakes"),
  progressions: text("progressions"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt", { withTimezone: true }),
  updatedAt: timestamp("updatedAt", { withTimezone: true }),
  instructions: text("instructions"),
  problemsFix: text("problemsFix"),
  isHidden: integer("isHidden").default(0),
  category: text("category"),
  coaching_cues: text("coaching_cues"),
  videoUrl: text("videoUrl"),
});

export type Drill = typeof drills.$inferSelect;
export type InsertDrill = typeof drills.$inferInsert;

// ============================================================
// Users
// ============================================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  /** Email used as primary auth identifier (replaces Manus openId) */
  email: varchar("email", { length: 320 }).notNull().unique(),
  /** Hashed password */
    passwordHash: text("passwordHash"),
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
  tags: json("tags").$type<string[]>(),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DrillDetail = typeof drillDetails.$inferSelect;
export type InsertDrillDetail = typeof drillDetails.$inferInsert;

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
// Custom Drills & Customizations
// ============================================================
export const customDrills = pgTable("customDrills", {
  id: serial("id").primaryKey(),
  drillId: varchar("drillId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  difficulty: varchar("difficulty", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  duration: varchar("duration", { length: 50 }).notNull(),
  purpose: text("purpose"),
  bestFor: text("bestFor"),
  equipment: text("equipment"),
  athletes: text("athletes"),
  description: json("description").$type<string[]>(),
  videoUrl: text("videoUrl"),
  drillType: varchar("drillType", { length: 100 }).default("Tee Work"),
  drillTypeRaw: varchar("drillTypeRaw", { length: 100 }),
  skillSet: varchar("skillSet", { length: 100 }).default("Hitting"),
  ageLevel: json("ageLevel").$type<string[]>(),
  tags: json("tags").$type<string[]>(),
  problem: json("problem").$type<string[]>(),
  goalTags: json("goalTags").$type<string[]>(),
  whatThisFixes: json("whatThisFixes").$type<string[]>(),
  whatToFeel: json("whatToFeel").$type<string[]>(),
  commonMistakes: json("commonMistakes").$type<string[]>(),
  coachCue: text("coachCue"),
  watchFor: text("watchFor"),
  nextSteps: json("nextSteps").$type<string[]>(),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CustomDrill = typeof customDrills.$inferSelect;
export type InsertCustomDrill = typeof customDrills.$inferInsert;

// ============================================================
// Drill catalog overrides (Phase 1 — DB overlay on static/custom drills, same drillId)
// ============================================================
export const drillCatalogOverrides = pgTable("drillCatalogOverrides", {
  drillId: varchar("drillId", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 500 }),
  difficulty: varchar("difficulty", { length: 50 }),
  categories: json("categories").$type<string[]>(),
  duration: varchar("duration", { length: 50 }),
  tags: json("tags").$type<string[]>(),
  externalUrl: text("externalUrl"),
  hiddenFromDirectory: integer("hiddenFromDirectory").default(0).notNull(),
  purpose: text("purpose"),
  bestFor: text("bestFor"),
  equipment: text("equipment"),
  coachCue: text("coachCue"),
  watchFor: text("watchFor"),
  whatThisFixes: json("whatThisFixes").$type<string[]>(),
  whatToFeel: json("whatToFeel").$type<string[]>(),
  commonMistakes: json("commonMistakes").$type<string[]>(),
  updatedBy: integer("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DrillCatalogOverride = typeof drillCatalogOverrides.$inferSelect;
export type InsertDrillCatalogOverride = typeof drillCatalogOverrides.$inferInsert;

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

// ============================================================
// Drill Favorites
// ============================================================
export const drillFavorites = pgTable("drillFavorites", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  drillId: text("drillId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DrillFavorite = typeof drillFavorites.$inferSelect;
export type InsertDrillFavorite = typeof drillFavorites.$inferInsert;

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
  // Coach-authored "this week's focus" — short directive shown at the top of
  // the athlete's My Plan landing surface. Updated by coach only.
  weeklyFocus: text("weeklyFocus"),
  weeklyFocusUpdatedAt: timestamp("weeklyFocusUpdatedAt"),
  // Slug pointing into the static PATHWAYS list in Pathways.tsx (e.g.
  // "barrel-path"). Surfaces "You're on the X pathway" on My Plan.
  activePathwayId: varchar("activePathwayId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AthleteProfile = typeof athleteProfiles.$inferSelect;
export type InsertAthleteProfile = typeof athleteProfiles.$inferInsert;

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
// Password Reset Requests
// ============================================================
export const resetRequestStatusEnum = pgEnum("reset_request_status", ["pending", "completed", "dismissed"]);

export const passwordResetRequests = pgTable("passwordResetRequests", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  status: resetRequestStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetRequest = typeof passwordResetRequests.$inferSelect;
export type InsertPasswordResetRequest = typeof passwordResetRequests.$inferInsert;

// ============================================================
// Drill Progress (personal completion tracking)
// ============================================================
export const drillProgress = pgTable("drillProgress", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  drillId: varchar("drillId", { length: 128 }).notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  notes: text("notes"),
  rating: integer("rating"),
});

export type DrillProgress = typeof drillProgress.$inferSelect;
export type InsertDrillProgress = typeof drillProgress.$inferInsert;

// ============================================================
// Routines (ordered drill sequences authored by coach)
// ============================================================
export const routineStatusEnum = pgEnum("routine_status", ["active", "paused", "completed"]);

export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  durationMinutes: integer("durationMinutes"),
  equipment: text("equipment"),
  location: varchar("location", { length: 100 }),
  routineType: varchar("routineType", { length: 100 }),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Routine = typeof routines.$inferSelect;
export type InsertRoutine = typeof routines.$inferInsert;

export const routineDrills = pgTable("routineDrills", {
  id: serial("id").primaryKey(),
  routineId: integer("routineId").notNull(),
  drillId: varchar("drillId", { length: 255 }).notNull(),
  drillName: varchar("drillName", { length: 255 }).notNull(),
  orderIndex: integer("orderIndex").notNull(),
  durationSeconds: integer("durationSeconds"),
  reps: integer("reps"),
  sets: integer("sets"),
  coachNotes: text("coachNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RoutineDrill = typeof routineDrills.$inferSelect;
export type InsertRoutineDrill = typeof routineDrills.$inferInsert;

export const routineAssignments = pgTable("routineAssignments", {
  id: serial("id").primaryKey(),
  routineId: integer("routineId").notNull(),
  userId: integer("userId").notNull(),
  frequency: varchar("frequency", { length: 100 }),
  status: routineStatusEnum("status").default("active").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type RoutineAssignment = typeof routineAssignments.$inferSelect;
export type InsertRoutineAssignment = typeof routineAssignments.$inferInsert;
