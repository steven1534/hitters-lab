/**
 * Shared YouTube URL utilities — handles every known URL variation:
 *
 * Standard:      https://www.youtube.com/watch?v=VIDEO_ID
 * No-www:        https://youtube.com/watch?v=VIDEO_ID
 * Mobile:        https://m.youtube.com/watch?v=VIDEO_ID
 * Short:         https://youtu.be/VIDEO_ID
 * Short+params:  https://youtu.be/VIDEO_ID?si=TRACKING&list=LIST
 * Shorts:        https://www.youtube.com/shorts/VIDEO_ID
 * Embed:         https://www.youtube.com/embed/VIDEO_ID
 * Live:          https://www.youtube.com/live/VIDEO_ID
 * Music:         https://music.youtube.com/watch?v=VIDEO_ID
 * Attribution:   https://www.youtube.com/attribution_link?...u=%2Fwatch%3Fv%3DVIDEO_ID
 * Playlist item: https://www.youtube.com/watch?v=VIDEO_ID&list=LIST
 * Nocookie:      https://www.youtube-nocookie.com/embed/VIDEO_ID
 * Vimeo:         https://vimeo.com/VIDEO_ID  |  https://player.vimeo.com/video/VIDEO_ID
 */

const YT_ID_RE = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/|e\/|watch\/|attribution_link\?(?:.*&)?u=(?:.*%3Fv%3D|.*\/watch%3Fv%3D)))([a-zA-Z0-9_-]{11})/i;

/** Extract the 11-char YouTube video ID from any URL variation. Returns null if not a YouTube URL. */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  // Decode percent-encoded URLs (e.g. attribution_link)
  let decoded = url;
  try { decoded = decodeURIComponent(url); } catch { /* keep original */ }
  const m = decoded.match(YT_ID_RE);
  return m ? m[1] : null;
}

/** Convert ANY YouTube or Vimeo URL to a proper embed URL. Returns null if unrecognised. */
export function toEmbedUrl(url: string): string | null {
  if (!url?.trim()) return null;

  // Already an embed URL — return as-is
  if (url.includes('youtube.com/embed/') || url.includes('youtube-nocookie.com/embed/')) {
    // Strip extra query params except start time
    const base = url.split('?')[0];
    return base;
  }
  if (url.includes('player.vimeo.com/video/')) return url.split('?')[0];

  // YouTube
  const ytId = extractYouTubeId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}`;

  // Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return null;
}

/** Returns true if the URL is a recognised YouTube or Vimeo URL */
export function isValidVideoUrl(url: string): boolean {
  if (!url?.trim()) return false;
  return !!(extractYouTubeId(url) || url.match(/vimeo\.com\/\d+/i));
}

/** Extract YouTube video ID for thumbnail generation */
export function getYouTubeThumbnail(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
