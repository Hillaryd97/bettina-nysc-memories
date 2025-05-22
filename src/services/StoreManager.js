import AsyncStorage from "@react-native-async-storage/async-storage";
import mediaManager from "./MediaManager";

// Keys for AsyncStorage
const KEYS = {
  ENTRIES: "journal_entries",
  USER_SETTINGS: "user_settings",
  SYNC_STATUS: "sync_status",
  SERVICE_INFO: "service_info", // Add this new key
  BADGES: "user_badges",
  BADGE_PROGRESS: "badge_progress",
};
const safeDateConversion = (dateValue) => {
  if (!dateValue) {
    return new Date().toISOString();
  }

  try {
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) {
        return new Date().toISOString();
      }
      return dateValue.toISOString();
    }

    const convertedDate = new Date(dateValue);
    if (isNaN(convertedDate.getTime())) {
      return new Date().toISOString();
    }

    return convertedDate.toISOString();
  } catch (error) {
    console.error("StorageManager safeDateConversion error:", error);
    return new Date().toISOString();
  }
};

/**
 * StorageManager handles all data persistence operations for the app
 * Whether saving locally to AsyncStorage or later to Firebase
 */
class StorageManager {
  /**
   * Get all journal entries
   * @returns {Promise<Array>} Array of entry objects
   */
  async getEntries() {
    try {
      const entriesJson = await AsyncStorage.getItem(KEYS.ENTRIES);
      return entriesJson ? JSON.parse(entriesJson) : [];
    } catch (error) {
      console.error("Error getting journal entries:", error);
      return [];
    }
  }

  /**
   * Save a new journal entry
   * @param {Object} entry Entry object to save
   * @returns {Promise<String>} ID of the saved entry
   */
  async saveEntry(entry) {
    try {
      const entries = await this.getEntries();

      // Ensure dates are properly formatted
      const newEntry = {
        ...entry,
        id: entry.id || Date.now().toString(),
        date: safeDateConversion(entry.date),
        createdAt: entry.createdAt
          ? safeDateConversion(entry.createdAt)
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: "local",
      };

      console.log("StorageManager: Saving entry with date:", newEntry.date);

      const updatedEntries = [
        newEntry,
        ...entries.filter((e) => e.id !== newEntry.id),
      ];

      await AsyncStorage.setItem(KEYS.ENTRIES, JSON.stringify(updatedEntries));
      return newEntry.id;
    } catch (error) {
      console.error("StorageManager: Error saving journal entry:", error);
      throw error;
    }
  }
  /**
   * Update an existing journal entry
   * @param {String} entryId ID of the entry to update
   * @param {Object} updatedData Updated entry data
   * @returns {Promise<Boolean>} Success status
   */
  async updateEntry(entryId, updatedData) {
    try {
      const entries = await this.getEntries();
      const entryIndex = entries.findIndex((entry) => entry.id === entryId);

      if (entryIndex === -1) {
        throw new Error("Entry not found");
      }

      // Ensure date is properly formatted if it's being updated
      const processedData = { ...updatedData };
      if (processedData.date) {
        processedData.date = safeDateConversion(processedData.date);
      }

      entries[entryIndex] = {
        ...entries[entryIndex],
        ...processedData,
        updatedAt: new Date().toISOString(),
        syncStatus:
          entries[entryIndex].syncStatus === "synced"
            ? "pendingSync"
            : entries[entryIndex].syncStatus,
      };

      console.log(
        "StorageManager: Updated entry with date:",
        entries[entryIndex].date
      );

      await AsyncStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
      return true;
    } catch (error) {
      console.error("StorageManager: Error updating journal entry:", error);
      return false;
    }
  }

