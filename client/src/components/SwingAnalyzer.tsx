import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { uploadVideo, type UploadProgress } from "@/lib/videoUpload";
import {
  Video, Upload, X, CheckCircle, AlertCircle, Clock,
  Loader2, Camera, FileVideo, ChevronDown, ChevronUp, Star, Zap
} from "lucide-react";

const SWING_TYPES = [
  { value: "batting-practice", label: "Batting Practice" },
  { value: "game-at-bat", label: "Game At-Bat" },
  { value: "tee-work", label: "Tee Work" },
  { value: "soft-toss", label: "Soft Toss" },
  { value: "front-toss", label: "Front Toss" },
  { value: "live-pitching", label: "Live Pitching" },
  { value: "cage-session", label: "Cage Session" },
  { value: "dry-swings", label: "Dry Swings" },
  { value: "other", label: "Other" },
];

function getStatusConfig(status: string) {
  switch (status) {
    case "pending":
      return { label: "Queued", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/30" };
    case "analyzing":
      return { label: "AI Analyzing", icon: Loader2, color: "text-[#E8425A]", bg: "bg-[#DC143C]/20 border-[#DC143C]/30", spin: true };
    case "complete":
      return { label: "Feedback Ready", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30" };
    case "failed":
      return { label: "Error", icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/20 border-red-500/30" };
    default:
      return { label: status, icon: Clock, color: "text-gray-400", bg: "bg-gray-500/20 border-gray-500/30" };
  }
}

export function SwingAnalyzer() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [swingType, setSwingType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mySwings = trpc.videoAnalysis.getMySwings.useQuery();
  const submitSwing = trpc.videoAnalysis.submitSwing.useMutation();
  const utils = trpc.useUtils();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please select a video file");
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setError("Video must be under 500MB");
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Upload video to S3
      const result = await uploadVideo({
        file: selectedFile,
        drillId: "swing-analysis",
        assignmentId: 0,
        onProgress: setUploadProgress,
      });

      if (!result.videoUrl) {
        throw new Error("Upload failed");
      }

      // Create the swing analysis record
      await submitSwing.mutateAsync({
        videoUrl: result.videoUrl,
        swingType: swingType || undefined,
        athleteNotes: notes || undefined,
      });

      // Success
      setSubmitSuccess(true);
      utils.videoAnalysis.getMySwings.invalidate();

      // Reset after delay
      setTimeout(() => {
        setShowUploadModal(false);
        setSubmitSuccess(false);
        setSelectedFile(null);
        setSwingType("");
        setNotes("");
        setUploadProgress(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit swing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setSwingType("");
    setNotes("");
    setUploadProgress(null);
    setError(null);
    setSubmitSuccess(false);
    setIsSubmitting(false);
  };

  const swingCount = mySwings.data?.length || 0;
  const pendingCount = mySwings.data?.filter(s =>
    ["pending", "analyzing"].includes(s.status)
  ).length || 0;
  const feedbackReadyCount = mySwings.data?.filter(s =>
    ["complete"].includes(s.status)
  ).length || 0;

  return (
    <>
      {/* Main CTA Card */}
      <div className="glass-card rounded-2xl overflow-hidden border-glow animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        <div className="relative p-5">
          {/* Background glow */}
          <div className="absolute top-0 left-0 w-40 h-40 bg-purple-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-electric/10 rounded-full blur-3xl" />

          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-electric rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Zap className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Swing Analyzer</h3>
                  <p className="text-xs text-muted-foreground">AI-powered swing feedback</p>
                </div>
              </div>
              {pendingCount > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse">
                  {pendingCount} analyzing
                </Badge>
              )}
              {feedbackReadyCount > 0 && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {feedbackReadyCount} ready
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Upload any swing video — BP, game at-bats, tee work, cage sessions — and get personalized feedback from Coach.
            </p>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  resetModal();
                  setShowUploadModal(true);
                }}
                className="flex-1 bg-gradient-to-r from-purple-600 to-electric hover:from-purple-500 hover:to-electric/90 text-white font-semibold shadow-lg shadow-purple-500/20 hover-lift"
              >
                <Camera className="w-4 h-4 mr-2" />
                Upload Swing
              </Button>

              {swingCount > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowHistory(!showHistory)}
                  className="glass border-border hover:bg-muted/50"
                >
                  {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span className="ml-1 text-sm">{swingCount}</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Submission History (collapsible) */}
        {showHistory && mySwings.data && mySwings.data.length > 0 && (
          <div className="border-t border-border divide-y divide-white/5">
            {mySwings.data.map((swing) => {
              const statusConfig = getStatusConfig(swing.status);
              const StatusIcon = statusConfig.icon;
              const date = new Date(swing.createdAt);

              return (
                <div key={swing.id} className="px-5 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileVideo className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {swing.analysisType
                          ? SWING_TYPES.find(t => t.value === swing.analysisType)?.label || swing.analysisType
                          : "Swing Video"
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {swing.title && ` · ${swing.title.substring(0, 30)}${swing.title.length > 30 ? "..." : ""}`}
                      </p>
                    </div>
                  </div>
                  <Badge className={`${statusConfig.bg} ${statusConfig.color} border text-xs flex-shrink-0`}>
                    <StatusIcon className={`w-3 h-3 mr-1 ${(statusConfig as any).spin ? "animate-spin" : ""}`} />
                    {statusConfig.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          setShowUploadModal(false);
        }
      }}>
        <DialogContent className="max-w-md mx-auto glass-card border-border p-0 gap-0">
          <DialogHeader className="p-5 pb-4 border-b border-border">
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              Upload Your Swing
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-4">
            {submitSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Swing Submitted!</h3>
                <p className="text-sm text-muted-foreground">
                  Coach will review the AI analysis and send you personalized feedback.
                </p>
              </div>
            ) : (
              <>
                {/* Video Upload Area */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Swing Video</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="bg-muted/50 border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Video className="w-5 h-5 text-purple-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
                    >
                      <div className="w-14 h-14 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-500/20 transition-colors">
                        <Upload className="w-7 h-7 text-purple-400" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">Tap to upload video</p>
                      <p className="text-xs text-muted-foreground">Record or choose from library · Up to 500MB</p>
                    </button>
                  )}
                </div>

                {/* Swing Type */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    What type of swing? <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Select value={swingType} onValueChange={setSwingType}>
                    <SelectTrigger className="bg-muted/50 border-border text-foreground">
                      <SelectValue placeholder="Select swing type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SWING_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Notes for Coach <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Working on keeping hands inside the ball, felt good contact on the 3rd swing..."
                    className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground resize-none"
                    rows={3}
                  />
                </div>

                {/* Upload Progress */}
                {uploadProgress && (
                  <div className="bg-muted/50 border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">
                        {uploadProgress.phase === "compressing" ? "Compressing..." : "Uploading..."}
                      </span>
                      <span className="text-sm text-muted-foreground">{uploadProgress.percent}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          uploadProgress.phase === "compressing"
                            ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                            : "bg-gradient-to-r from-purple-500 to-electric"
                        }`}
                        style={{ width: `${uploadProgress.percent}%` }}
                      />
                    </div>
                    {uploadProgress.phase === "compressing" && uploadProgress.compressedSize && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {(uploadProgress.originalSize! / (1024 * 1024)).toFixed(1)}MB → {(uploadProgress.compressedSize / (1024 * 1024)).toFixed(1)}MB
                      </p>
                    )}
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedFile || isSubmitting}
                  className="w-full bg-gradient-to-r from-purple-600 to-electric hover:from-purple-500 hover:to-electric/90 text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {uploadProgress?.phase === "compressing" ? "Compressing..." : "Uploading..."}
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Submit for Analysis
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
