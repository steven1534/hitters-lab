import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import multer from "multer";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes } from "./authRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startBatchProcessor } from "../emailBatching";
import { storageDownload } from "../storage";
import { uploadVideoFile } from "../videoStorage";
import { authenticateRequest } from "./auth";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Allow the site to be embedded in iframes on any domain
  app.use((_req, res, next) => {
    res.removeHeader("X-Frame-Options");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    next();
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Hard 15s request timeout — prevents hanging on DB issues
  app.use((_req, res, next) => {
    res.setTimeout(15000, () => {
      if (!res.headersSent) {
        res.status(503).json({ error: "Request timed out — server busy" });
      }
    });
    next();
  });

  // Email/password auth routes
  registerAuthRoutes(app);

  // --- Multipart video upload route (bypasses tRPC body size limits) ---
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("video/")) {
        cb(null, true);
      } else {
        cb(new Error("Only video files are allowed"));
      }
    },
  });

  app.post("/api/upload/video", upload.single("video"), async (req, res) => {
    try {
      const user = await authenticateRequest(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No video file provided" });
      }

      const drillId = req.body?.drillId || "unknown";
      const timestamp = Date.now();
      const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileKey = `drill-submissions/${user.id}/${drillId}/${timestamp}-${sanitizedFileName}`;

      const videoUrl = await uploadVideoFile(fileKey, file.buffer, file.mimetype);

      console.log(`[Video Upload] User ${user.id} uploaded ${file.originalname} (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);

      return res.json({
        success: true,
        videoUrl,
        fileKey,
      });
    } catch (error: any) {
      console.error("[Video Upload] Failed:", error);
      if (error.message?.includes("session") || error.message?.includes("auth")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      return res.status(500).json({ error: error.message || "Upload failed" });
    }
  });

  // Image proxy route
  app.get("/api/storage/image/*", async (req, res) => {
    try {
      const imagePath = (req.params as Record<string, string>)[0];
      if (!imagePath) {
        return res.status(400).json({ error: "Image path required" });
      }
      const { data, contentType } = await storageDownload(imagePath);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000");
      res.send(data);
    } catch (error) {
      console.error("Image proxy error:", error);
      res.status(500).json({ error: "Failed to proxy image" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path }) {
        console.error(`[tRPC Error] ${path ?? "unknown"}:`, error.message);
      },
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // In production, bind to the PORT env var provided by the host
  // In development, scan for an available port
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = process.env.NODE_ENV === "production"
    ? preferredPort
    : await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/`);
    startBatchProcessor();
  });
}

startServer().catch(console.error);
