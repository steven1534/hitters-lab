import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { blastPlayers, blastSessions, blastMetrics, users, sessionNotes } from "../drizzle/schema";
import { eq, asc, and, sql, desc } from "drizzle-orm";
import * as sessionNotesDb from "./sessionNotes";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

export const blastMetricsRouter = router({
  /** List all Blast Motion players */
  listPlayers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const db = await requireDb();
    const players = await db
      .select({
        id: blastPlayers.id,
        fullName: blastPlayers.fullName,
        userId: blastPlayers.userId,
        blastEmail: blastPlayers.blastEmail,
        createdAt: blastPlayers.createdAt,
        sessionCount: sql<number>`COUNT(DISTINCT ${blastSessions.id})`.mapWith(Number),
        latestSession: sql<Date | null>`MAX(${blastSessions.sessionDate})`,
        portalName: users.name,
        portalEmail: users.email,
      })
      .from(blastPlayers)
      .leftJoin(blastSessions, eq(blastSessions.playerId, blastPlayers.id))
      .leftJoin(users, eq(users.id, blastPlayers.userId))
      .groupBy(blastPlayers.id, blastPlayers.fullName, blastPlayers.userId, blastPlayers.blastEmail, blastPlayers.createdAt, users.name, users.email)
      .orderBy(asc(blastPlayers.fullName));
    return players;
  }),

  /** Get a single player's details */
  getPlayer: protectedProcedure
    .input(z.object({ playerId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await requireDb();
      const [player] = await db
        .select({
          id: blastPlayers.id,
          fullName: blastPlayers.fullName,
          userId: blastPlayers.userId,
          blastEmail: blastPlayers.blastEmail,
          createdAt: blastPlayers.createdAt,
          portalName: users.name,
          portalEmail: users.email,
        })
        .from(blastPlayers)
        .leftJoin(users, eq(users.id, blastPlayers.userId))
        .where(eq(blastPlayers.id, input.playerId));
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Player not found" });
      }
      return player;
    }),

  /** Get all sessions for a player, with metrics joined */
  getPlayerSessions: protectedProcedure
    .input(
      z.object({
        playerId: z.string(),
        sessionType: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await requireDb();

      const conditions = [eq(blastSessions.playerId, input.playerId)];
      if (input.sessionType && input.sessionType !== "All") {
        conditions.push(eq(blastSessions.sessionType, input.sessionType));
      }

      const sessions = await db
        .select({
          id: blastSessions.id,
          sessionDate: blastSessions.sessionDate,
          sessionType: blastSessions.sessionType,
          batSpeedMph: blastMetrics.batSpeedMph,
          onPlaneEfficiencyPercent: blastMetrics.onPlaneEfficiencyPercent,
          attackAngleDeg: blastMetrics.attackAngleDeg,
          exitVelocityMph: blastMetrics.exitVelocityMph,
          linkedNoteId: sessionNotes.id,
        })
        .from(blastSessions)
        .leftJoin(blastMetrics, eq(blastMetrics.sessionId, blastSessions.id))
        .leftJoin(sessionNotes, eq(sessionNotes.blastSessionId, blastSessions.id))
        .where(and(...conditions))
        .orderBy(asc(blastSessions.sessionDate));

      return sessions.map(s => ({
        ...s,
        hasLinkedNote: !!s.linkedNoteId,
      }));
    }),

  /** Get unique session types for a player (for filter dropdown) */
  getSessionTypes: protectedProcedure
    .input(z.object({ playerId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await requireDb();
      const types = await db
        .selectDistinct({ sessionType: blastSessions.sessionType })
        .from(blastSessions)
        .where(eq(blastSessions.playerId, input.playerId))
        .orderBy(asc(blastSessions.sessionType));
      return types.map((t: { sessionType: string | null }) => t.sessionType).filter(Boolean) as string[];
    }),

  /** Get trend data for a player */
  getTrends: protectedProcedure
    .input(
      z.object({
        playerId: z.string(),
        sessionType: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await requireDb();

      const conditions = [eq(blastSessions.playerId, input.playerId)];
      if (input.sessionType && input.sessionType !== "All") {
        conditions.push(eq(blastSessions.sessionType, input.sessionType));
      }

      const data = await db
        .select({
          sessionDate: blastSessions.sessionDate,
          sessionType: blastSessions.sessionType,
          batSpeedMph: blastMetrics.batSpeedMph,
          onPlaneEfficiencyPercent: blastMetrics.onPlaneEfficiencyPercent,
          attackAngleDeg: blastMetrics.attackAngleDeg,
          exitVelocityMph: blastMetrics.exitVelocityMph,
        })
        .from(blastSessions)
        .leftJoin(blastMetrics, eq(blastMetrics.sessionId, blastSessions.id))
        .where(and(...conditions))
        .orderBy(asc(blastSessions.sessionDate));

      return data;
    }),

  /** Get averages for a player, grouped by session type */
  getAverages: protectedProcedure
    .input(z.object({ playerId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await requireDb();

      const averages = await db
        .select({
          sessionType: blastSessions.sessionType,
          avgBatSpeed: sql<string>`ROUND(AVG(CAST(${blastMetrics.batSpeedMph} AS DECIMAL(5,2))), 2)`,
          avgOnPlaneEfficiency: sql<string>`ROUND(AVG(CAST(${blastMetrics.onPlaneEfficiencyPercent} AS DECIMAL(5,2))), 2)`,
          avgAttackAngle: sql<string>`ROUND(AVG(CAST(${blastMetrics.attackAngleDeg} AS DECIMAL(5,2))), 2)`,
          avgExitVelocity: sql<string>`ROUND(AVG(CAST(${blastMetrics.exitVelocityMph} AS DECIMAL(5,2))), 2)`,
          sessionCount: sql<number>`COUNT(*)`,
        })
        .from(blastSessions)
        .leftJoin(blastMetrics, eq(blastMetrics.sessionId, blastSessions.id))
        .where(eq(blastSessions.playerId, input.playerId))
        .groupBy(blastSessions.sessionType)
        .orderBy(asc(blastSessions.sessionType));

      return averages;
    }),

  /** Add a new player */
  addPlayer: protectedProcedure
    .input(z.object({ fullName: z.string().min(1), userId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await requireDb();
      const id = crypto.randomUUID();
      await db.insert(blastPlayers).values({
        id,
        fullName: input.fullName,
        userId: input.userId ?? null,
      });
      return { id, fullName: input.fullName };
    }),

  /** Link a Blast player to a portal user account */
  linkPlayer: protectedProcedure
    .input(z.object({ playerId: z.string(), userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await requireDb();
      await db.update(blastPlayers).set({ userId: input.userId }).where(eq(blastPlayers.id, input.playerId));
      return { success: true };
    }),

  /** Unlink a Blast player from their portal user account */
  unlinkPlayer: protectedProcedure
    .input(z.object({ playerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await requireDb();
      await db.update(blastPlayers).set({ userId: null }).where(eq(blastPlayers.id, input.playerId));
      return { success: true };
    }),

  /** Get the linked session note for a Blast session */
  getLinkedSessionNote: protectedProcedure
    .input(z.object({ blastSessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await requireDb();
      const [note] = await db
        .select()
        .from(sessionNotes)
        .where(eq(sessionNotes.blastSessionId, input.blastSessionId))
        .limit(1);
      return note ?? null;
    }),

  /** Get Blast metrics for a session note (reverse lookup) */
  getBlastDataForSessionNote: protectedProcedure
    .input(z.object({ blastSessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await requireDb();
      const [session] = await db
        .select({
          id: blastSessions.id,
          sessionDate: blastSessions.sessionDate,
          sessionType: blastSessions.sessionType,
          batSpeedMph: blastMetrics.batSpeedMph,
          onPlaneEfficiencyPercent: blastMetrics.onPlaneEfficiencyPercent,
          attackAngleDeg: blastMetrics.attackAngleDeg,
          exitVelocityMph: blastMetrics.exitVelocityMph,
        })
        .from(blastSessions)
        .leftJoin(blastMetrics, eq(blastMetrics.sessionId, blastSessions.id))
        .where(eq(blastSessions.id, input.blastSessionId))
        .limit(1);
      return session ?? null;
    }),

  /** Add a session with metrics for a player, auto-create linked session note if player has userId */
  addSession: protectedProcedure
    .input(
      z.object({
        playerId: z.string(),
        sessionDate: z.string(),
        sessionType: z.string(),
        createSessionNote: z.boolean().optional(), // explicitly opt-in/out
        metrics: z.object({
          batSpeedMph: z.string().optional(),
          onPlaneEfficiencyPercent: z.string().optional(),
          attackAngleDeg: z.string().optional(),
          exitVelocityMph: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await requireDb();
      const sessionId = crypto.randomUUID();
      await db.insert(blastSessions).values({
        id: sessionId,
        playerId: input.playerId,
        sessionDate: new Date(input.sessionDate),
        sessionType: input.sessionType,
      });
      await db.insert(blastMetrics).values({
        sessionId,
        batSpeedMph: input.metrics.batSpeedMph ?? null,
        onPlaneEfficiencyPercent: input.metrics.onPlaneEfficiencyPercent ?? null,
        attackAngleDeg: input.metrics.attackAngleDeg ?? null,
        exitVelocityMph: input.metrics.exitVelocityMph ?? null,
      });

      // Auto-create a linked session note if the player is linked to a portal user
      let linkedSessionNoteId: number | null = null;
      const shouldCreateNote = input.createSessionNote !== false; // default true
      if (shouldCreateNote) {
        const [player] = await db
          .select({ userId: blastPlayers.userId, fullName: blastPlayers.fullName })
          .from(blastPlayers)
          .where(eq(blastPlayers.id, input.playerId))
          .limit(1);

        if (player?.userId) {
          const sessionNumber = await sessionNotesDb.getNextSessionNumber(player.userId);
          // Build a summary of metrics for the session note
          const metricsSummary: string[] = [];
          if (input.metrics.batSpeedMph) metricsSummary.push(`Bat Speed: ${input.metrics.batSpeedMph} mph`);
          if (input.metrics.onPlaneEfficiencyPercent) metricsSummary.push(`OPE: ${input.metrics.onPlaneEfficiencyPercent}%`);
          if (input.metrics.attackAngleDeg) metricsSummary.push(`Attack Angle: ${input.metrics.attackAngleDeg}°`);
          if (input.metrics.exitVelocityMph) metricsSummary.push(`Exit Velo: ${input.metrics.exitVelocityMph} mph`);
          const metricsText = metricsSummary.length > 0
            ? `Session Blast Metrics: ${metricsSummary.join(", ")}`
            : "Blast session recorded (no metrics entered)";

          const note = await sessionNotesDb.createSessionNote({
            coachId: ctx.user.id,
            athleteId: player.userId,
            sessionNumber,
            sessionLabel: `Blast ${input.sessionType} Session`,
            sessionDate: new Date(input.sessionDate),
            duration: null,
            skillsWorked: ["Swing Mechanics"],
            whatImproved: metricsText,
            whatNeedsWork: "",
            homeworkDrills: [],
            overallRating: null,
            privateNotes: null,
            practicePlanId: null,
            blastSessionId: sessionId,
          });
          linkedSessionNoteId = note?.id ?? null;
        }
      }

      return { sessionId, linkedSessionNoteId };
    }),

  /** Update a session's date, type, and metrics */
  updateSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        sessionDate: z.string().optional(),
        sessionType: z.string().optional(),
        metrics: z.object({
          batSpeedMph: z.string().nullable().optional(),
          onPlaneEfficiencyPercent: z.string().nullable().optional(),
          attackAngleDeg: z.string().nullable().optional(),
          exitVelocityMph: z.string().nullable().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await requireDb();

      // Update session fields if provided
      const sessionUpdates: Record<string, any> = {};
      if (input.sessionDate) sessionUpdates.sessionDate = new Date(input.sessionDate);
      if (input.sessionType) sessionUpdates.sessionType = input.sessionType;
      if (Object.keys(sessionUpdates).length > 0) {
        await db.update(blastSessions).set(sessionUpdates).where(eq(blastSessions.id, input.sessionId));
      }

      // Update metrics if provided
      if (input.metrics) {
        const m = input.metrics;
        await db.update(blastMetrics).set({
          batSpeedMph: m.batSpeedMph ?? null,
          onPlaneEfficiencyPercent: m.onPlaneEfficiencyPercent ?? null,
          attackAngleDeg: m.attackAngleDeg ?? null,
          exitVelocityMph: m.exitVelocityMph ?? null,
        }).where(eq(blastMetrics.sessionId, input.sessionId));
      }

      // Also update the linked session note summary if one exists
      if (input.metrics) {
        const [linkedNote] = await db
          .select({ id: sessionNotes.id })
          .from(sessionNotes)
          .where(eq(sessionNotes.blastSessionId, input.sessionId))
          .limit(1);
        if (linkedNote) {
          const m = input.metrics;
          const metricsSummary: string[] = [];
          if (m.batSpeedMph) metricsSummary.push(`Bat Speed: ${m.batSpeedMph} mph`);
          if (m.onPlaneEfficiencyPercent) metricsSummary.push(`OPE: ${m.onPlaneEfficiencyPercent}%`);
          if (m.attackAngleDeg) metricsSummary.push(`Attack Angle: ${m.attackAngleDeg}°`);
          if (m.exitVelocityMph) metricsSummary.push(`Exit Velo: ${m.exitVelocityMph} mph`);
          const metricsText = metricsSummary.length > 0
            ? `Session Blast Metrics: ${metricsSummary.join(", ")}`
            : "Blast session recorded (no metrics entered)";
          await db.update(sessionNotes).set({
            whatImproved: metricsText,
            whatNeedsWork: "",
            sessionLabel: `Blast ${input.sessionType || ""} Session`.trim(),
          }).where(eq(sessionNotes.id, linkedNote.id));
        }
      }

      return { success: true };
    }),

  /** Bulk import sessions from CSV data */
  bulkImportSessions: protectedProcedure
    .input(
      z.object({
        playerId: z.string(),
        createSessionNotes: z.boolean().optional(),
        sessions: z.array(
          z.object({
            sessionDate: z.string(),
            sessionType: z.string(),
            metrics: z.object({
              batSpeedMph: z.string().optional(),
              onPlaneEfficiencyPercent: z.string().optional(),
              attackAngleDeg: z.string().optional(),
              exitVelocityMph: z.string().optional(),
            }),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await requireDb();

      // Get player info for session note creation
      let playerUserId: number | null = null;
      let playerName = "";
      if (input.createSessionNotes !== false) {
        const [player] = await db
          .select({ userId: blastPlayers.userId, fullName: blastPlayers.fullName })
          .from(blastPlayers)
          .where(eq(blastPlayers.id, input.playerId))
          .limit(1);
        playerUserId = player?.userId ?? null;
        playerName = player?.fullName ?? "";
      }

      let imported = 0;
      let notesCreated = 0;
      const errors: string[] = [];

      for (let i = 0; i < input.sessions.length; i++) {
        const s = input.sessions[i];
        try {
          const sessionId = crypto.randomUUID();
          await db.insert(blastSessions).values({
            id: sessionId,
            playerId: input.playerId,
            sessionDate: new Date(s.sessionDate),
            sessionType: s.sessionType,
          });
          await db.insert(blastMetrics).values({
            sessionId,
            batSpeedMph: s.metrics.batSpeedMph ?? null,
            onPlaneEfficiencyPercent: s.metrics.onPlaneEfficiencyPercent ?? null,
            attackAngleDeg: s.metrics.attackAngleDeg ?? null,
            exitVelocityMph: s.metrics.exitVelocityMph ?? null,
          });
          imported++;

          // Create linked session note if player is linked
          if (input.createSessionNotes !== false && playerUserId) {
            try {
              const sessionNumber = await sessionNotesDb.getNextSessionNumber(playerUserId);
              const m = s.metrics;
              const metricsSummary: string[] = [];
              if (m.batSpeedMph) metricsSummary.push(`Bat Speed: ${m.batSpeedMph} mph`);
              if (m.onPlaneEfficiencyPercent) metricsSummary.push(`OPE: ${m.onPlaneEfficiencyPercent}%`);
              if (m.attackAngleDeg) metricsSummary.push(`Attack Angle: ${m.attackAngleDeg}°`);
              if (m.exitVelocityMph) metricsSummary.push(`Exit Velo: ${m.exitVelocityMph} mph`);
              const metricsText = metricsSummary.length > 0
                ? `Session Blast Metrics: ${metricsSummary.join(", ")}`
                : "Blast session recorded (no metrics entered)";
              await sessionNotesDb.createSessionNote({
                coachId: ctx.user.id,
                athleteId: playerUserId,
                sessionNumber,
                sessionLabel: `Blast ${s.sessionType} Session`,
                sessionDate: new Date(s.sessionDate),
                duration: null,
                skillsWorked: ["Swing Mechanics"],
                whatImproved: metricsText,
                whatNeedsWork: "",
                homeworkDrills: [],
                overallRating: null,
                privateNotes: null,
                practicePlanId: null,
                blastSessionId: sessionId,
              });
              notesCreated++;
            } catch (noteErr) {
              // Don't fail the whole import if note creation fails
              console.error(`[Blast Import] Failed to create note for session ${i}:`, noteErr);
            }
          }
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      return { imported, notesCreated, errors, total: input.sessions.length };
    }),

  /** Get my own Blast data (athlete-facing) */
  getMyBlastData: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();

    // Find the blast player linked to this user
    const [player] = await db
      .select({ id: blastPlayers.id, fullName: blastPlayers.fullName })
      .from(blastPlayers)
      .where(eq(blastPlayers.userId, ctx.user.id))
      .limit(1);

    if (!player) {
      return { player: null, sessions: [], trends: [] };
    }

    // Get all sessions with metrics
    const sessions = await db
      .select({
        id: blastSessions.id,
        sessionDate: blastSessions.sessionDate,
        sessionType: blastSessions.sessionType,
        batSpeedMph: blastMetrics.batSpeedMph,
        onPlaneEfficiencyPercent: blastMetrics.onPlaneEfficiencyPercent,
        attackAngleDeg: blastMetrics.attackAngleDeg,
        exitVelocityMph: blastMetrics.exitVelocityMph,
      })
      .from(blastSessions)
      .leftJoin(blastMetrics, eq(blastMetrics.sessionId, blastSessions.id))
      .where(eq(blastSessions.playerId, player.id))
      .orderBy(desc(blastSessions.sessionDate));

    return { player, sessions };
  }),

  /** Create session notes retroactively for all unlinked Blast sessions of a player */
  createRetroactiveNotes: protectedProcedure
    .input(z.object({ playerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await requireDb();

      // Get the player and verify they're linked to a portal user
      const [player] = await db
        .select({ userId: blastPlayers.userId, fullName: blastPlayers.fullName })
        .from(blastPlayers)
        .where(eq(blastPlayers.id, input.playerId))
        .limit(1);

      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Player not found" });
      }
      if (!player.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Player must be linked to a portal account first" });
      }

      // Find all Blast sessions that don't have a linked session note
      const allSessions = await db
        .select({
          sessionId: blastSessions.id,
          sessionDate: blastSessions.sessionDate,
          sessionType: blastSessions.sessionType,
          batSpeedMph: blastMetrics.batSpeedMph,
          onPlaneEfficiencyPercent: blastMetrics.onPlaneEfficiencyPercent,
          attackAngleDeg: blastMetrics.attackAngleDeg,
          exitVelocityMph: blastMetrics.exitVelocityMph,
        })
        .from(blastSessions)
        .leftJoin(blastMetrics, eq(blastMetrics.sessionId, blastSessions.id))
        .where(eq(blastSessions.playerId, input.playerId))
        .orderBy(asc(blastSessions.sessionDate));

      // Get existing linked session note blast IDs
      const existingNotes = await db
        .select({ blastSessionId: sessionNotes.blastSessionId })
        .from(sessionNotes)
        .where(
          and(
            eq(sessionNotes.athleteId, player.userId),
            sql`${sessionNotes.blastSessionId} IS NOT NULL`
          )
        );
      const linkedIds = new Set(existingNotes.map((n) => n.blastSessionId));

      // Filter to unlinked sessions
      const unlinkedSessions = allSessions.filter((s) => !linkedIds.has(s.sessionId));

      let notesCreated = 0;
      const errors: string[] = [];

      for (const s of unlinkedSessions) {
        try {
          const sessionNumber = await sessionNotesDb.getNextSessionNumber(player.userId);
          const metricsSummary: string[] = [];
          if (s.batSpeedMph) metricsSummary.push(`Bat Speed: ${s.batSpeedMph} mph`);
          if (s.onPlaneEfficiencyPercent) metricsSummary.push(`OPE: ${s.onPlaneEfficiencyPercent}%`);
          if (s.attackAngleDeg) metricsSummary.push(`Attack Angle: ${s.attackAngleDeg}°`);
          if (s.exitVelocityMph) metricsSummary.push(`Exit Velo: ${s.exitVelocityMph} mph`);
          const metricsText = metricsSummary.length > 0
            ? `Session Blast Metrics: ${metricsSummary.join(", ")}`
            : "Blast session recorded (no metrics entered)";

          await sessionNotesDb.createSessionNote({
            coachId: ctx.user.id,
            athleteId: player.userId,
            sessionNumber,
            sessionLabel: `Blast ${s.sessionType || "General"} Session`,
            sessionDate: s.sessionDate ? new Date(s.sessionDate) : new Date(),
            duration: null,
            skillsWorked: ["Swing Mechanics"],
            whatImproved: metricsText,
            whatNeedsWork: "",
            homeworkDrills: [],
            overallRating: null,
            privateNotes: null,
            practicePlanId: null,
            blastSessionId: s.sessionId,
          });
          notesCreated++;
        } catch (err) {
          errors.push(`Session ${s.sessionId}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      return {
        notesCreated,
        errors,
        totalUnlinked: unlinkedSessions.length,
        alreadyLinked: linkedIds.size,
      };
    }),

  /** Delete a session, its metrics, and any linked session note */
  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await requireDb();
      // Delete any linked session note first
      await db.delete(sessionNotes).where(eq(sessionNotes.blastSessionId, input.sessionId));
      // Delete metrics (child), then session (parent)
      await db.delete(blastMetrics).where(eq(blastMetrics.sessionId, input.sessionId));
      await db.delete(blastSessions).where(eq(blastSessions.id, input.sessionId));
      return { success: true };
    }),
});
