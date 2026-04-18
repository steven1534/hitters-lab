import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Send, AlertCircle, Video, Loader2, CheckCircle, Zap, ArrowDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { uploadVideo, type UploadProgress, type UploadPhase } from "@/lib/videoUpload";

interface DrillSubmissionFormProps {
  assignmentId: number;
  drillId: string;
  onSubmitSuccess?: () => void;
}

export function DrillSubmissionForm({ assignmentId, drillId, onSubmitSuccess }: DrillSubmissionFormProps) {
  const utils = trpc.useUtils();
  const [notes, setNotes] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress>({
    phase: "idle",
    percent: 0,
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const createSubmissionMutation = trpc.submissions.drillSubmissions.createSubmission.useMutation({
    onSuccess: () => {
      // Refresh any view that shows submissions for this assignment / user
      utils.submissions.drillSubmissions.invalidate();
      utils.drillAssignments.invalidate();
    },
  });

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Allow up to 500MB before compression (will be compressed down)
      if (file.size > 500 * 1024 * 1024) {
        setError("Video file must be less than 500MB");
        return;
      }
      if (!file.type.startsWith("video/")) {
        setError("Please select a valid video file");
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setProgress({ phase: "idle", percent: 0, message: "" });

    if (!notes.trim() && !videoFile) {
      setError("Please add notes or upload a video");
      return;
    }

    setIsSubmitting(true);
    abortRef.current = new AbortController();

    try {
      let videoUrl: string | undefined;

      // Upload video with compression + real-time progress
      if (videoFile) {
        const result = await uploadVideo({
          file: videoFile,
          assignmentId,
          drillId,
          onProgress: setProgress,
          signal: abortRef.current.signal,
        });
        videoUrl = result.videoUrl;
      }

      // Create submission with S3 URL (auto-triggers videoAnalysis record on server)
      await createSubmissionMutation.mutateAsync({
        assignmentId,
        drillId,
        notes: notes.trim() || undefined,
        videoUrl,
      });

      setProgress({ phase: "done", percent: 100, message: "Upload complete!" });
      setSubmitted(true);

      toast.success("Video submitted", {
        description: videoFile
          ? "Queued for AI analysis. Coach will review the feedback soon."
          : "Your drill submission has been recorded. Great work!",
      });

      // Reset form after short delay
      setTimeout(() => {
        setNotes("");
        setVideoFile(null);
        setVideoPreview(null);
        setProgress({ phase: "idle", percent: 0, message: "" });
        setSubmitted(false);
        onSubmitSuccess?.();
      }, 2500);
    } catch (err) {
      if ((err as Error).message === "Upload cancelled") return;
      const errorMessage = err instanceof Error ? err.message : "Failed to submit drill";
      setError(errorMessage);
      setProgress({ phase: "error", percent: 0, message: errorMessage });

      toast.error("Submission failed", { description: errorMessage });
    } finally {
      setIsSubmitting(false);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsSubmitting(false);
    setProgress({ phase: "idle", percent: 0, message: "" });
  };

  // Phase-specific colors and icons
  const phaseConfig: Record<UploadPhase, { color: string; bgColor: string; glowColor: string }> = {
    idle: { color: "text-[#E8425A]", bgColor: "bg-[#DC143C]", glowColor: "shadow-[#DC143C]/30" },
    compressing: { color: "text-amber-400", bgColor: "bg-amber-500", glowColor: "shadow-amber-500/30" },
    uploading: { color: "text-[#E8425A]", bgColor: "bg-[#DC143C]", glowColor: "shadow-[#DC143C]/30" },
    done: { color: "text-emerald-400", bgColor: "bg-emerald-500", glowColor: "shadow-emerald-500/30" },
    error: { color: "text-red-400", bgColor: "bg-red-500", glowColor: "shadow-red-500/30" },
  };

  const currentPhaseConfig = phaseConfig[progress.phase];

  // Success state
  if (submitted) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center animate-in fade-in duration-300">
        <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <p className="font-bold text-emerald-400 text-lg">Submitted!</p>
        <p className="text-sm text-emerald-400/70 mt-1">
          {videoFile ? "Your video is queued for analysis" : "Your work has been recorded"}
        </p>
        {progress.compressedSize && progress.originalSize && progress.compressedSize < progress.originalSize && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-emerald-400/60">
            <Zap className="w-3 h-3" />
            <span>
              Compressed {formatBytes(progress.originalSize)} → {formatBytes(progress.compressedSize)}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-muted/40 border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/60 bg-white/[0.02] flex items-center gap-2">
        <Video className="w-4 h-4 text-[#E8425A]" />
        <h4 className="font-semibold text-foreground text-sm">Submit Your Work</h4>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Progress Panel — shown during compression and upload */}
        {progress.phase !== "idle" && progress.phase !== "error" && isSubmitting && (
          <div className="space-y-3 bg-muted/40 border border-border rounded-xl p-4">
            {/* Phase indicator */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentPhaseConfig.bgColor}/20`}>
                {progress.phase === "compressing" ? (
                  <Zap className={`w-4 h-4 ${currentPhaseConfig.color} animate-pulse`} />
                ) : progress.phase === "uploading" ? (
                  <Upload className={`w-4 h-4 ${currentPhaseConfig.color}`} />
                ) : (
                  <CheckCircle className={`w-4 h-4 ${currentPhaseConfig.color}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${currentPhaseConfig.color}`}>
                    {progress.phase === "compressing" ? "Compressing" : progress.phase === "uploading" ? "Uploading" : "Complete"}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {progress.percent}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{progress.message}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${currentPhaseConfig.bgColor} ${currentPhaseConfig.glowColor} shadow-lg`}
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            {/* Compression savings indicator */}
            {progress.compressedSize && progress.originalSize && progress.compressedSize < progress.originalSize && (
              <div className="flex items-center gap-2 text-xs text-amber-400/80 bg-amber-500/10 rounded-lg px-3 py-2">
                <ArrowDown className="w-3 h-3" />
                <span>
                  {formatBytes(progress.originalSize)} → {formatBytes(progress.compressedSize)}
                  {" "}({Math.round((1 - progress.compressedSize / progress.originalSize) * 100)}% smaller)
                </span>
              </div>
            )}

            {/* Cancel button */}
            <button
              type="button"
              onClick={handleCancel}
              className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
            >
              Cancel upload
            </button>
          </div>
        )}

        {/* Video Upload Area — hidden during active upload */}
        {(!isSubmitting || progress.phase === "idle") && (
          <div>
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden"
              id={`video-input-${assignmentId}`}
              disabled={isSubmitting}
            />

            {!videoFile ? (
              <label
                htmlFor={`video-input-${assignmentId}`}
                className="flex flex-col items-center justify-center gap-2 w-full px-4 py-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/40 hover:border-[#DC143C]/40 transition-all duration-200 active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-[#DC143C]/20 rounded-full flex items-center justify-center">
                  <Upload className="h-5 w-5 text-[#E8425A]" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  Tap to upload video
                </span>
                <span className="text-xs text-muted-foreground text-center">
                  Choose from library or record new — Max 500MB
                </span>
                <span className="text-xs text-[#E8425A]/60 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Auto-compressed before upload
                </span>
              </label>
            ) : (
              <div className="space-y-3">
                {/* Video Preview */}
                {videoPreview && (
                  <div className="relative rounded-xl overflow-hidden bg-black">
                    <video
                      src={videoPreview}
                      controls
                      className="w-full max-h-48"
                      preload="metadata"
                    />
                  </div>
                )}

                {/* File info + remove */}
                <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Video className="h-4 w-4 text-[#E8425A] shrink-0" />
                    <span className="text-xs text-foreground truncate">{videoFile.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({formatBytes(videoFile.size)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoFile(null);
                      setVideoPreview(null);
                    }}
                    disabled={isSubmitting}
                    className="text-xs text-red-400 hover:text-red-300 font-medium ml-2 shrink-0 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>

                {/* Compression hint for large files */}
                {videoFile.size > 10 * 1024 * 1024 && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-400/70 px-1">
                    <Zap className="w-3 h-3" />
                    <span>This video will be compressed before upload to save time</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notes (optional) — hidden during active upload */}
        {(!isSubmitting || progress.phase === "idle") && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Notes <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel? Any questions for Coach?"
              className="w-full h-16 bg-muted/40 border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-[#DC143C]/50 focus:border-[#DC143C]/30"
              disabled={isSubmitting}
              maxLength={500}
            />
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || (!notes.trim() && !videoFile)}
          className="w-full h-12 gap-2 bg-[#DC143C] hover:bg-[#B91030] active:bg-[#B91030] text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-[#DC143C]/20 hover:shadow-[#DC143C]/30 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {progress.phase === "compressing"
                ? `Compressing... ${progress.percent}%`
                : progress.phase === "uploading"
                  ? `Uploading... ${progress.percent}%`
                  : "Processing..."}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {videoFile ? "Submit Video for Analysis" : "Submit Notes"}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