  /**
   * Delete a journal entry and its associated media files
   * @param {String} entryId ID of the entry to delete
   * @returns {Promise<Boolean>} Success status
   */
  async deleteEntry(entryId) {
    try {
      const entries = await this.getEntries();
      const entryToDelete = entries.find((entry) => entry.id === entryId);

      if (!entryToDelete) {
        return false;
      }

      // Delete associated media files
      if (entryToDelete.images && Array.isArray(entryToDelete.images)) {
        for (const imageUri of entryToDelete.images) {
          try {
            await mediaManager.deleteFile(imageUri);
            console.log("Deleted image:", imageUri);
          } catch (error) {
            console.error("Error deleting image:", imageUri, error);
          }
        }
      }

      if (entryToDelete.audioNotes && Array.isArray(entryToDelete.audioNotes)) {
        for (const audioNote of entryToDelete.audioNotes) {
          if (audioNote.uri) {
            try {
              await mediaManager.deleteFile(audioNote.uri);
              console.log("Deleted audio:", audioNote.uri);
            } catch (error) {
              console.error("Error deleting audio:", audioNote.uri, error);
            }
          }
        }
      }

      // Remove entry from storage
      const updatedEntries = entries.filter((entry) => entry.id !== entryId);
      await AsyncStorage.setItem(KEYS.ENTRIES, JSON.stringify(updatedEntries));

      return true;
    } catch (error) {
      console.error("Error deleting journal entry:", error);
      return false;
    }
  }

  /**
   * Get a single entry by ID
   * @param {String} entryId ID of the entry
   * @returns {Promise<Object|null>} Entry object or null if not found
   */
  async getEntry(entryId) {
    try {
      const entries = await this.getEntries();
      return entries.find((entry) => entry.id === entryId) || null;
    } catch (error) {
      console.error("Error getting journal entry:", error);
      return null;
    }
  }

  /**
   * Get entries for a specific month
   * @param {Number} month Month number (0-11)
   * @param {Number} year Year (e.g., 2023)
   * @returns {Promise<Array>} Array of entries for the month
   */
  async getEntriesByMonth(month, year) {
    try {
      const entries = await this.getEntries();

      return entries.filter((entry) => {
        if (!entry.date) {
          console.warn("StorageManager: Entry has no date:", entry.id);
          return false;
        }

        try {
          const entryDate = new Date(entry.date);
          if (isNaN(entryDate.getTime())) {
            console.warn(
              "StorageManager: Invalid date for entry:",
              entry.id,
              entry.date
            );
            return false;
          }

          return (
            entryDate.getMonth() === month && entryDate.getFullYear() === year
          );
        } catch (error) {
          console.error(
            "StorageManager: Error filtering entry by month:",
            entry.id,
            error
          );
          return false;
        }
      });
    } catch (error) {
      console.error("StorageManager: Error getting entries by month:", error);
      return [];
    }
  }

  /**
   * Search entries by query text
   * @param {String} query Search query
   * @returns {Promise<Array>} Array of matching entries
   */
  async searchEntries(query) {
    try {
      if (!query || query.trim() === "") {
        return await this.getEntries();
      }

      const entries = await this.getEntries();
      const lowerCaseQuery = query.toLowerCase();

      return entries.filter(
        (entry) =>
          entry.title.toLowerCase().includes(lowerCaseQuery) ||
          entry.content.toLowerCase().includes(lowerCaseQuery) ||
          (entry.tags &&
            entry.tags.some((tag) =>
              tag.toLowerCase().includes(lowerCaseQuery)
            ))
      );
    } catch (error) {
      console.error("Error searching entries:", error);
      return [];
    }
  }

  /**
   * Get entry count by month
   * @param {Number} month Month number (0-11)
   * @param {Number} year Year (e.g., 2023)
   * @returns {Promise<Number>} Number of entries for the month
   */
  async getEntryCountByMonth(month, year) {
    const entries = await this.getEntriesByMonth(month, year);
    return entries.length;
  }

