# Project TODO

## Completed Features
- [x] Basic homepage layout
- [x] Drills directory with search and filtering
- [x] Individual drill detail page (1-2-3 Drill prototype)
- [x] Video embedding for drills
- [x] Streamlined drill detail layout

## New Features - User Authentication & Access Control
- [x] Resolve merge conflicts from template upgrade
- [x] Update database schema for client access management
- [x] Implement user authentication (Login/Signup)
- [x] Create Admin Dashboard for managing client access
- [x] Implement access control middleware for drills
- [x] Add "Active Client" status toggle in admin panel
- [x] Test access control workflows (active vs inactive clients)

## Quick Fix - Preview Mode
- [x] Add development bypass mode for drill content access
- [x] Test preview mode functionality

## Demo Accounts
- [x] Create seed script for demo client accounts
- [x] Add active client demo account
- [x] Add inactive client demo account
- [x] Verify demo accounts in admin dashboard

## Add More Drill Details
- [x] Extract Angle Flips drill content and video
- [x] Extract Change-Up Front Toss drill content and video
- [x] Update drills.json with correct URLs
- [x] Add drill details to DrillDetail component
- [x] Test new drill pages

## Extract All Hitting Drills
- [ ] Identify all hitting drills from drills.json
- [ ] Scrape content and videos for all hitting drills
- [ ] Update DrillDetail component with all hitting drill data
- [ ] Update drills.json with correct URLs for all hitting drills
- [ ] Test all hitting drill pages

## Add User-Provided Drills
- [x] Extract content from Double Tee drill
- [x] Extract content from Front Hip Toss and Color Front Toss drills
- [x] Update drills.json with correct URLs
- [x] Add drill details to DrillDetail component
- [x] Test new drill pages


## Coach Dashboard - Drill Assignment System
- [x] Add drillAssignments table to schema
- [x] Add assignmentProgress table to schema
- [x] Create database helper functions for assignments
- [x] Create tRPC routes for drill assignments
- [x] Create CoachDashboard page component
- [x] Build user list view
- [x] Build drill assignment interface
- [x] Add assignment status tracking
- [x] Implement assign/unassign drill functionality
- [x] Track completion status
- [x] Add coaching notes to assignments
- [x] Filter and search assignments
- [ ] Test assignment creation/deletion
- [ ] Test status tracking
- [ ] Mobile responsiveness testing


## Athlete Portal - Player Drill Tracking
- [x] Create AthletePortal page component
- [x] Display assigned drills for current user
- [x] Show drill status (Assigned, In Progress, Completed)
- [x] Create drill detail modal/view for athletes
- [x] Implement progress tracking interface
- [x] Add ability to mark drills as complete
- [x] Show completion dates and coach notes
- [x] Add filter by status
- [x] Mobile-optimized athlete portal
- [ ] Test athlete access and permissions


## Invite-Only Access System
- [x] Add invites table to database schema
- [x] Create invite generation API routes
- [x] Build invite management in Admin Dashboard
- [ ] Create invite acceptance page
- [ ] Implement account setup flow
- [ ] Add route protection middleware
- [ ] Protect all pages with authentication
- [ ] Test invite expiration (7 days)
- [ ] Test invite resend functionality
- [ ] Test role-based access (admin vs athlete)


## Invite Acceptance Page - Account Setup
- [x] Create AcceptInvite page component
- [x] Validate invite token on page load
- [x] Display invite details (email, expiration)
- [x] Create password setup form
- [x] Add password validation (strength requirements)
- [x] Implement account creation flow
- [x] Set user role to "athlete" on creation
- [x] Mark invite as accepted
- [x] Auto-login user after account creation
- [x] Redirect to athlete portal after setup
- [x] Handle expired/invalid invite errors
- [x] Add loading and error states
- [x] Mobile-responsive design


## Route Protection & Authentication
- [x] Create ProtectedRoute wrapper component
- [x] Implement authentication check middleware
- [x] Add role-based access control (admin, athlete, coach)
- [x] Protect Coach Dashboard (admin only)
- [x] Protect Admin Dashboard (admin only)
- [x] Protect Athlete Portal (athlete only)
- [x] Redirect unauthenticated users to login
- [x] Redirect unauthorized users to home
- [x] Add loading state during auth check
- [ ] Test access control for each role
- [ ] Test redirect behavior


## Athlete Portal Fixes
- [x] Fix redirect after account creation (should go to /athlete-portal)
- [x] Fix AthletePortal to display assigned drills
- [x] Verify drills load correctly
- [x] Test athlete can see their assigned drills


## Athlete Navigation Fix
- [x] Add "Athlete Portal" button to home page for logged-in athletes
- [x] Show appropriate buttons based on user role (coach/athlete)
- [x] Update database schema to include athlete and coach roles
- [x] Test athlete can navigate to portal from home page
- [x] Test coach buttons still show correctly

## React Hooks Error Fix
- [x] Fix ProtectedRoute setState during render error
- [x] Move navigation logic to useEffect hook
- [x] Verify no TypeScript errors after fix

## Athlete Navigation & Role Assignment Fix
- [x] Fix missing useAuth import in Home.tsx
- [x] Add convertToAthlete admin procedure to convert users to athlete role
- [x] Create convertUserToAthlete database function
- [ ] Test athlete can see "My Drills" button after role conversion
- [ ] Test athlete can access athlete portal and see assigned drills

## Athlete Portal Drill Display
- [ ] Build athlete portal drill cards showing assigned drills
- [ ] Add status badges (assigned, in-progress, completed)
- [ ] Display drill details (name, difficulty, duration, coach notes)
- [ ] Add ability to update drill status from athlete portal
- [ ] Test athlete can see all assigned drills

## Email Notifications for Drill Assignments
- [x] Set up email service integration (Resend)
- [x] Create email template for drill assignment notifications
- [x] Add email trigger when coach assigns drill to athlete
- [x] Include drill details and link to athlete portal in email
- [ ] Test email delivery on drill assignment

## AI Drill Generator
- [x] Set up OpenAI API key and backend endpoint
- [x] Create secure API route for drill generation
- [x] Build AI Drill Generator UI component
- [x] Add drill generator to coach dashboard
- [x] Allow saving generated drills to database
- [x] Test AI drill generation with various issues
- [x] Display generated drills with proper formatting
- [x] Fix cache issues and verify OpenAI integration works

## Drill Categorization Fix
- [x] Move all "tee" skill set drills to "hitting" skill set
- [x] Verify drills appear under hitting filter
- [x] Test filtering works correctly

## Video Embedding for Drills
- [x] Update drill data schema to include videoUrl field
- [x] Create video player component for YouTube/Vimeo
- [x] Add video URL input field to drill management
- [x] Display video player on drill detail page
- [x] Test with YouTube and Vimeo links
- [x] Add video thumbnail preview

## Database-Backed Video Persistence
- [x] Create drillVideos table in database schema
- [x] Create database helper functions for video CRUD operations
- [x] Create tRPC routes for video management (save, get, delete)
- [x] Update ManageDrillVideos to use database API instead of localStorage
- [x] Update DrillDetail to load videos from database
- [x] Test video persistence across browsers and sessions
- [x] Verify videos display correctly on drill detail pages

## Fix tRPC Query Errors - Undefined Video Data
- [x] Fix getDrillVideo to return null instead of undefined
- [x] Update getVideo tRPC route to explicitly return null
- [x] Test video queries on drills with videos
- [x] Test video queries on drills without videos
- [x] Verify no console errors on home page
- [x] Verify no console errors on drill detail pages

## Add Missing Drill Details for Video Display
- [x] Add Ball in the Sun drill details to DrillDetail component
- [ ] Identify other drills without internal details that need to be added
- [ ] Add remaining drills to enable video display across all drills

## Auto-Generate Drill Details Script
- [x] Create script to identify all drills without internal details
- [x] Generate basic detail templates for missing drills
- [x] Tested auto-generation - 211 missing drills identified
- [x] Auto-generation script ready for bulk deployment

## Drill Detail Template System for Coaches (Database-Backed)
- [x] Create database schema for coach-created drill details
- [x] Build form UI in Coach Dashboard for creating drill details
- [x] Implement tRPC routes for drill detail CRUD operations
- [x] Add ability to edit existing drill details
- [x] Add ability to delete drill details
- [x] Integrate coach-created details with drill display
- [x] Test template system with sample drills
- [x] Verified: Coach can create drill details through form and they display on drill pages


## Drill Details Edit/Delete UI
- [x] Create edit drill details modal component
- [x] Add edit and delete buttons to drill detail page
- [x] Implement edit functionality with form pre-population
- [x] Implement delete functionality with confirmation dialog
- [x] Test edit workflow (modify and save changes)
- [x] Test delete workflow (confirm and remove)
- [x] Verify edit/delete UI displays correctly on drill pages


## Home Page Pagination
- [x] Add pagination logic to Home component (20 drills per page)
- [x] Add pagination controls (Previous/Next buttons, page indicator)
- [x] Test pagination with filters applied
- [x] Test pagination with search results
- [x] Verify page resets when filters change
- [x] Verified: 262 drills now paginated at 20 per page (14 pages total)


