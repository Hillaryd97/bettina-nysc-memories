import * as FileSystem from 'expo-file-system';

class MediaManager {
  constructor() {
    this.mediaDirectory = `${FileSystem.documentDirectory}media/`;
    this.imagesDirectory = `${this.mediaDirectory}images/`;
    this.audioDirectory = `${this.mediaDirectory}audio/`;
    
    // Initialize directories on creation
    this.initializeDirectories();
  }

  /**
   * Initialize media directories
   */
  async initializeDirectories() {
    try {
      // Create main media directory
      const mediaInfo = await FileSystem.getInfoAsync(this.mediaDirectory);
      if (!mediaInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.mediaDirectory, { intermediates: true });
        console.log('Created media directory:', this.mediaDirectory);
      }

      // Create images subdirectory
      const imagesInfo = await FileSystem.getInfoAsync(this.imagesDirectory);
      if (!imagesInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.imagesDirectory, { intermediates: true });
        console.log('Created images directory:', this.imagesDirectory);
      }

      // Create audio subdirectory
      const audioInfo = await FileSystem.getInfoAsync(this.audioDirectory);
      if (!audioInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.audioDirectory, { intermediates: true });
        console.log('Created audio directory:', this.audioDirectory);
      }
    } catch (error) {
      console.error('Error initializing media directories:', error);
    }
  }

  /**
   * Save an image to permanent storage
   * @param {string} tempUri - Temporary URI from ImagePicker
   * @param {string} entryId - ID of the journal entry
   * @returns {Promise<string>} - Permanent file URI
   */
  async saveImage(tempUri, entryId) {
    try {
      // Ensure directories exist
      await this.initializeDirectories();

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = this.getFileExtension(tempUri) || 'jpg';
      const fileName = `entry_${entryId}_${timestamp}_${randomId}.${fileExtension}`;
      const permanentUri = `${this.imagesDirectory}${fileName}`;

      // Copy file from temp location to permanent location
      await FileSystem.copyAsync({
        from: tempUri,
        to: permanentUri
      });

      console.log(`Image saved: ${tempUri} -> ${permanentUri}`);
      return permanentUri;
    } catch (error) {
      console.error('Error saving image:', error);
      throw new Error(`Failed to save image: ${error.message}`);
    }
  }

  /**
   * Save an audio recording to permanent storage
   * @param {string} tempUri - Temporary URI from audio recording
   * @param {string} entryId - ID of the journal entry
   * @returns {Promise<string>} - Permanent file URI
   */
  async saveAudio(tempUri, entryId) {
    try {
      // Ensure directories exist
      await this.initializeDirectories();

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = this.getFileExtension(tempUri) || 'm4a';
      const fileName = `entry_${entryId}_audio_${timestamp}_${randomId}.${fileExtension}`;
      const permanentUri = `${this.audioDirectory}${fileName}`;

      // Copy file from temp location to permanent location
      await FileSystem.copyAsync({
        from: tempUri,
        to: permanentUri
      });

      console.log(`Audio saved: ${tempUri} -> ${permanentUri}`);
      return permanentUri;
    } catch (error) {
      console.error('Error saving audio:', error);
      throw new Error(`Failed to save audio: ${error.message}`);
    }
  }

  /**
   * Delete a media file
   * @param {string} fileUri - URI of the file to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFile(fileUri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri);
        console.log('File deleted:', fileUri);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Check if a file exists
   * @param {string} fileUri - URI of the file to check
   * @returns {Promise<boolean>} - Whether file exists
   */
  async fileExists(fileUri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      return fileInfo.exists;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  /**
   * Get file size in bytes
   * @param {string} fileUri - URI of the file
   * @returns {Promise<number>} - File size in bytes
   */
  async getFileSize(fileUri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      return fileInfo.exists ? fileInfo.size : 0;
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }

  /**
   * Clean up orphaned media files (files not referenced in any entry)
   * @param {Array} allEntries - All journal entries
   * @returns {Promise<number>} - Number of files deleted
   */
  async cleanupOrphanedFiles(allEntries) {
    try {
      let deletedCount = 0;

      // Get all referenced media files from entries
      const referencedFiles = new Set();
      allEntries.forEach(entry => {
        // Add image files
        if (entry.images && Array.isArray(entry.images)) {
          entry.images.forEach(uri => referencedFiles.add(uri));
        }
        
        // Add audio files
        if (entry.audioNotes && Array.isArray(entry.audioNotes)) {
          entry.audioNotes.forEach(note => {
            if (note.uri) referencedFiles.add(note.uri);
          });
        }
      });

      // Check images directory
      const imageFiles = await FileSystem.readDirectoryAsync(this.imagesDirectory);
      for (const fileName of imageFiles) {
        const fullPath = `${this.imagesDirectory}${fileName}`;
        if (!referencedFiles.has(fullPath)) {
          await this.deleteFile(fullPath);
          deletedCount++;
        }
      }

      // Check audio directory
      const audioFiles = await FileSystem.readDirectoryAsync(this.audioDirectory);
      for (const fileName of audioFiles) {
        const fullPath = `${this.audioDirectory}${fileName}`;
        if (!referencedFiles.has(fullPath)) {
          await this.deleteFile(fullPath);
          deletedCount++;
        }
      }

      console.log(`Cleanup completed: ${deletedCount} orphaned files deleted`);
      return deletedCount;
    } catch (error) {
      console.error('Error during cleanup:', error);
      return 0;
    }
  }

  /**
   * Get media storage statistics
   * @returns {Promise<Object>} - Storage stats
   */
  async getStorageStats() {
    try {
      let totalSize = 0;
      let imageCount = 0;
      let audioCount = 0;

      // Count images
      const imageFiles = await FileSystem.readDirectoryAsync(this.imagesDirectory);
      for (const fileName of imageFiles) {
        const fullPath = `${this.imagesDirectory}${fileName}`;
        const size = await this.getFileSize(fullPath);
        totalSize += size;
        imageCount++;
      }

      // Count audio files
      const audioFiles = await FileSystem.readDirectoryAsync(this.audioDirectory);
      for (const fileName of audioFiles) {
        const fullPath = `${this.audioDirectory}${fileName}`;
        const size = await this.getFileSize(fullPath);
        totalSize += size;
        audioCount++;
      }

      return {
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        imageCount,
        audioCount,
        totalFiles: imageCount + audioCount
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalSizeBytes: 0,
        totalSizeMB: '0.00',
        imageCount: 0,
        audioCount: 0,
        totalFiles: 0
      };
    }
  }

  /**
   * Extract file extension from URI
   * @param {string} uri - File URI
   * @returns {string} - File extension
   */
  getFileExtension(uri) {
    if (!uri) return '';
    
    // Handle different URI formats
    const cleanUri = uri.split('?')[0]; // Remove query parameters
    const parts = cleanUri.split('.');
    
    if (parts.length > 1) {
      return parts[parts.length - 1].toLowerCase();
    }
    
    return '';
  }

  /**
   * Get media directory paths for debugging
   * @returns {Object} - Directory paths
   */
  getDirectoryPaths() {
    return {
      main: this.mediaDirectory,
      images: this.imagesDirectory,
      audio: this.audioDirectory
    };
  }
}

// Create singleton instance
const mediaManager = new MediaManager();
export default mediaManager;