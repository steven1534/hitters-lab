import { eq, and, or, ne, isNull, inArray, desc, lte, gte, sql } from "drizzle-orm";
import { drillAssignments, assignmentProgress, InsertDrillAssignment, InsertAssignmentProgress, users, notifications, invites } from "../drizzle/schema";
import { getDb } from "./db";
import { sendDrillAssignmentEmail } from "./email";
import { ENV } from "./_core/env";

/**
 * Assign a drill to a user or an invited athlete (pre-assignment)
 * @param userId - User ID (for existing users) or null for invite-based assignment
 * @param inviteId - Invite ID (for pre-assigning to invited athletes)
 */
export async function assignDrill(
  userId: number | null, 
  drillId: string, 
  drillName: string, 
  notes?: string, 
  coachName?: string, 
  drillDetails?: { difficulty: string; duration: string },
  inviteId?: number
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get user or invite email for notification
  let email: string | null = null;
  let name: string | null = null;
  
  if (userId) {
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userResult.length > 0 ? userResult[0] : null;
    email = user?.email || null;
    name = user?.name || null;
  } else if (inviteId) {
    const inviteResult = await db.select().from(invites).where(eq(invites.id, inviteId)).limit(1);
    const invite = inviteResult.length > 0 ? inviteResult[0] : null;
    email = invite?.email || null;
    name = (invite as any)?.name || invite?.email?.split('@')[0] || null;
  }

  const assignment: InsertDrillAssignment = {
    userId: userId || undefined,
    inviteId: inviteId || undefined,
    drillId,
    drillName,
    status: "assigned",
    notes: notes || null,
  };

  const result = await db.insert(drillAssignments).values(assignment);

  // Send email notification
  if (email) {
    const portalUrl = `${ENV.appUrl}/athlete-portal`;
    await sendDrillAssignmentEmail({
      athleteEmail: email,
      athleteName: name || "Athlete",
      drillName,
      drillDifficulty: drillDetails?.difficulty || "Unknown",
      drillDuration: drillDetails?.duration || "Unknown",
      coachNotes: notes,
      coachName,
      portalUrl,
    });
  }

  // Create in-app notification for athlete (only if userId exists)
  if (userId) {
    try {
      await db.insert(notifications).values({
        userId,
        type: "assignment",
        title: "New Drill Assigned",
        message: `You have been assigned the drill: ${drillName}`,
        isRead: 0,
      });
    } catch (err) {
      console.error("[Notification] Failed to create in-app notification:", err);
    }
  }

  return result;
}

/**
 * @deprecated Do NOT call this function directly. The linking logic now
 * lives inside the `acceptInvite` transaction in server/invites.ts so that
 * role updates, invite status, assignment linking, and notification inserts
 * are all atomic. Calling this standalone re-introduces the partial-failure
 * / orphaned-assignment bug that CRIT #6 of the audit described.
 *
 * Kept here only to avoid breaking any external seed scripts that might
 * still import it. All in-app call sites have been removed.
 */
export async function linkInviteAssignmentsToUser(inviteId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Update all assignments with this inviteId to use the new userId
  const result = await db
    .update(drillAssignments)
    .set({ userId })
    .where(eq(drillAssignments.inviteId, inviteId));
  
  console.log(`[DrillAssignments] Linked ${result} assignments from invite ${inviteId} to user ${userId}`);
  
  // Create notifications for the newly linked assignments
  const linkedAssignments = await db
    .select()
    .from(drillAssignments)
    .where(eq(drillAssignments.inviteId, inviteId));
  
  for (const assignment of linkedAssignments) {
    try {
      await db.insert(notifications).values({
        userId,
        type: "assignment",
        title: "Drill Waiting for You",
        message: `You have a drill assigned: ${assignment.drillName}`,
        isRead: 0,
      });
    } catch (err) {
      console.error("[Notification] Failed to create notification for linked assignment:", err);
    }
  }
  
  return result;
}

