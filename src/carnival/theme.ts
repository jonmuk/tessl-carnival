/**
 * The carnival's colours, fonts and sizes. Games draw with these rather than
 * their own values, so every booth on the midway looks like it belongs.
 */
export const theme = {
  colors: {
    background: '#1b1035',
    surface: '#2a1a52',
    text: '#fff8e7',
    muted: '#b9a9d9',
    accent: '#ffcc33',
    danger: '#ff5a5f',
    stripeA: '#e63946',
    stripeB: '#fff8e7',
    water: '#5ec8f2',
    wood: '#8a5a3b',
    terminal: '#66ff66',
    terminalDim: '#2b8a3e',
    terminalBackground: '#050805',
  },
  font: {
    family: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
    mono: 'ui-monospace, Menlo, Consolas, "Liberation Mono", "Courier New", monospace',
    small: 14,
    body: 18,
    title: 32,
  },
  radius: 12,
  canvas: {
    width: 800,
    height: 500,
  },
} as const;

/**
 * Canvas font string, e.g. canvasFont('title') → 'bold 32px "Trebuchet MS", …'.
 * Pass 'mono' as the family for a terminal look.
 */
export function canvasFont(
  size: 'small' | 'body' | 'title',
  weight: 'normal' | 'bold' = 'normal',
  family: 'family' | 'mono' = 'family',
) {
  return `${weight} ${theme.font[size]}px ${theme.font[family]}`;
}

/** Exposes the theme to CSS as custom properties, e.g. --color-accent. */
export function applyTheme(root: HTMLElement = document.documentElement) {
  for (const [name, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--color-${name}`, value);
  }
  root.style.setProperty('--font-family', theme.font.family);
  root.style.setProperty('--radius', `${theme.radius}px`);
}
