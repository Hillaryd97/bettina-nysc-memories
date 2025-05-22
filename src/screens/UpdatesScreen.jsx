import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import UpdateService from '../services/UpdateService';

const COLORS = {
  primary: "#3DB389",
  primaryLight: "#E5F5EE",
  background: "#F8FDFB",
  white: "#FFFFFF",
  text: "#1E3A32",
  textLight: "#4F6E64",
  textMuted: "#8A9E97",
  error: "#E07D6B",
  success: "#4CAF50",
};

const UpdatesScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateHistory, setUpdateHistory] = useState([]);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Check for updates
    const updateResult = await UpdateService.checkForUpdates();
    setHasUpdate(updateResult.hasUpdate);
    setUpdateInfo(updateResult.updateInfo);
    
    // Get update history
    const historyResult = await UpdateService.getUpdateHistory();
    setUpdateHistory(historyResult.data || []);
    
    setLoading(false);
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    const result = await UpdateService.checkForUpdates();
    
    if (result.hasUpdate) {
      setHasUpdate(true);
      setUpdateInfo(result.updateInfo);
      UpdateService.showUpdateNotification(result.updateInfo);
    } else {
      Alert.alert(
        '✅ You\'re Up to Date!',
        `You have the latest version (${UpdateService.currentVersion})`
      );
    }
    
    setCheckingUpdates(false);
  };

  const handleDownload = (url) => {
    Alert.alert(
      'Download Update',
      'This will open your browser to download the latest version.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Download', 
          onPress: () => Linking.openURL(url)
        }
      ]
    );
  };

  const renderUpdateCard = (update, isLatest = false) => (
    <View key={update.id} style={[
      styles.updateCard,
      isLatest && hasUpdate && styles.latestUpdateCard
    ]}>
      <View style={styles.updateHeader}>
        <View>
          <Text style={styles.updateVersion}>
            Version {update.version}
            {isLatest && hasUpdate && (
              <Text style={styles.newBadge}> • NEW</Text>
            )}
          </Text>
          <Text style={styles.updateTitle}>{update.title}</Text>
        </View>
        
        {update.is_critical && (
          <View style={styles.criticalBadge}>
            <Text style={styles.criticalBadgeText}>Critical</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.updateDate}>
        {new Date(update.created_at).toLocaleDateString()}
      </Text>
      
      {update.release_notes && (
        <Text style={styles.updateNotes}>{update.release_notes}</Text>
      )}
      
      {isLatest && hasUpdate && (
        <TouchableOpacity 
          style={styles.downloadButton}
          onPress={() => handleDownload(update.download_url)}
        >
          <Feather name="download" size={16} color={COLORS.white} />
          <Text style={styles.downloadButtonText}>Download Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Updates</Text>
        <TouchableOpacity
          onPress={handleCheckUpdates}
          disabled={checkingUpdates}
          style={styles.refreshButton}
        >
          {checkingUpdates ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Feather name="refresh-cw" size={20} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Current Version */}
        <View style={styles.currentVersionCard}>
          <Text style={styles.currentVersionLabel}>Current Version</Text>
          <Text style={styles.currentVersionNumber}>
            {UpdateService.currentVersion}
          </Text>
          {!hasUpdate && (
            <View style={styles.upToDateBadge}>
              <Feather name="check-circle" size={16} color={COLORS.success} />
              <Text style={styles.upToDateText}>Up to date</Text>
            </View>
          )}
        </View>

        {/* Update Available */}
        {hasUpdate && updateInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Update Available</Text>
            {renderUpdateCard(updateInfo, true)}
          </View>
        )}

        {/* Update History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update History</Text>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : updateHistory.length === 0 ? (
            <Text style={styles.emptyText}>No update history available</Text>
          ) : (
            updateHistory.map((update, index) => renderUpdateCard(update, index === 0))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  currentVersionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  currentVersionLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  currentVersionNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  upToDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  upToDateText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '600',
    marginLeft: 6,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  updateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  latestUpdateCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  updateVersion: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  newBadge: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  updateTitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  criticalBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  criticalBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  updateDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  updateNotes: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 16,
  },
  downloadButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  downloadButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 16,
    marginTop: 20,
  },
});

export default UpdatesScreen;