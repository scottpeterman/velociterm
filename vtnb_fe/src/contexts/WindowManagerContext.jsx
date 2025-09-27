import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

const WindowManagerContext = createContext(null);

// Window action types
const WINDOW_ACTIONS = {
  CREATE_WINDOW: 'CREATE_WINDOW',
  CLOSE_WINDOW: 'CLOSE_WINDOW',
  MINIMIZE_WINDOW: 'MINIMIZE_WINDOW',
  MAXIMIZE_WINDOW: 'MAXIMIZE_WINDOW',
  FOCUS_WINDOW: 'FOCUS_WINDOW',
  UPDATE_WINDOW_POSITION: 'UPDATE_WINDOW_POSITION',
  UPDATE_WINDOW_SIZE: 'UPDATE_WINDOW_SIZE',
  SET_WINDOW_STATE: 'SET_WINDOW_STATE'
};

// Window reducer
const windowReducer = (state, action) => {
  switch (action.type) {
    case WINDOW_ACTIONS.CREATE_WINDOW: {
      const maxZ = Math.max(...state.windows.map(w => w.zIndex), 999);
      const newWindow = {
        id: crypto.randomUUID(),
        zIndex: maxZ + 1,
        position: { 
          x: 100 + Math.random() * 200, 
          y: 100 + Math.random() * 200 
        },
        size: { width: 800, height: 600 },
        isMinimized: false,
        isMaximized: false,
        isFocused: true,
        createdAt: Date.now(),
        ...action.payload
      };

      return {
        ...state,
        windows: [...state.windows.map(w => ({ ...w, isFocused: false })), newWindow],
        activeWindowId: newWindow.id,
        nextZIndex: maxZ + 2
      };
    }

    case WINDOW_ACTIONS.CLOSE_WINDOW:
      return {
        ...state,
        windows: state.windows.filter(w => w.id !== action.payload.windowId),
        activeWindowId: state.activeWindowId === action.payload.windowId 
          ? state.windows.find(w => w.id !== action.payload.windowId)?.id || null
          : state.activeWindowId
      };

    case WINDOW_ACTIONS.FOCUS_WINDOW: {
      const maxZ = Math.max(...state.windows.map(w => w.zIndex), 999);
      return {
        ...state,
        windows: state.windows.map(w => 
          w.id === action.payload.windowId
            ? { ...w, isFocused: true, zIndex: maxZ + 1 }
            : { ...w, isFocused: false }
        ),
        activeWindowId: action.payload.windowId,
        nextZIndex: maxZ + 2
      };
    }

    case WINDOW_ACTIONS.MINIMIZE_WINDOW:
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload.windowId
            ? { ...w, isMinimized: !w.isMinimized, isFocused: !w.isMinimized ? false : w.isFocused }
            : w
        )
      };

    case WINDOW_ACTIONS.UPDATE_WINDOW_POSITION:
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload.windowId
            ? { ...w, position: action.payload.position }
            : w
        )
      };

    case WINDOW_ACTIONS.UPDATE_WINDOW_SIZE:
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload.windowId
            ? { ...w, size: action.payload.size }
            : w
        )
      };

    default:
      return state;
  }
};

// Initial state
const initialWindowState = {
  windows: [],
  activeWindowId: null,
  nextZIndex: 1000
};

export const useWindowManager = () => {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error('useWindowManager must be used within WindowManagerProvider');
  }
  return context;
};

export const WindowManagerProvider = ({ children }) => {
  const [state, dispatch] = useReducer(windowReducer, initialWindowState);

  const createWindow = useCallback((windowConfig) => {
    dispatch({
      type: WINDOW_ACTIONS.CREATE_WINDOW,
      payload: windowConfig
    });
  }, []);

  const closeWindow = useCallback((windowId) => {
    dispatch({
      type: WINDOW_ACTIONS.CLOSE_WINDOW,
      payload: { windowId }
    });
  }, []);

  const focusWindow = useCallback((windowId) => {
    dispatch({
      type: WINDOW_ACTIONS.FOCUS_WINDOW,
      payload: { windowId }
    });
  }, []);

  const minimizeWindow = useCallback((windowId) => {
    dispatch({
      type: WINDOW_ACTIONS.MINIMIZE_WINDOW,
      payload: { windowId }
    });
  }, []);

  const updateWindowPosition = useCallback((windowId, position) => {
    dispatch({
      type: WINDOW_ACTIONS.UPDATE_WINDOW_POSITION,
      payload: { windowId, position }
    });
  }, []);

  const updateWindowSize = useCallback((windowId, size) => {
    dispatch({
      type: WINDOW_ACTIONS.UPDATE_WINDOW_SIZE,
      payload: { windowId, size }
    });
  }, []);

  const getWindowById = useCallback((windowId) => {
    return state.windows.find(w => w.id === windowId);
  }, [state.windows]);

  const getWindowsByType = useCallback((type) => {
    return state.windows.filter(w => w.type === type);
  }, [state.windows]);

  const contextValue = useMemo(() => ({
    // State
    windows: state.windows,
    activeWindowId: state.activeWindowId,
    
    // Actions
    createWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    updateWindowPosition,
    updateWindowSize,
    
    // Getters
    getWindowById,
    getWindowsByType,
    
    // Stats
    windowCount: state.windows.length,
    terminalCount: state.windows.filter(w => w.type === 'terminal').length,
    minimizedCount: state.windows.filter(w => w.isMinimized).length
  }), [
    state,
    createWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    updateWindowPosition,
    updateWindowSize,
    getWindowById,
    getWindowsByType
  ]);

  return (
    <WindowManagerContext.Provider value={contextValue}>
      {children}
    </WindowManagerContext.Provider>
  );
};