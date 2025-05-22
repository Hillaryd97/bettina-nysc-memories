import React, { useState, useEffect } from "react";
import UpdateService from "../services/UpdateService";

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
  Animated,
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

const GlowingMenuItem = ({ children, hasGlow, ...props }) => {
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (hasGlow) {
      startPulseAnimation();
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasGlow]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity {...props}>
        {children}
        {hasGlow && (
          <View
            style={{
              position: "absolute",
              top: 10,
              right: 15,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#FF4444",
            }}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const SettingsScreen = ({ navigation }) => {
  const [serviceInfo, setServiceInfo] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);
  const [showServiceInfoModal, setShowServiceInfoModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    // Load service info on component mount
    loadServiceInfo();
  }, []);
  useEffect(() => {
    checkForUpdates();

    // Check every few minutes
    const interval = setInterval(checkForUpdates, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkForUpdates = async () => {
    try {
      const result = await UpdateService.checkForUpdates();
      setHasUpdate(result.hasUpdate);
    } catch (error) {
      console.error("Error checking for updates in settings:", error);
    }
  };

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
          {/* Main Profile Card */}
          <View style={styles.profileCard}>
            {/* Header with Name and Edit */}
            <View style={styles.profileHeader}>
              <View style={styles.profileTitleContainer}>
                <Text style={styles.nameText}>
                  {serviceInfo?.name || "Corps Member"}
                </Text>
                <View style={styles.nyccBadge}>
                  <Text style={styles.nyccBadgeText}>NYSC</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setShowServiceInfoModal(true)}
              >
                <Feather name="edit-2" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Location Info */}
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={16} color={COLORS.textLight} />
              <Text style={styles.stateText}>
                {serviceInfo?.stateOfDeployment || "Set your deployment state"}
              </Text>
            </View>

            {/* Service Progress or Setup */}
            {daysLeft !== null ? (
              <View style={styles.serviceProgress}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Service Progress</Text>
                  <Text style={styles.progressPercentage}>
                    {Math.round(((365 - daysLeft) / 365) * 100)}%
                  </Text>
                </View>

                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.round(((365 - daysLeft) / 365) * 100)}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.progressStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{365 - daysLeft}</Text>
                    <Text style={styles.statLabel}>Days Served</Text>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.statItem}>
                    <Text
                      style={[styles.statNumber, { color: COLORS.primary }]}
                    >
                      {daysLeft}
                    </Text>
                    <Text style={styles.statLabel}>Days Left</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.setupSection}>
                <View style={styles.setupIconContainer}>
                  <Feather name="calendar" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.setupTextContainer}>
                  <Text style={styles.setupTitle}>Complete Your Profile</Text>
                  <Text style={styles.setupSubtitle}>
                    Set your service dates to track your progress
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.setupButton}
                  onPress={() => setShowServiceInfoModal(true)}
                >
                  <Text style={styles.setupButtonText}>Set Up</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
          {/* <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowServiceInfoModal(true)}
          >
            <Feather name="user" size={22} color={COLORS.text} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingText}>Edit Profile</Text>
              <Text style={styles.settingSubtext} className="ml-4">
                Update your profile information
              </Text>
            </View>
            <Feather name="chevron-right" size={22} color={COLORS.textMuted} />
          </TouchableOpacity> */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate("DataManagement")}
          >
            <Feather name="database" size={22} color={COLORS.text} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingText}>Data Management</Text>
              <Text style={styles.settingSubtext} className="ml-4">
                Manage your data
              </Text>
            </View>
            <Feather name="chevron-right" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
          <GlowingMenuItem
            style={styles.settingItem}
            onPress={() => navigation.navigate("Updates")}
            hasGlow={hasUpdate}
          >
            <Feather name="smartphone" size={22} color={COLORS.text} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingText}>App Updates</Text>
              <Text style={styles.settingSubtext} className="ml-4">
                Check for new versions
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {hasUpdate && (
                <View
                  style={{
                    backgroundColor: COLORS.primary,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 10,
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.white,
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    NEW
                  </Text>
                </View>
              )}
              <Feather
                name="chevron-right"
                size={22}
                color={COLORS.textMuted}
              />
            </View>
          </GlowingMenuItem>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate("AboutApp")}
          >
            <Feather name="info" size={22} color={COLORS.text} />
            <Text style={styles.settingText}>About Bettina</Text>
            <Feather name="chevron-right" size={22} color={COLORS.textMuted} />
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
    paddingVertical: 25,
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
    borderTopColor: "rgba(224, 125, 107, 0.2)",
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
    flexDirection: "row",
    alignItems: "flex-start",
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
  profileSection: {
    marginHorizontal: 20,
    marginBottom: 25,
    marginTop: 15,
  },

  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(61, 179, 137, 0.1)",
  },

  profileHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  profileTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  nameText: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginRight: 12,
  },

  nyccBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },

  nyccBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.5,
  },

  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(61, 179, 137, 0.2)",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 4,
  },

  stateText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginLeft: 8,
    fontWeight: "500",
  },

  serviceProgress: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(61, 179, 137, 0.1)",
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  progressTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },

  progressPercentage: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },

  progressBarBackground: {
    height: 10,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 5,
    marginBottom: 20,
    overflow: "hidden",
  },

  progressBarFill: {
    height: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },

  progressStats: {
    flexDirection: "row",
    alignItems: "center",
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: "500",
  },

  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
  },

  setupSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(61, 179, 137, 0.2)",
  },

  setupIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  setupTextContainer: {
    flex: 1,
    marginRight: 12,
  },

  setupTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },

  setupSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
  },

  setupButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  setupButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 14,
  },
});

export default SettingsScreen;
