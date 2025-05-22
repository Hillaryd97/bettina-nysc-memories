// Update your ServiceLockManager.js - Make sure all methods are properly defined in the class:

import AsyncStorage from '@react-native-async-storage/async-storage';
import storageManager from './StoreManager'; // Add this import

const LOCK_STATUS_KEY = '@service_lock_status';
const SERVER_TIME_KEY = '@last_server_time';

class ServiceLockManager {
  constructor() {
    this.isLocked = false;
    this.lockReason = null;
    this.timeCheckpoints = [];
  }

  /**
   * Get multiple free time sources for Nigeria (GMT+1)
   */
  async getMultipleTimeSources() {
    const timeSources = [
      'http://worldtimeapi.org/api/timezone/Africa/Lagos',
      'http://worldtimeapi.org/api/timezone/Etc/GMT-1',
      'https://timeapi.io/api/Time/current/zone?timeZone=Africa/Lagos'
    ];

    const results = [];
    
    for (const url of timeSources) {
      try {
        const response = await fetch(url, { timeout: 5000 });
        if (response.ok) {
          const data = await response.json();
          
          let serverTime;
          if (data.datetime) {
            serverTime = new Date(data.datetime);
          } else if (data.utc_datetime) {
            serverTime = new Date(data.utc_datetime);
          } else if (data.dateTime) {
            serverTime = new Date(data.dateTime);
          } else if (data.currentDateTime) {
            serverTime = new Date(data.currentDateTime);
          }
          
          if (serverTime && !isNaN(serverTime.getTime())) {
            results.push({
              source: url,
              time: serverTime,
              timestamp: serverTime.getTime(),
              timezone: data.timezone || 'Africa/Lagos'
            });
          }
        }
      } catch (error) {
        console.log(`Time source ${url} failed:`, error.message);
      }
    }
    
    return results;
  }

