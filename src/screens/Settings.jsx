import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import storageManager from "../services/StoreManager"; // Using your actual path
import ServiceInfoModal from "../components/ServiceInfoModal";
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
const SettingsScreen = ({ navigation }) => {
  const [serviceInfo, setServiceInfo] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);
  const [showServiceInfoModal, setShowServiceInfoModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    // Load service info on component mount
    loadServiceInfo();
  }, []);

  const loadServiceInfo = async () => {
    try {
      const settings = await storageManager.getSettings();
      if (settings.serviceInfo) {
        setServiceInfo(settings.serviceInfo);

        // Calculate days left in service
        if (settings.serviceInfo.startDate) {
          const startDate = new Date(settings.serviceInfo.startDate);
          const serviceEndDate = new Date(settings.serviceInfo.endDate);

          const today = new Date();
          const timeLeft = serviceEndDate - today;
          const daysRemaining = Math.max(
            0,
            Math.ceil(timeLeft / (1000 * 60 * 60 * 24))
          );

          setDaysLeft(daysRemaining);
        }
      }
    } catch (error) {
      console.error("Error loading service info:", error);
    }
  };

  const openSocialMedia = (url) => {
    Linking.openURL(url).catch((err) =>
      console.error("An error occurred", err)
    );
  };
  // Handle service info save
  const handleServiceInfoSave = async (info) => {
    try {
      // Save service info to settings
      const settings = await storageManager.getSettings();
      settings.serviceInfo = info;
      await storageManager.saveSettings(settings);

      // Update state
      setServiceInfo(info);
      setShowServiceInfoModal(false);
    } catch (error) {
      console.error("Error saving service info:", error);
    }
  };

  // Handle service info skip
  const handleServiceInfoSkip = () => {
    setShowServiceInfoModal(false);
  };

  const handleClearAllData = () => {
    // First confirmation dialog
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to delete all journal entries and app data? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => showFinalConfirmation(),
        },
      ]
    );
  };

  // Second confirmation dialog to ensure user really wants to delete
  const showFinalConfirmation = () => {
    Alert.alert(
      "Final Confirmation",
      "All your journal entries, pictures, and settings will be permanently deleted. You cannot recover this data after deletion.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes, Delete Everything",
          style: "destructive",
          onPress: () => performDataClear(),
        },
      ]
    );
  };

  // Actual data clearing process
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
              onPress: () => {
                // Navigate back to initial setup or main screen
                navigation.reset({
                  index: 0,
                  routes: [{ name: "HomeScreen" }], // Or whatever your onboarding/welcome screen is named
                });
              },
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
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerRight} />
        </View>

        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Feather name="user" size={36} color={COLORS.primary} />
          </View>

          <Text style={styles.nameText}>
            {serviceInfo?.name || "Corps Member"}
          </Text>
          <Text style={styles.stateText}>
            {serviceInfo?.stateOfDeployment || "Your State of Deployment"}
          </Text>

          {daysLeft !== null && (
            <View style={styles.daysLeftContainer}>
              <Text style={styles.daysLeftText}>{daysLeft}</Text>
              <Text style={styles.daysLeftLabel}>Days Left in Service</Text>
            </View>
          )}
        </View>

        {/* Badges Section */}
        {/* <View style={styles.badgesSection}>
          <Text style={styles.sectionTitle}>Your Badges</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.badgesScrollView}
          >
            <View style={styles.badgeItem}>
              <View style={styles.badgeIconContainer}>
                <Feather name="award" size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.badgeName}>First Entry</Text>
            </View>

            <View style={[styles.badgeItem, styles.badgeItemLocked]}>
              <View style={[styles.badgeIconContainer, styles.badgeIconLocked]}>
                <Feather name="star" size={28} color={COLORS.textMuted} />
              </View>
              <Text style={styles.badgeNameLocked}>10 Entries</Text>
            </View>

            <View style={[styles.badgeItem, styles.badgeItemLocked]}>
              <View style={[styles.badgeIconContainer, styles.badgeIconLocked]}>
                <Feather name="calendar" size={28} color={COLORS.textMuted} />
              </View>
              <Text style={styles.badgeNameLocked}>Weekly Streak</Text>
            </View>

            <View style={[styles.badgeItem, styles.badgeItemLocked]}>
              <View style={[styles.badgeIconContainer, styles.badgeIconLocked]}>
                <Feather name="camera" size={28} color={COLORS.textMuted} />
              </View>
              <Text style={styles.badgeNameLocked}>Photo Collector</Text>
            </View>
          </ScrollView>
        </View> */}

        {/* Settings Options */}
        <View style={styles.settingsSection}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowServiceInfoModal(true)}
          >
            <Feather name="user" size={22} color={COLORS.text} />
            <Text style={styles.settingText}>Edit Profile</Text>
            <Feather name="chevron-right" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate("AboutApp")}
          >
            <Feather name="info" size={22} color={COLORS.text} />
            <Text style={styles.settingText}>About Bettina</Text>
            <Feather name="chevron-right" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Feather name="download" size={22} color={COLORS.text} />
            <Text style={styles.settingText}>Export Journal</Text>
            <Feather name="chevron-right" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleClearAllData}
            disabled={clearing}
          >
            {clearing ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <Feather name="trash-2" size={22} color={COLORS.error} />
            )}
            <Text style={[styles.settingText, { color: COLORS.error }]}>
              {clearing ? "Clearing Data..." : "Clear All Data"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Bettina v1.0.0</Text>
        </View>
      </ScrollView>
      <ServiceInfoModal
        isVisible={showServiceInfoModal}
        onSave={handleServiceInfoSave}
        onSkip={handleServiceInfoSkip}
        existingInfo={serviceInfo} // Pass existing info here
      />
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
});

export default SettingsScreen;
