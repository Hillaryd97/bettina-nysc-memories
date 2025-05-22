import { useState } from "react";
import storageManager from "../services/StoreManager";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

const COLORS = {
  primary: "#3DB389",
  primaryLight: "#E5F5EE",
  primaryDark: "#1A6B52",
  secondary: "#5FB3A9",
  background: "#F8FDFB",
  card: "#F1F9F6",
  text: "#1E3A32",
  textLight: "#4F6E64",
  textMuted: "#8A9E97",
  white: "#FFFFFF",
  black: "#0F1F1A",
  error: "#E07D6B",
  border: "rgba(0,0,0,0.05)",
};

export const DataManagementScreen = ({ navigation }) => {
  const [clearing, setClearing] = useState(false);
  const [serviceInfo, setServiceInfo] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);
  const [showServiceInfoModal, setShowServiceInfoModal] = useState(false);

  const handleClearAllData = () => {
    // Your existing clear data logic here
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to delete all journal entries and app data? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => showFinalConfirmation(),
        },
      ]
    );
  };

  const showFinalConfirmation = () => {
    Alert.alert(
      "Final Confirmation",
      "All your journal entries, pictures, and settings will be permanently deleted. You cannot recover this data after deletion.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Delete Everything",
          style: "destructive",
          onPress: () => performDataClear(),
        },
      ]
    );
  };

  const performDataClear = async () => {
    try {
      setClearing(true);

      // Use storage manager to clear all data
      const success = await storageManager.clearAllData();

      if (success) {
        // Reset local state
        setServiceInfo(null);
        setDaysLeft(null);

        Alert.alert(
          "Data Cleared",
          "All app data has been successfully deleted.",
          [
            {
              text: "OK",
            //   onPress: () => {
            //     // Navigate back to initial setup or main screen
            //     navigation.reset({
            //       index: 0,
            //       routes: [{ name: "HomeScreen" }], // Or whatever your onboarding/welcome screen is named
            //     });
            //   },
            },
          ]
        );
      } else {
        throw new Error("Failed to clear data");
      }
    } catch (error) {
      console.error("Error clearing data:", error);
      Alert.alert(
        "Error",
        "There was a problem clearing your data. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setClearing(false);
    }
  };

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
        <Text style={styles.headerTitle}>Data Management</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Data Management Options */}
        <View style={styles.settingsSection}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate("ExportData")}
          >
            <Feather name="download" size={22} color={COLORS.text} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingText}>Export Journal</Text>
              <Text style={styles.settingSubtext} className="ml-4">
                Backup your entries and media
              </Text>
            </View>
            <Feather name="chevron-right" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate("ImportData")}
          >
            <Feather name="upload" size={22} color={COLORS.text} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingText}>Import Journal</Text>
              <Text style={styles.settingSubtext} className="ml-4">
                Restore from backup file
              </Text>
            </View>
            <Feather name="chevron-right" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.dangerItem]}
            onPress={handleClearAllData}
            disabled={clearing}
          >
            {clearing ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <Feather name="trash-2" size={22} color={COLORS.error} />
            )}
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingText, { color: COLORS.error }]}>
                {clearing ? "Clearing Data..." : "Clear All Data"}
              </Text>
              <Text
                style={[
                  styles.settingSubtext,
                  { color: COLORS.error, opacity: 0.7 },
                ]}
                className="ml-4"
              >
                Permanently delete everything
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Feather name="info" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Your data is stored locally on your device. Export regularly to
              create backups and ensure your memories are safe.
            </Text>
          </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  headerRight: {
    width: 40,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 25,
    backgroundColor: COLORS.white,
    marginBottom: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  nameText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
  },
  stateText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 4,
  },
  daysLeftContainer: {
    flexDirection: "column",
    alignItems: "center",
    marginTop: 15,
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  daysLeftText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
  },
  daysLeftLabel: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 2,
  },
  badgesSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 15,
  },
  badgesScrollView: {
    paddingBottom: 8,
  },
  badgeItem: {
    alignItems: "center",
    marginRight: 20,
    width: 85,
  },
  badgeItemLocked: {
    opacity: 0.7,
  },
  badgeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  badgeIconLocked: {
    backgroundColor: COLORS.card,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
  badgeNameLocked: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
    textAlign: "center",
  },
  settingsSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 20,
    paddingVertical: 5,
    marginBottom: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
    marginLeft: 15,
  },
  versionContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  versionText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
   settingTextContainer: {
    flex: 1,
    // marginLeft: 15,
  },
  settingSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  dangerItem: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(224, 125, 107, 0.2)',
    marginTop: 10,
    paddingTop: 20,
  },
  infoSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  infoCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginLeft: 12,
  },
  scrollContainer: {
    flex: 1,
  },
});
