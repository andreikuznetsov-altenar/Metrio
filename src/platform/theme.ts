export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export function resolveTheme(preference: ThemePreference, systemDark = false): ResolvedTheme {
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}

export function applyResolvedTheme(theme: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export function watchSystemTheme(onChange: (isDark: boolean) => void): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onChange(media.matches);
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
}

export function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