export async function unassignDrill(assignmentId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.delete(drillAssignments).where(eq(drillAssignments.id, assignmentId));
}

export async function updateAssignmentStatus(assignmentId: number, status: "assigned" | "in-progress" | "completed", notes?: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const updateData: any = { status };
  if (status === "completed") {
    updateData.completedAt = new Date();
  }
  if (notes !== undefined) {
    updateData.notes = notes;
  }

  return await db.update(drillAssignments).set(updateData).where(eq(drillAssignments.id, assignmentId));
}

export async function getUserAssignments(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // First, get assignments directly linked to this user
  const directAssignments = await db.select().from(drillAssignments).where(eq(drillAssignments.userId, userId));
  
  // Also check if this user has any accepted invites, and get assignments linked to those invites
  const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userResult.length > 0 ? userResult[0] : null;
  
  if (user?.email) {
    // Find any invites for this user's email
    const userInvites = await db.select().from(invites).where(eq(invites.email, user.email));
    
    if (userInvites.length > 0) {
      const inviteIds = userInvites.map(i => i.id);
      // Get assignments linked to these invites that don't have userId set yet
      const inviteAssignments = await db.select().from(drillAssignments).where(
        and(
          inArray(drillAssignments.inviteId, inviteIds),
          isNull(drillAssignments.userId)
        )
      );
      
      // Combine both sets of assignments
      return [...directAssignments, ...inviteAssignments];
    }
  }
  
  return directAssignments;
}

export async function getAllAssignments() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.select().from(drillAssignments);
}

/**
 * Get athlete assignment overview - shows which athletes have drills vs don't
 * Returns athletes grouped by assignment status with counts
 */
