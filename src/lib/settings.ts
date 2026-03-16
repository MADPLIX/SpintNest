const KEY_THEME = 'sprintnest_theme';
const KEY_ACCENT = 'sprintnest_accent';

export type Theme = 'dark' | 'light';

export const ACCENT_PRESETS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#4f46e5', label: 'Violett' },
  { value: '#3b82f6', label: 'Blau' },
  { value: '#0ea5e9', label: 'Hellblau' },
  { value: '#22c55e', label: 'Grün' },
  { value: '#10b981', label: 'Smaragd' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Rot' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#8b5cf6', label: 'Lila' },
];

export function getTheme(): Theme {
  return (localStorage.getItem(KEY_THEME) as Theme) || 'dark';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(KEY_THEME, theme);
}

export function getAccentColor(): string {
  return localStorage.getItem(KEY_ACCENT) || '#6366f1';
}

export function setAccentColor(hex: string): void {
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    localStorage.setItem(KEY_ACCENT, hex);
    applyAccentColor(hex);
  }
}

export function applyAccentColor(hex: string): void {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const hover = `rgb(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)})`;
  const muted = `rgba(${r}, ${g}, ${b}, 0.15)`;
  document.documentElement.style.setProperty('--color-accent', hex);
  document.documentElement.style.setProperty('--color-accent-hover', hover);
  document.documentElement.style.setProperty('--color-accent-muted', muted);
}
