/**
 * Video Upload Utility
 * - Client-side compression via ffmpeg.wasm (skips for small files)
 * - Real-time upload progress via XMLHttpRequest
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

// ── Types ──────────────────────────────────────────────────────────────────

export type UploadPhase = "idle" | "compressing" | "uploading" | "done" | "error";

export interface UploadProgress {
  phase: UploadPhase;
  /** 0-100 for the current phase */
  percent: number;
  /** Human-readable status message */
  message: string;
  /** Original file size in bytes */
  originalSize?: number;
  /** Compressed file size in bytes (if compression ran) */
  compressedSize?: number;
}

export interface UploadResult {
  videoUrl: string;
  fileKey: string;
}

interface UploadVideoOptions {
  file: File;
  assignmentId: number;
  drillId: string;
  onProgress: (progress: UploadProgress) => void;
  /** Skip compression for files under this size (bytes). Default: 10MB */
  compressionThreshold?: number;
  /** Target bitrate for compression in kbps. Default: 1500 */
  targetBitrateKbps?: number;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

// ── Compression ────────────────────────────────────────────────────────────

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoading = false;
let ffmpegLoadPromise: Promise<boolean> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) return ffmpegInstance;

  if (ffmpegLoading && ffmpegLoadPromise) {
    await ffmpegLoadPromise;
    return ffmpegInstance!;
  }

  ffmpegLoading = true;
  ffmpegInstance = new FFmpeg();

  ffmpegLoadPromise = ffmpegInstance.load({
    coreURL: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js",
    wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm",
  });

  await ffmpegLoadPromise;
  ffmpegLoading = false;
  return ffmpegInstance;
}

async function compressVideo(
  file: File,
  onProgress: (percent: number) => void
): Promise<File> {
  const ffmpeg = await getFFmpeg();

  // Write input file
  const inputName = "input" + getExtension(file.name);
  const outputName = "output.mp4";

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Track progress
  ffmpeg.on("progress", ({ progress }) => {
    onProgress(Math.min(Math.round(progress * 100), 99));
  });

  // Compress: re-encode to H.264 at reduced bitrate, scale down if > 720p
  await ffmpeg.exec([
    "-i", inputName,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "28",
    "-vf", "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-y",
    outputName,
  ]);

  onProgress(100);

  // Read output
  const data = await ffmpeg.readFile(outputName);
  const uint8 = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
  // Copy to a clean ArrayBuffer to avoid SharedArrayBuffer TS issues
  const buffer = new ArrayBuffer(uint8.byteLength);
  new Uint8Array(buffer).set(uint8);
  const compressedBlob = new Blob([buffer], { type: "video/mp4" });

  // Clean up
  await ffmpeg.deleteFile(inputName).catch(() => {});
  await ffmpeg.deleteFile(outputName).catch(() => {});

  // If compressed is actually larger (rare), return original
  if (compressedBlob.size >= file.size) {
    return file;
  }

  return new File([compressedBlob], file.name.replace(/\.[^.]+$/, ".mp4"), {
    type: "video/mp4",
  });
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.substring(dot) : ".mp4";
}

// ── Upload via XHR ─────────────────────────────────────────────────────────

function uploadWithProgress(
  file: File,
  assignmentId: number,
  drillId: string,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Real-time progress
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve({ videoUrl: result.videoUrl, fileKey: result.fileKey });
        } catch {
          reject(new Error("Invalid server response"));
        }
      } else {
        try {
          const errBody = JSON.parse(xhr.responseText);
          reject(new Error(errBody.error || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("timeout", () => reject(new Error("Upload timed out")));

    // Handle abort
    if (signal) {
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new Error("Upload cancelled"));
      });
    }

    // Build FormData
    const formData = new FormData();
    formData.append("video", file);
    formData.append("assignmentId", String(assignmentId));
    formData.append("drillId", drillId);

    // Send
    xhr.open("POST", "/api/upload/video");
    xhr.withCredentials = true;
    xhr.timeout = 5 * 60 * 1000; // 5 minute timeout for large files
    xhr.send(formData);
  });
}

// ── Main Export ────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadVideo(options: UploadVideoOptions): Promise<UploadResult> {
  const {
    file,
    assignmentId,
    drillId,
    onProgress,
    compressionThreshold = 10 * 1024 * 1024, // 10MB
    signal,
  } = options;

  let fileToUpload = file;
  const originalSize = file.size;

  // Phase 1: Compress (if file is large enough)
  if (file.size > compressionThreshold) {
    onProgress({
      phase: "compressing",
      percent: 0,
      message: `Compressing ${formatBytes(file.size)} video...`,
      originalSize,
    });

    try {
      fileToUpload = await compressVideo(file, (percent) => {
        onProgress({
          phase: "compressing",
          percent,
          message: percent < 100
            ? `Compressing... ${percent}%`
            : "Compression complete",
          originalSize,
        });
      });

      const savedPercent = Math.round((1 - fileToUpload.size / originalSize) * 100);
      if (fileToUpload.size < originalSize) {
        onProgress({
          phase: "compressing",
          percent: 100,
          message: `Compressed: ${formatBytes(originalSize)} → ${formatBytes(fileToUpload.size)} (${savedPercent}% smaller)`,
          originalSize,
          compressedSize: fileToUpload.size,
        });
        // Brief pause so user can see the compression result
        await new Promise((r) => setTimeout(r, 1200));
      }
    } catch (err) {
      // If compression fails, upload original file
      console.warn("[VideoUpload] Compression failed, uploading original:", err);
      fileToUpload = file;
      onProgress({
        phase: "compressing",
        percent: 100,
        message: "Compression unavailable — uploading original",
        originalSize,
      });
      await new Promise((r) => setTimeout(r, 800));
    }
  } else {
    onProgress({
      phase: "compressing",
      percent: 100,
      message: `File is ${formatBytes(file.size)} — no compression needed`,
      originalSize,
    });
    await new Promise((r) => setTimeout(r, 500));
  }

  // Phase 2: Upload with real-time progress
  onProgress({
    phase: "uploading",
    percent: 0,
    message: `Uploading ${formatBytes(fileToUpload.size)}...`,
    originalSize,
    compressedSize: fileToUpload.size !== originalSize ? fileToUpload.size : undefined,
  });

  const result = await uploadWithProgress(
    fileToUpload,
    assignmentId,
    drillId,
    (percent) => {
      const uploaded = Math.round((percent / 100) * fileToUpload.size);
      onProgress({
        phase: "uploading",
        percent,
        message: `Uploading... ${formatBytes(uploaded)} / ${formatBytes(fileToUpload.size)}`,
        originalSize,
        compressedSize: fileToUpload.size !== originalSize ? fileToUpload.size : undefined,
      });
    },
    signal
  );

  onProgress({
    phase: "done",
    percent: 100,
    message: "Upload complete!",
    originalSize,
    compressedSize: fileToUpload.size !== originalSize ? fileToUpload.size : undefined,
  });

  return result;
}