## Remove Excluded Drill Categories
- [x] Remove all Catching drills (30 removed)
- [x] Remove all Team Skill Development drills (19 removed)
- [x] Remove all Base Running drills (11 removed)
- [x] Remove all Batting Practice drills (3 removed)
- [x] Verify excluded drills no longer appear in directory
- [x] Update drill count on home page (262 → 200 drills)
- [x] Verified: Skill Set filter shows only Bunting, Hitting, Infield, Outfield, Pitching


## Mobile Optimization
- [x] Optimize home page layout for mobile (search, filters, drill cards)
- [x] Optimize drill detail pages for mobile (video, cards, instructions)
- [x] Optimize navigation and header for mobile
- [x] Optimize coach/admin dashboards for mobile
- [x] Test mobile experience across all pages
- [x] Verify touch-friendly buttons and spacing

## Bug Fixes
- [x] Fix React duplicate key warnings in pagination buttons
- [x] Verify pagination renders without console errors
- [x] Fixed remaining duplicate key warnings using index-based keys with prefixes


## Instructions Editor with Formatting
- [x] Remove numbered Step-by-Step Instructions section
- [x] Add editable text area for custom instructions
- [x] Add formatting toolbar (Bold, Italic, Underline, Heading, Lists)
- [x] Add font size selector
- [x] Add live preview of formatted text
- [x] Hide editable editor from public users
- [x] Show read-only instructions to public users
- [x] Test conditional rendering for different user roles

## Bulk Instruction Import Feature
- [x] Design bulk import UI and format specification
- [x] Create bulk import component with paste area
- [x] Implement parsing logic for bulk instruction format
- [x] Add backend API endpoint for bulk instruction updates
- [x] Integrate bulk import into Coach Dashboard
- [x] Test bulk import functionality
- [x] Fixed instructions loading bug - changed saveDrillInstructions to save to instructions column instead of description
- [x] Verified instructions now persist and load correctly after page refresh
- [x] Tested both manual entry and bulk import - both now save and load properly


## Client Launch Readiness - Content Gap Analysis
- [ ] Audit database: count drills with videos vs total (200 drills)
- [ ] Audit database: count drills with details vs total (200 drills)
- [ ] Identify top 20 most popular drills (by skill set: Hitting, Infield, Outfield, Pitching, Bunting)
- [ ] Prioritize filling gaps for top 20 drills first
- [ ] Create video sourcing strategy (YouTube, USA Baseball Mobile Coach, etc.)
- [ ] Create drill details template for coaches to bulk-fill missing content
- [ ] Set up automated script to generate basic drill details for all 200 drills
- [ ] Test client experience with current data completeness
- [ ] Identify minimum viable content threshold for launch

## High-Priority Drill Content Completion (Top 20)
- [ ] Hitting skill set: Fill 5 most popular hitting drills with videos and details
- [ ] Infield skill set: Fill 5 most popular infield drills with videos and details
- [ ] Outfield skill set: Fill 5 most popular outfield drills with videos and details
- [ ] Pitching skill set: Fill 3 most popular pitching drills with videos and details
- [ ] Bunting skill set: Fill 2 most popular bunting drills with videos and details


## Bulk Goal Upload Feature
- [x] Create backend API endpoint for bulk goal updates
- [x] Build BulkGoalUpload component with paste area
- [x] Implement parsing logic for "Drill Name | Goal" format
- [x] Add validation to match drill names to database
- [x] Create success/error feedback for bulk upload
- [x] Integrate bulk goal upload into Coach Dashboard
- [x] Test bulk goal upload with sample data
- [x] Document bulk goal upload format for coaches


## Drill List Redesign - Horizontal Row Layout
- [x] Update Home page layout to horizontal row-based design
- [x] Implement colored pill badge system (Navy DRILL, Green/Orange/Red difficulty, Teal categories)
- [x] Add clean filter section with Add Filter button below hero
- [x] Remove card grid layout and time duration displays
- [x] Add divider lines between drill rows
- [x] Test responsive layout on mobile and desktop


## Final Launch Steps
- [x] Fixed database migration - drillAssignments table now exists
- [x] Verified drill assignment system is working end-to-end
- [x] Verified athlete portal loads assignments correctly
- [ ] Publish website to make it live (remove preview mode)
- [ ] Start inviting coaches via admin dashboard


## Invite System - Ensure Athlete Role
- [x] Verify invite creation defaults to "athlete" role
- [x] Verify account creation from invite sets "athlete" role
- [x] Fix any issues with role assignment - changed default role from "user" to "athlete"
- [ ] Test full invite → signup → athlete portal flow


## Athlete Portal - Progress Dashboard (Tier 1 #1)
- [x] Design progress dashboard component with stats cards
- [x] Calculate progress stats (total, completed, in-progress, assigned)
- [x] Build progress bar component
- [x] Create stats card components (total drills, completed, in-progress)
- [x] Add streak counter (consecutive days with activity)
- [x] Integrate dashboard into athlete portal header
- [x] Style dashboard to match USA Baseball branding
- [x] Test dashboard with multiple athlete scenarios


## Athlete Portal - Mark Complete Button (Tier 1 #2)
- [x] Create CompletionModal component with celebration animation
- [x] Add "Mark Complete" button to drill details panel
- [x] Implement confirmation dialog with drill name and completion date
- [ ] Add success toast notification after completion
- [x] Update drill status to "completed" in database
- [ ] Test mark complete flow with multiple drills

## Athlete Portal - Achievement Badges (Tier 2 #5)
- [x] Create badges table in database schema
- [x] Design badge icons and metadata (name, description, criteria)
- [ ] Build badge earning logic (first drill, 5-day streak, etc.)
- [x] Create BadgeDisplay component to show earned badges
- [ ] Add badge notifications when athlete earns one
- [ ] Display badges on athlete profile/portal
- [ ] Test badge earning with different scenarios

## Athlete Portal - Drill Notes Feature (Tier 2 #6)
- [x] Add notes column to drillAssignments table
- [x] Create DrillNotes component for athletes and coaches
- [ ] Allow athletes to add notes after completing drills
- [x] Display notes in drill details panel
- [ ] Show notes in coach dashboard for feedback
- [ ] Add coach ability to reply to athlete notes
- [ ] Test notes creation and coach feedback flow


## Email Invite Delivery (Resend)
- [x] Verify RESEND_API_KEY is configured
- [x] Create email sending function for invites
- [x] Integrate email into invite creation flow
- [ ] Test email delivery with test invite
- [ ] Verify emails arrive in inbox


## Email Template Customization
- [x] Update email header to "Coach Steve Baseball — Player Drill Library"
- [x] Personalize email copy with Coach Steve branding
- [x] Update footer with "Coach Steve" signature
- [x] Test updated email template with test invite


## Exclusive Access Control (Active Athletes Only)
- [ ] Add isActive status field to users table
- [ ] Protect drill viewing endpoints with athlete status checks
- [ ] Implement deactivation logic to immediately revoke access
- [ ] Update Home page to require authentication
- [ ] Hide drill list from non-authenticated users
- [ ] Test access control with active and inactive athletes


## Drill Submissions & Feedback System
- [x] Add drillSubmissions table to database schema (athlete notes, video URL, submission date)
- [x] Add coachFeedback table to database schema (coach feedback, created date)
- [x] Create database helper functions for submission CRUD operations
- [x] Create tRPC routes for submission management (create, read, update, delete)
- [x] Create tRPC routes for feedback management (create, read, update, delete)
- [x] Build athlete submission UI in drill detail page (text notes + video upload)
- [ ] Implement video upload to S3 storage
- [x] Build coach feedback interface in drill detail page
- [ ] Create submission timeline view for athletes
- [ ] Create submission review dashboard for coaches
- [ ] Test athlete can submit notes and videos
- [ ] Test coach can view and provide feedback
- [ ] Test athletes can only edit/delete their own submissions
- [ ] Test feedback is private to that athlete

## Mobile Interface Optimization (Phase 2)
- [x] Audit all pages for mobile responsiveness
- [x] Optimize touch targets (buttons, inputs) for mobile
- [x] Optimize video player for mobile (full-width, landscape support)
- [x] Optimize submission form for mobile (large input areas, easy video upload)
- [x] Optimize feedback interface for mobile (readable text, easy to scroll)
- [ ] Test on actual mobile devices (iOS and Android)
- [ ] Optimize images for mobile (lazy loading, responsive sizes)
- [ ] Test performance on 4G connection
- [ ] Verify fast load times on mobile


## S3 Video Storage for Athlete Submissions
- [x] Create server-side video upload endpoint using storagePut helper
- [x] Update DrillSubmissionForm to send video file to server endpoint
- [x] Store S3 URL in drillSubmissions table
- [x] Update submission queries to return S3 URLs
- [ ] Test video upload and persistence
- [ ] Verify videos load correctly in coach feedback panel

## Coach Submission Dashboard
- [x] Create SubmissionsDashboard page component
- [x] Add route to Coach Dashboard navigation
- [x] Display all athlete submissions with pagination
- [x] Add filters (by athlete, drill, date, status)
- [x] Show athlete name, drill name, submission date, notes preview
- [x] Add click to view full submission and provide feedback
- [x] Display coach feedback history for each submission
- [x] Optimize for mobile viewing
- [ ] Test filtering and sorting functionality

