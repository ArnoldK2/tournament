export interface ClientTheme {
  key: string
  bg: string
  surface: string
  text: string
  subText: string
  faintText: string
  gridLine: string
  accent: string
  fontUrl?: string
}

export const DEFAULT_THEME: ClientTheme = {
  key: 'default',
  bg: '#050510',
  surface: 'rgba(255,255,255,0.04)',
  text: '#ffffff',
  subText: 'rgba(255,255,255,0.5)',
  faintText: 'rgba(255,255,255,0.25)',
  gridLine: 'rgba(255,255,255,0.06)',
  accent: '#7c3aed',
}

const WAGA_THEME: ClientTheme = {
  key: 'waga',
  bg: '#f5f0e8',
  surface: '#ffffff',
  text: '#1a1a1a',
  subText: 'rgba(0,0,0,0.5)',
  faintText: 'rgba(0,0,0,0.25)',
  gridLine: 'rgba(0,0,0,0.08)',
  accent: '#c0392b',
  fontUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap',
}

const CLIENT_THEMES: Record<string, ClientTheme> = {
  '5c403fae-6e1c-4920-b939-bc3752dcaa7a': WAGA_THEME,
}

export function getClientTheme(clientId?: string): ClientTheme {
  if (!clientId) return DEFAULT_THEME
  return CLIENT_THEMES[clientId] ?? DEFAULT_THEME
}