export async function getAthleteAssignmentOverview() {
  const db = await getDb();
  if (!db) {
    return { athletes: [] };
  }

  // Get all athletes (users with role 'athlete' or active clients) — exclude parents and admins
  const allAthletes = await db.select().from(users).where(
    and(
      or(
        eq(users.role, 'athlete'),
        eq(users.isActiveClient, 1)
      ),
      ne(users.role, 'parent'),
      ne(users.role, 'admin')
    )
  );

  // Get all pending/accepted invites that don't have a user yet
  const pendingInvites = await db.select().from(invites).where(
    or(
      eq(invites.status, 'pending'),
      eq(invites.status, 'accepted')
    )
  );

  // Get all assignments
  const allAssignments = await db.select().from(drillAssignments);

  // Build assignment counts by userId and inviteId
  const assignmentsByUser: Record<number, { total: number; completed: number; inProgress: number; assigned: number }> = {};
  const assignmentsByInvite: Record<number, { total: number; completed: number; inProgress: number; assigned: number }> = {};

  allAssignments.forEach(a => {
    if (a.userId) {
      if (!assignmentsByUser[a.userId]) {
        assignmentsByUser[a.userId] = { total: 0, completed: 0, inProgress: 0, assigned: 0 };
      }
      assignmentsByUser[a.userId].total++;
      if (a.status === 'completed') assignmentsByUser[a.userId].completed++;
      else if (a.status === 'in-progress') assignmentsByUser[a.userId].inProgress++;
      else assignmentsByUser[a.userId].assigned++;
    }
    if (a.inviteId) {
      if (!assignmentsByInvite[a.inviteId]) {
        assignmentsByInvite[a.inviteId] = { total: 0, completed: 0, inProgress: 0, assigned: 0 };
      }
      assignmentsByInvite[a.inviteId].total++;
      if (a.status === 'completed') assignmentsByInvite[a.inviteId].completed++;
      else if (a.status === 'in-progress') assignmentsByInvite[a.inviteId].inProgress++;
      else assignmentsByInvite[a.inviteId].assigned++;
    }
  });

  // Build athlete list with assignment status
  const athletesWithStatus: Array<{
    id: string;
    name: string;
    email: string;
    type: 'user' | 'invite';
    status: 'pending' | 'active';
    hasDrills: boolean;
    totalDrills: number;
    completedDrills: number;
    inProgressDrills: number;
    assignedDrills: number;
    lastActivity: Date | null;
  }> = [];

  // Process users
  for (const user of allAthletes) {
    // Skip admin users
    if (user.role === 'admin') continue;
    
    const stats = assignmentsByUser[user.id] || { total: 0, completed: 0, inProgress: 0, assigned: 0 };
    
    // Get last activity from assignments
    const userAssignments = allAssignments.filter(a => a.userId === user.id);
    const lastActivity = userAssignments.length > 0 
      ? userAssignments.reduce((latest, a) => {
          const aDate = a.updatedAt ? new Date(a.updatedAt) : null;
          return aDate && (!latest || aDate > latest) ? aDate : latest;
        }, null as Date | null)
      : null;

    athletesWithStatus.push({
      id: `user-${user.id}`,
      name: user.name || user.email?.split('@')[0] || `User ${user.id}`,
      email: user.email || '',
      type: 'user',
      status: user.isActiveClient === 1 ? 'active' : 'pending',
      hasDrills: stats.total > 0,
      totalDrills: stats.total,
      completedDrills: stats.completed,
      inProgressDrills: stats.inProgress,
      assignedDrills: stats.assigned,
      lastActivity,
    });
  }

  // Process invites (only those without matching users)
  for (const invite of pendingInvites) {
    // Check if this email already has a user account
    const existingUser = allAthletes.find(u => u.email === invite.email);
    if (existingUser) continue;

    const stats = assignmentsByInvite[invite.id] || { total: 0, completed: 0, inProgress: 0, assigned: 0 };

    athletesWithStatus.push({
      id: `invite-${invite.id}`,
      name: (invite as any).name || invite.email.split('@')[0],
      email: invite.email,
      type: 'invite',
      status: 'pending',
      hasDrills: stats.total > 0,
      totalDrills: stats.total,
      completedDrills: stats.completed,
      inProgressDrills: stats.inProgress,
      assignedDrills: stats.assigned,
      lastActivity: null,
    });
  }

  // Calculate summary stats
  const totalAthletes = athletesWithStatus.length;
  const athletesWithDrills = athletesWithStatus.filter(a => a.hasDrills).length;
  const athletesWithoutDrills = athletesWithStatus.filter(a => !a.hasDrills).length;
  const totalDrillsAssigned = allAssignments.length;
  const totalCompleted = allAssignments.filter(a => a.status === 'completed').length;

  return {
    summary: {
      totalAthletes,
      athletesWithDrills,
      athletesWithoutDrills,
      totalDrillsAssigned,
      totalCompleted,
      completionRate: totalDrillsAssigned > 0 ? Math.round((totalCompleted / totalDrillsAssigned) * 100) : 0,
    },
    athletes: athletesWithStatus,
  };
}

