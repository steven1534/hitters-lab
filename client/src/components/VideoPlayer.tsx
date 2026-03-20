import { useState } from 'react';
import { Play } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl?: string;
  title?: string;
}

export function VideoPlayer({ videoUrl, title = 'Drill Video' }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);

  if (!videoUrl) {
    return null;
  }

  // Extract video ID from various URL formats
  const getEmbedUrl = (url: string): string | null => {
    try {
      // YouTube formats - support multiple URL patterns:
      // - youtube.com/watch?v=VIDEO_ID (standard)
      // - youtube.com/watch?v=VIDEO_ID&si=... (with tracking params)
      // - youtube.com/watch/VIDEO_ID (non-standard but sometimes used)
      // - youtu.be/VIDEO_ID (short URL)
      // - youtu.be/VIDEO_ID?si=... (short URL with tracking)
      // - youtube.com/embed/VIDEO_ID (embed URL)
      // - m.youtube.com/watch?v=VIDEO_ID (mobile)
      const youtubeRegex = /(?:(?:www\.|m\.)?youtube\.com\/watch\?v=|(?:www\.|m\.)?youtube\.com\/watch\/|youtu\.be\/|(?:www\.|m\.)?youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:[&?]|$)/;
      const youtubeMatch = url.match(youtubeRegex);
      if (youtubeMatch) {
        return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
      }

      // Vimeo formats
      const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
      const vimeoMatch = url.match(vimeoRegex);
      if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      }

      // If it's already an embed URL, use it directly
      if (url.includes('youtube.com/embed') || url.includes('player.vimeo.com')) {
        return url;
      }

      return null;
    } catch {
      return null;
    }
  };

  const embedUrl = getEmbedUrl(videoUrl);

  if (!embedUrl) {
    return (
      <div className="w-full bg-muted rounded-lg p-8 flex flex-col items-center justify-center gap-3">
        <Play className="w-12 h-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Invalid video URL</p>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          Open video in new tab
        </a>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={embedUrl}
          title={title}
          className="absolute top-0 left-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
        />
        {isLoading && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
