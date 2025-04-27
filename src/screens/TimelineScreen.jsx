import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useJournal } from "../context/JournalContext";
import { format, addMonths, startOfMonth, endOfMonth } from "date-fns";

// Constants
const COLORS = {
  primary: "#3DB389",
  primaryLight: "#E5F5EE",
  primaryDark: "#1A6B52",
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

// Month card component
const MonthCard = ({ month, onPress, isActive }) => {
  return (
    <TouchableOpacity
      style={[styles.monthCard, isActive && styles.activeMonthCard]}
      onPress={onPress}
    >
      <Text style={[styles.monthName, isActive && styles.activeMonthText]}>
        {format(month.date, "MMMM yyyy")}
      </Text>

      <View style={styles.monthStats}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, isActive && styles.activeMonthText]}>
            {month.entryCount}
          </Text>
          <Text style={[styles.statLabel, isActive && styles.activeMonthText]}>
            Entries
          </Text>
        </View>

        {month.moodSummary && (
          <View style={styles.statItem}>
            <Text
              style={[styles.statValue, isActive && styles.activeMonthText]}
            >
              {month.moodSummary.emoji}
            </Text>
            <Text
              style={[styles.statLabel, isActive && styles.activeMonthText]}
            >
              Mood
            </Text>
          </View>
        )}
      </View>

      {month.entryCount > 0 ? (
        <Text
          style={[styles.monthHighlight, isActive && styles.activeMonthText]}
        >
          {month.highlight}
        </Text>
      ) : (
        <Text
          style={[styles.noEntriesText, isActive && styles.activeMonthText]}
        >
          No entries this month
        </Text>
      )}
    </TouchableOpacity>
  );
};

// Entry list item component
const EntryListItem = ({ entry, onPress }) => {
  const formattedDate = format(new Date(entry.date), "MMM d");

  return (
    <TouchableOpacity style={styles.entryItem} onPress={onPress}>
      <View style={styles.entryDateContainer}>
        <Text style={styles.entryDate}>{formattedDate}</Text>
      </View>

      <View style={styles.entryContent}>
        <Text style={styles.entryTitle} numberOfLines={1}>
          {entry.title}
        </Text>
        <Text style={styles.entryPreview} numberOfLines={1}>
          {entry.content
            ? entry.content.substring(0, 60) +
              (entry.content.length > 60 ? "..." : "")
            : "No content"}
        </Text>
      </View>

      <Feather name="chevron-right" size={18} color={COLORS.textLight} />
    </TouchableOpacity>
  );
};

