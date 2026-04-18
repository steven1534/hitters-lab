import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import * as favoritesDb from "./drillFavorites";

const drillIdSchema = z.string().min(1);

export const favoritesRouter = router({
  toggle: protectedProcedure
    .input(z.object({ drillId: drillIdSchema }))
    .mutation(async ({ ctx, input }) => {
      return favoritesDb.toggleFavorite(ctx.user.id, input.drillId);
    }),

  add: protectedProcedure
    .input(z.object({ drillId: drillIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const success = await favoritesDb.addFavorite(ctx.user.id, input.drillId);
      return { success };
    }),

  remove: protectedProcedure
    .input(z.object({ drillId: drillIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const success = await favoritesDb.removeFavorite(ctx.user.id, input.drillId);
      return { success };
    }),

  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const drillIds = await favoritesDb.getUserFavorites(ctx.user.id);
      return { drillIds };
    }),

  isFavorited: protectedProcedure
    .input(z.object({ drillId: drillIdSchema }))
    .query(async ({ ctx, input }) => {
      const isFavorited = await favoritesDb.isFavorited(ctx.user.id, input.drillId);
      return { isFavorited };
    }),

  getCount: protectedProcedure
    .query(async ({ ctx }) => {
      const count = await favoritesDb.getFavoriteCount(ctx.user.id);
      return { count };
    }),
});
