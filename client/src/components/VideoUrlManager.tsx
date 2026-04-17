import { useState } from 'react';
import { isValidVideoUrl } from '@/lib/youtubeUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, Copy, Check, AlertCircle } from 'lucide-react';

interface VideoUrlManagerProps {
  drillId: string;
  drillName: string;
  currentVideoUrl?: string;
  onSave?: (videoUrl: string) => void;
}

export function VideoUrlManager({ drillId, drillName, currentVideoUrl, onSave }: VideoUrlManagerProps) {
  const [videoUrl, setVideoUrl] = useState(currentVideoUrl || '');
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const validateVideoUrl = (url: string): boolean => {
    if (!url) return true; // Empty is valid
    return /youtu\.be|youtube\.com|vimeo\.com/i.test(url);
  };

  const handleSave = () => {
    setError('');
    
    if (!validateVideoUrl(videoUrl)) {
      setError('Please enter a valid YouTube or Vimeo URL');
      return;
    }

    onSave?.(videoUrl);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(videoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-l-4 border-l-[#DC143C] border-white/[0.08] bg-white/[0.02]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-5 w-5 text-[#DC143C]" />
          Add Video to {drillName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400 flex gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Supported Platforms:</p>
            <p>YouTube, Vimeo, or direct embed URLs</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">Video URL</label>
          <Input
            placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="font-mono text-sm"
          />
          {error && (
            <p className="text-sm text-red-400 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            className="flex-1"
            variant={isSaved ? 'default' : 'default'}
          >
            {isSaved ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved!
              </>
            ) : (
              'Save Video URL'
            )}
          </Button>
          {videoUrl && (
            <Button
              onClick={handleCopy}
              variant="outline"
              size="icon"
              title="Copy URL"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {currentVideoUrl && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm">
            <p className="font-semibold text-green-400 mb-1">Current Video:</p>
            <p className="text-green-300 break-all font-mono text-xs">{currentVideoUrl}</p>
          </div>
        )}

        <div className="bg-white/[0.04] rounded-lg p-3 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground/70">Examples:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>YouTube: https://www.youtube.com/watch?v=dQw4w9WgXcQ</li>
            <li>YouTube Short: https://youtu.be/dQw4w9WgXcQ</li>
            <li>Vimeo: https://vimeo.com/123456789</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
