import React, { createContext, useState, useContext, useEffect } from 'react';
import storageManager from '../services/StoreManager';

// Create context
const JournalContext = createContext();

// Journal provider component
export const JournalProvider = ({ children }) => {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load entries from storage on mount
  useEffect(() => {
    const loadEntries = async () => {
      try {
        const loadedEntries = await storageManager.getEntries();
        setEntries(loadedEntries);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading entries:', error);
        setIsLoading(false);
      }
    };
    
    loadEntries();
  }, []);
  
  // Add a new entry
  const addEntry = async (entry) => {
    try {
      const entryId = await storageManager.saveEntry(entry);
      const newEntry = await storageManager.getEntry(entryId);
      
      setEntries(prevEntries => [newEntry, ...prevEntries.filter(e => e.id !== entryId)]);
      return entryId;
    } catch (error) {
      console.error('Error adding entry:', error);
      throw error;
    }
  };
  
  // Update an existing entry
  const updateEntry = async (entryId, updatedData) => {
    try {
      const success = await storageManager.updateEntry(entryId, updatedData);
      
      if (success) {
        const updatedEntry = await storageManager.getEntry(entryId);
        
        setEntries(prevEntries =>
          prevEntries.map(entry =>
            entry.id === entryId ? updatedEntry : entry
          )
        );
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error updating entry:', error);
      return false;
    }
  };
  
  // Delete an entry
  const deleteEntry = async (entryId) => {
    try {
      const success = await storageManager.deleteEntry(entryId);
      
      if (success) {
        setEntries(prevEntries =>
          prevEntries.filter(entry => entry.id !== entryId)
        );
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting entry:', error);
      return false;
    }
  };
  
  // Get a single entry by ID
  const getEntry = async (entryId) => {
    return await storageManager.getEntry(entryId);
  };
  
  // Get entries by month
  const getEntriesByMonth = async (month, year) => {
    return await storageManager.getEntriesByMonth(month, year);
  };
  
  // Get entry count by month
  const getEntryCountByMonth = async (month, year) => {
    return await storageManager.getEntryCountByMonth(month, year);
  };
  
  // Search entries
  const searchEntries = async (query) => {
    return await storageManager.searchEntries(query);
  };
  
  // Export all data
  const exportData = async () => {
    return await storageManager.exportData();
  };
  
  // Import data
  const importData = async (jsonData, merge = false) => {
    const success = await storageManager.importData(jsonData, merge);
    
    if (success) {
      // Reload entries after import
      const loadedEntries = await storageManager.getEntries();
      setEntries(loadedEntries);
    }
    
    return success;
  };
  
  // Clear all data
  const clearAllData = async () => {
    const success = await storageManager.clearAllData();
    
    if (success) {
      setEntries([]);
    }
    
    return success;
  };
  
  
// Add this function to the JournalProvider component
const getServiceInfo = async () => {
  try {
    const serviceInfoJson = await storageManager.getServiceInfo();
    
    if (serviceInfoJson) {
      let info;
      
      // Handle both string and object formats
      if (typeof serviceInfoJson === 'string') {
        try {
          info = JSON.parse(serviceInfoJson);
        } catch (parseError) {
          console.error('Error parsing service info JSON:', parseError);
          return null;
        }
      } else {
        // Already an object
        info = serviceInfoJson;
      }
      
      // Ensure dates are properly converted to Date objects
      if (info.startDate) {
        info.startDate = new Date(info.startDate);
        console.log("Parsed startDate:", info.startDate);
      }
      
      if (info.endDate) {
        info.endDate = new Date(info.endDate);
      }
      
      if (info.dateFirstSet) {
        info.dateFirstSet = new Date(info.dateFirstSet);
      }
      
      return info;
    }
    return null;
  } catch (error) {
    console.error('Error getting service info:', error);
    return null;
  }
};

// Update the saveServiceInfo function to handle Date objects properly
const saveServiceInfo = async (serviceInfo) => {
  try {
    // Create a copy of the service info to avoid modifying the original
    const infoToSave = { ...serviceInfo };
    
    // Ensure dates are serialized consistently
    if (infoToSave.startDate instanceof Date) {
      console.log("Saving startDate as ISO string");
      // This will ensure the date is saved in a consistent format
      infoToSave.startDate = infoToSave.startDate.toISOString();
    }
    
    if (infoToSave.endDate instanceof Date) {
      infoToSave.endDate = infoToSave.endDate.toISOString();
    }
    
    if (infoToSave.dateFirstSet instanceof Date) {
      infoToSave.dateFirstSet = infoToSave.dateFirstSet.toISOString();
    }
    
    const success = await storageManager.saveServiceInfo(infoToSave);
    return success;
  } catch (error) {
    console.error('Error saving service info:', error);
    return false;
  }
};
// Then add it to the value object
const value = {
  entries,
  isLoading,
  addEntry,
  updateEntry,
  deleteEntry,
  getEntry,
  getEntriesByMonth,
  getEntryCountByMonth,
  searchEntries,
  exportData,
  importData,
  clearAllData,
  getServiceInfo, // Add this line
  saveServiceInfo,
};
  
  return (
    <JournalContext.Provider value={value}>
      {children}
    </JournalContext.Provider>
  );
};

// Custom hook to use the journal context
export const useJournal = () => {
  const context = useContext(JournalContext);
  if (context === undefined) {
    throw new Error('useJournal must be used within a JournalProvider');
  }
  return context;
};