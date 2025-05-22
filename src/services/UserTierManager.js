// Create a new file: src/services/UserTierManager.js

import AsyncStorage from '@react-native-async-storage/async-storage';

const TIER_STORAGE_KEY = '@user_tier_info';

// Define tier limits and features
export const USER_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    maxImagesPerEntry: 3,
    maxAudioNotesPerEntry: 2,
    maxEntriesPerMonth: 50,
    canExportData: true,
    canImportData: true,
    hasCloudSync: false,
    hasAIAssistant: false,
    hasAdvancedBadges: false,
    maxStorageMB: 100,
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    maxImagesPerEntry: 10,
    maxAudioNotesPerEntry: 5,
    maxEntriesPerMonth: -1, // Unlimited
    canExportData: true,
    canImportData: true,
    hasCloudSync: true,
    hasAIAssistant: true,
    hasAdvancedBadges: true,
    maxStorageMB: 1000,
  }
};

class UserTierManager {
  constructor() {
    this.currentTier = USER_TIERS.FREE; // Default to free
    this.loadUserTier();
  }

  /**
   * Load user tier from storage
   */
  async loadUserTier() {
    try {
      const tierInfo = await AsyncStorage.getItem(TIER_STORAGE_KEY);
      if (tierInfo) {
        const parsed = JSON.parse(tierInfo);
        this.currentTier = USER_TIERS[parsed.tierId.toUpperCase()] || USER_TIERS.FREE;
        console.log('UserTier: Loaded tier:', this.currentTier.name);
      }
    } catch (error) {
      console.error('Error loading user tier:', error);
      this.currentTier = USER_TIERS.FREE;
    }
  }

  /**
   * Save user tier to storage
   */
  async saveUserTier(tierId, expiryDate = null) {
    try {
      const tierInfo = {
        tierId: tierId.toLowerCase(),
        upgradeDate: new Date().toISOString(),
        expiryDate: expiryDate,
      };
      
      await AsyncStorage.setItem(TIER_STORAGE_KEY, JSON.stringify(tierInfo));
      this.currentTier = USER_TIERS[tierId.toUpperCase()] || USER_TIERS.FREE;
      console.log('UserTier: Saved tier:', this.currentTier.name);
      
      return true;
    } catch (error) {
      console.error('Error saving user tier:', error);
      return false;
    }
  }

  /**
   * Get current user tier
   */
  getCurrentTier() {
    return this.currentTier;
  }

  /**
   * Check if user is premium
   */
  isPremium() {
    return this.currentTier.id === 'premium';
  }

  /**
   * Get tier-specific limits
   */
  getLimits() {
    return {
      maxImagesPerEntry: this.currentTier.maxImagesPerEntry,
      maxAudioNotesPerEntry: this.currentTier.maxAudioNotesPerEntry,
      maxEntriesPerMonth: this.currentTier.maxEntriesPerMonth,
      maxStorageMB: this.currentTier.maxStorageMB,
    };
  }

  /**
   * Get tier-specific features
   */
  getFeatures() {
    return {
      canExportData: this.currentTier.canExportData,
      canImportData: this.currentTier.canImportData,
      hasCloudSync: this.currentTier.hasCloudSync,
      hasAIAssistant: this.currentTier.hasAIAssistant,
      hasAdvancedBadges: this.currentTier.hasAdvancedBadges,
    };
  }

  /**
   * Check if user can add more images to an entry
   */
  canAddImage(currentImageCount) {
    return currentImageCount < this.currentTier.maxImagesPerEntry;
  }

  /**
   * Check if user can add more audio notes to an entry
   */
  canAddAudio(currentAudioCount) {
    return currentAudioCount < this.currentTier.maxAudioNotesPerEntry;
  }

  /**
   * Get upgrade message for a specific feature
   */
  getUpgradeMessage(feature) {
    const messages = {
      images: `You've reached the limit of ${this.currentTier.maxImagesPerEntry} images per entry. Upgrade to Premium for up to ${USER_TIERS.PREMIUM.maxImagesPerEntry} images per entry.`,
      audio: `You've reached the limit of ${this.currentTier.maxAudioNotesPerEntry} audio notes per entry. Upgrade to Premium for up to ${USER_TIERS.PREMIUM.maxAudioNotesPerEntry} audio notes per entry.`,
      cloudSync: 'Cloud sync is available in Premium. Upgrade to automatically sync your entries across devices.',
      aiAssistant: 'AI Assistant is available in Premium. Upgrade to get writing suggestions and mood insights.',
    };
    
    return messages[feature] || 'This feature is available in Premium. Upgrade to unlock all features.';
  }

  /**
   * Simulate premium upgrade (for testing)
   */
  async upgradeToPremium() {
    return await this.saveUserTier('premium');
  }

  /**
   * Simulate downgrade to free (for testing)
   */
  async downgradeToFree() {
    return await this.saveUserTier('free');
  }
}

// Create singleton instance
const userTierManager = new UserTierManager();
export default userTierManager;