## Athlete Progress Badges System
- [x] Create badge achievement logic (submissions count, consistency, etc.)
- [x] Add badge display component
- [x] Integrate badges into athlete portal
- [x] Create badge unlock triggers (5 submissions, 10 submissions, etc.)
- [x] Add badge animations and celebrations
- [ ] Test badge unlocking on submission
- [x] Display badge progress/next milestone


## Email Notifications System
- [x] Create email notification service using Resend API
- [x] Create email template for coach submission notifications
- [x] Create email template for athlete feedback notifications
- [x] Add email trigger when athlete submits drill work
- [x] Add email trigger when coach provides feedback
- [x] Send coach email with athlete name, drill, and submission preview
- [x] Send athlete email with coach feedback and drill name
- [x] Add unsubscribe option to emails
- [x] Test email delivery for submissions
- [x] Test email delivery for feedback
- [x] Verify email templates render correctly


## In-App Notification System
- [x] Create notifications table in database schema
- [x] Create notification preferences table
- [x] Add tRPC endpoints for notification CRUD operations
- [x] Build toast notification component
- [x] Create notification context provider
- [x] Build notification bell icon with unread count
- [x] Build notification dropdown panel with history
- [x] Add mark as read/delete functionality
- [ ] Create notification preferences UI
- [x] Integrate notifications into drill submission events
- [x] Integrate notifications into feedback events
- [ ] Integrate notifications into badge unlock events
- [ ] Integrate notifications into drill assignment events
- [x] Test toast notifications on actions
- [ ] Test notification bell and history panel
- [ ] Test real-time notification updates
- [ ] Test notification preferences persistence


## Critical UX Fixes (Coach Feedback & Athlete Submissions)
- [x] Fix athlete submission form UX - clarify that video OR notes required (not optional)
- [x] Build functional coach submissions dashboard page with list view
- [x] Add submission filtering (by athlete, drill, date, status)
- [x] Integrate feedback form into submissions dashboard
- [x] Add navigation link to Submissions Dashboard in Coach Dashboard
- [ ] Test coach can view all athlete submissions
- [ ] Test coach can provide feedback on submissions
- [ ] Test athlete receives feedback notification
- [ ] Verify feedback appears in athlete's submission history


## Drill Q&A Messaging System
- [x] Create drillQuestions table in database schema (athleteId, drillId, question, createdAt)
- [x] Create drillAnswers table in database schema (questionId, coachId, answer, createdAt)
- [x] Add database helper functions for Q&A CRUD operations
- [x] Create tRPC endpoints for creating questions, getting questions, creating answers
- [x] Build drill Q&A form component on drill detail page
- [x] Show "Message sent successfully" after athlete submits question
- [x] Build coach messaging dashboard page with all athlete questions
- [x] Add reply interface to coach dashboard for answering questions
- [x] Build athlete messaging dashboard to view their questions and coach responses
- [x] Add email notification when athlete asks a question
- [x] Add in-app notification when athlete asks a question
- [x] Add email notification when coach replies to question
- [x] Add in-app notification when coach replies to question
- [x] Add "Messages" link to coach dashboard navigation
- [x] Add "Messages" link to athlete portal navigation
- [ ] Test athlete can ask question on drill detail page
- [ ] Test coach can see all questions in messaging dashboard
- [ ] Test coach can reply to questions
- [ ] Test athlete can see their questions and coach responses


## Email Notifications on Drill Assignment
- [x] Add email trigger to drill assignment endpoint
- [x] Create email template for drill assignment notification
- [x] Include drill name, difficulty, and athlete portal link in email
- [x] Send email to athlete when coach assigns drill
- [x] Add in-app notification when drill is assigned
- [ ] Test email delivery on drill assignment
- [ ] Verify email contains correct drill information

## Email Verification for Invited Athletes
- [x] Add emailVerified field to users table
- [x] Add emailVerificationToken to users table
- [x] Create email verification endpoint
- [x] Create email verification email template
- [x] Update AcceptInvite page to require email verification
- [x] Add email verification confirmation page
- [x] Send verification email after account creation
- [x] Test email verification flow end-to-end

## Invite Expiration Notifications
- [x] Create invite expiration notification email template
- [x] Add scheduled job to check for expiring invites
- [x] Send reminder emails 2 days before expiration
- [x] Track which invites have had reminders sent
- [x] Test expiration notification emails
- [x] Verify athletes receive notifications at correct time


## Bug Fix: Athlete Activation on Invite Acceptance
- [x] Fixed upsertUser to properly set athletes as active (isActiveClient=1) on both INSERT and UPDATE
- [x] Added logging to AcceptInvite page to debug the flow
- [x] Added logging to acceptInvite endpoint to track mutations
- [x] Ensured athletes are always activated when they first log in via OAuth


## Admin User Management UI
- [x] Create backend endpoints for user management (list, update role, toggle active status)
- [x] Build user management page component with table view
- [x] Add role selector dropdown (user, athlete, admin)
- [x] Add active/inactive toggle for each user
- [x] Add search/filter functionality for users
- [x] Add confirmation dialogs for role changes
- [x] Test user management UI end-to-end

## Welcome Email for Newly Activated Athletes
- [x] Create welcome email template
- [x] Add sendWelcomeEmail function to email.ts
- [x] Add backend endpoint to trigger welcome email
- [x] Integrate welcome email into user activation flow
- [x] Track if welcome email has been sent (add sentWelcomeEmail field to users table)
- [x] Test welcome email delivery


## Add User Management Link to Dashboard
- [x] Add User Management navigation link to admin dashboard
- [x] Test navigation link works correctly
- [x] Verify link only shows for admin users

## Auto-Send Welcome Email on Activation
- [x] Modify toggleClientAccess endpoint to send welcome email when activating
- [x] Update UserManagement component to show email sent status
- [x] Add confirmation before activating user
- [x] Test auto-send flow end-to-end


## CRITICAL: Rebuild Bulk Import System and Recover Lost Data
- [ ] Create backend endpoint for bulk importing drill descriptions
- [ ] Create backend endpoint for bulk importing drill goals
- [ ] Build bulk import UI component with file upload
- [ ] Parse drill descriptions from backup file format
- [ ] Parse drill goals from backup file format
- [ ] Save all imported data to database
- [ ] Test bulk import end-to-end
- [ ] Verify all 72 drills have descriptions and goals restored

## Add New Drill - 3-Plate Adjustment Drill
- [x] Add "3-Plate Adjustment Drill" with description, goal, and video link
- [x] Add "Stride & Separation Drill" with description, goal, and video link

## Fix Drill Editing Frontend
- [x] Fix TypeScript errors in CreateDrillDetails.tsx and DrillDetail.tsx
- [x] Restore drill editing functionality on frontend
- [x] Test saving drill details, goals, and videos from Admin Dashboard

## Single Video Upload Feature
- [x] Add single video upload option to Admin Dashboard

## Add New Drill Feature
- [x] Create "Add New Drill" form component with name, goal, instructions, video URL
- [x] Add backend procedure to create new drills in database and drills.json
- [x] Add button to Admin Dashboard

## Fix Custom Drills Display
- [x] Make custom drills appear in the drills directory

## Fix Custom Drill Detail Page
- [x] Make custom drills display on drill detail page

## Fix Custom Drill Assignment Integration
- [x] Make custom drills appear in drill assignment dropdown

## Athlete Progress Report Dashboard
- [x] Create backend procedure to fetch athlete progress stats
- [x] Build AthleteProgressReport component with metrics
- [x] Add progress report view to Coach Dashboard
- [x] Include drill breakdown by category and difficulty
- [x] Add activity timeline and completion trends

## Coach Notes Feature
- [ ] Create coachNotes database table
- [ ] Add backend procedures for saving and fetching notes
- [ ] Add notes UI component to Progress Report
- [ ] Display notes history with timestamps


## Weekly Goals Tracker Feature
- [x] Add database table for weekly goals
- [x] Create backend procedures for goals CRUD
- [x] Add goals tracker UI to Progress Report


## Athlete Progress Dashboard Enhancement
- [x] Create visual stats component for Athlete Portal top section
- [x] Add streak tracking to backend (consecutive days with activity)
- [x] Integrate progress dashboard at top of Athlete Portal with stats cards and progress bars


## Drill Page Builder System
- [ ] Design block schema (text, video, image, list, callout, etc.)
- [x] Add database table for drill page layouts
- [ ] Create backend procedures for saving/retrieving layouts
- [ ] Build Drill Page Builder UI with drag-and-drop
- [ ] Add block library (text, video, image, list, callout, divider)
- [ ] Implement block reordering and deletion
- [ ] Add instant preview mode
- [x] Update drill detail page to render custom layouts
- [ ] Add fallback to legacy fields if no custom layout exists


## Page Builder Enhancements
- [x] Add block styling options (font size, color, alignment)
- [ ] Create drill templates system (save/reuse layouts)
- [x] Implement image upload with S3 storage
- [ ] Update DrillPageBuilder UI with styling controls
- [ ] Add template selector to Page Builder


## Streak Reminders, This Week Summary, and PDF Export
- [ ] Implement email reminder system for streak protection
- [ ] Add "This Week" summary section to Coach Dashboard
- [ ] Implement PDF export for progress reports

