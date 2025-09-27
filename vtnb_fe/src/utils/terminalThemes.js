// src/utils/terminalThemes.js
export const TERMINAL_THEMES = {
  dark: {
    name: 'Dark',
    background: '#0f172a',
    foreground: '#f1f5f9',
    cursor: '#06b6d4',
    selection: 'rgba(6, 182, 212, 0.3)',
    black: '#484f58',
    red: '#ff7b72',
    green: '#3fb950',
    yellow: '#d29922',
    blue: '#58a6ff',
    magenta: '#bc8cff',
    cyan: '#39c5cf',
    white: '#b1bac4',
    brightBlack: '#6e7681',
    brightRed: '#ffa198',
    brightGreen: '#56d364',
    brightYellow: '#e3b341',
    brightBlue: '#79c0ff',
    brightMagenta: '#d2a8ff',
    brightCyan: '#56d4dd',
    brightWhite: '#f0f6fc'
  },
  light: {
    name: 'Light',
    background: '#ffffff',
    foreground: '#24292f',
    cursor: '#0969da',
    selection: 'rgba(9, 105, 218, 0.2)',
    black: '#24292f',
    red: '#cf222e',
    green: '#116329',
    yellow: '#4d2d00',
    blue: '#0969da',
    magenta: '#8250df',
    cyan: '#1b7c83',
    white: '#6e7781',
    brightBlack: '#656d76',
    brightRed: '#a40e26',
    brightGreen: '#0d5016',
    brightYellow: '#633c01',
    brightBlue: '#0550ae',
    brightMagenta: '#6f42c1',
    brightCyan: '#1b7c83',
    brightWhite: '#24292f'
  },
  cyber: {
    name: 'Cyber',
    background: '#001122',
    foreground: '#00e6e6',
    cursor: '#00e6e6',
    selection: 'rgba(0, 230, 230, 0.2)',
    black: '#000000',
    red: '#ff0044',
    green: '#00cc99',
    yellow: '#cccc00',
    blue: '#0088ff',
    magenta: '#cc44cc',
    cyan: '#00e6e6',
    white: '#ccffff',
    brightBlack: '#666666',
    brightRed: '#ff4466',
    brightGreen: '#44ffcc',
    brightYellow: '#ffff44',
    brightBlue: '#44aaff',
    brightMagenta: '#ff66ff',
    brightCyan: '#66ffff',
    brightWhite: '#ffffff'
  },
  terminal_green: {
    name: 'Terminal Green',
    background: '#001100',
    foreground: '#00ff00',
    cursor: '#00ff00',
    selection: 'rgba(0, 255, 0, 0.2)',
    black: '#000000',
    red: '#00aa00',
    green: '#00ff00',
    yellow: '#88ff00',
    blue: '#0088aa',
    magenta: '#00aa88',
    cyan: '#00ffaa',
    white: '#aaffaa',
    brightBlack: '#555555',
    brightRed: '#55ff55',
    brightGreen: '#55ff55',
    brightYellow: '#ffff55',
    brightBlue: '#5555ff',
    brightMagenta: '#ff55ff',
    brightCyan: '#55ffff',
    brightWhite: '#ffffff'
  },
  amber: {
    name: 'Amber',
    background: '#1a0f00',
    foreground: '#ffb000',
    cursor: '#ffb000',
    selection: 'rgba(255, 176, 0, 0.2)',
    black: '#000000',
    red: '#ff6600',
    green: '#cc9900',
    yellow: '#ffb000',
    blue: '#ff8800',
    magenta: '#ff9933',
    cyan: '#ffaa00',
    white: '#ffcc66',
    brightBlack: '#664400',
    brightRed: '#ff8833',
    brightGreen: '#ffcc00',
    brightYellow: '#ffdd33',
    brightBlue: '#ffaa33',
    brightMagenta: '#ffbb44',
    brightCyan: '#ffcc44',
    brightWhite: '#ffeeaa'
  }
};

// Theme storage utilities
export const getTerminalTheme = (windowId) => {
  const stored = localStorage.getItem(`terminal-theme-${windowId}`);
  return stored && TERMINAL_THEMES[stored] ? stored : 'dark';
};

export const setTerminalTheme = (windowId, themeKey) => {
  if (TERMINAL_THEMES[themeKey]) {
    localStorage.setItem(`terminal-theme-${windowId}`, themeKey);
  }
};

export const clearTerminalTheme = (windowId) => {
  localStorage.removeItem(`terminal-theme-${windowId}`);
};

// Get theme object by key
export const getThemeConfig = (themeKey = 'dark') => {
  return TERMINAL_THEMES[themeKey] || TERMINAL_THEMES.dark;
};