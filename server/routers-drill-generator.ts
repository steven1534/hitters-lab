import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { generateDrill } from "./drillGenerator";
import { TRPCError } from "@trpc/server";

export const drillGeneratorRouter = router({
  generateDrill: protectedProcedure
    .input(z.object({
      issue: z.string().min(5, "Please describe the issue in more detail"),
      skillLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const drill = await generateDrill(input.issue, input.skillLevel);
        return {
          success: true,
          drill,
        };
      } catch (error) {
        console.error("[DrillGenerator] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate drill",
        });
      }
    }),
});
