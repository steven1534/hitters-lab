import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const notificationsRouter = router({
  getUnread: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return [];
    const all = await db.getNotificationsByUser(ctx.user.id);
    return all.filter((n: any) => !n.isRead);
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return [];
    return await db.getNotificationsByUser(ctx.user.id);
  }),

  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ input }) => {
      const success = await db.markNotificationRead(input.notificationId);
      return { success };
    }),

  delete: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ input }) => {
      const success = await db.deleteNotification(input.notificationId);
      return { success };
    }),

  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return await db.getNotificationPreferences(ctx.user.id);
  }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        submissionNotifications: z.number().optional(),
        feedbackNotifications: z.number().optional(),
        badgeNotifications: z.number().optional(),
        assignmentNotifications: z.number().optional(),
        systemNotifications: z.number().optional(),
        emailNotifications: z.number().optional(),
        inAppNotifications: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) return null;
      return await db.createOrUpdateNotificationPreferences(ctx.user.id, input);
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return 0;
    return await db.getUnreadNotificationCount(ctx.user.id);
  }),
});
