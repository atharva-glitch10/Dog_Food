import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';
export type FontSize = 'small' | 'medium' | 'large';
export type Density = 'comfortable' | 'compact';

interface SettingsContextType {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  fontSize: FontSize;
  setFontSize: (s: FontSize) => void;
  density: Density;
  setDensity: (d: Density) => void;
  reduceMotion: boolean;
  setReduceMotion: (r: boolean) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('dogfood_theme') as ThemeMode) || 'light';
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    return (localStorage.getItem('dogfood_font_size') as FontSize) || 'medium';
  });

  const [density, setDensityState] = useState<Density>(() => {
    return (localStorage.getItem('dogfood_density') as Density) || 'comfortable';
  });

  const [reduceMotion, setReduceMotionState] = useState<boolean>(() => {
    return localStorage.getItem('dogfood_reduce_motion') === 'true';
  });

  const [isOpen, setIsOpen] = useState(false);

  // Apply Theme
  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    localStorage.setItem('dogfood_theme', t);
  };

  // Apply Font Size
  const setFontSize = (s: FontSize) => {
    setFontSizeState(s);
    localStorage.setItem('dogfood_font_size', s);
  };

  // Apply Density
  const setDensity = (d: Density) => {
    setDensityState(d);
    localStorage.setItem('dogfood_density', d);
  };

  // Apply Reduce Motion
  const setReduceMotion = (r: boolean) => {
    setReduceMotionState(r);
    localStorage.setItem('dogfood_reduce_motion', String(r));
  };

  const toggleSettings = () => setIsOpen((prev) => !prev);

  // Synchronize document classes immediately
  useEffect(() => {
    const root = document.documentElement;

    // Theme
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }

    // Font size
    root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    root.classList.add(`font-size-${fontSize}`);

    // Density
    if (density === 'compact') {
      root.classList.add('density-compact');
    } else {
      root.classList.remove('density-compact');
    }

    // Reduce Motion
    if (reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [theme, fontSize, density, reduceMotion]);

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        fontSize,
        setFontSize,
        density,
        setDensity,
        reduceMotion,
        setReduceMotion,
        isOpen,
        setIsOpen,
        toggleSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
