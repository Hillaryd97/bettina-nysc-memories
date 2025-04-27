import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  StatusBar,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { format, differenceInDays } from "date-fns";
import { BlurView } from "expo-blur";
import { useJournal } from "../context/JournalContext";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 2;
const SPACING = 8;
const ITEM_WIDTH = (width - SPACING * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

// MasonryList component to display images in a masonry layout
const MasonryList = ({ data, onItemPress }) => {
  // Function to determine image height (creating the masonry effect)
  const getImageHeight = (index) => {
    // Create varying heights to achieve masonry effect
    const heights = [200, 240, 180, 220, 250, 190];
    return heights[index % heights.length];
  };

  // Separate data into columns
  const columns = data.reduce((acc, item, index) => {
    const columnIndex = index % COLUMN_COUNT;
    acc[columnIndex] = [...(acc[columnIndex] || []), item];
    return acc;
  }, []);

  return (
    <View style={styles.masonryContainer}>
      {columns.map((column, columnIndex) => (
        <View key={`column-${columnIndex}`} style={styles.masonryColumn}>
          {column.map((item, itemIndex) => {
            const imageHeight = getImageHeight(
              (columnIndex * data.length) / COLUMN_COUNT + itemIndex
            );
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.masonryItem,
                  {
                    height: imageHeight,
                    marginLeft: columnIndex === 0 ? 0 : SPACING,
                    marginBottom: SPACING,
                  },
                ]}
                onPress={() => onItemPress(item)}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={styles.masonryImage}
                  resizeMode="cover"
                />
                <View style={styles.masonryDateContainer}>
                  <Text style={styles.masonryDateText}>
                    {format(new Date(item.date), "MMM d")}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

// Sticky header component for date sections
const StickyHeader = ({ date, scrollY, index }) => {
  // Animation calculations for sticky header
  const headerHeight = 40;
  const stickyHeaderPosition = index * headerHeight;
  const inputRange = [
    -1,
    0,
    stickyHeaderPosition,
    stickyHeaderPosition + headerHeight,
  ];
  const translateY = scrollY.interpolate({
    inputRange,
    outputRange: [0, 0, 0, headerHeight],
  });

  return (
    <Animated.View
      style={[styles.stickyHeaderContainer, { transform: [{ translateY }] }]}
    >
      <Text style={styles.stickyHeaderText}>{date}</Text>
    </Animated.View>
  );
};

// Image viewer modal component
const ImageViewerModal = ({ visible, image, onClose, allImages }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible && image) {
      const index = allImages.findIndex((img) => img.id === image.id);
      setCurrentIndex(index >= 0 ? index : 0);
    }
  }, [visible, image, allImages]);

  const handleSwipeLeft = () => {
    if (currentIndex < allImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSwipeRight = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!visible || !allImages[currentIndex]) return null;

  const currentImage = allImages[currentIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <BlurView intensity={90} style={StyleSheet.absoluteFill} tint="dark">
        <SafeAreaView style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.imageContainer}>
            <TouchableOpacity
              style={[styles.navButton, styles.leftButton]}
              onPress={handleSwipeRight}
              disabled={currentIndex === 0}
            >
              <Ionicons
                name="chevron-back"
                size={28}
                color={currentIndex === 0 ? "rgba(255,255,255,0.3)" : "#fff"}
              />
            </TouchableOpacity>

            <Image
              source={{ uri: currentImage.uri }}
              style={styles.fullImage}
              resizeMode="contain"
            />

            <TouchableOpacity
              style={[styles.navButton, styles.rightButton]}
              onPress={handleSwipeLeft}
              disabled={currentIndex === allImages.length - 1}
            >
              <Ionicons
                name="chevron-forward"
                size={28}
                color={
                  currentIndex === allImages.length - 1
                    ? "rgba(255,255,255,0.3)"
                    : "#fff"
                }
              />
            </TouchableOpacity>
          </View>

          <View style={styles.modalInfoContainer}>
            <Text style={styles.modalDateText}>
              {format(new Date(currentImage.date), "MMMM d, yyyy")}
            </Text>
            <Text style={styles.modalCaptionText}>
              {currentImage.title || "Untitled memory"}
            </Text>
            {/* {currentImage.dayCount && (
              <Text style={styles.modalDayText}>
                Day {currentImage.dayCount} of your service year
              </Text>
            )} */}
          </View>

          <View style={styles.paginationContainer}>
            {allImages.map((_, index) => (
              <View
                key={`dot-${index}`}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor:
                      index === currentIndex ? "#fff" : "rgba(255,255,255,0.4)",
                  },
                ]}
              />
            ))}
          </View>
        </SafeAreaView>
      </BlurView>
    </Modal>
  );
};

// Main Gallery Screen component
const GalleryScreen = ({ navigation }) => {
  const { entries, isLoading: entriesLoading, getServiceInfo } = useJournal();
  const [images, setImages] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [serviceInfo, setServiceInfo] = useState(null);

  // Load service info
  useEffect(() => {
    const loadServiceData = async () => {
      try {
        const serviceData = await getServiceInfo();
        setServiceInfo(serviceData);
      } catch (error) {
        console.error("Error loading service info:", error);
      }
    };

    loadServiceData();
  }, []);

  // Extract images from entries
  useEffect(() => {
    setLoading(true);

    if (entriesLoading) return;

    // Process entries to extract images
    const extractedImages = [];

    entries.forEach((entry) => {
      if (entry.images && entry.images.length > 0) {
        // Calculate day count if serviceInfo is available
        let dayCount = null;
        if (serviceInfo && serviceInfo.startDate) {
          // Ensure we're working with date objects
          const startDate = new Date(serviceInfo.startDate);
          const entryDate = new Date(entry.date);

          // Reset time portions to get accurate day count
          const normalizedStartDate = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate()
          );
          const normalizedEntryDate = new Date(
            entryDate.getFullYear(),
            entryDate.getMonth(),
            entryDate.getDate()
          );

          // Calculate the difference in days and add 1 to make it inclusive
          dayCount =
            Math.floor(
              (normalizedEntryDate - normalizedStartDate) /
                (1000 * 60 * 60 * 24)
            ) + 1;

          // Ensure day count is between 1 and 365 (typical service year)
          dayCount = Math.max(1, Math.min(365, dayCount));

          // If day count seems unreasonable (like very large numbers from date parsing issues),
          // default to a safe value
          if (dayCount > 365 || dayCount < 0) {
            console.warn("Invalid day count calculated:", dayCount);
            dayCount = null;
          }
        }

        entry.images.forEach((imageUri, index) => {
          extractedImages.push({
            id: `${entry.id}-img-${index}`,
            uri: imageUri,
            date: entry.date,
            title: entry.title,
            entryId: entry.id,
            dayCount,
          });
        });
      }
    });

    // Sort by date (newest first)
    extractedImages.sort((a, b) => new Date(b.date) - new Date(a.date));

    setImages(extractedImages);
    setLoading(false);
  }, [entries, serviceInfo, entriesLoading]);

  // Group images by month for section headers
  const groupedImages = images.reduce((acc, img) => {
    const monthYear = format(new Date(img.date), "MMMM yyyy");
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(img);
    return acc;
  }, {});

  // Available filter months
  const availableMonths = [
    ...new Set(images.map((img) => format(new Date(img.date), "MMM yyyy"))),
  ];

  // Filter images based on selected filter
  const filteredImages =
    selectedFilter === "all"
      ? images
      : images.filter(
          (img) => format(new Date(img.date), "MMM yyyy") === selectedFilter
        );

  // Handle image press
  const handleImagePress = (image) => {
    setSelectedImage(image);
    setIsModalVisible(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalVisible(false);
  };

  // Get a highlighted memory
  const getHighlightedMemory = () => {
    if (images.length === 0) return null;

    // If we have more than 5 images, try to find one from the first month
    if (images.length > 5) {
      const oldestDate = new Date(
        Math.min(...images.map((img) => new Date(img.date).getTime()))
      );
      const firstMonthImages = images.filter((img) => {
        const imgDate = new Date(img.date);
        return (
          imgDate.getMonth() === oldestDate.getMonth() &&
          imgDate.getFullYear() === oldestDate.getFullYear()
        );
      });

      if (firstMonthImages.length > 0) {
        return firstMonthImages[
          Math.floor(Math.random() * firstMonthImages.length)
        ];
      }
    }

    // Otherwise, just pick a random one
    return images[Math.floor(Math.random() * images.length)];
  };

  const highlightedMemory = images.length > 0 ? getHighlightedMemory() : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <SafeAreaView style={styles.header} >
        <View style={styles.headerTextContainer} className="">
          <Text style={styles.headerTitle}>Gallery</Text>
          <Text style={styles.headerSubtitle}>Your memories</Text>
        </View>
        {/* <TouchableOpacity>
          <Ionicons name="search" size={24} color="#1E3A32" />
        </TouchableOpacity> */}
      </SafeAreaView>

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === "all" && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedFilter("all")}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === "all" && styles.filterTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {availableMonths.map((month) => (
            <TouchableOpacity
              key={month}
              style={[
                styles.filterButton,
                selectedFilter === month && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(month)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === month && styles.filterTextActive,
                ]}
              >
                {month}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading || entriesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3DB389" />
          <Text style={styles.loadingText}>Loading your memories...</Text>
        </View>
      ) : images.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={64} color="#3DB389" />
          <Text style={styles.emptyTitle}>No Memories Yet</Text>
          <Text style={styles.emptyText}>
            Add images to your journal entries to see them here.
          </Text>
        </View>
      ) : (
        <Animated.ScrollView
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Featured Memory section */}
          {/* {highlightedMemory && images.length >= 3 && (
            <View style={styles.featuredContainer}>
              <Text style={styles.featuredTitle}>Featured Memory</Text>
              <TouchableOpacity
                style={styles.featuredImageContainer}
                onPress={() => handleImagePress(highlightedMemory)}
              >
                <Image
                  source={{ uri: highlightedMemory.uri }}
                  style={styles.featuredImage}
                  resizeMode="cover"
                />
                <View
                  style={styles.featuredOverlay}
                  className="flex-row items-center space-x-2 justify-center"
                >
                  <Text style={styles.featuredDate}>
                    {format(new Date(highlightedMemory.date), "MMMM d, yyyy")}:
                    {highlightedMemory.dayCount && ` • Day ${highlightedMemory.dayCount}`}
                  </Text>
                  <Text style={styles.featuredCaption}>
                    {highlightedMemory.title ||
                      "Highlights from your service year"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )} */}

          {/* Masonry Gallery */}
          <MasonryList data={filteredImages} onItemPress={handleImagePress} />
        </Animated.ScrollView>
      )}

      {/* Image Viewer Modal */}
      <ImageViewerModal
        visible={isModalVisible}
        image={selectedImage}
        onClose={closeModal}
        allImages={filteredImages}
      />
    </View>
  );
};

