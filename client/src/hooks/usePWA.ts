import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isStandalone: boolean;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pwaState, setPwaState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    isStandalone: false,
  });

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    // Check if already installed (localStorage flag)
    const isInstalled = localStorage.getItem('pwa-installed') === 'true' || isStandalone;

    setPwaState(prev => ({
      ...prev,
      isIOS,
      isStandalone,
      isInstalled,
    }));

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPwaState(prev => ({ ...prev, isInstallable: true }));
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      localStorage.setItem('pwa-installed', 'true');
      setPwaState(prev => ({
        ...prev,
        isInstallable: false,
        isInstalled: true,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return { outcome: 'dismissed' as const };
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem('pwa-installed', 'true');
      setPwaState(prev => ({
        ...prev,
        isInstallable: false,
        isInstalled: true,
      }));
    }

    setDeferredPrompt(null);
    return { outcome };
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    // Store dismissal with timestamp to not show again for a while
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    setDeferredPrompt(null);
    setPwaState(prev => ({ ...prev, isInstallable: false }));
  }, []);

  // Check if we should show the prompt (not dismissed recently)
  const shouldShowPrompt = useCallback(() => {
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (!dismissed) return true;

    // Show again after 7 days
    const dismissedTime = parseInt(dismissed, 10);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedTime > sevenDays;
  }, []);

  return {
    ...pwaState,
    promptInstall,
    dismissPrompt,
    shouldShowPrompt,
    canPrompt: pwaState.isInstallable && !pwaState.isInstalled && shouldShowPrompt(),
  };
}
