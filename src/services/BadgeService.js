// BadgeService.js
// import { BADGES, getBadgeById } from './BadgeDefinitions';
import { BADGES } from '../components/BadgeDefinitons';
import storageManager from './StoreManager';

class BadgeService {
  /**
   * Update badge statistics when an entry is created
   * @param {Object} entry The created entry
   */
  async updateStatsForNewEntry(entry) {
    try {
      // Get current progress
      const progress = await storageManager.getBadgeProgress();
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Update streak
      let { streakDays, lastEntryDate } = progress;
      
      if (!lastEntryDate) {
        // First entry ever
        streakDays = 1;
      } else {
        const lastDate = new Date(lastEntryDate).toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastDate === today) {
          // Already logged an entry today, streak unchanged
        } else if (lastDate === yesterdayStr) {
          // Logged yesterday, streak continues
          streakDays += 1;
        } else {
          // Break in streak
          streakDays = 1;
        }
      }
      
      // Update tags used
      const tagsUsed = { ...progress.tagsUsed };
      if (entry.tags && Array.isArray(entry.tags)) {
        entry.tags.forEach(tag => {
          tagsUsed[tag] = (tagsUsed[tag] || 0) + 1;
        });
      }
      
      // Update first entry date if not set
      const firstEntryDate = progress.firstEntryDate || new Date().toISOString();
      
      // Update progress
      await storageManager.updateBadgeProgress({
        streakDays,
        lastEntryDate: today,
        entriesCount: progress.entriesCount + 1,
        tagsUsed,
        firstEntryDate
      });
      
      // Check for badges that might have been earned
      await this.checkForNewBadges();
    } catch (error) {
      console.error("Error updating badge stats for new entry:", error);
    }
  }
  
  /**
   * Update stats when search is used
   */
  async updateStatsForSearch() {
    try {
      const progress = await storageManager.getBadgeProgress();
      await storageManager.updateBadgeProgress({
        searchCount: (progress.searchCount || 0) + 1
      });
      await this.checkForNewBadges();
    } catch (error) {
      console.error("Error updating search stats:", error);
    }
  }
  
  /**
   * Update stats when export is used
   */
  async updateStatsForExport() {
    try {
      const progress = await storageManager.getBadgeProgress();
      await storageManager.updateBadgeProgress({
        exportCount: (progress.exportCount || 0) + 1
      });
      await this.checkForNewBadges();
    } catch (error) {
      console.error("Error updating export stats:", error);
    }
  }
  
  /**
   * Check if any new badges have been earned
   * @returns {Promise<Array>} Array of newly awarded badge IDs
   */
  async checkForNewBadges() {
    try {
      const newlyAwarded = [];
      const progress = await storageManager.getBadgeProgress();
      const userBadges = await storageManager.getUserBadges();
      const serviceInfo = await storageManager.getServiceInfo();
      
      // Get IDs of badges user already has
      const existingBadgeIds = userBadges.map(badge => badge.id);
      
      // Check each badge definition
      for (const badgeDef of BADGES) {
        // Skip if user already has this badge
        if (existingBadgeIds.includes(badgeDef.id)) {
          continue;
        }
        
        // Check if conditions are met
        if (badgeDef.condition(progress, serviceInfo)) {
          // Award the badge
          await storageManager.awardBadge(
            badgeDef.id,
            badgeDef.title,
            badgeDef.description,
            badgeDef.category,
            badgeDef.icon
          );
          
          newlyAwarded.push(badgeDef.id);
        }
      }
      
      return newlyAwarded;
    } catch (error) {
      console.error("Error checking for new badges:", error);
      return [];
    }
  }
  
  /**
   * Get all badges with earning status
   * @returns {Promise<Object>} Object with categories and badge info
   */
  async getAllBadgesWithStatus() {
    try {
      const userBadges = await storageManager.getUserBadges();
      const earnedBadgeIds = userBadges.map(badge => badge.id);
      
      // Group badges by category with earned status
      const result = {};
      
      BADGES.forEach(badgeDef => {
        if (!result[badgeDef.category]) {
          result[badgeDef.category] = [];
        }
        
        result[badgeDef.category].push({
          ...badgeDef,
          earned: earnedBadgeIds.includes(badgeDef.id),
          earnedDate: earnedBadgeIds.includes(badgeDef.id) 
            ? userBadges.find(b => b.id === badgeDef.id).awardedAt 
            : null
        });
      });
      
      return result;
    } catch (error) {
      console.error("Error getting badges with status:", error);
      return {};
    }
  }
  
  /**
   * Get recently earned badges
   * @param {Number} limit Maximum number of badges to return
   * @returns {Promise<Array>} Recently earned badges
   */
  async getRecentlyEarnedBadges(limit = 5) {
    try {
      const userBadges = await storageManager.getUserBadges();
      
      // Sort by awarded date (newest first)
      return userBadges
        .sort((a, b) => new Date(b.awardedAt) - new Date(a.awardedAt))
        .slice(0, limit);
    } catch (error) {
      console.error("Error getting recently earned badges:", error);
      return [];
    }
  }
  
  /**
   * Mark badge as viewed (for notifications)
   * @param {String} badgeId Badge ID
   */
  async markBadgeAsViewed(badgeId) {
    try {
      await storageManager.updateBadge(badgeId, { viewed: true });
    } catch (error) {
      console.error("Error marking badge as viewed:", error);
    }
  }
}

// Singleton instance
const badgeService = new BadgeService();
export default badgeService;