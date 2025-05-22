import UpdateService from './UpdateService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

class NotificationService {
  /**
   * Check and show any pending notifications
   */
  async checkAndShowNotifications() {
    try {
      const result = await UpdateService.getNotifications();
      
      if (result.error || !result.data.length) {
        return;
      }

      // Get already shown notifications
      const shownNotifications = await AsyncStorage.getItem('shown_notifications');
      const shown = shownNotifications ? JSON.parse(shownNotifications) : [];

      // Show new notifications
      for (const notification of result.data) {
        if (!shown.includes(notification.id)) {
          this.showNotification(notification);
          await this.markNotificationAsShown(notification.id);
        }
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }

  /**
   * Show a notification to the user
   */
  showNotification(notification) {
    const icon = this.getNotificationIcon(notification.type);
    
    Alert.alert(
      `${icon} ${notification.title}`,
      notification.message,
      notification.is_dismissible ? [
        { text: 'OK', style: 'default' }
      ] : [],
      { cancelable: notification.is_dismissible }
    );

    // Track that notification was shown
    UpdateService.trackNotificationShown(notification.id);
  }

  /**
   * Mark notification as shown locally
   */
  async markNotificationAsShown(notificationId) {
    try {
      const shownNotifications = await AsyncStorage.getItem('shown_notifications');
      const shown = shownNotifications ? JSON.parse(shownNotifications) : [];
      
      if (!shown.includes(notificationId)) {
        shown.push(notificationId);
        await AsyncStorage.setItem('shown_notifications', JSON.stringify(shown));
      }
    } catch (error) {
      console.error('Error marking notification as shown:', error);
    }
  }

  /**
   * Get appropriate icon for notification type
   */
  getNotificationIcon(type) {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '🚨';
      case 'info': return 'ℹ️';
      case 'update': return '🎉';
      default: return '📢';
    }
  }
}

export default new NotificationService();