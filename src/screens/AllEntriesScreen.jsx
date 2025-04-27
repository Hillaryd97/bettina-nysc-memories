import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useJournal } from '../context/JournalContext';
import { format } from 'date-fns';

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

const JournalEntryCard = ({ entry, onPress }) => {
  const moodIcon = () => {
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
  };

  // Format the entry date
  const formattedDate = () => {
    if (!entry.date) return "";
    const date = new Date(entry.date);
    return format(date, 'MMM d, yyyy');
  };

  // Create a preview from the content if needed
  const preview = () => {
    if (entry.preview) return entry.preview;
    
    // Create a preview from the content
    const maxPreviewLength = 120;
    if (entry.content && entry.content.length > maxPreviewLength) {
      return entry.content.substring(0, maxPreviewLength) + '...';
    }
    return entry.content || "No content";
  };

  return (
    <TouchableOpacity style={styles.entryCard} onPress={onPress}>
      <View style={styles.entryContent}>
        <View style={styles.entryHeader}>
          <Text style={styles.entryTitle} numberOfLines={1}>
            {entry.title}
          </Text>
          <View style={styles.entryDateBadge}>
            <Feather
              name={moodIcon()}
              size={14}
              color={COLORS.primary}
              style={styles.moodIcon}
            />
            <Text style={styles.entryDateText}>{formattedDate()}</Text>
          </View>
        </View>
        <Text style={styles.entryPreview} numberOfLines={2}>
          {preview()}
        </Text>
        
        {entry.tags && entry.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {entry.tags.map((tag, index) => (
              <View key={index} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.entryDivider} />
    </TouchableOpacity>
  );
};

const AllEntriesScreen = ({ navigation }) => {
  const { entries, isLoading, searchEntries } = useJournal();
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'title'

  // Load and sort entries when the screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadEntries = async () => {
        setRefreshing(true);
        try {
          let results;
          
          if (searchQuery.trim()) {
            results = await searchEntries(searchQuery);
          } else {
            results = [...entries];
          }
          
          // Sort entries
          results = sortEntries(results, sortBy);
          
          setFilteredEntries(results);
        } catch (error) {
          console.error('Error loading entries:', error);
        } finally {
          setRefreshing(false);
        }
      };
      
      loadEntries();
    }, [entries, searchQuery, sortBy])
  );

  // Sort entries by date (newest first) or title
  const sortEntries = (entriesToSort, sortKey) => {
    if (sortKey === 'date') {
      return [...entriesToSort].sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt);
        const dateB = new Date(b.date || b.createdAt);
        return dateB - dateA; // Newest first
      });
    } else if (sortKey === 'title') {
      return [...entriesToSort].sort((a, b) => {
        return a.title.localeCompare(b.title); // Alphabetical
      });
    }
    return entriesToSort;
  };

  // Handle search
  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  // Toggle sort order
  const toggleSort = () => {
    setSortBy(sortBy === 'date' ? 'title' : 'date');
  };

  // Handle entry selection
  const handleEntryPress = (entry) => {
    navigation.navigate('CreateEntry', {
      mode: 'preview',
      entry: entry
    });
  };

  // Refresh entries
  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      const sorted = sortEntries([...entries], sortBy);
      setFilteredEntries(sorted);
      setRefreshing(false);
    }, 500);
  };

  // Render header with search and sort options
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <Feather name="arrow-left" size={24} color={COLORS.text} />
      </TouchableOpacity>
      
      <Text style={styles.headerTitle}>All Journal Entries</Text>
      
      <TouchableOpacity 
        style={styles.sortButton} 
        onPress={toggleSort}
      >
        <Feather 
          name={sortBy === 'date' ? "clock" : "type"} 
          size={20} 
          color={COLORS.primary} 
        />
      </TouchableOpacity>
    </View>
  );

  // Render search bar
  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Feather name="search" size={20} color={COLORS.textLight} />
      <TextInput
        placeholder="Search entries by title, content, or tags"
        value={searchQuery}
        onChangeText={handleSearch}
        style={styles.searchInput}
        placeholderTextColor={COLORS.textLight}
      />
      {searchQuery !== '' && (
        <TouchableOpacity onPress={() => setSearchQuery('')}>
          <Feather name="x" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      )}
    </View>
  );

  // Empty state component
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      {searchQuery ? (
        <>
          <Feather name="search" size={50} color={COLORS.primaryLight} />
          <Text style={styles.emptyStateTitle}>No Matching Entries</Text>
          <Text style={styles.emptyStateText}>
            We couldn't find any entries matching your search.
          </Text>
        </>
      ) : (
        <>
          <Feather name="book-open" size={50} color={COLORS.primaryLight} />
          <Text style={styles.emptyStateTitle}>No Journal Entries Yet</Text>
          <Text style={styles.emptyStateText}>
            Start capturing your service year journey by creating your first entry.
          </Text>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {renderHeader()}
      {renderSearchBar()}
      
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
          contentContainerStyle={[
            styles.listContent,
            filteredEntries.length === 0 && styles.emptyListContent
          ]}
          ListEmptyComponent={renderEmptyState}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontWeight: '700',
    color: COLORS.text,
  },
  sortButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    ...shadowStyles.small,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 15,
    overflow: 'hidden',
    ...shadowStyles.small,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  entryContent: {
    padding: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 10,
  },
  entryDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '500',
  },
  entryPreview: {
    color: COLORS.textLight,
    lineHeight: 20,
    fontSize: 14,
    marginBottom: 8,
  },
  entryDivider: {
    height: 4,
    backgroundColor: COLORS.primaryLight,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: 'rgba(61, 179, 137, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});

export default AllEntriesScreen;