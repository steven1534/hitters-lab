# Phase 1 Kill List

Generated 2026-04-17 from audit + user decisions + live DB row counts.

## Guardrails
- No DB tables dropped. All cuts are code-only. Supabase data preserved.
- Snake_case tables (`training_videos`, `progress_reports`, `testimonials`, `contact_submissions`, `services`, `faqs`, `admin_users`, etc.) are NOT touched — they belong to the main marketing site, not Hitters Lab.
- Core drills+pathways+AthletePortal+PlayerReports+Blast remain fully working.

## What stays (the Hitters Lab product)

### Public
- `DrillsDirectory` (home page)
- `Pathways`
- `DrillDetail` (standard page, not the Notion builder)
- `Login`, `AcceptInvite`, `VerifyEmail`, `NotFound`, `Home`

### Athlete
- `AthletePortal` (training + progress + coach notes + messages tabs — messages tab will be removed)
- `MyProgress` (streak UI stripped)
- `MyProfile`

### Coach (admin)
- `CoachDashboard` (trimmed tabs)
- `UserManagement`
- `ManageDrillVideos`
- `CreateDrillDetails`
- `SubmissionsDashboard` → KEEP (coach watches athlete video submissions)

### Coach tools kept per user decision
- PlayerReports (component + server + `playerReports` table reads remain)
- Blast Metrics (component + `blastPlayers/blastSessions/blastMetrics` + CSV importer)

---

## What gets cut

### PAGES (client/src/pages)
- `AthleteMessaging.tsx`
- `CoachMessaging.tsx`
- `ActivityFeed.tsx`
- `ParentDashboard.tsx` (parent-child schema is stubbed anyway)
- `AthleteAssessment.tsx`
- `DrillComparison.tsx`
- `DrillGeneratorPage.tsx` (uses OpenAI to generate drills — scope creep)
- `ComponentShowcase.tsx` (dev-only)

### COMPONENTS (client/src/components) — 13 files, ~10,000 LOC
- `PracticePlanner.tsx` (1,637 LOC)
- `NotionBlockEditor.tsx` (1,382 LOC)
- `SessionNotesForm.tsx` (1,020 LOC)
- `SessionNotesTab.tsx` (547 LOC)
- `SessionHistory.tsx` (474 LOC)
- `AthleteSessionNotes.tsx`
- `DrillPageBuilder.tsx` (551 LOC)
- `DrillPageBuilderNotion.tsx` (846 LOC)
- `VideoAnalysisTab.tsx` (794 LOC)
- `SwingAnalyzer.tsx` (409 LOC — AI swing analysis)
- `AthleteBadges.tsx` + `AthleteBadgesRedesigned.tsx`
- `ProgressReportReview.tsx` + `AthleteProgressReport.tsx`
- `AthleteVideoFeedback.tsx` (redundant with SubmissionsDashboard flow)
- `DrillQAForm.tsx` (Q&A feature — unused)
- `ImpersonationBanner.tsx`

### HOOKS / LIB
- `usePreviewLimit.ts` + `DrillPreviewWall.tsx` (gating feature — not needed)
- `useStreak` references (reduce from MyProgress + AthletePortal)
- `useActivityLog` references

### SERVER
- `server/practicePlanner.ts` + `server/practicePlans.ts` + `server/practicePlanGenerator.ts` if exist
- `server/sessionNotes.ts` + its tests
- `server/videoAnalysisService.ts` + `server/videoAnalysis.ts` — prompt-injection risk
- `server/drillGenerator.ts` — prompt-injection risk
- `server/streakReminderJob.ts` + `server/streaks.ts`
- `server/badges.ts`
- `server/messaging.ts` (if exists) + message routes in routers.ts
- `server/activity.ts` + routes
- `server/quizzes.ts` + routes
- `server/weeklyChallenges.ts` + routes
- `server/weeklyGoals.ts` + routes
- `server/emailBatchJob.ts` + `server/pendingEmailAlerts.ts` (broken flaky test per audit)
- `server/progressReports.ts` (note: `playerReports.ts` STAYS; only the weekly-progress-report flow goes)
- `server/parentManagement.ts` + parentManagement router
- Impersonation endpoints in routers.ts
- Q&A endpoints (drillQuestions, drillAnswers routers)

### ROUTES in `client/src/App.tsx`
Remove: `/parent-dashboard`, `/athlete-messaging`, `/coach-messaging`, `/activity-feed`, `/drill-comparison`, `/athlete-assessment`, `/drill-generator`

### SCHEMA (`drizzle/schema.ts`)
Remove schema definitions for (but don't drop DB tables):
- `practicePlans`, `practicePlanBlocks`
- `sessionNotes`
- `videoAnalysis`
- `badges`
- `messages`
- `athleteActivity` (33 rows — harmless activity log, not load-bearing)
- `weeklyChallenges`, `weeklyGoals`
- `quizAttempts`, `quizQuestions`, `quizQuestionResults`
- `parentChildren`
- `coachAlertPreferences`, `pendingEmailAlerts`
- `coachNotes` (replaced by notes inside `playerReports`)
- `progressReports` (DIFFERENT from `playerReports` — this is the weekly-generated report)
- `drillQuestions`, `drillAnswers`
- `drillPageLayouts`, `drillPageTemplates` (page builder)
- `drillCustomizations`, `drillStatCards` (page builder companions)

KEEP in schema:
- `users`, `invites`, `passwordResetRequests`, `notifications`, `notificationPreferences`
- `drills`, `drillCatalogOverrides`, `drillVideos`, `drillDetails`, `drillFavorites`, `customDrills`
- `drillAssignments`, `drillProgress`, `assignmentProgress`, `drillSubmissions`, `coachFeedback`
- `athleteProfiles`
- `playerReports`
- `blastPlayers`, `blastSessions`, `blastMetrics`
- `siteContent`

### TESTS
Delete any tests for deleted modules. Keep tests for kept modules.
Replace the placeholder-only ones flagged in the audit (`invites.test.ts`, `admin.test.ts`) with real tests — NOT in this PR, next Phase.

### SCRIPTS / CONFIG
Already cut in Phase 0. Nothing more here.

---

## Expected impact

- Files deleted: ~40
- Lines deleted: ~15,000
- Audit findings closed: ~60–80
- Client bundle: meaningfully smaller
- Build time: faster
- Remaining vision match: tight

## NOT in this PR (Phase 2+)

- Schema FK/CASCADE rewrite (big migration work)
- Real test suite replacing placeholders
- Impersonation fix with session table
- Email batching retry logic
- Parent-child schema (build properly if/when needed)
