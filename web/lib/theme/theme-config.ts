/**
 * 🎨 CONTINUUM THEME SYSTEM
 * 
 * Professional light/dark theme support inspired by SmartHR Japan
 * - System preference detection
 * - User preference persistence
 * - Smooth transitions
 */

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Core
  background: string;
  backgroundCard: string;
  backgroundElevated: string;
  foreground: string;
  
  // Text
  textPrimary: string;
  textMuted: string;
  textDim: string;
  
  // Brand
  primary: string;
  primaryForeground: string;
  primaryGlow: string;
  secondary: string;
  accent: string;
  
  // Status
  success: string;
  warning: string;
  danger: string;
  info: string;
  
  // UI
  border: string;
  borderHover: string;
  input: string;
  ring: string;
  
  // Effects
  glassBorder: string;
  glassShadow: string;
  cardShadow: string;
}

// SmartHR Japan inspired light theme - Clean, professional, trustworthy
export const lightTheme: ThemeColors = {
  // Core - Clean white backgrounds
  background: '#FFFFFF',
  backgroundCard: '#F8F9FA',
  backgroundElevated: '#FFFFFF',
  foreground: '#1A1A1A',
  
  // Text - High contrast for readability
  textPrimary: '#1A1A1A',
  textMuted: '#5C5C5C',
  textDim: '#8C8C8C',
  
  // Brand - Professional blue (SmartHR style)
  primary: '#0066CC',
  primaryForeground: '#FFFFFF',
  primaryGlow: 'rgba(0, 102, 204, 0.2)',
  secondary: '#00A3A3',
  accent: '#0066CC',
  
  // Status - Clear, accessible colors
  success: '#00875A',
  warning: '#FFAB00',
  danger: '#DE350B',
  info: '#0066CC',
  
  // UI - Subtle borders and inputs
  border: '#E1E4E8',
  borderHover: '#C4C9CF',
  input: '#F4F5F7',
  ring: '#0066CC',
  
  // Effects - Subtle shadows for depth
  glassBorder: '1px solid #E1E4E8',
  glassShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
  cardShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.03)',
};

// Premium dark theme - Current Continuum aesthetic refined
export const darkTheme: ThemeColors = {
  // Core - Deep, premium dark
  background: '#030305',
  backgroundCard: 'rgba(15, 15, 25, 0.8)',
  backgroundElevated: 'rgba(25, 25, 40, 0.9)',
  foreground: '#F8FAFC',
  
  // Text - Crisp white with muted variants
  textPrimary: '#F8FAFC',
  textMuted: '#64748B',
  textDim: '#475569',
  
  // Brand - Purple glow aesthetic
  primary: '#A855F7',
  primaryForeground: '#FFFFFF',
  primaryGlow: 'rgba(168, 85, 247, 0.5)',
  secondary: '#06B6D4',
  accent: '#00F2FF',
  
  // Status - Vibrant on dark
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  
  // UI - Subtle glass effect borders
  border: 'rgba(255, 255, 255, 0.06)',
  borderHover: 'rgba(255, 255, 255, 0.12)',
  input: 'rgba(255, 255, 255, 0.05)',
  ring: '#A855F7',
  
  // Effects - Premium glow and glass
  glassBorder: '1px solid rgba(255, 255, 255, 0.06)',
  glassShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset',
  cardShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px rgba(168, 85, 247, 0.1)',
};

// CSS Custom properties for themes
export const lightThemeCSS = `
  --bg-dark: ${lightTheme.background};
  --bg-card: ${lightTheme.backgroundCard};
  --bg-elevated: ${lightTheme.backgroundElevated};
  --foreground: ${lightTheme.foreground};
  
  --text-main: ${lightTheme.textPrimary};
  --text-muted: ${lightTheme.textMuted};
  --text-dim: ${lightTheme.textDim};
  
  --primary: ${lightTheme.primary};
  --primary-foreground: ${lightTheme.primaryForeground};
  --primary-glow: ${lightTheme.primaryGlow};
  --secondary: ${lightTheme.secondary};
  --accent: ${lightTheme.accent};
  
  --success: ${lightTheme.success};
  --warning: ${lightTheme.warning};
  --danger: ${lightTheme.danger};
  --info: ${lightTheme.info};
  
  --border-color: ${lightTheme.border};
  --border-hover: ${lightTheme.borderHover};
  --input-bg: ${lightTheme.input};
  --ring: ${lightTheme.ring};
  
  --glass-border: ${lightTheme.glassBorder};
  --glass-shadow: ${lightTheme.glassShadow};
  --card-shadow: ${lightTheme.cardShadow};
  
  /* shadcn/ui variables for light mode */
  --background: 0 0% 100%;
  --card: 0 0% 98%;
  --card-foreground: 0 0% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 10%;
  --primary-hsl: 210 100% 40%;
  --secondary-hsl: 180 100% 32%;
  --muted: 210 10% 96%;
  --muted-foreground: 0 0% 36%;
  --accent-hsl: 210 10% 96%;
  --accent-foreground: 0 0% 10%;
  --destructive: 0 84% 46%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 88%;
  --input: 0 0% 96%;
`;

export const darkThemeCSS = `
  --bg-dark: ${darkTheme.background};
  --bg-card: ${darkTheme.backgroundCard};
  --bg-elevated: ${darkTheme.backgroundElevated};
  --foreground: ${darkTheme.foreground};
  
  --text-main: ${darkTheme.textPrimary};
  --text-muted: ${darkTheme.textMuted};
  --text-dim: ${darkTheme.textDim};
  
  --primary: ${darkTheme.primary};
  --primary-foreground: ${darkTheme.primaryForeground};
  --primary-glow: ${darkTheme.primaryGlow};
  --secondary: ${darkTheme.secondary};
  --accent: ${darkTheme.accent};
  
  --success: ${darkTheme.success};
  --warning: ${darkTheme.warning};
  --danger: ${darkTheme.danger};
  --info: ${darkTheme.info};
  
  --border-color: ${darkTheme.border};
  --border-hover: ${darkTheme.borderHover};
  --input-bg: ${darkTheme.input};
  --ring: ${darkTheme.ring};
  
  --glass-border: ${darkTheme.glassBorder};
  --glass-shadow: ${darkTheme.glassShadow};
  --card-shadow: ${darkTheme.cardShadow};
  
  /* shadcn/ui variables for dark mode */
  --background: 240 10% 1%;
  --card: 240 10% 4%;
  --card-foreground: 210 40% 98%;
  --popover: 240 10% 4%;
  --popover-foreground: 210 40% 98%;
  --primary-hsl: 270 91% 65%;
  --secondary-hsl: 187 94% 43%;
  --muted: 240 5% 15%;
  --muted-foreground: 215 20% 55%;
  --accent-hsl: 240 5% 15%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 240 5% 15%;
  --input: 240 5% 12%;
`;

// Theme storage keys
export const THEME_STORAGE_KEY = 'continuum-theme';

// Get system preference
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Get stored theme preference
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
}

// Store theme preference
export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

// Resolve effective theme
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}
