/**
 * Video storage — uploads video files to S3 (if configured) or
 * Supabase Storage (fallback using the existing DATABASE_URL project ref).
 *
 * This replaces the Forge storagePut() call which required internal
 * BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY credentials.
 */

import { ENV } from "./_core/env";

// ── S3 upload ──────────────────────────────────────────────────────────────

async function uploadToS3(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region: ENV.awsRegion || "us-east-1",
    credentials: {
      accessKeyId: ENV.awsAccessKeyId,
      secretAccessKey: ENV.awsSecretAccessKey,
    },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: ENV.awsBucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read" as any,
    })
  );

  const region = ENV.awsRegion || "us-east-1";
  return `https://${ENV.awsBucketName}.s3.${region}.amazonaws.com/${key}`;
}

// ── Supabase Storage upload (fallback) ─────────────────────────────────────
// Uses the Supabase project ref + service role key from DATABASE_URL / env.
// Requires a "swing-videos" bucket to exist in Supabase Storage (public).

function getSupabaseProjectRef(): string | null {
  // Explicit env var takes priority
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  // Derive from DATABASE_URL: postgresql://postgres.PROJECT_REF:...
  const url = ENV.databaseUrl;
  const match = url.match(/postgres\.([a-z0-9]+):/i);
  return match ? match[1] : null;
}

async function uploadToSupabase(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const projectRef = getSupabaseProjectRef();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!projectRef) throw new Error("Cannot derive Supabase project ref from DATABASE_URL");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY env var not set");

  const bucket = "swing-videos";
  const url = `https://${projectRef}.supabase.co/storage/v1/object/${bucket}/${key}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": mimeType,
      "x-upsert": "true",
    },
    body: buffer as unknown as BodyInit,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Supabase Storage upload failed (${response.status}): ${text}`);
  }

  return `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket}/${key}`;
}

// ── Simple URL storage (last resort) ───────────────────────────────────────
// Converts to base64 data URL — works for small clips but not ideal.
// Only used when no storage backend is configured.

// ── Main export ────────────────────────────────────────────────────────────

export async function uploadVideoFile(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  // Try S3 first
  if (ENV.awsAccessKeyId && ENV.awsSecretAccessKey && ENV.awsBucketName) {
    try {
      console.log("[VideoStorage] Uploading to S3:", key);
      return await uploadToS3(key, buffer, mimeType);
    } catch (err: any) {
      console.error("[VideoStorage] S3 upload failed:", err.message);
      // Fall through to Supabase
    }
  }

  // Try Supabase Storage
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      console.log("[VideoStorage] Uploading to Supabase Storage:", key);
      return await uploadToSupabase(key, buffer, mimeType);
    } catch (err: any) {
      console.error("[VideoStorage] Supabase Storage upload failed:", err.message);
      throw err;
    }
  }

  throw new Error(
    "No video storage configured. Set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_BUCKET_NAME, " +
    "or set SUPABASE_SERVICE_ROLE_KEY in your environment variables."
  );
}
