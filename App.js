import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { JournalProvider } from './src/context/JournalContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import badgeService from './src/services/BadgeService';
import storageManager from './src/services/StoreManager';
// Main app with theme context
const Main = () => {
  const { theme, isDark } = useTheme();
  useEffect(() => {
    const checkTimeBasedBadges = async () => {
      try {
        const newBadges = await badgeService.checkForNewBadges();
        
        // Show notification if new badges were earned
        if (newBadges.length > 0) {
          // Get badge details for the first new badge
          const badgeDetails = await storageManager.getUserBadges();
          const newBadge = badgeDetails.find(b => b.id === newBadges[0]);
          
          if (newBadge && !newBadge.viewed) {
            showBadgeNotification(newBadge);
            await badgeService.markBadgeAsViewed(newBadge.id);
          }
        }
      } catch (error) {
        console.error('Error checking time-based badges:', error);
      }
    };
    
    checkTimeBasedBadges();
  }, []);
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
    <ThemeProvider>
     <JournalProvider>
     <Main />
     </JournalProvider>
    </ThemeProvider>
    </SafeAreaProvider> 
  );
}