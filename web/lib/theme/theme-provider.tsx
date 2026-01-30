/**
 * 🎨 CONTINUUM THEME PROVIDER
 * 
 * React context provider for theme management
 * - System preference detection with media query listener
 * - Persistent user preferences
 * - Smooth theme transitions
 * - SSR-safe implementation
 */

"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  Theme, 
  getSystemTheme, 
  getStoredTheme, 
  setStoredTheme, 
  resolveTheme,
  THEME_STORAGE_KEY
} from './theme-config';

interface ThemeContextType {
  /** Current theme setting ('light', 'dark', or 'system') */
  theme: Theme;
  /** Resolved theme based on system preference when 'system' is selected */
  resolvedTheme: 'light' | 'dark';
  /** Set the theme preference */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark (ignores system) */
  toggleTheme: () => void;
  /** Whether theme has been initialized (for SSR) */
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Default theme if no preference is stored */
  defaultTheme?: Theme;
  /** Force a specific theme (useful for specific pages) */
  forcedTheme?: 'light' | 'dark';
  /** Disable system theme detection */
  disableSystemTheme?: boolean;
  /** Enable smooth transition when changing themes */
  enableTransitions?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  forcedTheme,
  disableSystemTheme = false,
  enableTransitions = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  // Apply theme to document
  const applyTheme = useCallback((newResolvedTheme: 'light' | 'dark') => {
    const root = document.documentElement;
    const body = document.body;

    // Add transition class for smooth theme changes
    if (enableTransitions && mounted) {
      root.classList.add('theme-transition');
      setTimeout(() => root.classList.remove('theme-transition'), 300);
    }

    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    body.classList.remove('light-theme', 'dark-theme');

    // Apply new theme
    root.classList.add(newResolvedTheme);
    body.classList.add(`${newResolvedTheme}-theme`);

    // Update color-scheme for native elements
    root.style.colorScheme = newResolvedTheme;

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        newResolvedTheme === 'light' ? '#FFFFFF' : '#030305'
      );
    }

    setResolvedTheme(newResolvedTheme);
  }, [enableTransitions, mounted]);

  // Set theme and persist
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setStoredTheme(newTheme);
    
    if (forcedTheme) {
      applyTheme(forcedTheme);
    } else {
      const resolved = disableSystemTheme && newTheme === 'system' 
        ? 'dark' 
        : resolveTheme(newTheme);
      applyTheme(resolved);
    }
  }, [forcedTheme, disableSystemTheme, applyTheme]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // Initialize theme on mount
  useEffect(() => {
    const storedTheme = getStoredTheme();
    const initialTheme = storedTheme || defaultTheme;
    
    setThemeState(initialTheme);
    
    if (forcedTheme) {
      applyTheme(forcedTheme);
    } else {
      const resolved = disableSystemTheme && initialTheme === 'system'
        ? 'dark'
        : resolveTheme(initialTheme);
      applyTheme(resolved);
    }
    
    setMounted(true);
  }, [defaultTheme, forcedTheme, disableSystemTheme, applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (disableSystemTheme || forcedTheme) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, disableSystemTheme, forcedTheme, applyTheme]);

  // Listen for storage changes (sync across tabs)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const newTheme = e.newValue as Theme;
        setThemeState(newTheme);
        if (!forcedTheme) {
          const resolved = disableSystemTheme && newTheme === 'system'
            ? 'dark'
            : resolveTheme(newTheme);
          applyTheme(resolved);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [forcedTheme, disableSystemTheme, applyTheme]);

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    mounted,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 * @returns Theme context with current theme, setter, and toggle functions
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Inline script to prevent flash of wrong theme on initial load
 * Add this to your document head for best results
 */
export const ThemeScript = () => {
  const script = `
    (function() {
      const stored = localStorage.getItem('${THEME_STORAGE_KEY}');
      const theme = stored || 'system';
      const resolved = theme === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      document.documentElement.classList.add(resolved);
      document.documentElement.style.colorScheme = resolved;
    })();
  `;
  
  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
};
