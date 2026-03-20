export const ENV = {
  /** JWT secret for signing session cookies */
  cookieSecret: process.env.JWT_SECRET ?? "",
  /** PostgreSQL connection string (Supabase) */
  databaseUrl: process.env.DATABASE_URL ?? "",
  /** Admin email — this user always gets the admin role */
  ownerEmail: process.env.OWNER_EMAIL ?? "coach@coachstevebaseball.com",
  isProduction: process.env.NODE_ENV === "production",
  /** Resend API key for email sending */
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  /** Google Gemini API key */
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  /** OpenAI API key */
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  /** AWS S3 for file/video storage */
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  awsRegion: process.env.AWS_REGION ?? "us-east-1",
  awsBucketName: process.env.AWS_BUCKET_NAME ?? "",
  /** App URL (for email links, CORS, etc.) */
  appUrl: process.env.APP_URL ?? "http://localhost:5000",
};
