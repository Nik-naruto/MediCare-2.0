import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Global Route Scroll Restoration Component
 * Resets window and element scroll positions to top (0, 0) on route navigation,
 * accounting for async route hydration and browser click focus event cycles.
 */
export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // Preserve anchor links if hash is specified (e.g. #contact)
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    const resetScroll = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });

      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }

      const scrollableElements = document.querySelectorAll('main, #root, .flex-1, .overflow-y-auto');
      scrollableElements.forEach((el) => {
        if (el && el.scrollTop > 0) {
          el.scrollTop = 0;
        }
      });
    };

    // Execute scroll reset immediately and over micro-ticks to catch browser event loop reflows
    resetScroll();
    const t1 = setTimeout(resetScroll, 0);
    const t2 = setTimeout(resetScroll, 50);
    const t3 = setTimeout(resetScroll, 100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname, hash]);

  return null;
};
