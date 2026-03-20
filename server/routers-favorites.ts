import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import * as favoritesDb from "./drillFavorites";

export const favoritesRouter = router({
  // Toggle favorite status for a drill
  toggle: protectedProcedure
    .input(z.object({
      drillId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await favoritesDb.toggleFavorite(ctx.user.id, input.drillId);
      return result;
    }),

  // Add a drill to favorites
  add: protectedProcedure
    .input(z.object({
      drillId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const success = await favoritesDb.addFavorite(ctx.user.id, input.drillId);
      return { success };
    }),

  // Remove a drill from favorites
  remove: protectedProcedure
    .input(z.object({
      drillId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const success = await favoritesDb.removeFavorite(ctx.user.id, input.drillId);
      return { success };
    }),

  // Get all favorite drill IDs for the current user
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const drillIds = await favoritesDb.getUserFavorites(ctx.user.id);
      return { drillIds };
    }),

  // Check if a specific drill is favorited
  isFavorited: protectedProcedure
    .input(z.object({
      drillId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const isFavorited = await favoritesDb.isFavorited(ctx.user.id, input.drillId);
      return { isFavorited };
    }),

  // Get favorite count for the current user
  getCount: protectedProcedure
    .query(async ({ ctx }) => {
      const count = await favoritesDb.getFavoriteCount(ctx.user.id);
      return { count };
    }),
});
