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
  Platform,
} from "react-native";
import { format, differenceInDays } from "date-fns";
import { BlurView } from "expo-blur";
import { useJournal } from "../context/JournalContext";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");
const COLUMN_COUNT = 2;
const SPACING = 12;
const ITEM_WIDTH = (width - SPACING * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

// Enhanced MasonryList with better mobile design
const MasonryList = ({ data, onItemPress }) => {
  const getImageHeight = (index) => {
    // More varied heights for better masonry effect
    const heights = [180, 220, 160, 200, 240, 190, 170, 210];
    return heights[index % heights.length];
  };

  // Separate data into columns for masonry layout
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
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={styles.masonryImage}
                  resizeMode="cover"
                />

                {/* Enhanced overlay with gradient */}
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.7)"]}
                  style={styles.imageOverlay}
                >
                  <View style={styles.imageMetadata}>
                    <Text style={styles.imageDateText}>
                      {format(new Date(item.date), "MMM d")}
                    </Text>
                    {item.dayCount && (
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>
                          Day {item.dayCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>

                {/* Corner accent */}
                <View style={styles.cornerAccent} />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

// Enhanced Featured Memory Component
const FeaturedMemory = ({ memory, onPress }) => {
  if (!memory) return null;

  return (
    <View style={styles.featuredSection}>
      <View style={styles.featuredHeader}>
        <Text style={styles.featuredTitle}>✨ Featured Memory</Text>
        <Text style={styles.featuredSubtitle}>
          A special moment from your journey
        </Text>
      </View>

      <TouchableOpacity
        style={styles.featuredContainer}
        onPress={() => onPress(memory)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: memory.uri }}
          style={styles.featuredImage}
          resizeMode="cover"
        />

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={styles.featuredOverlay}
        >
          <View style={styles.featuredContent}>
            <Text style={styles.featuredDate}>
              {format(new Date(memory.date), "EEEE, MMMM d, yyyy")}
            </Text>
            {memory.dayCount && (
              <Text style={styles.featuredDayText}>
                Day {memory.dayCount} of your service year
              </Text>
            )}
            <Text style={styles.featuredCaption} numberOfLines={2}>
              {memory.title || "A beautiful memory from your NYSC journey"}
            </Text>
          </View>
        </LinearGradient>

        {/* Play icon overlay */}
        <View style={styles.playIconContainer}>
          <View style={styles.playIcon}>
            <Feather name="eye" size={20} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Enhanced Image Viewer Modal
const ImageViewerModal = ({ visible, image, onClose, allImages }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && image) {
      const index = allImages.findIndex((img) => img.id === image.id);
      setCurrentIndex(index >= 0 ? index : 0);

      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, image, allImages]);

  const handleSwipeLeft = () => {
    if (currentIndex < allImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setImageLoading(true);
    }
  };

  const handleSwipeRight = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setImageLoading(true);
    }
  };

  if (!visible || !allImages[currentIndex]) return null;

  const currentImage = allImages[currentIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
        <BlurView intensity={95} style={StyleSheet.absoluteFill} tint="dark">
          {/* Header */}
          <SafeAreaView style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <View style={styles.closeButtonBackground}>
                <Ionicons name="close" size={24} color="#fff" />
              </View>
            </TouchableOpacity>

            <View style={styles.modalCounter}>
              <Text style={styles.modalCounterText}>
                {currentIndex + 1} of {allImages.length}
              </Text>
            </View>
          </SafeAreaView>

          {/* Image Container */}
          <View style={styles.modalImageContainer}>
            <TouchableOpacity
              style={[styles.navButton, styles.leftNavButton]}
              onPress={handleSwipeRight}
              disabled={currentIndex === 0}
            >
              <View
                style={[
                  styles.navButtonBackground,
                  currentIndex === 0 && styles.navButtonDisabled,
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={currentIndex === 0 ? "rgba(255,255,255,0.3)" : "#fff"}
                />
              </View>
            </TouchableOpacity>

            <View style={styles.centerImageContainer}>
              {imageLoading && (
                <View style={styles.imageLoadingContainer}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}
              <Image
                source={{ uri: currentImage.uri }}
                style={styles.modalImage}
                resizeMode="contain"
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
            </View>

            <TouchableOpacity
              style={[styles.navButton, styles.rightNavButton]}
              onPress={handleSwipeLeft}
              disabled={currentIndex === allImages.length - 1}
            >
              <View
                style={[
                  styles.navButtonBackground,
                  currentIndex === allImages.length - 1 &&
                    styles.navButtonDisabled,
                ]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={
                    currentIndex === allImages.length - 1
                      ? "rgba(255,255,255,0.3)"
                      : "#fff"
                  }
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Bottom Info */}
          <View style={styles.modalBottomInfo}>
            <View style={styles.modalInfoCard}>
              <Text style={styles.modalImageDate}>
                {format(new Date(currentImage.date), "EEEE, MMMM d, yyyy")}
              </Text>
              {currentImage.dayCount && (
                <Text style={styles.modalImageDayCount}>
                  Day {currentImage.dayCount} of your service year
                </Text>
              )}
              <Text style={styles.modalImageTitle}>
                {currentImage.title || "Memory from your NYSC journey"}
              </Text>
            </View>
          </View>

          {/* Pagination Dots */}
          {allImages.length > 1 && (
            <View style={styles.paginationContainer}>
              {allImages.slice(0, 5).map((_, index) => (
                <View
                  key={`dot-${index}`}
                  style={[
                    styles.paginationDot,
                    {
                      backgroundColor:
                        index === currentIndex
                          ? "#fff"
                          : "rgba(255,255,255,0.4)",
                      width: index === currentIndex ? 8 : 6,
                      height: index === currentIndex ? 8 : 6,
                    },
                  ]}
                />
              ))}
              {allImages.length > 5 && (
                <Text style={styles.paginationMore}>...</Text>
              )}
            </View>
          )}
        </BlurView>
      </Animated.View>
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

    const extractedImages = [];

    entries.forEach((entry) => {
      if (entry.images && entry.images.length > 0) {
        let dayCount = null;
        if (serviceInfo && serviceInfo.startDate) {
          const startDate = new Date(serviceInfo.startDate);
          const entryDate = new Date(entry.date);

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

          dayCount =
            Math.floor(
              (normalizedEntryDate - normalizedStartDate) /
                (1000 * 60 * 60 * 24)
            ) + 1;

          dayCount = Math.max(1, Math.min(365, dayCount));

          if (dayCount > 365 || dayCount < 0) {
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

    extractedImages.sort((a, b) => new Date(b.date) - new Date(a.date));
    setImages(extractedImages);
    setLoading(false);
  }, [entries, serviceInfo, entriesLoading]);

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

    return images[Math.floor(Math.random() * images.length)];
  };

  const highlightedMemory = images.length > 0 ? getHighlightedMemory() : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FDFB" />

      {/* Enhanced Header */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Gallery</Text>
            <Text style={styles.headerSubtitle}>
              {images.length} {images.length === 1 ? "memory" : "memories"}{" "}
              captured
            </Text>
          </View>
          {images.length > 0 && (
            <View style={styles.headerStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{availableMonths.length}</Text>
                <Text style={styles.statLabel}>Months</Text>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Enhanced Filter tabs */}
      {availableMonths.length > 1 && (
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
                All ({images.length})
              </Text>
            </TouchableOpacity>

            {availableMonths.map((month) => {
              const monthCount = images.filter(
                (img) => format(new Date(img.date), "MMM yyyy") === month
              ).length;

              return (
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
                    {month} ({monthCount})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {loading || entriesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3DB389" />
          <Text style={styles.loadingText}>Loading your memories...</Text>
        </View>
      ) : images.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <LinearGradient
              colors={["#E5F5EE", "#3DB389"]}
              style={styles.emptyIconGradient}
            >
              <Ionicons name="images-outline" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>No Memories Yet</Text>
          <Text style={styles.emptyText}>
            Start adding photos to your journal entries to see them here.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate("CreateEntry")}
          >
            <Text style={styles.emptyButtonText}>Create First Entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.ScrollView
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Featured Memory section */}
          {highlightedMemory &&
            images.length >= 5 &&
            selectedFilter === "all" && (
              <FeaturedMemory
                memory={highlightedMemory}
                onPress={handleImagePress}
              />
            )}

          {/* Masonry Gallery */}
          <MasonryList data={filteredImages} onItemPress={handleImagePress} />
        </Animated.ScrollView>
      )}

      {/* Enhanced Image Viewer Modal */}
      <ImageViewerModal
        visible={isModalVisible}
        image={selectedImage}
        onClose={closeModal}
        allImages={filteredImages}
      />
    </View>
  );
};

// Enhanced Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FDFB",
  },
  header: {
    backgroundColor: "#F8FDFB",
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 12 : 36,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E3A32",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#4F6E64",
  },
  headerStats: {
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    backgroundColor: "#E5F5EE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3DB389",
  },
  statLabel: {
    fontSize: 11,
    color: "#1A6B52",
    marginTop: 2,
  },
  filterContainer: {
    paddingVertical: 16,
    backgroundColor: "#F8FDFB",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  filterScrollContent: {
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(61, 179, 137, 0.2)",
    minWidth: 80,
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#3DB389",
    borderColor: "#3DB389",
  },
  filterText: {
    color: "#3DB389",
    fontWeight: "600",
    fontSize: 14,
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: SPACING,
    paddingBottom: 20,
  },

  // Featured Memory Styles
  featuredSection: {
    marginBottom: 24,
    paddingTop: 8,
  },
  featuredHeader: {
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E3A32",
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontSize: 14,
    color: "#4F6E64",
  },
  featuredContainer: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
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
    height: "60%",
    justifyContent: "flex-end",
  },
  featuredContent: {
    padding: 20,
  },
  featuredDate: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  featuredDayText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginBottom: 8,
  },
  featuredCaption: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 22,
  },
  playIconContainer: {
    position: "absolute",
    top: 20,
    right: 20,
  },
  playIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Masonry Styles
  masonryContainer: {
    flexDirection: "row",
    paddingTop: SPACING,
  },
  masonryColumn: {
    flex: 1,
  },
  masonryItem: {
    width: ITEM_WIDTH,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  masonryImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "40%",
    justifyContent: "flex-end",
  },
  imageMetadata: {
    padding: 12,
  },
  imageDateText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  dayBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  dayBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "500",
  },
  cornerAccent: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3DB389",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
  },
  modalCloseButton: {
    zIndex: 10,
  },
  closeButtonBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCounter: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  modalCounterText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  modalImageContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  centerImageContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 0, // Remove horizontal padding for full width
  },
  modalImage: {
    width: width,
    height: height * 0.85, // Use 85% of screen height
    maxWidth: width,
    maxHeight: height * 0.85,
  },
  imageLoadingContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -20,
  },
  navButton: {
    position: "absolute", // Make buttons absolutely positioned
    top: "50%", // Center vertically
    zIndex: 10, // Ensure they're above the image
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  leftNavButton: {
    left: 10, // Position from left edge
    marginTop: -22, // Adjust for perfect centering (half of button height)
  },
  rightNavButton: {
    right: 10, // Position from right edge
    marginTop: -22, // Adjust for perfect centering
  },
  navButtonBackground: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonDisabled: {
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  modalBottomInfo: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalInfoCard: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 16,
    padding: 16,
  },
  modalImageDate: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  modalImageDayCount: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginBottom: 8,
  },
  modalImageTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    lineHeight: 24,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 30,
  },
  paginationDot: {
    borderRadius: 4,
    marginHorizontal: 3,
  },
  paginationMore: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    marginLeft: 8,
  },

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4F6E64",
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E3A32",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#4F6E64",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#3DB389",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
    shadowColor: "#3DB389",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default GalleryScreen;