  /**
   * Get current time in Nigeria timezone using device capabilities
   */
  getNigeriaTime() {
    try {
      const now = new Date();
      
      // Use Intl.DateTimeFormat for Nigeria
      const nigeriaTime = new Intl.DateTimeFormat('en-NG', {
        timeZone: 'Africa/Lagos',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(now);
      
      const year = parseInt(nigeriaTime.find(part => part.type === 'year').value);
      const month = parseInt(nigeriaTime.find(part => part.type === 'month').value) - 1;
      const day = parseInt(nigeriaTime.find(part => part.type === 'day').value);
      const hour = parseInt(nigeriaTime.find(part => part.type === 'hour').value);
      const minute = parseInt(nigeriaTime.find(part => part.type === 'minute').value);
      const second = parseInt(nigeriaTime.find(part => part.type === 'second').value);
      
      const localNigeriaTime = new Date(year, month, day, hour, minute, second);
      return localNigeriaTime;
      
    } catch (error) {
      console.error('Error getting Nigeria time:', error);
      
      // Fallback: Manual GMT+1 calculation
      const utc = new Date();
      const nigeriaOffset = 1 * 60;
      const localOffset = utc.getTimezoneOffset();
      const totalOffset = nigeriaOffset + localOffset;
      
      const nigeriaTime = new Date(utc.getTime() + (totalOffset * 60000));
      return nigeriaTime;
    }
  }

  /**
   * Store time checkpoints for later validation
   */
  async storeTimeCheckpoint(eventType = 'general') {
    try {
      const deviceTime = new Date();
      const timeSources = await this.getMultipleTimeSources();
      
      const checkpoint = {
        id: Date.now().toString(),
        eventType,
        deviceTime: deviceTime.toISOString(),
        deviceTimestamp: deviceTime.getTime(),
        serverTimes: timeSources.map(s => ({
          source: s.source,
          time: s.time.toISOString(),
          timestamp: s.timestamp
        })),
        createdAt: deviceTime.toISOString()
      };

      const existingCheckpoints = await this.getStoredCheckpoints();
      existingCheckpoints.push(checkpoint);
      
      // Keep only last 10 checkpoints
      const recentCheckpoints = existingCheckpoints.slice(-10);
      await AsyncStorage.setItem('@time_checkpoints', JSON.stringify(recentCheckpoints));
      
      console.log('ServiceLock: Time checkpoint stored -', eventType);
      return checkpoint;
    } catch (error) {
      console.error('ServiceLock: Error storing time checkpoint:', error);
      return null;
    }
  }

  /**
   * Get stored time checkpoints
   */
  async getStoredCheckpoints() {
    try {
      const stored = await AsyncStorage.getItem('@time_checkpoints');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('ServiceLock: Error getting checkpoints:', error);
      return [];
    }
  }

  /**
   * Get trusted time with Nigeria timezone priority
   */
  async getTrustedTime() {
    try {
      const timeSources = await this.getMultipleTimeSources();
      
      if (timeSources.length > 0) {
        const nigeriaTimeSources = timeSources.filter(s => 
          s.timezone && (s.timezone.includes('Lagos') || s.timezone.includes('Africa'))
        );
        
        if (nigeriaTimeSources.length > 0) {
          const timestamps = nigeriaTimeSources.map(s => s.timestamp).sort((a, b) => a - b);
          const medianTimestamp = timestamps[Math.floor(timestamps.length / 2)];
          return new Date(medianTimestamp);
        } else {
          const timestamps = timeSources.map(s => s.timestamp).sort((a, b) => a - b);
          const medianTimestamp = timestamps[Math.floor(timestamps.length / 2)];
          return new Date(medianTimestamp);
        }
      }
      
      return this.getNigeriaTime();
    } catch (error) {
      console.error('ServiceLock: Error getting trusted time:', error);
      return this.getNigeriaTime();
    }
  }

  /**
   * Detect time manipulation
   */
  async detectTimeManipulation() {
    try {
      const suspiciousActivities = [];
      const currentDeviceTime = new Date();
      const checkpoints = await this.getStoredCheckpoints();
      
      if (checkpoints.length === 0) {
        await this.storeTimeCheckpoint('initial');
        return { isManipulated: false, confidence: 0, reasons: [] };
      }

      const lastCheckpoint = checkpoints[checkpoints.length - 1];
      const timeSinceLastCheck = currentDeviceTime.getTime() - new Date(lastCheckpoint.deviceTime).getTime();
      
      // Check if device time moved backwards significantly
      if (timeSinceLastCheck < -60000) {
        suspiciousActivities.push({
          type: 'TIME_BACKWARDS',
          severity: 'HIGH',
          description: 'Device time moved backwards significantly',
          evidence: `Time moved back by ${Math.abs(timeSinceLastCheck / 1000)} seconds`
        });
      }

      // Check for impossible time jumps forward
      const maxReasonableGap = 7 * 24 * 60 * 60 * 1000;
      if (timeSinceLastCheck > maxReasonableGap) {
        suspiciousActivities.push({
          type: 'TIME_JUMP_FORWARD',
          severity: 'MEDIUM',
          description: 'Device time jumped forward unusually',
          evidence: `Time jumped forward by ${timeSinceLastCheck / (1000 * 60 * 60 * 24)} days`
        });
      }

      const highSeverityCount = suspiciousActivities.filter(a => a.severity === 'HIGH').length;
      const mediumSeverityCount = suspiciousActivities.filter(a => a.severity === 'MEDIUM').length;
      const lowSeverityCount = suspiciousActivities.filter(a => a.severity === 'LOW').length;
      
      const confidence = Math.min(100, (highSeverityCount * 50) + (mediumSeverityCount * 25) + (lowSeverityCount * 10));
      
      await this.storeTimeCheckpoint('validation');
      
      return {
        isManipulated: confidence > 50,
        confidence,
        reasons: suspiciousActivities,
        timestamp: currentDeviceTime.toISOString()
      };
      
    } catch (error) {
      console.error('ServiceLock: Error detecting time manipulation:', error);
      return { isManipulated: false, confidence: 0, reasons: [] };
    }
  }

  /**
   * Check service year status
   */
  async checkServiceYearStatus(serviceInfo) {
    if (!serviceInfo || !serviceInfo.startDate) {
      return { isLocked: false, reason: null };
    }

    try {
      const currentTime = await this.getTrustedTime();
      const serviceStartDate = new Date(serviceInfo.startDate);
      const serviceEndDate = new Date(serviceStartDate);
      serviceEndDate.setFullYear(serviceEndDate.getFullYear() + 1);
      
      const gracePeriodEnd = new Date(serviceEndDate);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30);
      
      const manipulationCheck = await this.detectTimeManipulation();
      
      let lockStatus = {
        isLocked: false,
        reason: null,
        serviceEndDate: serviceEndDate.toISOString(),
        gracePeriodEnd: gracePeriodEnd.toISOString(),
        timeManipulation: manipulationCheck,
        trustLevel: manipulationCheck.confidence > 50 ? 'LOW' : 'HIGH',
        timezone: 'Africa/Lagos'
      };

      if (manipulationCheck.confidence > 75) {
        lockStatus.isLocked = true;
        lockStatus.reason = 'TIME_MANIPULATION';
        lockStatus.message = 'Suspicious time changes detected. App locked for security.';
        return lockStatus;
      }

      if (currentTime > gracePeriodEnd) {
        lockStatus.isLocked = true;
        lockStatus.reason = 'SERVICE_COMPLETED';
        lockStatus.message = 'Your NYSC service year has concluded. The app is now in read-only mode.';
      } else if (currentTime > serviceEndDate) {
        const daysLeft = Math.ceil((gracePeriodEnd - currentTime) / (1000 * 60 * 60 * 24));
        lockStatus.reason = 'GRACE_PERIOD';
        lockStatus.message = `Service year ended. ${daysLeft} days left for final entries.`;
        lockStatus.daysRemaining = daysLeft;
      } else {
        const daysLeft = Math.ceil((serviceEndDate - currentTime) / (1000 * 60 * 60 * 24));
        lockStatus.daysRemaining = daysLeft;
      }

      await AsyncStorage.setItem(LOCK_STATUS_KEY, JSON.stringify(lockStatus));
      return lockStatus;
      
    } catch (error) {
      console.error('ServiceLock: Error checking service year status:', error);
      return { isLocked: false, reason: 'ERROR' };
    }
  }

  /**
   * Get cached lock status
   */
  async getCachedLockStatus() {
    try {
      const cached = await AsyncStorage.getItem(LOCK_STATUS_KEY);
      return cached ? JSON.parse(cached) : { isLocked: false, reason: null };
    } catch (error) {
      console.error('ServiceLock: Error getting cached lock status:', error);
      return { isLocked: false, reason: null };
    }
  }

  /**
   * Check if editing is allowed
   */
  async canEdit() {
    const status = await this.getCachedLockStatus();
    return !status.isLocked;
  }

  /**
   * Get lock message for UI display
   */
  async getLockMessage() {
    const status = await this.getCachedLockStatus();
    
    if (status.isLocked) {
      return status.message || 'Your service year has ended. The app is now read-only.';
    } else if (status.reason === 'GRACE_PERIOD') {
      return status.message;
    }
    
    return null;
  }
}

// Create and export singleton instance
const serviceLockManager = new ServiceLockManager();
export default serviceLockManager;