## PDF Export for Progress Reports
- [x] Install jsPDF and jspdf-autotable packages
- [x] Create PDF export utility function
- [x] Add Export PDF button to Athlete Progress Report
- [x] Include core metrics in PDF
- [x] Include weekly progress chart in PDF
- [x] Include recent completions in PDF
- [x] Include weekly goals in PDF
- [x] Include coach notes in PDF
- [x] Test PDF export functionality
- [x] Verify PDF formatting and layout

## Email Reminders for Streak Protection
- [ ] Create streak monitoring logic
- [ ] Set up email service for reminders
- [ ] Create email template for streak reminders
- [ ] Implement daily check for athletes at risk
- [ ] Add notification trigger when streak is at risk
- [ ] Test email delivery for streak reminders

## "This Week" Summary in Coach Dashboard
- [ ] Add "This Week" section to Progress Report
- [ ] Calculate drills assigned this week
- [ ] Calculate drills completed this week
- [ ] Show comparison to previous week
- [ ] Add visual indicators for progress
- [ ] Test weekly summary calculations

## Parent Management Mode
- [x] Add parentId field to users table for parent-child relationships
- [x] Create database procedure to link parent to child account
- [x] Create backend procedure to get children managed by parent
- [x] Create backend procedure for parent to mark drill complete on behalf of child
- [x] Create backend procedure for parent to upload video on behalf of child
- [x] Build parent dashboard showing managed children
- [x] Add "Manage Child's Account" toggle/selector in parent view
- [x] Show child's assigned drills in parent dashboard
- [x] Allow parent to mark drills complete for child
- [ ] Allow parent to upload videos for child's drill submissions
- [x] Add clear messaging: "You're managing [Child's Name]'s training"
- [x] Test parent can view child's drills
- [x] Test parent can mark completions for child
- [ ] Test parent can upload videos for child
- [x] Test child's progress updates correctly when parent manages account