  /**
   * Save user settings
   * @param {Object} settings Settings object
   * @returns {Promise<Boolean>} Success status
   */
  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem(KEYS.USER_SETTINGS, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      return false;
    }
  }

  /**
   * Get user settings
   * @returns {Promise<Object>} Settings object
   */
  async getSettings() {
    try {
      const settingsJson = await AsyncStorage.getItem(KEYS.USER_SETTINGS);
      return settingsJson ? JSON.parse(settingsJson) : {};
    } catch (error) {
      console.error("Error getting settings:", error);
      return {};
    }
  }

  /**
   * Enhanced Export data function - Add this to your StorageManager class
   * Export all journal data as JSON with metadata
   * @returns {Promise<String>} JSON string of all data
   */
  async exportData() {
    try {
      console.log("StorageManager: Starting data export");

      // Get all necessary data
      const entries = await this.getEntries();
      const settings = await this.getSettings();
      const serviceInfo = await this.getServiceInfo();
      const badges = await this.getUserBadges();
      const badgeProgress = await this.getBadgeProgress();

      console.log(
        `StorageManager: Retrieved ${entries.length} entries for export`
      );

      // Process entries to remove media files but keep metadata
      const processedEntries = entries.map((entry) => {
        const processed = { ...entry };

        // Handle images - keep metadata but remove file paths
        if (entry.images && entry.images.length > 0) {
          processed.originalImageCount = entry.images.length;
          processed.imageFilenames = entry.images.map((path) => {
            // Extract just the filename from the path
            const filename = path.split("/").pop();
            return filename || `image_${Date.now()}.jpg`;
          });
          processed.hadImages = true;
          processed.images = []; // Clear actual file paths
        } else {
          processed.originalImageCount = 0;
          processed.imageFilenames = [];
          processed.hadImages = false;
          processed.images = [];
        }

        // Handle audio notes - keep metadata but remove file paths
        if (entry.audioNotes && entry.audioNotes.length > 0) {
          processed.originalAudioCount = entry.audioNotes.length;
          processed.hadAudio = true;
          processed.audioNotes = entry.audioNotes.map((note) => ({
            id: note.id,
            name: note.name,
            date: note.date,
            originalFilename: note.uri
              ? note.uri.split("/").pop()
              : "voice_note.m4a",
            // Remove actual file path
            uri: null,
            isPlaceholder: true,
          }));
        } else {
          processed.originalAudioCount = 0;
          processed.hadAudio = false;
          processed.audioNotes = [];
        }

        return processed;
      });

      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          appVersion: "1.0.0", // Update with your actual app version
          exportVersion: "1.2", // Increment this when export format changes
          entriesCount: entries.length,
          badgesCount: badges.length,
          mediaNote:
            "Photos and voice recordings remain on original device for privacy",
        },
        entries: processedEntries,
        settings,
        serviceInfo,
        badges,
        badgeProgress,
      };

      console.log("StorageManager: Export data prepared successfully");
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error("StorageManager: Error exporting data:", error);
      throw error;
    }
  }

  /**
   * Import journal data from JSON with enhanced validation and recovery
   * @param {String} jsonData JSON string of data to import
   * @param {Boolean} merge Whether to merge with existing data
   * @returns {Promise<Object>} Result with success status and stats
   */
  async importData(jsonData, merge = false) {
    try {
      console.log("StorageManager: Starting data import");

      // Parse the imported data
      let importedData;
      try {
        importedData = JSON.parse(jsonData);
      } catch (parseError) {
        console.error("StorageManager: Invalid JSON format:", parseError);
        return {
          success: false,
          error: "Invalid data format. The file appears to be corrupted.",
          stats: null,
        };
      }

      // Validate the imported data structure
      if (!importedData.entries || !Array.isArray(importedData.entries)) {
        console.error("StorageManager: Missing or invalid entries array");
        return {
          success: false,
          error:
            "Invalid backup file format. Entries data is missing or corrupted.",
          stats: null,
        };
      }

      // Prepare statistics to return to the user
      const stats = {
        entriesImported: 0,
        entriesSkipped: 0,
        settingsImported: false,
        serviceInfoImported: false,
        badgesImported: 0,
      };

      // Handle entries import
      if (merge) {
        console.log("StorageManager: Performing merge import");
        // Get existing entries for merge
        const existingEntries = await this.getEntries();
        const existingIds = new Set(existingEntries.map((entry) => entry.id));

        // Filter to only new entries
        const newEntries = importedData.entries.filter(
          (entry) => !existingIds.has(entry.id)
        );
        stats.entriesImported = newEntries.length;
        stats.entriesSkipped = importedData.entries.length - newEntries.length;

        // Combine with existing entries
        const mergedEntries = [...existingEntries, ...newEntries];
        await AsyncStorage.setItem(KEYS.ENTRIES, JSON.stringify(mergedEntries));

        console.log(
          `StorageManager: Merged ${newEntries.length} new entries with ${existingEntries.length} existing entries`
        );
      } else {
        console.log("StorageManager: Performing complete replacement import");
        // Replace all entries
        await AsyncStorage.setItem(
          KEYS.ENTRIES,
          JSON.stringify(importedData.entries)
        );
        stats.entriesImported = importedData.entries.length;

        console.log(
          `StorageManager: Replaced all entries with ${importedData.entries.length} imported entries`
        );
      }

      // Import settings if available
      if (importedData.settings && typeof importedData.settings === "object") {
        await AsyncStorage.setItem(
          KEYS.USER_SETTINGS,
          JSON.stringify(importedData.settings)
        );
        stats.settingsImported = true;
        console.log("StorageManager: Imported user settings");
      }

      // Import service info if available
      if (
        importedData.serviceInfo &&
        typeof importedData.serviceInfo === "object"
      ) {
        await AsyncStorage.setItem(
          KEYS.SERVICE_INFO,
          JSON.stringify(importedData.serviceInfo)
        );
        stats.serviceInfoImported = true;
        console.log("StorageManager: Imported service info");
      }

      // Import badges if available
      if (importedData.badges && Array.isArray(importedData.badges)) {
        await AsyncStorage.setItem(
          KEYS.BADGES,
          JSON.stringify(importedData.badges)
        );
        stats.badgesImported = importedData.badges.length;
        console.log(
          `StorageManager: Imported ${importedData.badges.length} badges`
        );
      }

      // Import badge progress if available
      if (
        importedData.badgeProgress &&
        typeof importedData.badgeProgress === "object"
      ) {
        await AsyncStorage.setItem(
          KEYS.BADGE_PROGRESS,
          JSON.stringify(importedData.badgeProgress)
        );
        console.log("StorageManager: Imported badge progress");
      }

      console.log("StorageManager: Import completed successfully");
      return {
        success: true,
        error: null,
        stats,
      };
    } catch (error) {
      console.error("StorageManager: Error importing data:", error);
      return {
        success: false,
        error: "An unexpected error occurred during import.",
        stats: null,
      };
    }
  }

  /**
   * Clear all app data including media files
   * @returns {Promise<Boolean>} Success status
   */
  async clearAllData() {
    try {
      // Get all entries to clean up their media
      const entries = await this.getEntries();

      // Clean up all media files
      await mediaManager.cleanupOrphanedFiles([]);

      // Clear AsyncStorage
      await AsyncStorage.multiRemove([
        KEYS.ENTRIES,
        KEYS.USER_SETTINGS,
        KEYS.SYNC_STATUS,
        KEYS.SERVICE_INFO,
        KEYS.BADGES,
        KEYS.BADGE_PROGRESS,
      ]);

      console.log("All data and media files cleared");
      return true;
    } catch (error) {
      console.error("Error clearing data:", error);
      return false;
    }
  }

  /**
   * Get service information
   * @returns {Promise<Object|null>} Service info object or null if not found
   */
  async getServiceInfo() {
    try {
      console.log("StorageManager: Getting service info");
      const serviceInfoJson = await AsyncStorage.getItem(KEYS.SERVICE_INFO);

      if (!serviceInfoJson) {
        console.log("StorageManager: No service info found");
        return null;
      }

      try {
        // Parse the JSON string
        const serviceInfo = JSON.parse(serviceInfoJson);
        console.log("StorageManager: Service info retrieved successfully");

        // Log the type of startDate for debugging
        console.log(
          "StorageManager: startDate type in stored data:",
          typeof serviceInfo.startDate
        );

        return serviceInfo;
      } catch (parseError) {
        console.error(
          "StorageManager: Error parsing service info JSON:",
          parseError
        );
        return null;
      }
    } catch (error) {
      console.error("StorageManager: Error getting service info:", error);
      return null;
    }
  }
  /**
   * Save service information
   * @param {Object} serviceInfo Service info object with startDate and other service-related data
   * @returns {Promise<Boolean>} Success status
   */
  // Add this to StorageManager.js
  async saveServiceInfo(serviceInfo) {
    try {
      console.log("StorageManager: Saving service info");

      // Clone the object to avoid modifying the original
      const infoToSave = { ...serviceInfo };

      // Log the data being saved
      console.log("StorageManager: Service info to save:", infoToSave);
      console.log(
        "StorageManager: startDate type:",
        typeof infoToSave.startDate
      );

      // Ensure we're storing a proper JSON string
      await AsyncStorage.setItem(KEYS.SERVICE_INFO, JSON.stringify(infoToSave));
      console.log("StorageManager: Service info saved successfully");
      return true;
    } catch (error) {
      console.error("StorageManager: Error saving service info:", error);
      return false;
    }
  }

  /**
   * Perform media cleanup to remove orphaned files
   * @returns {Promise<Object>} Cleanup results
   */
  async performMediaCleanup() {
    try {
      const entries = await this.getEntries();
      const deletedCount = await mediaManager.cleanupOrphanedFiles(entries);
      const storageStats = await mediaManager.getStorageStats();

      return {
        success: true,
        deletedFiles: deletedCount,
        stats: storageStats,
      };
    } catch (error) {
      console.error("Error performing media cleanup:", error);
      return {
        success: false,
        deletedFiles: 0,
        stats: null,
        error: error.message,
      };
    }
  }

  /**
   * Get media storage statistics
   * @returns {Promise<Object>} Storage statistics
   */
  async getMediaStats() {
    try {
      return await mediaManager.getStorageStats();
    } catch (error) {
      console.error("Error getting media stats:", error);
      return {
        totalSizeBytes: 0,
        totalSizeMB: "0.00",
        imageCount: 0,
        audioCount: 0,
        totalFiles: 0,
      };
    }
  }

  async validateAndFixEntryDates() {
    try {
      console.log("StorageManager: Validating entry dates...");
      const entries = await this.getEntries();
      let fixedCount = 0;

      const fixedEntries = entries.map((entry) => {
        if (!entry.date) {
          console.log("StorageManager: Fixing entry with no date:", entry.id);
          entry.date = entry.createdAt || new Date().toISOString();
          fixedCount++;
        } else {
          try {
            const testDate = new Date(entry.date);
            if (isNaN(testDate.getTime())) {
              console.log(
                "StorageManager: Fixing entry with invalid date:",
                entry.id,
                entry.date
              );
              entry.date = entry.createdAt || new Date().toISOString();
              fixedCount++;
            }
          } catch (error) {
            console.log(
              "StorageManager: Fixing entry with corrupted date:",
              entry.id
            );
            entry.date = entry.createdAt || new Date().toISOString();
            fixedCount++;
          }
        }

        // Also fix createdAt and updatedAt if needed
        if (!entry.createdAt) {
          entry.createdAt = entry.date || new Date().toISOString();
        }
        if (!entry.updatedAt) {
          entry.updatedAt = entry.createdAt || new Date().toISOString();
        }

        return entry;
      });

      if (fixedCount > 0) {
        console.log(
          `StorageManager: Fixed ${fixedCount} entries with invalid dates`
        );
        await AsyncStorage.setItem(KEYS.ENTRIES, JSON.stringify(fixedEntries));
      }

      return { success: true, fixedCount };
    } catch (error) {
      console.error("StorageManager: Error validating entry dates:", error);
      return { success: false, fixedCount: 0 };
    }
  }

  /**
   * Get all user badges
   * @returns {Promise<Array>} Array of badge objects
   */
  async getUserBadges() {
    try {
      const badgesJson = await AsyncStorage.getItem(KEYS.BADGES);
      return badgesJson ? JSON.parse(badgesJson) : [];
    } catch (error) {
      console.error("Error getting user badges:", error);
      return [];
    }
  }

  /**
   * Award a new badge to the user
   * @param {String} badgeId Unique badge identifier
   * @param {String} title Badge title
   * @param {String} description Badge description
   * @param {String} category Badge category
   * @param {String} icon Icon name or path
   * @returns {Promise<Boolean>} Success status
   */
  async awardBadge(badgeId, title, description, category, icon) {
    try {
      const badges = await this.getUserBadges();

      // Check if badge already exists
      if (badges.some((badge) => badge.id === badgeId)) {
        return false;
      }

      // Add new badge
      const newBadge = {
        id: badgeId,
        title,
        description,
        category,
        icon,
        awardedAt: new Date().toISOString(),
        viewed: false,
      };

      const updatedBadges = [...badges, newBadge];
      await AsyncStorage.setItem(KEYS.BADGES, JSON.stringify(updatedBadges));
      return true;
    } catch (error) {
      console.error("Error awarding badge:", error);
      return false;
    }
  }

  /**
   * Update badge status (e.g., mark as viewed)
   * @param {String} badgeId Badge identifier
   * @param {Object} updates Object with fields to update
   * @returns {Promise<Boolean>} Success status
   */
  async updateBadge(badgeId, updates) {
    try {
      const badges = await this.getUserBadges();
      const badgeIndex = badges.findIndex((badge) => badge.id === badgeId);

      if (badgeIndex === -1) {
        return false;
      }

      badges[badgeIndex] = {
        ...badges[badgeIndex],
        ...updates,
      };

      await AsyncStorage.setItem(KEYS.BADGES, JSON.stringify(badges));
      return true;
    } catch (error) {
      console.error("Error updating badge:", error);
      return false;
    }
  }

  /**
   * Get badge progress data
   * @returns {Promise<Object>} Badge progress data
   */
  async getBadgeProgress() {
    try {
      const progressJson = await AsyncStorage.getItem(KEYS.BADGE_PROGRESS);
      return progressJson
        ? JSON.parse(progressJson)
        : {
            streakDays: 0,
            lastEntryDate: null,
            entriesCount: 0,
            tagsUsed: {},
            searchCount: 0,
            exportCount: 0,
            // Add more progress trackers as needed
          };
    } catch (error) {
      console.error("Error getting badge progress:", error);
      return {};
    }
  }

  /**
   * Update badge progress data
   * @param {Object} updates Fields to update
   * @returns {Promise<Boolean>} Success status
   */
  async updateBadgeProgress(updates) {
    try {
      const currentProgress = await this.getBadgeProgress();
      const updatedProgress = {
        ...currentProgress,
        ...updates,
      };

      await AsyncStorage.setItem(
        KEYS.BADGE_PROGRESS,
        JSON.stringify(updatedProgress)
      );
      return true;
    } catch (error) {
      console.error("Error updating badge progress:", error);
      return false;
    }
  }

  /**
   * Check and award badges based on current app state
   * Should be called at key moments (app open, entry creation, etc.)
   * @returns {Promise<Array>} Array of newly awarded badges
   */
  async checkAndAwardBadges() {
    try {
      const newlyAwarded = [];
      const entries = await this.getEntries();
      const progress = await this.getBadgeProgress();
      const serviceInfo = await this.getServiceInfo();
      const settings = await this.getSettings();

      // Update basic progress metrics
      await this.updateBadgeProgress({
        entriesCount: entries.length,
      });

      // Check for streak (consecutive days)
      if (progress.lastEntryDate) {
        const lastEntryDate = new Date(progress.lastEntryDate);
        const today = new Date();

        // Reset streak if more than a day has passed
        if (today - lastEntryDate > 24 * 60 * 60 * 1000) {
          await this.updateBadgeProgress({ streakDays: 0 });
        }
      }

      // Check for badges based on entry count
      if (entries.length >= 1 && !(await this.hasBadge("first_entry"))) {
        await this.awardBadge(
          "first_entry",
          "First Entry",
          "Created your first journal entry",
          "Milestones",
          "first-entry-icon"
        );
        newlyAwarded.push("first_entry");
      }

      if (
        entries.length >= 25 &&
        !(await this.hasBadge("prolific_writer_25"))
      ) {
        await this.awardBadge(
          "prolific_writer_25",
          "Prolific Writer",
          "Created 25 journal entries",
          "Achievements",
          "prolific-writer-icon"
        );
        newlyAwarded.push("prolific_writer_25");
      }

      // ... Add more badge checks here

      return newlyAwarded;
    } catch (error) {
      console.error("Error checking and awarding badges:", error);
      return [];
    }
  }

  /**
   * Check if user already has a specific badge
   * @param {String} badgeId Badge identifier
   * @returns {Promise<Boolean>} Whether user has the badge
   */
  async hasBadge(badgeId) {
    const badges = await this.getUserBadges();
    return badges.some((badge) => badge.id === badgeId);
  }
  // Future Firebase methods would be added here
  // They would use the same public interface but different implementation
}

// Create singleton instance
const storageManager = new StorageManager();
export default storageManager;
