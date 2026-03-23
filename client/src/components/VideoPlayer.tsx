import { useState } from 'react';
import { Play } from 'lucide-react';
import { toEmbedUrl } from '@/lib/youtubeUtils';

interface VideoPlayerProps {
  videoUrl?: string;
  title?: string;
}

export function VideoPlayer({ videoUrl, title = 'Drill Video' }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);

  if (!videoUrl) {
    return null;
  }

  const embedUrl = toEmbedUrl(videoUrl);

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
