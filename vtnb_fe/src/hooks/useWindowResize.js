// src/hooks/useWindowResize.js
import { useEffect, useCallback } from 'react';

export const useWindowResize = (windowId, onResize) => {
  const handleCustomResize = useCallback((event) => {
    if (event.detail && String(event.detail.windowId) === String(windowId)) {
      onResize(event.detail);
    }
  }, [windowId, onResize]);

  useEffect(() => {
    window.addEventListener('windowResize', handleCustomResize);
    return () => {
      window.removeEventListener('windowResize', handleCustomResize);
    };
  }, [handleCustomResize]);

  const triggerResize = useCallback((dimensions) => {
    const event = new CustomEvent('windowResize', {
      detail: {
        windowId,
        ...dimensions
      }
    });
    window.dispatchEvent(event);
  }, [windowId]);

  return { triggerResize };
};