export async function getAssignmentById(assignmentId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.select().from(drillAssignments).where(eq(drillAssignments.id, assignmentId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function recordProgress(assignmentId: number, userId: number, repsCompleted: number, notes?: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const progress: InsertAssignmentProgress = {
    assignmentId,
    userId,
    repsCompleted,
    notes: notes || null,
  };

  return await db.insert(assignmentProgress).values(progress);
}

export async function getAssignmentProgress(assignmentId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db.select().from(assignmentProgress).where(eq(assignmentProgress.assignmentId, assignmentId));
}

/**
 * Get comprehensive progress statistics for an athlete
 */
export async function getAthleteProgressStats(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get all assignments for this user
  const assignments = await getUserAssignments(userId);
  
  // Calculate core metrics
  const totalAssigned = assignments.length;
  const completed = assignments.filter(a => a.status === "completed").length;
  const inProgress = assignments.filter(a => a.status === "in-progress").length;
  const assigned = assignments.filter(a => a.status === "assigned").length;
  const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

  // Calculate average time to complete (in days)
  const completedAssignments = assignments.filter(a => a.status === "completed" && a.completedAt && a.assignedAt);
  let avgDaysToComplete = 0;
  if (completedAssignments.length > 0) {
    const totalDays = completedAssignments.reduce((sum, a) => {
      const assignedDate = new Date(a.assignedAt!);
      const completedDate = new Date(a.completedAt!);
      const days = Math.ceil((completedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    avgDaysToComplete = Math.round(totalDays / completedAssignments.length);
  }

  // Get last activity date
  const sortedByUpdate = [...assignments].sort((a, b) => {
    const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return dateB - dateA;
  });
  const lastActivityDate = sortedByUpdate[0]?.updatedAt || null;

  // Get recent completions (last 5)
  const recentCompletions = assignments
    .filter(a => a.status === "completed" && a.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 5)
    .map(a => ({
      drillName: a.drillName,
      completedAt: a.completedAt,
    }));

  // Calculate weekly progress (last 4 weeks)
  const now = new Date();
  const weeklyProgress = [];
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    
    const completedThisWeek = assignments.filter(a => {
      if (a.status !== "completed" || !a.completedAt) return false;
      const completedDate = new Date(a.completedAt);
      return completedDate >= weekStart && completedDate < weekEnd;
    }).length;
    
    weeklyProgress.unshift({
      week: `Week ${4 - i}`,
      completed: completedThisWeek,
    });
  }

  // Drill breakdown by difficulty
  const byDifficulty = {
    Easy: { total: 0, completed: 0 },
    Medium: { total: 0, completed: 0 },
    Hard: { total: 0, completed: 0 },
    Unknown: { total: 0, completed: 0 },
  };

  // We need to get difficulty from the drill data
  // For now, we'll use a simple approach - this could be enhanced later
  assignments.forEach(a => {
    // Default to Unknown if we don't have difficulty info
    const difficulty = "Unknown";
    if (!byDifficulty[difficulty as keyof typeof byDifficulty]) {
      byDifficulty.Unknown.total++;
      if (a.status === "completed") byDifficulty.Unknown.completed++;
    } else {
      byDifficulty[difficulty as keyof typeof byDifficulty].total++;
      if (a.status === "completed") byDifficulty[difficulty as keyof typeof byDifficulty].completed++;
    }
  });

  return {
    coreMetrics: {
      totalAssigned,
      completed,
      inProgress,
      assigned,
      completionRate,
      avgDaysToComplete,
    },
    activity: {
      lastActivityDate,
      recentCompletions,
      weeklyProgress,
    },
    drillBreakdown: {
      byDifficulty,
    },
    assignments, // Include raw assignments for detailed view
  };
}


import { coachNotes, InsertCoachNote } from "../drizzle/schema";

/**
 * Get all coach notes for an athlete
 */
export async function getCoachNotes(athleteId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  return await db
    .select()
    .from(coachNotes)
    .where(eq(coachNotes.athleteId, athleteId))
    .orderBy(desc(coachNotes.meetingDate));
}

/**
 * Add a new coach note for an athlete
 */
export async function addCoachNote(data: {
  athleteId: number;
  coachId: number;
  note: string;
  meetingDate: Date;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const noteData: InsertCoachNote = {
    athleteId: data.athleteId,
    coachId: data.coachId,
    note: data.note,
    meetingDate: data.meetingDate,
  };

  const result = await db.insert(coachNotes).values(noteData).returning({ id: coachNotes.id });
  return { success: true, id: result[0].id };
}

/**
 * Update an existing coach note
 */
export async function updateCoachNote(noteId: number, note: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(coachNotes)
    .set({ note })
    .where(eq(coachNotes.id, noteId));

  return { success: true };
}

/**
 * Delete a coach note
 */
export async function deleteCoachNote(noteId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.delete(coachNotes).where(eq(coachNotes.id, noteId));
  return { success: true };
}