const TimelineScreen = ({ navigation, route }) => {
  const { entries, isLoading, getEntriesByMonth } = useJournal();
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthEntries, setMonthEntries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Get service start date from route or use default
  const serviceStartDate =
    route.params?.serviceStartDate || new Date(2023, 3, 23); // April 23, 2023
  const serviceEndDate = route.params?.serviceEndDate || new Date(2024, 3, 23); // April 23, 2024

  // Load timeline data when the screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadTimelineData = async () => {
        setRefreshing(true);
        try {
          // Generate months between start and end date
          const monthsData = [];
          let currentDate = new Date(serviceStartDate);

          while (currentDate <= serviceEndDate) {
            const month = currentDate.getMonth();
            const year = currentDate.getFullYear();

            // Get entries for this month
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);

            const monthEntries = entries.filter((entry) => {
              const entryDate = new Date(entry.date);
              return entryDate >= monthStart && entryDate <= monthEnd;
            });

            // Get most common mood for the month
            let moodSummary = null;
            if (monthEntries.length > 0) {
              const moodCounts = {};
              monthEntries.forEach((entry) => {
                if (entry.mood) {
                  moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
                }
              });

              // Find most common mood
              let topMood = null;
              let topCount = 0;

              Object.keys(moodCounts).forEach((mood) => {
                if (moodCounts[mood] > topCount) {
                  topMood = mood;
                  topCount = moodCounts[mood];
                }
              });

              if (topMood) {
                // Get emoji for the mood
                const emoji = getMoodEmoji(topMood);
                moodSummary = { mood: topMood, emoji, count: topCount };
              }
            }

            // Generate a highlight text
            let highlight = "";
            if (monthEntries.length > 0) {
              highlight = `${monthEntries.length} ${
                monthEntries.length === 1 ? "entry" : "entries"
              } recorded`;
            }

            monthsData.push({
              id: `${year}-${month}`,
              date: new Date(currentDate),
              entryCount: monthEntries.length,
              moodSummary,
              highlight,
              monthIndex: month,
              year,
            });

            // Move to next month
            currentDate = addMonths(currentDate, 1);
          }

          setMonths(monthsData);

          // If we have a selected month, load its entries
          if (selectedMonth) {
            loadMonthEntries(selectedMonth);
          } else if (monthsData.length > 0) {
            // Select current month or first month with entries
            const currentMonth = new Date();
            const currentMonthId = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;

            const monthWithEntries = monthsData.find((m) => m.entryCount > 0);
            const monthToSelect =
              monthsData.find((m) => m.id === currentMonthId) ||
              monthWithEntries ||
              monthsData[0];

            setSelectedMonth(monthToSelect);
            loadMonthEntries(monthToSelect);
          }
        } catch (error) {
          console.error("Error loading timeline data:", error);
        } finally {
          setRefreshing(false);
        }
      };

      loadTimelineData();
    }, [entries, serviceStartDate, serviceEndDate])
  );

  // Load entries for a specific month
  const loadMonthEntries = async (month) => {
    try {
      // Filter entries for the selected month
      const monthStart = startOfMonth(month.date);
      const monthEnd = endOfMonth(month.date);

      const filteredEntries = entries.filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= monthStart && entryDate <= monthEnd;
      });

      // Sort by date, newest first
      filteredEntries.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });

      setMonthEntries(filteredEntries);
    } catch (error) {
      console.error("Error loading month entries:", error);
      setMonthEntries([]);
    }
  };

  // Handle month selection
  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    loadMonthEntries(month);
  };

  // Handle entry selection
  const handleEntryPress = (entry) => {
    navigation.navigate("CreateEntry", {
      mode: "preview",
      entry: entry,
    });
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);

    // Re-load the current month's entries
    if (selectedMonth) {
      loadMonthEntries(selectedMonth);
    }

    setRefreshing(false);
  };

  // Get emoji for mood
  const getMoodEmoji = (mood) => {
    switch (mood) {
      case "happy":
        return "😊";
      case "sad":
        return "😔";
      case "excited":
        return "😃";
      case "thoughtful":
        return "🤔";
      case "anxious":
        return "😰";
      case "grateful":
        return "🙏";
      case "calm":
        return "😌";
      case "tired":
        return "😴";
      default:
        return "⭐";
    }
  };

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Feather name="arrow-left" size={24} color={COLORS.text} />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Service Timeline</Text>

      <View style={{ width: 32 }} />
    </View>
  );

  // Render month carousel
  const renderMonthCarousel = () => (
    <View className="h-fit py-8 pl-4">
      <FlatList
        data={months}
        horizontal
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MonthCard
            month={item}
            isActive={selectedMonth?.id === item.id}
            onPress={() => {
              setSelectedMonth(item);
              loadMonthEntries(item);
            }}
          />
        )}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );

  // Render entries list
  const renderEntriesList = () => (
    <View style={styles.entriesContainer}>
      <Text style={styles.sectionTitle}>
        {selectedMonth ? format(selectedMonth.date, "MMMM yyyy") : "Entries"}
      </Text>

      {monthEntries.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Feather name="calendar" size={50} color={COLORS.primaryLight} />
          <Text style={styles.emptyStateTitle}>No Entries</Text>
          <Text style={styles.emptyStateText}>
            You haven't recorded any entries for this month yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={monthEntries}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <EntryListItem
              entry={item}
              onPress={() => handleEntryPress(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.entriesList}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {renderHeader()}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <>
          {renderMonthCarousel()}
          {renderEntriesList()}
        </>
      )}
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...shadowStyles.small,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  monthCarousel: {
    padding: 15,
  },
  monthCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 15,
    marginRight: 15,
    width: 220,
    height: 170,
    ...shadowStyles.small,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    // alignItems: 'center',
  },
  activeMonthCard: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  monthName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
  },
  activeMonthText: {
    color: COLORS.white,
  },
  monthStats: {
    flexDirection: "row",
    marginBottom: 10,
  },
  statItem: {
    marginRight: 15,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  monthHighlight: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  noEntriesText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontStyle: "italic",
  },
  entriesContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 15,
  },
  entriesList: {
    paddingBottom: 20,
  },
  entryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    ...shadowStyles.small,
  },
  entryDateContainer: {
    width: 45,
    marginRight: 15,
  },
  entryDate: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  entryContent: {
    flex: 1,
    marginRight: 10,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 5,
  },
  entryPreview: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
  },
});

export default TimelineScreen;
