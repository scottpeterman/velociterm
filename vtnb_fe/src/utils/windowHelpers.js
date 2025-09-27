// src/utils/windowHelpers.js
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

export const getViewportBounds = () => {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
};

export const constrainWindowPosition = (position, size) => {
  const viewport = getViewportBounds();

  return {
    x: clamp(position.x, 0, viewport.width - Math.max(size.width, 200)),
    y: clamp(position.y, 0, viewport.height - Math.max(size.height, 100))
  };
};

export const constrainWindowSize = (size, minSize = { width: 300, height: 200 }) => {
  const viewport = getViewportBounds();

  return {
    width: clamp(size.width, minSize.width, viewport.width * 0.9),
    height: clamp(size.height, minSize.height, viewport.height * 0.9)
  };
};

// WebSocket URL builder for different environments
export const buildWebSocketUrl = (windowId, endpoint = 'terminal') => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  let port;

  // Development environment detection
  if (window.location.port === '3000' ||
      window.location.port === '5173' ||
      window.location.port === '5174') {
    port = '8050'; // Backend port
  } else {
    port = window.location.port || (protocol === 'wss:' ? '443' : '80');
  }

  return `${protocol}//${hostname}:${port}/ws/${endpoint}/${windowId}`;
};

// Safe JSON stringification
export const safeJSONStringify = (obj) => {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    return '"<unserializable>"';
  }
};