// Component Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FDFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 16,
    backgroundColor: "#F8FDFB",
  },
  headerTextContainer: {
    flexDirection: "column",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#4F6E64",
    marginTop: 2,
  },
  filterContainer: {
    paddingVertical: 12,
    backgroundColor: "#F8FDFB",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  filterScrollContent: {
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "#E5F5EE",
  },
  filterButtonActive: {
    backgroundColor: "#3DB389",
  },
  filterText: {
    color: "#1A6B52",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: SPACING,
    paddingBottom: 20,
  },
  stickyHeaderContainer: {
    height: 40,
    justifyContent: "center",
    backgroundColor: "#F8FDFB",
    paddingHorizontal: 16,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  stickyHeaderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E3A32",
  },
  masonryContainer: {
    flexDirection: "row",
    paddingTop: SPACING,
  },
  masonryColumn: {
    flex: 1,
  },
  masonryItem: {
    width: ITEM_WIDTH,
    borderRadius: 8,
    overflow: "hidden",
  },
  masonryImage: {
    width: "100%",
    height: "100%",
  },
  masonryDateContainer: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  masonryDateText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: "100%",
    height: "70%",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  fullImage: {
    width: "85%",
    height: "100%",
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  leftButton: {
    marginRight: 10,
  },
  rightButton: {
    marginLeft: 10,
  },
  modalInfoContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  modalDateText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalCaptionText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  modalDayText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginTop: 8,
  },
  paginationContainer: {
    flexDirection: "row",
    marginTop: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#1E3A32",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E3A32",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#4F6E64",
    textAlign: "center",
    marginTop: 8,
  },
  featuredContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3DB389",
    marginBottom: 12,
    marginLeft: 8,
  },
  featuredImageContainer: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  featuredOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 12,
  },
  featuredDate: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  featuredCaption: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default GalleryScreen;