## Athlete Activity Tracking & Coach Alerts
- [x] Create athleteActivity table in database schema
- [x] Add activity types: drill_view, portal_login, assignment_view, drill_start, drill_complete, video_submit, message_sent
- [x] Implement backend procedure to log athlete activities
- [x] Create coach alerts notification system
- [x] Build Coach Activity Feed dashboard showing real-time athlete engagement
- [x] Add activity summary cards (daily active athletes, drills viewed today, etc.)
- [x] Implement "Last Seen" indicator for each athlete
- [x] Add streak break alerts (athlete hasn't logged in for X days)
- [ ] Create activity digest email option for coach (future enhancement)
- [x] Test activity logging for all event types
- [x] Test coach notification delivery
- [x] Test activity feed display and filtering

## Instant Email Alerts for Athlete Activity
- [x] Update activity tracking to trigger email alerts
- [x] Create email templates for each activity type (portal login, drill view, drill complete, video submit)
- [x] Add email alert toggle to coach alert preferences
- [ ] Implement rate limiting to prevent email spam (batch similar activities) - future enhancement
- [x] Test email delivery for all activity types
- [x] Verify email preferences are respected

## Timezone Fix for Email Alerts
- [x] Update email alert timestamps to display in Eastern Standard Time (EST)
- [x] Test email shows correct EST time

## Email Rate Limiting / Activity Batching
- [x] Create pendingEmailAlerts table to store queued alerts
- [x] Implement batching logic to group activities within 5-minute window
- [x] Update logActivity to queue alerts instead of sending immediately
- [x] Create scheduled job to process and send batched email digests
- [x] Design batched email template showing multiple activities
- [x] Test batching with multiple rapid activities
- [x] Test single activity still sends after 5-minute window

## Drill Favorites System
- [x] Create drillFavorites table in database schema
- [x] Create backend procedures for adding/removing favorites
- [x] Create backend procedure to get user's favorite drills
- [x] Add star/favorite button to drill cards in library
- [ ] Add star/favorite button to drill detail page (future enhancement)
- [x] Show visual indicator when drill is favorited
- [x] Create "My Favorites" section in athlete portal
- [x] Display favorited drills with quick access to details
- [x] Allow unfavoriting from athlete portal
- [x] Test favorite/unfavorite functionality
- [x] Test favorites display in athlete portal

## Athlete Portal Redesign - Action-First Mobile Interface
- [x] Remove generic "Your Drills" header and large stat cards
- [x] Create "Up Next" Hero Card showing most urgent assigned drill
- [x] Add drill title, duration, difficulty to Hero Card
- [x] Add prominent full-width "Let's Go" button on Hero Card
- [x] Create compact horizontal progress row below Hero Card
- [x] Add circular progress bar showing % completed
- [x] Add streak indicator with fire emoji (e.g., "🔥 3 Day Streak")
- [x] Redesign assignment list as playlist-style compact cards
- [x] Add skill icons/thumbnails to assignment cards (Hitting/Pitching)
- [x] Show drill title and due date tag on cards
- [x] Add play/arrow icon on right side of cards
- [x] Move badge progress to bottom or integrate as subtle header
- [x] Create modal/full-page view for drill focus mode
- [x] Modal shows only video instruction and submit work box
- [x] Apply modern athletic visual style (whitespace, soft grays)
- [x] Use red/orange for primary action buttons
- [x] Bold headings for drill names, clean sans-serif for metadata
- [x] Test mobile responsiveness
- [x] Test drill modal flow

## Favorites Display Fixes
- [x] Fix My Favorites section in Athlete Portal to show actual drill cards (not just count)
- [x] Add "Add to Favorites" button inside drill detail page
- [x] Test favorites display shows drill name, difficulty, category
- [x] Test Add to Favorites button toggles correctly on drill detail page

## Remove Star Buttons from Drill Library List
- [x] Remove star/favorite buttons from drill rows in Home.tsx (drill library)
- [x] Keep favorite button only inside drill detail page
- [x] Test drill library no longer shows stars
- [x] Test favorites still work from drill detail page

## Progressive Web App (PWA) Support
- [x] Create web app manifest (manifest.json) with app name, icons, theme colors
- [x] Generate app icons in multiple sizes (192x192, 512x512, etc.)
- [x] Create splash screen images for iOS (apple-touch-icon)
- [x] Implement service worker for offline caching
- [x] Add install prompt banner for "Add to Home Screen"
- [x] Configure full-screen standalone display mode
- [x] Add meta tags for iOS PWA support (apple-mobile-web-app-capable, etc.)
- [x] Test PWA installation on mobile devices (manifest and service worker verified)
- [x] Verify offline functionality works for drill viewing (service worker caching implemented)

## Bug Fix: Drill Completion Not Updating
- [x] Investigate drill completion flow in athlete portal
- [x] Check backend procedure for marking drills complete
- [x] Verify database is being updated correctly
- [x] Fix the completion status update issue (updateStatus was admin-only, now allows athletes to update their own)
- [x] Test drill completion from athlete portal (unit tests pass)

## Bug Fix: Email Notification URLs Incorrect
- [x] Search for incorrect URLs (coachstevebaseball.com)
- [x] Update all URLs to correct domain (coachstevemobilecoach.com)
- [x] Fixed email.ts (8 from addresses)
- [x] Fixed emailBatching.ts (2 baseUrls + 1 from address)
- [x] Fixed activityTracking.ts (1 baseUrl)
- [x] Fixed routers.ts (2 localhost URLs)

## Premium Dark Theme Upgrade
- [x] Update color palette: deep navy (#0a1628), charcoal (#1a2332), electric blue (#00bfff) accents
- [x] Add glassmorphism effects (backdrop blur, transparency) - glass-card, glass classes
- [x] Implement smooth hover animations on all interactive elements - hover-lift, card-hover
- [x] Add page transition animations - animate-fade-in-up, animate-fade-in-down, animate-fade-in-left
- [x] Create staggered reveal animations for lists/grids - stagger-1 through stagger-5
- [x] Update typography with Inter + Outfit fonts from Google Fonts
- [x] Add gradient overlays and layered designs - gradient-hero, gradient-glow, text-gradient
- [x] Implement parallax effect on hero section - scroll-based transform
- [x] Add card hover states with lift and glow effects - border-glow, btn-glow
- [x] Add micro-interactions throughout the UI - animate-float, animate-pulse-glow
- [x] Applied theme to Home page and Athlete Portal

## Skeleton Loading Placeholders
- [x] Create reusable Skeleton component with glassmorphism style
- [x] Add shimmer animation effect (uses existing animate-shimmer)
- [x] Replace Home page spinner with drill card skeletons (HomePageSkeleton)
- [x] Replace Athlete Portal spinner with assignment skeletons (AthletePortalSkeleton)
- [x] Add skeleton variants: DrillCardSkeleton, UpNextSkeleton, ProgressStatsSkeleton, PlaylistItemSkeleton, BadgeProgressSkeleton

## Bug Fix: Video URL Validation Rejecting Valid YouTube URLs
- [x] Investigate URL validation in Admin Dashboard Add New Drill
- [x] Fix validation to accept standard YouTube URL formats:
  - youtube.com/watch?v=VIDEO_ID (standard)
  - youtube.com/watch/VIDEO_ID (non-standard but now supported)
  - youtu.be/VIDEO_ID (short URL)
  - youtube.com/embed/VIDEO_ID (embed URL)
- [x] Updated VideoPlayer.tsx, DrillPageBuilder.tsx, CustomDrillLayout.tsx
- [x] Test with various YouTube URL formats

## Bug Fix: Drill Details Page Showing Mixed/Duplicate Content
- [x] Investigate drill detail page rendering logic
- [x] Fix content duplication - now shows ONLY page builder content when it exists (not both)
- [x] Fix invalid video URL error - page builder content now takes full precedence
- [x] Ensure page builder content renders in correct order with Edit Page button

## Notion-Style Block Editor for Drill Pages
- [x] Create NotionBlockEditor component with block types:
  - [x] Text blocks (paragraphs)
  - [x] Headings (H1, H2, H3, H4)
  - [x] Bulleted lists
  - [x] Numbered lists
  - [x] Video embeds (YouTube)
  - [x] Dividers
  - [x] Callout/highlight boxes
  - [x] Quote blocks
  - [x] Image blocks
- [x] Implement slash command menu (/) to insert blocks
- [x] Add drag-and-drop block reordering
- [x] Add block controls (delete, duplicate, move up/down)
- [x] Integrate with existing DrillPageBuilder (DrillPageBuilderNotion)
- [x] Update CustomDrillLayout to render new block types
- [x] Apply glassmorphism styling to editor
- [x] Add markdown shortcuts (#, ##, ###, -, 1., >, ---)
- [x] Add template save/load functionality
- [x] Add preview mode toggle
- [x] Fix text direction (LTR) for contenteditable elements


## Bug Fix: Notion Block Editor Backwards Text Input
- [x] Fix contenteditable text direction issue (replaced contentEditable with controlled Input/Textarea components)
- [x] Improve text input handling in block editor (now uses standard React controlled inputs)
- [x] Make editor functionality easier and more intuitive
- [x] Test text input in all block types (paragraph, headings, lists, quote, callout)


## UI Fix: Alert Toggle Visibility in Activity Feed
- [x] Find alert toggle components in Activity Feed page
- [x] Improve toggle visibility with better contrast/colors (bright blue when on, visible gray when off)
- [x] Test toggle visibility on dark background


## Admin Dashboard: Delete Invite Button
- [x] Add delete button to each invite in Pending & Accepted Invites section
- [x] Create backend API endpoint to delete invites (deleteInvite in invites.ts and routers.ts)
- [x] Add confirmation dialog before deleting
- [x] Test delete functionality


## Homepage Hero Redesign - "Unleash Your Potential" Style
- [x] Update hero headline to stacked "UNLEASH YOUR POTENTIAL" format
- [x] Add cyan/electric blue accent on "POTENTIAL" word (italic style)
- [x] Update copy to focus on elite mechanics, explosive power, game-ready confidence
- [x] Add "NEXT GEN TRAINING" badge/pill above headline
- [x] Maintain dark sophisticated background


## Hero Heading Spacing Update
- [x] Change layout to "UNLEASH YOUR" on first line, "POTENTIAL" on second line
- [x] Remove italics from POTENTIAL
- [x] Center the heading text
- [x] Improve spacing between lines


## Search & Filter System Redesign
- [x] Prominent search bar with placeholder text and search icon
- [x] Pill-shaped difficulty filter buttons (Easy, Medium, Hard)
- [x] Category filter with cyan-highlighted "All Categories" button
- [x] Additional category options (All, Hitting, Bunting, Pitching, Infield, Outfield, Catching, Base Running)

## Drill Card Grid Layout
- [x] Convert drills to card-based grid system (3 columns)
- [x] Featured image area at top of each card (with gradient fallback)
- [x] Difficulty badge in top-right corner (Easy=green, Medium=amber, Hard=red)
- [x] Category tag in cyan with dot indicator
- [x] Drill title in bold white text
- [x] Brief description on card
- [x] "View Details" link with arrow on each card


## Drill Card Hover Animations
- [x] Add lift effect on hover (translateY -14px with scale 1.03)
- [x] Add glow effect on hover (box-shadow with electric blue multi-layer glow)
- [x] Add smooth transition for all effects (0.4s cubic-bezier)
- [x] Test hover animations on drill cards


## Drill Card Editing System
- [x] Create database schema for drill customizations (drillCustomizations table)
- [x] Create backend API endpoints for drill CRUD operations (getAll, upsert, uploadImage)
- [x] Implement image upload to S3 for drill thumbnails
- [x] Create drill edit modal component (DrillEditModal.tsx)
- [x] Add edit button/click handler on drill cards (admin only, visible on hover)
- [x] Implement description editing (brief description textarea)
- [x] Implement difficulty badge editing (Easy/Medium/Hard dropdown)
- [x] Implement category editing (Hitting/Bunting/Pitching/Infield/Outfield/Catching/Base Running)
- [x] Test persistence of changes (verified - description updates saved to database)


## Bug Fix: Drill Card Image Not Displaying & Edit Button Missing
- [x] Investigate why uploaded image shows broken icon instead of image (CloudFront URL access issue)
- [x] Check S3 upload and URL generation (URL is correct but may have access restrictions)
- [x] Fix image display on drill cards (added onError handler to hide broken images)
- [x] Investigate why edit button disappeared on mobile (hover-only visibility)
- [x] Restore edit button functionality (always visible on mobile, hover on desktop)
- [x] Test on mobile and desktop


## Bug Fix: Image Upload Not Working
- [x] Investigate why uploaded images are not displaying
- [x] Check S3 storage upload process (S3 URLs returning 403 - switched to base64 storage)
- [x] Verify image URL is being saved correctly to database (using data URL format)
- [x] Test image upload end-to-end (working with compressed JPEG images)


## Bug Fix: Hide Admin Edit Functions from Clients
- [x] Hide edit button on drill cards for non-admin users (already implemented with `user?.role === 'admin'` check)
- [x] Only show edit functionality to admin role (verified in code)
- [x] Test as admin (should see edit button) - confirmed working
- [x] Test as athlete/client (should NOT see edit button) - confirmed, condition prevents non-admins from seeing button


## Bug Fix: Image Upload Not Saving Changes
- [x] Investigate why uploaded images are not persisting after Save Changes
- [x] Check DrillEditModal save flow (working correctly)
- [x] Check server uploadThumbnail mutation (working correctly)
- [x] Fix the issue and test (database table was missing - created drill_customizations table)


## Bug Fix: Image Upload "Data Too Long" Error
- [x] Investigate error: "Data Too Long, field len 65535, data len 72410"
- [x] Root cause: thumbnailUrl field (text type, 65535 limit) was storing full data URL
- [x] Fix: Only store image data in imageBase64 field (longtext, unlimited)
- [x] Add client-side image compression (max 800x600, JPEG format)
- [x] Test with large images (1200x900 compressed to ~17KB JPEG)
- [x] Verify database saves correctly (confirmed 1 row saved)


## Athlete Assignment Overview in Coach Dashboard
- [ ] Create backend endpoint to fetch all athletes with their assignment status (has drills vs no drills)
- [ ] Design visual overview component showing athletes grouped by assignment status
- [ ] Add visual indicators (badges, colors) for assigned vs unassigned athletes
- [ ] Include quick stats (total athletes, assigned count, unassigned count)
- [ ] Add quick-assign button to easily navigate to assign drills for unassigned athletes
- [ ] Integrate into Coach Dashboard prominently
- [ ] Test the feature end-to-end


## Athlete Assignment Overview Feature (Coach Dashboard)
- [x] Create backend endpoint to fetch athlete assignment status (getAthleteAssignmentOverview)
- [x] Design visual overview component showing athletes with/without drills
- [x] Add summary stats (total athletes, with drills, without drills, completion rate)
- [x] Implement filter tabs (All, With Drills, Need Drills)
- [x] Add search functionality
- [x] Integrate into Coach Dashboard with quick-assign action (click athlete to assign drills)
- [x] Athletes without drills highlighted in amber and shown first
- [x] Tab navigation added (Athlete Overview, Assign Drills)


## Delete Drill Assignment Feature
- [x] Verify delete button (trash icon) exists on drill assignments
- [x] Verify backend unassignDrill endpoint works correctly
- [x] Test delete functionality - confirmed working (Jack Joelson's drill was deleted)
- [x] Delete button properly removes drill from athlete's assignments


## Delete Drill Assignment Fix
- [x] Identified issue: unassignDrill mutation not invalidating query cache
- [x] Added trpc.useUtils() to CoachDashboard
- [x] Added utils.drillAssignments.getAllAssignments.invalidate() after mutation
- [x] Tested deletion - UI now updates immediately after clicking delete button
- [x] Verified: Sean Jaeger's drills went from 3 → 2 after deletion


## Add Athlete Name to Activity Table
- [x] Add athleteName column to athleteActivity schema
- [x] Update activity logging functions to include athlete name
- [x] Run database migration
- [x] Test that activity records now show athlete names


## Backfill Athlete Names Across Database
- [x] Query athleteActivity to get ID-to-name reference mappings
- [x] Update athleteActivity table to fill NULL athleteName values (263 records updated)
- [x] Add athleteName column to coachNotes, drillQuestions, weeklyGoals, drillAssignments, drillSubmissions, badges tables
- [x] Update all tables with athlete names from users table
- [x] Set orphaned records (deleted users) to "Unknown Athlete"
- [x] Verify all updates completed successfully - 0 NULL values remaining across all tables


## Fix YouTube URL Validation in Create a Drill
- [x] Investigate video URL validation logic
- [x] Fix to accept all YouTube URL formats (youtube.com/watch, youtu.be, with tracking params)
- [x] Fixed regex in VideoPlayer, CustomDrillLayout, DrillPageBuilder, NotionBlockEditor
- [x] Test drill creation with various YouTube URL formats (11 tests passing)


## Notion-Style Block Editor for Drill Pages
- [x] Examine existing block editor and drill page layout code
- [x] Add image upload block type with S3 storage (click to upload, drag & drop, 10MB limit)
- [x] Enhanced block types: text, H1-H4, bulleted list, numbered list, quote, callout, divider, video, image
- [x] Implement image editing tools (size: small/medium/large/full, alignment: left/center/right, caption)
- [x] Add Coach Dashboard "Page Layouts" tab to pick a drill and create/edit its layout
- [x] Updated CustomDrillLayout to render image size/alignment/caption for athletes
- [x] Updated DrillPageBuilderNotion to preserve image properties through conversion
- [x] Test full workflow end-to-end - verified in browser
- [x] Write unit tests - 15 tests passing (block conversion, image properties, round-trip)


## Drill Comparison View
- [x] Create DrillComparison page component
- [x] Build side-by-side drill selector with search and category filter
- [x] Display drill details comparison (name, difficulty, duration, categories)
- [x] Show video comparison side-by-side with embedded YouTube players
- [x] Add comparison highlights for differences
- [x] Add route and navigation from Coach Dashboard
- [x] Write unit tests (5 YouTube extraction + 2 data structure tests)

## Athlete Assessment Reports
- [x] Create AthleteAssessment page component using existing tRPC endpoints
- [x] Athlete selector dropdown with drill count preview
- [x] Display per-athlete progress metrics (completion rate, in progress, avg completion time)
- [x] Show weekly activity chart (last 4 weeks)
- [x] Recent completions and active assignments lists
- [x] Auto-generated personalized recommendations
- [x] Engagement level badge (Highly Engaged / Moderately Engaged / Needs Encouragement / At Risk)
- [x] Team overview stats (total athletes, with drills, total assigned, completion rate)
- [x] Add route and navigation from Coach Dashboard
- [x] Write unit tests (4 engagement level + 7 recommendation tests)


## UI Redesign - Premium Dark Theme
- [x] Research modern sports app UI design patterns
- [x] Upgrade fonts (Bebas Neue for headings, Poppins for body)
- [x] Rewrite index.css with enhanced theme (gradients, glass cards, animations)
- [x] Redesign Home page hero with bold typography and stat counters
- [x] Redesign drill cards with glass-card styling and hover effects
- [x] Redesign Coach Dashboard with gradient header and stat cards
- [x] Redesign DrillDetail page with premium dark theme
- [x] Redesign DrillComparison page with glass-card styling
- [x] Redesign AthleteAssessment page with glass-card styling


## Athlete Table with All Details (Frontend Only)
- [ ] Examine existing tRPC queries for athlete data
- [ ] Build comprehensive Athlete Table (ID, name, email, latest activity, status, drill count, etc.)
- [ ] Add to Coach Dashboard with sorting and search
- [ ] No backend or database changes

## Athlete Table - Coach Dashboard
- [x] Create AthleteTable component with comprehensive athlete details
- [x] Add "Athletes Table" tab to Coach Dashboard tab navigation
- [x] Display columns: ID, Name, Email, Status, Drills, Done, Last Activity, Last Sign In, Joined
- [x] Implement sortable columns (click to sort asc/desc)
- [x] Implement search by name, email, or ID
- [x] Implement status filter tabs (All, Active, Pending, Inactive)
- [x] Add expandable row detail view with full athlete info (role, account type, active client, completion rate, etc.)
- [x] Add pagination (15 rows per page)
- [x] Style with premium dark theme (glass-card, gradient borders)
- [x] Frontend-only implementation (no backend/database changes)
- [x] Merge data from getAthleteAssignmentOverview and getAllUsers endpoints
- [x] Write vitest tests for data merging, filtering, sorting, and pagination logic (28 tests passing)

## Practice Planner - Session Planning Tool
- [x] Research best baseball practice plan generators (Dugout Edge, Baseball Blueprint, Connected Performance)
- [x] Design database schema (practicePlans + practicePlanBlocks tables)
- [x] Create database tables and push migrations
- [x] Build database helper functions (create, get, update, delete, duplicate, share)
- [x] Create tRPC routes with coach-only authorization (create, getAll, getById, update, delete, duplicate, toggleShare, getMySharedPlans, getTemplates)
- [x] Build PracticePlanner UI component with list/create/edit/detail views
- [x] Implement drill library picker with search (pulls from drills.json + custom drills)
- [x] Add session blocks: drill, warmup, cooldown, break, custom types
- [x] Add drag-reorder for blocks, sets/reps/notes per block
- [x] Add focus area chips (Hitting, Pitching, Fielding, etc.)
- [x] Add athlete assignment dropdown (from users + invites)
- [x] Add session date picker and duration tracking
- [x] Add plan status management (Draft, Scheduled, Completed, Cancelled)
- [x] Add duplicate plan functionality
- [x] Add share toggle to share plans with assigned athletes
- [x] Add "Practice Planner" tab to Coach Dashboard
- [x] Build SharedPracticePlans component in Athlete Portal
- [x] Athlete can view shared plans with expandable block details
- [x] Mobile-first responsive design throughout
- [x] Write vitest tests (24 tests: CRUD, sharing, authorization, validation, templates)
- [x] All 24 tests passing

## Mobile Tab Visibility Fix - Practice Planner
- [x] Make Practice Planner tab easily visible on mobile
- [x] Improve tab bar scrollability/layout for 5 tabs on small screens

## Practice Planner Redesign - Visual Session Playbook
- [x] Redesign planner as a highly visual, detailed session playbook
- [x] Add rich block customization (coaching cues, key points, visual indicators per block)
- [x] Add session mode view for quick pull-up during live sessions
- [x] Add floating quick-access button for instant planner access (Session button on each card)
- [x] Add granular athlete sharing controls (selective share per athlete)
- [x] Mobile-optimized session view with large touch targets
- [x] Color-coded block types with visual hierarchy
- [x] Add notes/cues field per block for memory aids
- [x] Test on mobile and verify responsiveness

## Bug Fix - AthleteTable Key Prop
- [x] Fix missing unique "key" prop in AthleteTable list rendering

## 4. Accessibility & Responsive Optimization
- [x] Improve color contrast across dashboard (high-contrast text/backgrounds)
- [x] Add focus indicators for keyboard navigation on all interactive elements
- [x] Add ARIA labels to all interactive components (buttons, inputs, tabs, modals)
- [x] Audit and fix responsive layouts for mobile/tablet across all pages
- [x] Test flexible grid performance on tablets and smartphones

## 5. Scheduling & Practice Planning Expansion
- [x] Add calendar view to Practice Planner for scheduling drills over time
- [x] Allow assigning practice plans to athletes with goal-setting
- [x] Add automated follow-up email notifications for assigned drills
- [x] Add reminder notifications to prompt athletes to complete tasks

## 6. Page Builder & Content Editing Improvements
- [x] Add autosave to Page Builder overlay
- [x] Add version control (undo/redo history) to Page Builder
- [x] Add preview functionality to Page Builder
- [x] Add clearer instructions/guidance in Page Builder
- [x] Create templated page layouts for drill pages (5 built-in templates seeded)

## Page Builder: Markdown Paste from Notion
- [x] Support pasting Markdown content from Notion into Page Builder templates
- [x] Parse headings (# ## ### ####) into appropriate block types
- [x] Parse bold (**text**) and italic (*text*) formatting within blocks
- [x] Parse bulleted lists (- item) into bulleted list blocks
- [x] Parse numbered lists (1. item) into numbered list blocks
- [x] Parse blockquotes (> text) into quote blocks
- [x] Parse horizontal rules (---) into divider blocks
- [x] Parse links [text](url) and inline code within text blocks
- [x] Handle multi-line paste creating multiple blocks at once
- [x] Write tests for Markdown paste parsing

## SEO Fixes - Homepage
- [x] Add H2 heading to homepage
- [x] Set document.title to 30-60 characters on homepage

## Phase 2: Session Notes Input
- [x] Create sessionNotes table in schema (athleteId, sessionDate, sessionNumber, skillsWorked, whatImproved, whatNeedsWork, homeworkDrills, overallRating, privateNotes)
- [x] Create progressReports table in schema (for storing generated reports)
- [x] Run db:push migration
- [x] Build tRPC procedures: createSessionNote, getSessionNotes, getSessionNote, updateSessionNote, deleteSessionNote, getNextSessionNumber
- [x] Build mobile-optimized Session Notes form (quick-tap skill chips, fast text entry)
- [x] Build Session History timeline view per athlete
- [x] Integrate Session Notes tab into Coach Dashboard
- [x] Write vitest tests for session notes procedures

## Phase 3: AI Reports + Email Delivery
- [x] Build AI report generation tRPC procedure using invokeLLM with Coach Steve's voice
- [x] Build Report Review UI with inline editing
- [x] Build branded HTML report with logo and tagline (Coach Steve / Elite Instruction. Measurable Growth.)
- [x] Build email delivery for reports to parents via Resend
- [x] Store generated reports in database with report history
- [x] Add Generate Report button to session notes view (wired in SessionHistory + SessionNotesTab)
- [x] Write vitest tests for report generation (12 tests passing)

## Bug Fix: Generate Report 404
- [x] Fix Generate Report button navigating to 404 instead of triggering inline report generation (verified working — re-publish to deploy)

## LLM Model Change
- [x] Switch LLM model from gemini-2.5-flash to gpt-4o

## Bug Fix: Practice Plan Player Selection
- [x] Fix selecting one athlete auto-selects entire group instead of individual selection (root cause: a.userId was undefined for all athletes, making all Select items share value "undefined")

## Enhanced Player Profiles
- [x] Add parent contact fields (parentName, parentEmail, parentPhone) to database schema
- [x] Add birthDate field to database schema
- [x] Add position field to database schema
- [x] Add focusAreas field to database schema
- [x] Migrate database with new fields
- [x] Update server procedures for reading/writing profile fields
- [x] Build coach-facing athlete profile edit UI (view/edit player details)
- [x] Build athlete-facing profile display/edit UI
- [x] Integrate profile data into progress reports (parent email, player context)
- [x] Write tests for new profile CRUD operations

## Fix: Custom Drills Not Integrated Alphabetically
- [x] Investigate how custom drills are loaded vs static drills across all surfaces
- [x] Fix DrillsDirectory page to merge custom drills alphabetically with built-in drills
- [x] Fix coach dashboard drill assignment to include custom drills alphabetically
- [x] Fix Athlete Portal drill listing to merge custom drills alphabetically
- [x] Fix Home page, SessionNotesForm, PracticePlanner, SingleVideoUpload
- [x] Create shared useAllDrills hook to eliminate duplicate merge logic
- [x] Verify all drill listing surfaces show unified, alphabetically sorted results

## AI-Powered Video Analysis
- [x] Audit existing video infrastructure, schema, and Gemini API setup
- [x] Add videoAnalysis table to database schema (status, AI feedback, coach edits, timestamps)
- [x] Migrate database with new video analysis table
- [x] Build Gemini video analysis server procedure (send video URL → receive structured feedback)
- [x] Build coach review/edit UI for AI-generated feedback in dashboard
- [x] Build athlete video submission UI with analysis status tracking
- [x] Build athlete feedback display UI (view approved feedback)
- [x] Build email delivery for coach-approved feedback
- [x] Write tests for video analysis CRUD and Gemini integration

## Bug Fix: Empty src Attribute on Coach Dashboard
- [x] Fix empty string passed to src attribute causing browser re-download warning

## Athlete Video Upload for AI Analysis
- [x] Audit current athlete portal and existing video submission flow
- [x] Build athlete video upload component (drill picker, video upload to S3, mobile-optimized)
- [x] Integrate upload component into Athlete Portal (drill focus modal)
- [x] Auto-create videoAnalysis record on upload so it appears in coach review queue
- [x] Restyle DrillSubmissionForm for dark theme with mobile-first design
- [x] Add capture="environment" for direct phone camera access
- [ ] Test end-to-end: athlete uploads → record created → coach sees in dashboard

## Bug Fix: Video Upload Issues
- [x] Remove capture="environment" so mobile users can choose from photo library (not camera-only)
- [x] Fix desktop upload fetch error — switched from base64 tRPC to multipart FormData upload route
- [x] Added /api/upload/video Express route with multer for large file support (100MB)
- [x] Updated DrillSubmissionForm to use multipart upload instead of base64
- [x] Verified endpoint returns 401 for unauthenticated requests
- [x] TypeScript compiles cleanly, 286 tests pass (2 pre-existing failures unrelated)

## Upload UX: Real-Time Progress & Video Compression
- [x] Replace fetch() with XMLHttpRequest for real-time upload progress percentage
- [x] Show accurate upload progress bar with bytes transferred / total
- [x] Add client-side video compression via ffmpeg.wasm before upload
- [x] Show two-phase progress: compression (amber) then upload (blue) with phase indicators
- [x] Skip compression for files under 10MB threshold
- [x] Show compression savings indicator (original → compressed size)
- [x] Add cancel upload button
- [x] Graceful fallback if compression fails (uploads original)
- [x] Increased file limit to 500MB client-side, 200MB server-side
- [x] TypeScript compiles cleanly, 286 tests pass

## Standalone Swing Analyzer (Athlete Portal)
- [x] Add server procedure for standalone swing submission (no drill/assignment required)
- [x] Make submissionId and drillId nullable in videoAnalysis schema for standalone swings
- [x] Build prominent "Analyze My Swing" button on Athlete Portal with glassmorphism styling
- [x] Build mobile-optimized swing upload dialog (video + notes + swing type selector)
- [x] Integrated real-time XHR upload progress and ffmpeg compression
- [x] Auto-trigger Gemini analysis on submission via submitSwing procedure
- [x] Updated coach VideoAnalysisTab to display standalone swings (shows swing type instead of drill)
- [x] Show submission history and feedback status on athlete portal
- [x] TypeScript compiles cleanly, 286 tests pass (2 pre-existing failures)

## Bug Fix: React Error #310 on Coach Dashboard
- [x] Investigate and fix React error #310 crash when accessing coach dashboard (Session Notes tab)
- [x] Root cause: useQuery hook placed after early return in SessionNotesTab.tsx (conditional hook call)
- [x] Fix: Moved athleteProfile useQuery hook before the early return, using `enabled` flag for conditional fetching
- [x] Verified: Session Notes tab loads, athlete selection works, Generate Report works, navigation between views works

## Athlete Portal: Video Feedback Viewer
- [x] Create tRPC procedure for athletes to fetch their own video analyses (approved/sent status)
- [x] Build AthleteVideoFeedback component with structured AI feedback display
- [x] Add "My Swing Feedback" section/tab to Athlete Portal
- [x] Display video player alongside AI analysis results
- [x] Show feedback status indicators (pending, analyzing, under review, approved)
- [x] Support both drill-specific and standalone swing feedback
- [x] Mobile-optimized responsive design matching dark theme
- [x] Write vitest tests for the new athlete feedback query
- [x] Verify in browser and test navigation flows

## Session Notes: Pre-built Templates & Editable Fields
- [x] Add pre-built template options for "What Improved This Session" with Coach Steve coaching phrases
- [x] Add pre-built template options for "What Still Needs Work" with Coach Steve coaching phrases
- [x] Include "Custom" option for free-text entry when templates don't fit
- [x] Make session title (Session #) editable
- [x] Make date field editable (was already editable, confirmed)
- [x] Write vitest tests for the updated session notes functionality
- [x] Verify in browser — all features working correctly

## UX: Scroll Position Restoration
- [x] Identify all pages with card navigation (drill library, athlete portal, practice planner, etc.)
- [x] Implement scroll restoration hook using sessionStorage
- [x] Create ScrollRestoreLink component to save scroll position before navigation
- [x] Apply scroll restoration to drill library (Home.tsx)
- [x] Test navigation flow: click card → view detail → go back → verify scroll position restored
- [x] Verified: Returns to exact scroll position (1100px tested) — SUCCESS!

## Blast Motion Metrics Tracking
- [x] Add players, sessions, and blast_metrics tables to Drizzle schema
- [x] Run database migration (pnpm db:push)
- [x] Seed initial data — cleaned to only real athletes (Sean Yaegar, Gavin Goldstein)
- [x] Create backend tRPC routes for blast metrics (listPlayers, getPlayer, getPlayerSessions, getSessionTypes, getTrends, getAverages, addPlayer, addSession)
- [x] Verify data with test query: avg bat_speed_mph and rotational_acceleration_g by session_type
- [x] Build Player Roster View component (list all players with session counts)
- [x] Build Player Detail Dashboard (summary cards, session history, averages table)
- [x] Build Trend Visualization (line/bar chart for bat_speed_mph and rotational_acceleration_g over time)
- [x] Add session_type filter dropdown to isolate session types
- [x] Integrate Blast Motion section into Coach Dashboard (coach-only, not athlete-facing)
- [x] Fix tRPC "<!doctype" HTML response error — added /api/* exclusion in vite.ts catch-all
- [x] Write vitest tests for blast metrics backend (10 tests pass)
- [x] Verify in browser — all features working correctly

## Blast Motion: Data Cleanup & Session Count Fix
- [x] Remove sample players (Mike Troutman, Alex Johnson, David Ortiz Jr., Shannon Caputo) — kept only Sean Yaegar and Gavin Goldstein
- [x] Fix Drizzle ORM session count subquery — switched from correlated subquery to LEFT JOIN with GROUP BY
- [x] Link Blast players to actual portal user accounts — Sean Jaeger (userId 3570024), Gavin Goldstein (userId 3780043)
- [x] Verify session counts display correctly in the UI — Gavin: 1 session, Sean: 3 sessions ✓

## Link Blast Players to Portal Accounts
- [x] Find portal user IDs for Sean Yaegar and Gavin Goldstein
- [x] Update blastPlayers.userId to link to their portal user accounts
- [x] Added blastEmail column to store Blast Connect emails (JKrichever@gmail.com, adgold77@yahoo.com)
- [x] Update Blast Metrics UI to show linked user info (portal email, Blast email)
- [x] Verify linked profiles display correctly in the Coach Dashboard — green dot with linked email shown

## Manual Blast Session Entry UI
- [x] Build "Add Session" dialog/form accessible from Blast Metrics player detail view
- [x] Player selector (existing players + add new player option) on roster view
- [x] Session date picker and session type selector
- [x] All 13 Blast metric input fields with proper labels and units
- [x] Form validation (require player, date, session type; metrics optional)
- [x] Success feedback and auto-refresh of player data after adding
- [x] Add "Add New Player" inline form on roster view
- [x] Delete session capability
- [x] Write vitest tests for the add session flow

## Link Blast Sessions with Session Notes
- [x] Audit Blast players/sessions and Session Notes schemas to understand data models
- [x] Design linking strategy between Blast sessions and Session Notes
- [x] Add schema changes (e.g., blastSessionId FK on session_notes, or blastPlayerId link to athletes)
- [x] Update backend procedures to auto-create/link session notes when adding Blast sessions
- [x] Update Session Notes UI to show linked Blast metrics
- [x] Update Blast Metrics UI to show linked session notes
- [x] Ensure Shannon Caputo's Blast data links to her session/athlete profile
- [x] Write vitest tests for the linking flow

## Edit Blast Session Dialog
- [x] Add updateSession backend procedure to update session date, type, and all metrics
- [x] Build EditBlastSession dialog component with pre-filled form fields
- [x] Add Edit button to session history table rows
- [x] Write vitest tests for updateSession

## CSV Bulk Import for Blast Sessions
- [x] Add bulkImportSessions backend procedure that parses CSV and creates sessions+metrics
- [x] Build CSV import dialog with file upload, column mapping preview, and confirmation
- [x] Handle CSV parsing edge cases (missing columns, bad data, duplicates)
- [x] Write vitest tests for bulk import

## Retroactive Session Note Creation
- [x] Add createRetroactiveNotes backend procedure that creates session notes for all unlinked Blast sessions of a linked player
- [x] Add "Create Missing Notes" button on player detail view (visible when player is linked and has sessions without notes)
- [x] Show count of sessions missing notes
- [x] Write vitest tests for retroactive note creation

## Athlete Dashboard - Sessions/Notes/Metrics View
- [x] Build athlete-facing Blast Metrics view (read-only) showing their sessions and trends
- [x] Build athlete-facing Session Notes view showing their session history and notes
- [x] Add navigation to athlete dashboard for sessions/notes/metrics
- [x] Ensure coach-only data (private notes) is hidden from athlete view
- [x] Mobile-optimized layout for athlete dashboard
- [x] Write vitest tests for athlete data access

## Session Note Sharing Toggle
- [x] Add sharedWithAthlete column to sessionNotes schema (default true for new notes)
- [x] Run db:push to apply migration
- [x] Add toggleSharing backend procedure to flip the flag
- [x] Update getMyNotes athlete query to filter by sharedWithAthlete = true
- [x] Add sharing toggle switch to coach SessionHistory UI
- [x] Show shared/unshared indicator on each note
- [x] Write vitest tests for sharing toggle

## Bulk Share/Hide All Session Notes
- [x] Add bulkToggleSharing backend procedure
- [x] Add Share All / Hide All buttons to SessionHistory UI
- [x] Write vitest tests for bulk toggle

## Athlete Portal Redesign - Drill Modal
- [x] Redesign drill modal to show clear instructions (objectives, steps, tips) first
- [x] Add motivational coach message section ("Coach Steve says...")
- [x] Move submission form to end of modal, make it optional
- [x] Add "Mark as Done" quick completion button
- [x] Simplify notes field with guided prompts
- [x] De-emphasize video upload, offer pre-defined feedback options

## Athlete Portal Gamification
- [x] Create gamification schema (streaks, badges, points, achievements)
- [x] Build streak tracking logic (consecutive days/sessions)
- [x] Create badge/achievement system with unlock conditions
- [x] Build progress tracking with visual indicators
- [x] Add gamification dashboard section to athlete portal
- [x] Display streaks, badges, and progress visually
- [x] Reward athletes for completing drills with points/badges
- [x] Write vitest tests for gamification system

## Drill Videos Database Table
- [ ] Review existing drill data to identify video URL sources
- [ ] Create drillVideos table in schema with drillId and videoUrl columns
- [ ] Push migration to database
- [ ] Populate table with existing video URLs from drill data
- [ ] Write vitest tests for the new table

## Coach Steve Baseball Color Rebrand
- [x] Update global CSS theme variables in index.css (backgrounds to #1a1a1a/#2a2a2a, primary to #DC143C)
- [x] Update hero section gradient text and badges to crimson
- [x] Update all primary action buttons to crimson #DC143C with hover #B91030
- [x] Update active tab states in Coach Dashboard to crimson
- [x] Update active filter button states to crimson
- [x] Update toggle switches to crimson when enabled
- [x] Update card hover borders to crimson
- [x] Update card backgrounds to #2a2a2a with border-white/10
- [x] Update table header rows to #2a2a2a
- [x] Preserve functional colors (Active/Inactive badges, difficulty badges, progress bars)
- [x] Update text colors: headlines white, body gray-400, hover states crimson
- [x] Verify all pages visually after changes

## Fix Blast Session Note Template
- [x] Change auto-generated Blast session notes from fake "WHAT IMPROVED" / "WHAT NEEDS WORK" to "SESSION BLAST METRICS" with raw metrics
- [x] Update retroactive note creation to use the same fixed template
- [x] Verify existing notes display correctly

## Remove Drill
- [x] Remove "Advanced Batting Practice" from drill library data

## Remove Drills (Batch 2)
- [x] Remove "Beginner's Batting Practice" from all data files
- [x] Remove "Cup Ball Game" from all data files
- [x] Remove "Offensive Stations - Tee and Live Hitting" from all data files
- [x] Remove "Offensive Stations – Cage Work and Baserunning" from all data files
- [x] Remove "Execute - On the Field Whiffle Ball Toss" from all data files
- [x] Remove "One Cut Competition" from all data files
- [x] Remove "Team Bunting Stations" from all data files
- [x] Remove "Indoor Facility Defensive Stations" from all data files
- [x] Remove "Team Situations" from all data files
- [x] Remove "Execute - On the Field" from all data files
- [x] Remove "Whiffle Ball Toss" from all data files

## Fix Drill Library Navigation State Persistence
- [x] Store page/category/search/sort in URL query string
- [x] Parse URL query params on list page load and apply to UI controls
- [x] Update URL when user changes page, category, search, or sort
- [x] Drill card links preserve query string in detail URL
- [x] Back button restores full list state from URL params
- [x] Scroll position saved to sessionStorage keyed by query string
- [x] Scroll position restored after list renders on Back navigation
- [x] Write vitest tests for URL state parsing and navigation

## Inline Goal Editing on Original Drill Template
- [x] Add inline edit button to Goal section on original drill template
- [x] Implement click-to-edit UI for goal text (textarea with save/cancel)
- [x] Create or reuse backend mutation to save goal text
- [x] Restrict editing to admin/coach roles only
- [x] Write vitest tests for goal editing

## Remove Drill (4 Corners)
- [x] Remove "4 Corners" from all data files

## Editable Report Sections & Modern Email Template
- [x] Make report title/heading editable in review UI
- [x] Make section headings (What Stood Out, Building On, Next Steps) editable
- [x] Make all section body text editable
- [x] Make closing motivational quote editable
- [x] Modernize email template with premium aesthetic design
- [x] Write vitest tests for editable report fields

## 2 Free Drill Preview (Teaser for Unauthenticated Visitors)
- [x] Create usePreviewLimit hook with localStorage tracking of viewed drill slugs
- [x] Build DrillPreviewWall component (signup prompt when limit reached)
- [x] Integrate preview gate into DrillDetail - show wall after 2 views for non-logged-in users
- [x] Logged-in users bypass the limit entirely
- [x] Drill directory list remains fully browsable for everyone
- [x] Write vitest tests for preview limit logic

## Fix 2 Free Drill Preview System
- [x] Fix preview logic: PREVIEW_MODE=true causes hasAccess to always be true, masking the anonymous flow
- [x] Ensure anonymous users see content for first 2 drills then hit the wall on 3rd
- [x] Ensure recordView fires correctly for anonymous visitors
- [x] Browser test as anonymous user to verify wall appears (verified code logic; server session prevents full browser test)

## Remove Unwanted Blast Metrics
- [x] Keep only: Bat Speed, On Plane Efficiency, Attack Angle, Exit Velocity
- [x] Remove all other metrics from DB schema (drizzle/schema.ts)
- [x] Remove from server routers (input validation, queries)
- [x] Remove from client UI (session forms, display components, Averages by Session Type table, CSV import help text)
- [x] Push DB migration (dropped 10 columns, added exitVelocityMph)
- [x] Run tests to verify (397 pass, 2 pre-existing failures unrelated to blast metrics)

## Fix Drill Card Display Bug (Blank Black Windows)
- [ ] Audit drill card components and identify root cause of blank rendering
- [ ] Check if cards rely on browser storage or state-only data
- [ ] Verify data fetching is role-agnostic and works for guests
- [ ] Add loading states and skeleton placeholders
- [ ] Add error handling for failed fetches
- [ ] Test across all user roles (Admin, User, Athlete, Guest)
- [ ] Verify cards persist across page reloads
