import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { storagePut } from "./storage";

export const imageUploadRouter = router({
  uploadImage: protectedProcedure
    .input(z.object({
      fileKey: z.string(),
      fileData: z.array(z.number()),
      mimeType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileData);
      const { url } = await storagePut(input.fileKey, buffer, input.mimeType);
      return { url };
    }),
});
