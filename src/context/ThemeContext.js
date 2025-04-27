import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../theme';

// Create context
const ThemeContext = createContext({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
  setTheme: (mode) => {},
});

// Theme modes
const ThemeMode = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

// Storage key
const THEME_PREFERENCE_KEY = '@bettina_theme_preference';

// Provider component
export const ThemeProvider = ({ children }) => {
  // Get device color scheme
  const deviceColorScheme = useColorScheme();
  
  // State for theme preference
  const [themeMode, setThemeMode] = useState(ThemeMode.SYSTEM);
  
  // Derived theme based on mode and device scheme
  const isDark = 
    themeMode === ThemeMode.DARK || 
    (themeMode === ThemeMode.SYSTEM && deviceColorScheme === 'dark');
  
  const theme = isDark ? darkTheme : lightTheme;
  
  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (savedTheme !== null) {
          setThemeMode(savedTheme);
        }
      } catch (error) {
        console.log('Error loading theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, []);
  
  // Save theme preference when it changes
  useEffect(() => {
    const saveThemePreference = async () => {
      try {
        await AsyncStorage.setItem(THEME_PREFERENCE_KEY, themeMode);
      } catch (error) {
        console.log('Error saving theme preference:', error);
      }
    };
    
    saveThemePreference();
  }, [themeMode]);
  
  // Toggle between light and dark
  const toggleTheme = () => {
    setThemeMode(isDark ? ThemeMode.LIGHT : ThemeMode.DARK);
  };
  
  // Set specific theme
  const setTheme = (mode) => {
    if (Object.values(ThemeMode).includes(mode)) {
      setThemeMode(mode);
    }
  };
  
  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for using the theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { ThemeMode };