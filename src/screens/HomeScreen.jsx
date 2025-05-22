import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useJournal } from "../context/JournalContext";
import { format } from "date-fns";
import ServiceInfoModal from "../components/ServiceInfoModal";
import storageManager from "../services/StoreManager";
import serviceLockManager from "../services/ServiceLockManager";

import UpdateService from "../services/UpdateService";
import GlowingSettingsButton from "../components/GlowingSettingsButton";
import NotificationService from "../services/NotificationService";

// Constants
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

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Shadow styles
const shadowStyles = {
  small: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
};

// Components
const Header = ({
  name,
  date,
  onSettingsPress,
  onNamePress,
  lockStatus,
  hasUpdate,
}) => (
  <View style={styles.headerContainer}>
    <TouchableOpacity onPress={onNamePress}>
      <View style={styles.nameContainer}>
        <Text style={styles.headerTitle}>Hi, {name}</Text>
        <Feather
          name="edit-2"
          size={14}
          color={COLORS.primary}
          style={styles.editIcon}
        />
      </View>
      <Text style={styles.headerDate}>{date}</Text>
    </TouchableOpacity>

    <View style={styles.headerActions}>
      {/* Show lock icon if service is locked */}
      {lockStatus?.isLocked && (
        <View style={styles.lockIndicator}>
          <Feather name="lock" size={16} color={COLORS.error} />
        </View>
      )}

      <GlowingSettingsButton
        onPress={onSettingsPress}
        style={styles.notificationButton}
        iconColor={COLORS.primary}
        iconSize={20}
      />
    </View>
  </View>
);

