import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'tenderhub-theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize theme from localStorage or system preference
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    console.log('🚀 [ThemeProvider] Initializing theme...');

    // Check localStorage first
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (storedTheme === 'light' || storedTheme === 'dark') {
      console.log('✅ [ThemeProvider] Found stored theme:', storedTheme);
      return storedTheme;
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      console.log('✅ [ThemeProvider] Using system dark theme preference');
      return 'dark';
    }

    console.log('✅ [ThemeProvider] Defaulting to light theme');
    return 'light';
  });

  // Update localStorage and document class when theme changes
  useEffect(() => {
    console.log('🎨 [ThemeProvider] Theme changed to:', theme);

    // Save to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    // Update document class for CSS custom properties
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);

    // Update body background for seamless experience
    document.body.style.backgroundColor = theme === 'dark' ? '#141414' : '#f0f2f5';

    console.log('✅ [ThemeProvider] Theme applied to document');
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      console.log('🔄 [ThemeProvider] Toggling theme from', prevTheme, 'to', newTheme);
      return newTheme;
    });
  };

  const setTheme = (newTheme: ThemeMode) => {
    console.log('🔧 [ThemeProvider] Setting theme to:', newTheme);
    setThemeState(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
