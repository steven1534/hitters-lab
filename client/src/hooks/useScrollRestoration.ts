import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Hook to restore scroll position when returning to a page
 * Usage: Call `useScrollRestoration()` in pages that have scrollable content (e.g., drill directory, athlete portal)
 * 
 * How it works:
 * - Restores scroll position from sessionStorage when component mounts
 * - Works in conjunction with ScrollRestoreLink component which saves scroll position before navigation
 */
export function useScrollRestoration() {
  const [location] = useLocation();

  useEffect(() => {
    // Restore scroll position after a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const savedPosition = sessionStorage.getItem(`scroll-${location}`);
      if (savedPosition) {
        window.scrollTo(0, parseInt(savedPosition, 10));
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [location]);
}