const ProgressTracker = ({ startDate, endDate, daysPassed, totalDays }) => {
  const progressPercentage = useMemo(
    () => Math.min(100, Math.max(0, (daysPassed / totalDays) * 100)),
    [daysPassed, totalDays]
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Service Progress</Text>
        <Text style={styles.progressText}>
          {Math.abs(daysPassed)} of {totalDays} days
        </Text>
      </View>

      <View style={styles.progressBarBackground}>
        <View
          style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
        />
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.dateText}>
          Started: {format(startDate, "MMM d, yyyy")}
        </Text>
        <Text style={styles.dateText}>
          Passing Out: {format(endDate, "MMM d, yyyy")}
        </Text>
      </View>
    </View>
  );
};
const DefaultProgressTracker = ({ onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>Service Progress</Text>
      <Text style={[styles.progressText, styles.defaultProgressText]}>
        0 of 365 days
      </Text>
    </View>

    <View style={styles.progressBarBackground}>
      <View style={[styles.progressBarFill, { width: "0%" }]} />
    </View>

    <View style={styles.setupContainer}>
      <Text style={styles.setupText}>
        Set up your service details to track your journey
      </Text>
      <View style={styles.setupButton}>
        <Text style={styles.setupButtonText}>Set Up Now</Text>
        <Feather name="arrow-right" size={16} color={COLORS.white} />
      </View>
    </View>
  </TouchableOpacity>
);

const ServiceMonthsTimeline = ({ months, currentMonthIndex, onMonthPress }) => {
  return (
    <View style={styles.monthsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Service Timeline</Text>
        <TouchableOpacity onPress={onMonthPress}>
          <Text style={styles.seeAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.monthsContainer}
      >
        {months.map((month, index) => (
          <MonthPill
            key={month.month}
            month={month}
            isCurrent={index === currentMonthIndex}
            isPast={index < currentMonthIndex}
            onPress={() => onMonthPress(month, index)}
          />
        ))}
      </ScrollView>
    </View>
  );
};
const DefaultServiceTimeline = ({ onPress }) => (
  <View style={styles.monthsSection}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Service Timeline</Text>
    </View>

    <TouchableOpacity style={styles.defaultTimelineContainer} onPress={onPress}>
      <Feather name="calendar" size={24} color={COLORS.primaryLight} />
      <Text style={styles.defaultTimelineText}>
        Set up your service details to see your timeline
      </Text>
      <View style={styles.timelineSetupButton}>
        <Text style={styles.timelineSetupButtonText}>Configure</Text>
      </View>
    </TouchableOpacity>
  </View>
);

const MonthPill = ({ month, isCurrent, isPast, onPress }) => {
  const backgroundColor = isCurrent
    ? COLORS.primary
    : isPast
    ? COLORS.primaryLight
    : COLORS.card;

  const textColor = isCurrent
    ? COLORS.white
    : isPast
    ? COLORS.primaryDark
    : COLORS.textLight;

  const borderColor = isCurrent ? COLORS.primaryDark : COLORS.primaryLight;

  return (
    <TouchableOpacity
      style={[styles.monthPill, { backgroundColor, borderColor }]}
      onPress={onPress}
    >
      <Text style={[styles.monthText, { color: textColor }]}>
        {month.month.substring(0, 3)}
      </Text>
      <Text></Text>
      <View style={styles.monthEntriesBadge}>
        <Text
          style={[
            styles.monthEntriesText,
            { color: isCurrent ? COLORS.white : COLORS.primary },
          ]}
        >
          {month.entries}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const JournalEntryCard = ({ entry, onPress }) => {
  // Add validation
  if (!entry) {
    console.warn("JournalEntryCard: Received null/undefined entry");
    return null;
  }

  const moodIcon = useMemo(() => {
    if (!entry.mood) return "star";

    switch (entry.mood) {
      case "happy":
        return "smile";
      case "sad":
        return "frown";
      case "excited":
        return "smile";
      case "thoughtful":
        return "coffee";
      case "anxious":
        return "alert-circle";
      case "grateful":
        return "heart";
      case "calm":
        return "sun";
      case "tired":
        return "moon";
      default:
        return "star";
    }
  }, [entry.mood]);

  // Format the entry date with validation
  const formattedDate = useMemo(() => {
    if (!entry.date) {
      console.warn("JournalEntryCard: Entry has no date:", entry.id);
      return "";
    }

    try {
      const date = safeDateConversion(entry.date);
      return format(date, "MMM d");
    } catch (error) {
      console.error("JournalEntryCard: Error formatting date:", error);
      return "";
    }
  }, [entry.date]);
  // Create a preview from the content if needed
  const preview = useMemo(() => {
    if (entry.preview) return entry.preview;

    // Create a preview from the content
    const maxPreviewLength = 120;
    if (entry.content && entry.content.length > maxPreviewLength) {
      return entry.content.substring(0, maxPreviewLength) + "...";
    }
    return entry.content || "No content";
  }, [entry.content, entry.preview]);

  // Handle press with entry validation
  const handlePress = () => {
    console.log("JournalEntryCard: Card pressed for entry:", entry.id);

    if (!entry.id) {
      console.error("JournalEntryCard: Cannot press entry without ID");
      return;
    }

    onPress(entry);
  };

  return (
    <TouchableOpacity style={styles.entryCard} onPress={handlePress}>
      <View style={styles.entryContent}>
        <View style={styles.entryHeader}>
          <Text style={styles.entryTitle} numberOfLines={1}>
            {entry.title || "Untitled Entry"}
          </Text>
          <View style={styles.entryDateBadge}>
            <Feather
              name={moodIcon}
              size={14}
              color={COLORS.primary}
              style={styles.moodIcon}
            />
            <Text style={styles.entryDateText}>{formattedDate}</Text>
          </View>
        </View>
        <Text style={styles.entryPreview} numberOfLines={2}>
          {preview}
        </Text>
      </View>
      <View style={styles.entryDivider} />
    </TouchableOpacity>
  );
};

// Empty state component
const EmptyState = ({ onCreatePress }) => (
  <View style={styles.emptyStateContainer}>
    <Feather name="book-open" size={60} color={COLORS.primaryLight} />
    <Text style={styles.emptyStateTitle}>No Journal Entries Yet</Text>
    <Text style={styles.emptyStateText}>
      Start capturing your service year journey by creating your first entry.
    </Text>
    <TouchableOpacity style={styles.emptyStateButton} onPress={onCreatePress}>
      <Text style={styles.emptyStateButtonText}>Create First Entry</Text>
    </TouchableOpacity>
  </View>
);

const safeDateConversion = (dateValue) => {
  if (!dateValue) {
    console.warn("safeDateConversion: Received null/undefined date");
    return new Date(); // Return current date as fallback
  }

  try {
    // If it's already a Date object
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) {
        console.warn("safeDateConversion: Invalid Date object");
        return new Date();
      }
      return dateValue;
    }

    // If it's a string or number, convert to Date
    const convertedDate = new Date(dateValue);
    if (isNaN(convertedDate.getTime())) {
      console.warn(
        "safeDateConversion: Could not convert to valid date:",
        dateValue
      );
      return new Date();
    }

    return convertedDate;
  } catch (error) {
    console.error("safeDateConversion: Error converting date:", error);
    return new Date();
  }
};
// Main Component
const HomeScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { entries, isLoading, getEntriesByMonth, getEntryCountByMonth } =
    useJournal();
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [serviceMonths, setServiceMonths] = useState([]);
  const [showServiceInfoModal, setShowServiceInfoModal] = useState(false);
  const [serviceInfo, setServiceInfo] = useState(null);
  const [serviceLockStatus, setServiceLockStatus] = useState(null);
  const [hasUpdate, setHasUpdate] = useState(false);

  // Load service info on mount
  useEffect(() => {
    const loadServiceInfo = async () => {
      try {
        if (serviceInfo) {
          const lockStatus = await serviceLockManager.checkServiceYearStatus(
            serviceInfo
          );
          setServiceLockStatus(lockStatus);
        }
        const settings = await storageManager.getSettings();

        if (settings.serviceInfo) {
          setServiceInfo(settings.serviceInfo);
        } else {
          // Show service info modal if not set yet
          setShowServiceInfoModal(true);
        }
      } catch (error) {
        console.error("Error loading service info:", error);
        setShowServiceInfoModal(true);
      }
    };

    loadServiceInfo();
  }, []);
  const handleNamePress = () => {
    setShowServiceInfoModal(true);
  };
  // Memoized date calculations
  const { today, formattedDate, startDate, endDate, daysPassed, totalDays } =
    useMemo(() => {
      const today = new Date();

      // Use service info if available, otherwise use defaults
      const startDate = serviceInfo
        ? new Date(serviceInfo.startDate)
        : new Date(2023, 3, 23);
      const totalDays = serviceInfo ? serviceInfo.totalDays : 365;
      const endDate = serviceInfo
        ? new Date(serviceInfo.endDate)
        : new Date(startDate.getTime() + totalDays * 24 * 60 * 60 * 1000);

      const daysPassed = Math.floor(
        (today - startDate) / (1000 * 60 * 60 * 24)
      );

      const formattedDate = `${DAY_NAMES[today.getDay()]}, ${
        MONTH_NAMES[today.getMonth()]
      } ${today.getDate()}`;

      return {
        today,
        formattedDate,
        startDate,
        endDate,
        daysPassed,
        totalDays,
      };
    }, [serviceInfo]);

  // Load entries and service months data when the component mounts or when we return to this screen
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        setRefreshing(true);
        try {
          if (!startDate || !endDate) {
            setRefreshing(false);
            return;
          }

          // Generate service months based on start date through end date
          const months = [];
          const currentDate = new Date();
          const startYear = startDate.getFullYear();
          const startMonth = startDate.getMonth();

          // Create a month entry for each month from the start date to the end date
          for (let i = 0; i < 12; i++) {
            const monthDate = new Date(startYear, startMonth + i, 1);
            if (monthDate > endDate) break;

            const monthName = MONTH_NAMES[monthDate.getMonth()];
            const year = monthDate.getFullYear();
            const month = monthDate.getMonth();

            // Count the entries for this month
            const monthEntries = entries.filter((entry) => {
              const entryDate = new Date(entry.date);
              return (
                entryDate.getMonth() === month &&
                entryDate.getFullYear() === year
              );
            });

            months.push({
              month: monthName,
              year: year,
              monthIndex: month,
              entries: monthEntries.length,
            });
          }

          setServiceMonths(months);

          // Set the filtered entries to be the recent entries (last 10)
          setFilteredEntries(entries.slice(0, 10));
        } catch (error) {
          console.error("Error loading data:", error);
        } finally {
          setRefreshing(false);
        }
      };

      loadData();
    }, [entries, startDate, endDate])
  );

  useEffect(() => {
    const checkUpdatesAndNotifications = async () => {
      try {
        // Check for updates
        const updateResult = await UpdateService.checkForUpdatesOnLaunch();
        console.log("Launch update check:", updateResult);

        // Check for notifications (only if no critical update)
        if (updateResult.type !== "force_update") {
          await NotificationService.checkAndShowNotifications();
        }
      } catch (error) {
        console.error("Error checking updates and notifications:", error);
      }
    };

    setTimeout(checkUpdatesAndNotifications, 2000);
  }, []);

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
  const serializeEntryForNavigation = (entry) => {
    if (!entry) return null;

    // Safely convert dates to timestamps
    const safeConvertDate = (dateValue) => {
      if (!dateValue) return new Date().getTime(); // Default to current time

      try {
        const date = safeDateConversion(dateValue);
        return date.getTime();
      } catch (error) {
        console.error(
          "Error converting date for navigation:",
          dateValue,
          error
        );
        return new Date().getTime(); // Fallback to current time
      }
    };

    return {
      id: entry.id,
      title: entry.title || "",
      content: entry.content || "",
      formattedContent: entry.formattedContent || null,
      mood: entry.mood || null,
      tags: entry.tags || [],
      images: entry.images || [],
      date: safeConvertDate(entry.date),
      createdAt: safeConvertDate(entry.createdAt),
      updatedAt: safeConvertDate(entry.updatedAt),
      audioNotes: entry.audioNotes
        ? entry.audioNotes.map((note) => ({
            ...note,
            date:
              typeof note.date === "string"
                ? note.date
                : new Date(note.date || new Date()).toISOString(),
          }))
        : [],
    };
  };
  // Get the current month index
  const getCurrentMonthIndex = () => {
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    return serviceMonths.findIndex(
      (m) => m.monthIndex === currentMonth && m.year === currentYear
    );
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);

    // In a real app, this might fetch new data from a server
    // For now, we'll just simulate a delay
    setTimeout(() => {
      setFilteredEntries(entries.slice(0, 10));
      setRefreshing(false);
    }, 1000);
  };

  // Handle month selection
  const handleMonthPress = async (month, index) => {
    // Navigate to timeline screen with this month selected
    navigation.navigate("Timeline", {
      selectedMonth: month,
      serviceStartDate: startDate,
      serviceEndDate: endDate,
    });
  };

  // Navigate to create new entry
  const handleCreateEntry = () => {
    if (serviceLockStatus?.isLocked) {
      Alert.alert(
        "Service Year Ended",
        "Your NYSC service year has concluded. You can still view your entries but cannot create new ones.",
        [{ text: "OK" }]
      );
      return;
    }

    const today = new Date();
    const todayEntry = entries.find((entry) => {
      if (!entry.date) return false;
      const entryDate = new Date(entry.date);
      const todayNormalized = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const entryNormalized = new Date(
        entryDate.getFullYear(),
        entryDate.getMonth(),
        entryDate.getDate()
      );
      return todayNormalized.getTime() === entryNormalized.getTime();
    });

    if (todayEntry) {
      navigation.navigate("CreateEntry", {
        mode: serviceLockStatus?.isLocked ? "preview" : "edit",
        entry: serializeEntryForNavigation(todayEntry),
        dayCount: daysPassed,
        totalDays: totalDays,
      });
    } else {
      navigation.navigate("CreateEntry", {
        mode: "edit",
        entry: null,
        dayCount: daysPassed,
        totalDays: totalDays,
      });
    }
  };

  const handleEntryPress = (entry) => {
    try {
      console.log("HomeScreen: Entry pressed:", entry.id, entry.title);

      // Validate that we have a proper entry
      if (!entry || !entry.id) {
        console.error("HomeScreen: Invalid entry data:", entry);
        Alert.alert("Error", "Unable to open entry. Invalid entry data.");
        return;
      }

      // Get month entries with safe date handling
      const getMonthEntries = () => {
        if (!entry.date) {
          console.warn("HomeScreen: Entry has no date, returning single entry");
          return [entry];
        }

        try {
          // Safely convert entry date
          const entryDate = safeDateConversion(entry.date);
          const entryMonth = entryDate.getMonth();
          const entryYear = entryDate.getFullYear();

          console.log(
            `HomeScreen: Finding entries for month ${
              entryMonth + 1
            }/${entryYear}`
          );

          const monthEntries = entries.filter((e) => {
            if (!e.date) return false;

            try {
              const eDate = safeDateConversion(e.date);
              return (
                eDate.getMonth() === entryMonth &&
                eDate.getFullYear() === entryYear
              );
            } catch (error) {
              console.error("HomeScreen: Error filtering entry:", e.id, error);
              return false;
            }
          });

          // Sort entries by date (newest first)
          monthEntries.sort((a, b) => {
            const dateA = safeDateConversion(a.date);
            const dateB = safeDateConversion(b.date);
            return dateB.getTime() - dateA.getTime();
          });

          return monthEntries.length > 0 ? monthEntries : [entry];
        } catch (error) {
          console.error("HomeScreen: Error getting month entries:", error);
          return [entry];
        }
      };

      const monthEntries = getMonthEntries();
      const serializedEntry = serializeEntryForNavigation(entry);
      const serializedMonthEntries = monthEntries.map(
        serializeEntryForNavigation
      );

      // Calculate service day count safely
      let dayCount = null;
      if (serviceInfo && serviceInfo.startDate && entry.date) {
        try {
          const startDate = safeDateConversion(serviceInfo.startDate);
          const entryDate = safeDateConversion(entry.date);

          const diffTime = Math.abs(entryDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          dayCount = diffDays + 1;
        } catch (error) {
          console.error("HomeScreen: Error calculating day count:", error);
        }
      }

      const totalDays = serviceInfo?.totalDays || 365;

      // Navigate to CreateEntry screen
      navigation.navigate("CreateEntry", {
        mode: "preview",
        entry: serializedEntry,
        dayCount: dayCount,
        totalDays: totalDays,
        monthEntries: serializedMonthEntries,
      });
    } catch (error) {
      console.error("HomeScreen: Error in handleEntryPress:", error);
      Alert.alert("Error", "Unable to open entry. Please try again.");
    }
  };

  // Handle notification press
  const handleSettingsPress = () => {
    // Navigation to notifications or show notification modal
    navigation.navigate("Settings");
  };

  // Handle see all entries
  const handleSeeAllEntries = () => {
    navigation.navigate("AllEntries");
  };

  // Handle view timeline
  const handleViewTimeline = () => {
    navigation.navigate("Timeline", {
      serviceStartDate: startDate,
      serviceEndDate: endDate,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <JournalEntryCard
              entry={item}
              onPress={() => handleEntryPress(item)}
            />
          )}
          ListEmptyComponent={
            !searchQuery ? (
              <EmptyState onCreatePress={handleCreateEntry} />
            ) : (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>
                  No entries found matching "{searchQuery}"
                </Text>
              </View>
            )
          }
          ListHeaderComponent={
            <>
              <View style={styles.headerSection}>
                <Header
                  name={serviceInfo?.name || "Corper"}
                  date={formattedDate}
                  onSettingsPress={handleSettingsPress}
                  onNamePress={handleNamePress}
                  lockStatus={serviceLockStatus}
                  hasUpdate={hasUpdate}
                />
                {/* <SearchBar value={searchQuery} onChangeText={handleSearch} /> */}
              </View>

              {serviceInfo ? (
                <ProgressTracker
                  startDate={startDate}
                  endDate={endDate}
                  daysPassed={daysPassed}
                  totalDays={totalDays}
                />
              ) : (
                <DefaultProgressTracker
                  onPress={() => setShowServiceInfoModal(true)}
                />
              )}
              {serviceLockStatus?.reason === "GRACE_PERIOD" && (
                <View style={styles.gracePeriodWarning}>
                  <Feather name="clock" size={16} color={COLORS.error} />
                  <Text style={styles.gracePeriodText}>
                    Service year ended. {serviceLockStatus.daysRemaining} days
                    left to add final entries.
                  </Text>
                </View>
              )}
              {serviceInfo && serviceMonths.length > 0 ? (
                <ServiceMonthsTimeline
                  months={serviceMonths}
                  currentMonthIndex={getCurrentMonthIndex()}
                  onMonthPress={handleViewTimeline}
                />
              ) : (
                <DefaultServiceTimeline
                  onPress={() => setShowServiceInfoModal(true)}
                />
              )}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Journal Entries</Text>
                <TouchableOpacity onPress={handleSeeAllEntries}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
            </>
          }
          contentContainerStyle={[
            styles.listContent,
            filteredEntries.length === 0 && styles.emptyList,
          ]}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* Service Info Modal */}
      <ServiceInfoModal
        isVisible={showServiceInfoModal}
        onSave={handleServiceInfoSave}
        onSkip={handleServiceInfoSkip}
        existingInfo={serviceInfo} // Pass existing info here
      />
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
  },
  headerSection: {
    padding: 20,
    paddingTop: 25,
    paddingBottom: 25,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  notificationButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    ...shadowStyles.small,
  },
  searchContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    height: 48,
    marginTop: 15,
    ...shadowStyles.small,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    height: 48,
    color: COLORS.text,
    fontSize: 15,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    ...shadowStyles.medium,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 3,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  seeAllText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 12,
  },
  entryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 15,
    marginHorizontal: 20,
    overflow: "hidden",
    ...shadowStyles.small,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  entryContent: {
    padding: 16,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    alignItems: "center",
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    marginRight: 10,
  },
  entryDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  moodIcon: {
    marginRight: 5,
  },
  entryDateText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "500",
  },
  entryPreview: {
    color: COLORS.textLight,
    lineHeight: 20,
    fontSize: 14,
  },
  entryDivider: {
    height: 4,
    backgroundColor: COLORS.primaryLight,
  },
  monthsSection: {
    marginBottom: 24,
  },
  monthsContainer: {
    paddingLeft: 20,
    paddingRight: 10,
    paddingVertical: 8,
  },
  monthPill: {
    width: 120,
    height: 140,
    borderRadius: 16,
    marginRight: 12,
    padding: 12,
    justifyContent: "space-between",
    borderWidth: 1,
    ...shadowStyles.small,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
  },
  monthEntriesBadge: {
    borderRadius: 50,
    backgroundColor: "rgba(160, 237, 206, 0.3)",
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
  },
  monthEntriesText: {
    fontSize: 12,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    ...shadowStyles.medium,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 25,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 16,
  },
  noResultsContainer: {
    padding: 30,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  editIcon: {
    marginLeft: 8,
  },
  defaultProgressText: {
    color: COLORS.textMuted,
  },
  setupContainer: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  setupText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textLight,
    marginRight: 10,
  },
  setupButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  setupButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    marginRight: 6,
  },
  defaultTimelineContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 15,
    marginHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    marginTop: 10,
  },
  defaultTimelineText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: "center",
    marginVertical: 10,
  },
  timelineSetupButton: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 5,
  },
  timelineSetupButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  lockIndicator: {
    marginRight: 10,
    padding: 4,
  },
  gracePeriodWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  gracePeriodText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default HomeScreen;
