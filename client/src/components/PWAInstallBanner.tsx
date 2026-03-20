import { useState } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { X, Download, Share, Plus } from 'lucide-react';

export function PWAInstallBanner() {
  const { canPrompt, isIOS, isStandalone, promptInstall, dismissPrompt } = usePWA();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Don't show if already in standalone mode
  if (isStandalone) {
    return null;
  }

  // Show iOS-specific instructions
  if (isIOS && !canPrompt) {
    // Check if we've dismissed iOS prompt recently
    const iosDismissed = localStorage.getItem('pwa-ios-dismissed');
    if (iosDismissed) {
      const dismissedTime = parseInt(iosDismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) {
        return null;
      }
    }

    if (!showIOSInstructions) {
      return (
        <div className="fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground p-4 shadow-lg z-50 safe-area-inset-bottom">
          <div className="container flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Install App</p>
                <p className="text-xs text-primary-foreground/80">Add to your home screen for quick access</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowIOSInstructions(true)}
              >
                How to Install
              </Button>
              <button
                onClick={() => {
                  localStorage.setItem('pwa-ios-dismissed', Date.now().toString());
                  setShowIOSInstructions(false);
                }}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // iOS installation instructions modal
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
        <div className="bg-background text-foreground w-full max-w-lg rounded-t-2xl p-6 pb-8 safe-area-inset-bottom animate-in slide-in-from-bottom">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold">Install on iPhone/iPad</h3>
            <button
              onClick={() => {
                localStorage.setItem('pwa-ios-dismissed', Date.now().toString());
                setShowIOSInstructions(false);
              }}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary p-2 rounded-lg shrink-0">
                <Share className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Step 1</p>
                <p className="text-sm text-muted-foreground">
                  Tap the <strong>Share</strong> button at the bottom of Safari
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary p-2 rounded-lg shrink-0">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Step 2</p>
                <p className="text-sm text-muted-foreground">
                  Scroll down and tap <strong>"Add to Home Screen"</strong>
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary p-2 rounded-lg shrink-0">
                <Download className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Step 3</p>
                <p className="text-sm text-muted-foreground">
                  Tap <strong>"Add"</strong> in the top right corner
                </p>
              </div>
            </div>
          </div>
          
          <Button
            className="w-full mt-6"
            onClick={() => {
              localStorage.setItem('pwa-ios-dismissed', Date.now().toString());
              setShowIOSInstructions(false);
            }}
          >
            Got it!
          </Button>
        </div>
      </div>
    );
  }

  // Show install prompt for Android/Desktop
  if (!canPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground p-4 shadow-lg z-50 safe-area-inset-bottom">
      <div className="container flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Install App</p>
            <p className="text-xs text-primary-foreground/80">Quick access from your home screen</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              await promptInstall();
            }}
          >
            Install
          </Button>
          <button
            onClick={dismissPrompt}
            className="p-1 hover:bg-white/10 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
