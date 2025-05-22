import { supabase } from './SupabaseClient';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class UpdateService {
  constructor() {
    this.currentVersion = '1.0.0'; // Update this with each release
    this.currentVersionCode = 1;   // Increment with each release
  }

  /**
   * Check if there's a new version available
   */
  async checkForUpdates() {
    try {
      console.log('Checking for updates...');
      
      const { data, error } = await supabase
        .from('app_updates')
        .select('*')
        .eq('is_active', true)
        .lte('publish_at', new Date().toISOString())
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('version_code', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Update check error:', error);
        return {
          hasUpdate: false,
          updateInfo: null,
          error: error.message
        };
      }

      const hasUpdate = this.currentVersionCode < data.version_code;
      
      // Track that user viewed this update
      if (hasUpdate) {
        await this.trackUpdateView(data.id);
      }

      console.log('Update check result:', {
        currentVersion: this.currentVersion,
        latestVersion: data.version,
        hasUpdate
      });

      return {
        hasUpdate,
        updateInfo: data,
        error: null
      };
    } catch (error) {
      console.error('Update service error:', error);
      return {
        hasUpdate: false,
        updateInfo: null,
        error: 'Failed to check for updates'
      };
    }
  }

  /**
   * Check if current app version is still supported
   */
  async checkVersionSupport() {
    try {
      const { data, error } = await supabase
        .from('app_updates')
        .select('min_supported_version, is_force_update, version')
        .eq('is_active', true)
        .order('version_code', { ascending: false })
        .limit(1)
        .single();

      if (error) return { isSupported: true, mustUpdate: false };

      let isSupported = true;
      let mustUpdate = false;

      if (data.min_supported_version) {
        isSupported = this.compareVersions(this.currentVersion, data.min_supported_version) >= 0;
        mustUpdate = data.is_force_update && !isSupported;
      }

      return {
        isSupported,
        mustUpdate,
        latestVersion: data.version
      };
    } catch (error) {
      console.error('Version support check failed:', error);
      return { isSupported: true, mustUpdate: false };
    }
  }

  /**
   * Get active notifications for this app version
   */
  async getNotifications() {
    try {
      const { data, error } = await supabase
        .from('app_notifications')
        .select('*')
        .eq('is_active', true)
        .lte('starts_at', new Date().toISOString())
        .or('ends_at.is.null,ends_at.gt.' + new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter notifications for current version if target_versions is specified
      const filteredNotifications = data.filter(notification => {
        if (!notification.target_versions || notification.target_versions.length === 0) {
          return true; // Show to all versions
        }
        return notification.target_versions.includes(this.currentVersion);
      });

      return { data: filteredNotifications, error: null };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { data: [], error: error.message };
    }
  }

  /**
   * Get app configuration
   */
  async getConfig() {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      
      // Convert to key-value object
      const config = {};
      data.forEach(item => {
        config[item.key] = item.value;
      });

      return { config, error: null };
    } catch (error) {
      console.error('Error fetching config:', error);
      return { config: {}, error: error.message };
    }
  }

  /**
   * Check for updates and handle them automatically on app launch
   */
  async checkForUpdatesOnLaunch() {
    try {
      // First check if version is supported
      const supportCheck = await this.checkVersionSupport();
      
      if (supportCheck.mustUpdate) {
        this.showForceUpdateDialog(supportCheck.latestVersion);
        return { handled: true, type: 'force_update' };
      }

      // Check for regular updates
      const updateCheck = await this.checkForUpdates();
      
      if (updateCheck.hasUpdate) {
        // Check if user already dismissed this update
        const dismissedUpdates = await AsyncStorage.getItem('dismissed_updates');
        const dismissed = dismissedUpdates ? JSON.parse(dismissedUpdates) : [];
        
        if (!dismissed.includes(updateCheck.updateInfo.version)) {
          if (updateCheck.updateInfo.is_critical) {
            this.showCriticalUpdateDialog(updateCheck.updateInfo);
          } else {
            this.showUpdateNotification(updateCheck.updateInfo);
          }
          return { handled: true, type: 'update_available' };
        }
      }

      return { handled: false, type: 'no_update' };
    } catch (error) {
      console.error('Error in launch update check:', error);
      return { handled: false, type: 'error' };
    }
  }

  /**
   * Show force update dialog (can't be dismissed)
   */
  showForceUpdateDialog(latestVersion) {
    Alert.alert(
      '🚨 Update Required',
      `Your version of Bettina is no longer supported. Please update to version ${latestVersion} to continue using the app.`,
      [
        {
          text: 'Update Now',
          onPress: () => this.openDownloadLink()
        }
      ],
      { cancelable: false }
    );
  }

  /**
   * Show critical update dialog
   */
  showCriticalUpdateDialog(updateInfo) {
    Alert.alert(
      '⚠️ Important Update Available',
      `${updateInfo.title}\n\n${updateInfo.release_notes}\n\nThis update contains critical fixes and is strongly recommended.`,
      [
        {
          text: 'Later',
          style: 'cancel',
          onPress: () => this.dismissUpdate(updateInfo.version)
        },
        {
          text: 'Update Now',
          onPress: () => this.downloadUpdate(updateInfo)
        }
      ]
    );
  }

  /**
   * Show regular update notification
   */
  showUpdateNotification(updateInfo) {
    const title = '🎉 New Update Available';
    const message = `${updateInfo.title}\n\nVersion ${updateInfo.version} is now available with new features and improvements.`;

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Skip This Version',
          style: 'cancel',
          onPress: () => this.dismissUpdate(updateInfo.version)
        },
        {
          text: 'Later',
          style: 'cancel'
        },
        {
          text: 'Update',
          onPress: () => this.downloadUpdate(updateInfo)
        }
      ]
    );
  }

  /**
   * Handle update download
   */
  async downloadUpdate(updateInfo) {
    try {
      // Track download
      await this.trackUpdateDownload(updateInfo.id);
      
      // Open download link
      await Linking.openURL(updateInfo.download_url);
    } catch (error) {
      console.error('Error opening download link:', error);
      Alert.alert('Error', 'Could not open download link. Please try again.');
    }
  }

  /**
   * Dismiss update (won't show again for this version)
   */
  async dismissUpdate(version) {
    try {
      const dismissedUpdates = await AsyncStorage.getItem('dismissed_updates');
      const dismissed = dismissedUpdates ? JSON.parse(dismissedUpdates) : [];
      
      if (!dismissed.includes(version)) {
        dismissed.push(version);
        await AsyncStorage.setItem('dismissed_updates', JSON.stringify(dismissed));
      }
    } catch (error) {
      console.error('Error dismissing update:', error);
    }
  }

  /**
   * Track update view
   */
  async trackUpdateView(updateId) {
    try {
      await supabase.rpc('increment_view_count', { update_id: updateId });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  }

  /**
   * Track update download
   */
  async trackUpdateDownload(updateId) {
    try {
      await supabase.rpc('increment_download_count', { update_id: updateId });
    } catch (error) {
      console.error('Error tracking download:', error);
    }
  }

  /**
   * Track notification shown
   */
  async trackNotificationShown(notificationId) {
    try {
      await supabase.rpc('increment_notification_shown', { notification_id: notificationId });
    } catch (error) {
      console.error('Error tracking notification:', error);
    }
  }

  /**
   * Compare version strings
   */
  compareVersions(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part < v2part) return -1;
      if (v1part > v2part) return 1;
    }
    return 0;
  }

  /**
   * Get all update history
   */
  async getUpdateHistory() {
    try {
      const { data, error } = await supabase
        .from('app_updates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching update history:', error);
      return { data: [], error: error.message };
    }
  }
}

export default new UpdateService();