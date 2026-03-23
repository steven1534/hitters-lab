/**
 * Server-side Open Graph meta tag injection for drill pages.
 *
 * When iMessage, Twitter, Slack, WhatsApp, Facebook, etc. fetch a drill URL
 * they send a request with a bot/crawler User-Agent. This middleware detects
 * those requests for /drill/:id routes and injects drill-specific OG tags
 * into the index.html before serving it, so link previews show the drill name,
 * description, and YouTube thumbnail.
 */

import type { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import * as db from "../db";

const APP_URL = process.env.APP_URL ?? "https://app.coachstevebaseball.com";

// YouTube ID extraction — handles all URL variants
const YT_ID_RE = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i;

function ytThumb(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;
  const m = videoUrl.match(YT_ID_RE);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Bot/crawler user-agent detector
function isCrawler(ua: string): boolean {
  return /facebookexternalhit|twitterbot|whatsapp|telegrambot|slackbot|linkedinbot|discordbot|applebot|iMessage|iMessageLinkPreview|bingbot|googlebot|preview|curl|wget|python-requests|node-fetch|axios|Go-http-client/i.test(ua);
}

// Load static drills JSON once at startup
let staticDrills: Array<{ id: string; name: string; difficulty: string; categories: string[] }> = [];
try {
  const drillsPath = path.resolve(process.cwd(), "client/src/data/drills.json");
  if (fs.existsSync(drillsPath)) {
    staticDrills = JSON.parse(fs.readFileSync(drillsPath, "utf-8"));
  }
} catch {
  // drills.json not available — will rely on DB only
}

export function ogMetaMiddleware(distPath: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const url = req.originalUrl;

    // Only handle /drill/:id routes
    const drillMatch = url.match(/^\/drill\/([^/?#]+)/);
    if (!drillMatch) return next();

    // Always inject OG tags for drill pages (not just crawlers)
    // This ensures iMessage previews work even on first cold open
    const drillId = decodeURIComponent(drillMatch[1]);

    try {
      // Look up drill name from static data or DB
      let drillName = "";
      let drillDescription = "Improve your hitting mechanics with this professional baseball drill from Coach Steve's Hitters Lab.";
      let imageUrl = `${APP_URL}/icons/icon-512.png`; // fallback

      // 1. Try static drills first (fastest)
      const staticDrill = staticDrills.find(d => d.id === drillId);
      if (staticDrill) {
        drillName = staticDrill.name;
        drillDescription = `${staticDrill.difficulty} ${staticDrill.categories.join(", ")} drill. Train smarter with Coach Steve's Hitters Lab.`;
      }

      // 2. Try custom drills from DB
      if (!drillName) {
        const customDrills = await db.getCustomDrills();
        const customDrill = customDrills.find((cd: any) => cd.drillId === drillId);
        if (customDrill) {
          drillName = customDrill.name;
          drillDescription = `${customDrill.difficulty} ${customDrill.category} drill · ${customDrill.duration}. Train smarter with Coach Steve's Hitters Lab.`;
        }
      }

      // 3. Try drillDetails for goal text
      try {
        const detail = await db.getDrillDetail(drillId);
        if (detail?.goal) {
          drillDescription = detail.goal;
        }
      } catch { /* non-critical */ }

      // 4. Try to get YouTube thumbnail
      try {
        const video = await db.getDrillVideo(drillId);
        const thumb = ytThumb(video?.videoUrl);
        if (thumb) imageUrl = thumb;
      } catch { /* non-critical */ }

      if (!drillName) {
        // Unknown drill — just serve normal index.html
        return next();
      }

      // Read index.html
      const indexPath = path.resolve(distPath, "index.html");
      let html = fs.readFileSync(indexPath, "utf-8");

      const title = escapeHtml(`${drillName} — Coach Steve's Hitters Lab`);
      const desc = escapeHtml(drillDescription.substring(0, 200));
      const pageUrl = `${APP_URL}/drill/${drillId}`;

      // Inject OG tags — replace existing generic ones and add new ones
      const ogTags = `
    <!-- Dynamic OG tags for drill: ${drillName} -->
    <title>${title}</title>
    <meta name="description" content="${desc}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="480" />
    <meta property="og:image:height" content="360" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Coach Steve's Hitters Lab" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${imageUrl}" />`;

      // Replace the static <title> and og tags in index.html
      html = html
        .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
        .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${title}" />`)
        .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${desc}" />`)
        // Inject remaining tags before </head>
        .replace(
          "</head>",
          `    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="480" />
    <meta property="og:image:height" content="360" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:site_name" content="Coach Steve's Hitters Lab" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${imageUrl}" />
  </head>`
        );

      res.setHeader("Content-Type", "text/html");
      res.setHeader("Cache-Control", "public, max-age=3600"); // cache 1 hour
      return res.send(html);
    } catch (err) {
      console.error("[OG Meta] Error generating meta tags:", err);
      return next();
    }
  };
}
