import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { JournalProvider } from "./src/context/JournalContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import badgeService from "./src/services/BadgeService";
import storageManager from "./src/services/StoreManager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import serviceLockManager from "./src/services/ServiceLockManager";
import { AppState } from "react-native";

// Main app with theme context
const Main = () => {
  const { theme, isDark } = useTheme();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("App: Starting initialization...");

        // Store initial time checkpoint (with error handling)
        try {
          if (
            serviceLockManager &&
            typeof serviceLockManager.storeTimeCheckpoint === "function"
          ) {
            await serviceLockManager.storeTimeCheckpoint("app_startup");
            console.log("App: Time checkpoint stored successfully");
          } else {
            console.warn("App: ServiceLockManager not properly initialized");
          }
        } catch (checkpointError) {
          console.error("App: Error storing time checkpoint:", checkpointError);
          // Don't fail the entire initialization for this
        }

        // Fix any existing entries with invalid dates
        try {
          const validationResult =
            await storageManager.validateAndFixEntryDates();
          if (validationResult.fixedCount > 0) {
            console.log(
              `App: Fixed ${validationResult.fixedCount} entries with invalid dates`
            );
          }
        } catch (validationError) {
          console.error("App: Error validating entry dates:", validationError);
        }

        // Check service year lock status with enhanced protection
        try {
          const settings = await storageManager.getSettings();
          if (settings.serviceInfo && serviceLockManager) {
            const lockStatus = await serviceLockManager.checkServiceYearStatus(
              settings.serviceInfo
            );
            console.log(
              "App: Service lock status:",
              lockStatus.reason || "ACTIVE"
            );

            // Show warning if time manipulation detected
            if (
              lockStatus.timeManipulation &&
              lockStatus.timeManipulation.confidence > 30
            ) {
              console.warn(
                "App: Time manipulation detected with confidence:",
                lockStatus.timeManipulation.confidence
              );
            }

            if (lockStatus.reason === "TIME_MANIPULATION") {
              console.log("App: Time manipulation lock triggered");
            }
          }
        } catch (lockError) {
          console.error("App: Error checking service lock status:", lockError);
        }

        // Badge checking (existing code)
        try {
          const newBadges = await badgeService.checkForNewBadges();
          if (newBadges.length > 0) {
            const badgeDetails = await storageManager.getUserBadges();
            const newBadge = badgeDetails.find((b) => b.id === newBadges[0]);

            if (newBadge && !newBadge.viewed) {
              // showBadgeNotification(newBadge); // Uncomment if you have this function
              await badgeService.markBadgeAsViewed(newBadge.id);
            }
          }
        } catch (badgeError) {
          console.error("App: Error checking badges:", badgeError);
        }

        // Media cleanup (existing code)
        try {
          const lastCleanup = await AsyncStorage.getItem("@last_media_cleanup");
          const now = Date.now();
          const oneWeek = 7 * 24 * 60 * 60 * 1000;

          if (!lastCleanup || now - parseInt(lastCleanup) > oneWeek) {
            console.log("App: Performing scheduled media cleanup...");
            const cleanupResult = await storageManager.performMediaCleanup();
            if (cleanupResult.success && cleanupResult.deletedFiles > 0) {
              console.log(
                `App: Cleanup completed: ${cleanupResult.deletedFiles} files removed`
              );
            }
            await AsyncStorage.setItem("@last_media_cleanup", now.toString());
          }
        } catch (cleanupError) {
          console.error("App: Error during media cleanup:", cleanupError);
        }

        console.log("App: Initialization completed successfully");
      } catch (error) {
        console.error("App: Critical error during initialization:", error);
        // App should still continue to work even if initialization has issues
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === "active") {
        // App came to foreground - store checkpoint
        serviceLockManager.storeTimeCheckpoint("app_foreground");
      } else if (nextAppState === "background") {
        // App went to background - store checkpoint
        serviceLockManager.storeTimeCheckpoint("app_background");
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  // useEffect(() => {
  //   const checkTimeBasedBadges = async () => {
  //     try {
  //       const newBadges = await badgeService.checkForNewBadges();

  //       // Show notification if new badges were earned
  //       if (newBadges.length > 0) {
  //         // Get badge details for the first new badge
  //         const badgeDetails = await storageManager.getUserBadges();
  //         const newBadge = badgeDetails.find((b) => b.id === newBadges[0]);

  //         if (newBadge && !newBadge.viewed) {
  //           showBadgeNotification(newBadge);
  //           await badgeService.markBadgeAsViewed(newBadge.id);
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error checking time-based badges:", error);
  //     }
  //   };

  //   checkTimeBasedBadges();
  // }, []);
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
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
