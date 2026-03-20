import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { storagePut } from "./storage";

export const videoUploadRouter = router({
  uploadSubmissionVideo: protectedProcedure
    .input(z.object({
      assignmentId: z.number(),
      drillId: z.string(),
      fileData: z.string(), // Base64 encoded file data
      fileName: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
      }

      try {
        // Validate file size (max 100MB)
        const fileSizeBytes = Buffer.byteLength(input.fileData, 'base64');
        const maxSizeBytes = 100 * 1024 * 1024; // 100MB
        
        if (fileSizeBytes > maxSizeBytes) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Video file exceeds 100MB limit' 
          });
        }

        // Validate MIME type
        if (!input.mimeType.startsWith('video/')) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Invalid file type. Only video files are allowed.' 
          });
        }

        // Create S3 key with organized structure
        const timestamp = Date.now();
        const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileKey = `drill-submissions/${ctx.user.id}/${input.drillId}/${timestamp}-${sanitizedFileName}`;

        // Convert base64 to buffer
        const fileBuffer = Buffer.from(input.fileData, 'base64');

        // Upload to S3
        const uploadResult = await storagePut(fileKey, fileBuffer, input.mimeType);

        return {
          success: true,
          videoUrl: uploadResult.url,
          fileKey: uploadResult.key,
        };
      } catch (error) {
        console.error('[Video Upload] Failed:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to upload video',
        });
      }
    }),
});
