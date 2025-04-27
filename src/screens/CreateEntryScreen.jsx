import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Feather, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import Modal from "react-native-modal";
import { format } from "date-fns";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useJournal } from "../context/JournalContext";
import storageManager from "../services/StoreManager";

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

// Mood data
const MOODS = [
  { id: "happy", emoji: "😊", label: "Happy" },
  { id: "sad", emoji: "😔", label: "Sad" },
  { id: "excited", emoji: "😃", label: "Excited" },
  { id: "thoughtful", emoji: "🤔", label: "Thoughtful" },
  { id: "anxious", emoji: "😰", label: "Anxious" },
  { id: "grateful", emoji: "🙏", label: "Grateful" },
  { id: "calm", emoji: "😌", label: "Calm" },
  { id: "tired", emoji: "😴", label: "Tired" },
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
// Add this after the useEffect that loads service info

const CreateEntryScreen = ({
  route = {},
  navigation,
  mode = "edit", // 'edit' or 'preview'
  initialEntry = null,
  serviceDayCount = null, // Current day in service (can be null if no service info)
  totalServiceDays = 365, // Total days of service
  // Add these new props
  monthEntries = [], // All entries for the current month
  onDelete = null, // Function to delete the entry
}) => {
  // Get props from route if available
  const routeMode = route.params?.mode || mode;
  const routeEntry = route.params?.entry || initialEntry;
  const routeDayCount = route.params?.dayCount || serviceDayCount;
  const routeTotalDays = route.params?.totalDays || totalServiceDays;
  const routeMonthEntries = route.params?.monthEntries || monthEntries;
  // State
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);
  const [entryMode, setEntryMode] = useState(routeMode);
  const [title, setTitle] = useState(routeEntry?.title || "");
  const [content, setContent] = useState(routeEntry?.content || "");
  const [formattedContent, setFormattedContent] = useState(
    routeEntry?.formattedContent || null
  );

  const [selectedDate, setSelectedDate] = useState(() => {
    // Ensure proper Date object initialization from entry data
    if (routeEntry?.date) {
      if (typeof routeEntry.date === "number") {
        return new Date(routeEntry.date);
      } else if (typeof routeEntry.date === "string") {
        return new Date(routeEntry.date);
      } else if (routeEntry.date instanceof Date) {
        return routeEntry.date;
      }
    }
    return new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMood, setSelectedMood] = useState(routeEntry?.mood || null);
  const [tags, setTags] = useState(routeEntry?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [images, setImages] = useState(routeEntry?.images || []);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioNotes, setAudioNotes] = useState(routeEntry?.audioNotes || []);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [serviceInfo, setServiceInfo] = useState(null);

  // Text selection state
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  // Get journal context
  const {
    addEntry,
    updateEntry,
    deleteEntry,
    entries,
    getServiceInfo,
    saveServiceInfo,
  } = useJournal();

  // Refs
  const contentRef = useRef(null);
  const soundObject = useRef(new Audio.Sound());

  // Calculate day of service
  const formattedDate = format(selectedDate, "MMMM dd, yyyy");
  const dayText = `Day ${routeDayCount} of ${routeTotalDays}`;

  useEffect(() => {
    // Ensure selectedDate is always a valid Date object
    if (routeEntry?.date) {
      // Check if date is already a Date object or needs conversion
      if (typeof routeEntry.date === "number") {
        setSelectedDate(new Date(routeEntry.date));
      } else if (typeof routeEntry.date === "string") {
        setSelectedDate(new Date(routeEntry.date));
      } else if (routeEntry.date instanceof Date) {
        setSelectedDate(routeEntry.date);
      } else {
        // Fallback to current date
        setSelectedDate(new Date());
      }
    }
  }, [routeEntry]);

  useEffect(() => {
    const loadServiceInfo = async () => {
      try {
        console.log("Attempting to load service info from settings...");

        // Get the settings object like HomeScreen does
        const settings = await storageManager.getSettings();

        if (settings && settings.serviceInfo) {
          // Convert date strings to Date objects
          const info = settings.serviceInfo;

          if (info.startDate) {
            info.startDate = new Date(info.startDate);
          }

          if (info.endDate) {
            info.endDate = new Date(info.endDate);
          }

          console.log("Service info loaded from settings:", info);
          console.log("Start date:", info.startDate);

          // Set the service info state
          setServiceInfo(info);
        } else {
          console.log("No service info found in settings");
        }
      } catch (error) {
        console.error("Error loading service info:", error);
      }
    };

    loadServiceInfo();
  }, []);

  // 3. Replace your getMinimumDate and getMaximumDate functions with these:
  const getMinimumDate = () => {
    if (serviceInfo && serviceInfo.startDate) {
      console.log(
        "Using settings start date as minimum:",
        serviceInfo.startDate
      );
      return new Date(serviceInfo.startDate);
    }

    // Fallback
    console.log("Using fallback minimum date");
    const fallbackDate = new Date();
    fallbackDate.setFullYear(fallbackDate.getFullYear() - 1);
    return fallbackDate;
  };

  const getMaximumDate = () => {
    const today = new Date();

    if (serviceInfo && serviceInfo.endDate) {
      const endDate = new Date(serviceInfo.endDate);
      console.log("Using settings end date:", endDate);

      // Return the earlier of today or end date
      return endDate < today ? endDate : today;
    }

    return today;
  };
  const minValidDate = getMinimumDate();
  const maxValidDate = getMaximumDate();
  console.log("Date picker valid range:", {
    min: minValidDate,
    max: maxValidDate,
  });
  const serializeEntryForNavigation = (entry) => {
    if (!entry) return null;

    // Create a copy of the entry with dates converted to timestamps
    return {
      ...entry,
      date: entry.date ? entry.date.getTime() : null,
      createdAt: entry.createdAt ? entry.createdAt.getTime() : null,
      updatedAt: entry.updatedAt ? entry.updatedAt.getTime() : null,
      // Convert dates in audio notes if they exist
      audioNotes: entry.audioNotes
        ? entry.audioNotes.map((note) => ({
            ...note,
            date:
              typeof note.date === "string"
                ? note.date
                : new Date(note.date).toISOString(),
          }))
        : [],
    };
  };

  // Reset audio on unmount
  useEffect(() => {
    return () => {
      if (recording) {
        stopRecording();
      }
      if (playingAudio) {
        stopAudio();
      }
      soundObject.current = null;
    };
  }, []);

  // Request permissions for media
  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status: imageStatus } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        const { status: cameraStatus } =
          await ImagePicker.requestCameraPermissionsAsync();
        const { status: audioStatus } = await Audio.requestPermissionsAsync();

        if (
          imageStatus !== "granted" ||
          cameraStatus !== "granted" ||
          audioStatus !== "granted"
        ) {
          alert(
            "Sorry, we need camera, gallery, and microphone permissions to make this work!"
          );
        }
      }
    })();
  }, []);
  useEffect(() => {
    if (routeEntry && routeMonthEntries.length > 0) {
      const index = routeMonthEntries.findIndex(
        (entry) => entry.id === routeEntry.id
      );
      if (index !== -1) {
        setCurrentEntryIndex(index);
      }
    }
  }, [routeEntry, routeMonthEntries]);
  const loadEntry = (entry) => {
    setTitle(entry.title || "");
    setContent(entry.content || "");
    setFormattedContent(entry.formattedContent || null);
    setSelectedDate(new Date(entry.date));
    setSelectedMood(entry.mood || null);
    setTags(entry.tags || []);
    setImages(entry.images || []);
    setAudioNotes(entry.audioNotes || []);

    // Update the entry being edited
    if (navigation) {
      // Update route params without re-rendering the screen
      navigation.setParams({
        entry: entry,
        mode: "edit", // Switch to edit mode for the loaded entry
      });
    }
  };

  const clearFields = (newDate) => {
    setTitle("");
    setContent("");
    setFormattedContent(null);
    setSelectedDate(newDate);
    setSelectedMood(null);
    setTags([]);
    setImages([]);
    setAudioNotes([]);

    // Update route params for a new entry
    if (navigation) {
      navigation.setParams({
        entry: null,
        mode: "edit",
      });
    }
  };
  const isDateValid = (date) => {
    if (!serviceInfo || !serviceInfo.startDate) {
      console.log("No service info available, can't validate date");
      return false; // Require service info for validation
    }

    // Create clean Date objects for comparison
    const dateToCheck = new Date(date);
    const minDate = getMinimumDate();
    const maxDate = getMaximumDate();

    // Reset time for proper comparison
    dateToCheck.setHours(0, 0, 0, 0);
    minDate.setHours(0, 0, 0, 0);
    maxDate.setHours(0, 0, 0, 0);

    // Log all dates for debugging
    console.log("Date validation comparison:", {
      dateToCheck: dateToCheck.toISOString(),
      userMinDate: minDate.toISOString(),
      userMaxDate: maxDate.toISOString(),
    });

    // Check if date is within the user's valid service date range
    const isAfterMin = dateToCheck >= minDate;
    const isBeforeMax = dateToCheck <= maxDate;
    console.log("Date validation results:", { isAfterMin, isBeforeMax });

    return isAfterMin && isBeforeMax;
  };

  const handleDateChange = (event, selectedDate) => {
    // Close picker for Android
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (!selectedDate) {
      setShowDatePicker(false);
      return;
    }

    console.log("User selected date:", selectedDate);

    // Make sure we have service info
    if (!serviceInfo || !serviceInfo.startDate) {
      Alert.alert(
        "Service Info Missing",
        "Your service dates haven't been set up. Please set your service information first.",
        [{ text: "OK", onPress: () => setShowDatePicker(false) }]
      );
      return;
    }

    // Validate with the user's actual service dates
    const isValid = isDateValid(selectedDate);

    if (!isValid) {
      // Format dates for user-friendly error message with actual service dates
      const minDate = getMinimumDate();
      const maxDate = getMaximumDate();
      const minDateStr = format(minDate, "MMMM d, yyyy");
      const maxDateStr = format(maxDate, "MMMM d, yyyy");

      Alert.alert(
        "Invalid Date",
        `Please select a date within your service period (${minDateStr} to ${maxDateStr}).`,
        [{ text: "OK", onPress: () => setShowDatePicker(false) }]
      );
      return;
    }

    // Close date picker for iOS
    setShowDatePicker(false);

    // Continue with your existing logic for loading/clearing entry
    const existingEntry = findEntryForDate(selectedDate);

    if (existingEntry) {
      loadEntry(existingEntry);
    } else {
      clearFields(selectedDate);
    }
  };

  // Find an entry for a specific date
  const findEntryForDate = (date) => {
    if (!entries || entries.length === 0) return null;

    const targetDate = new Date(date);
    // Reset time to compare only the date part
    targetDate.setHours(0, 0, 0, 0);

    // Find entry with matching date
    return entries.find((entry) => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === targetDate.getTime();
    });
  };

  // Handle text formatting
  const applyFormat = (format) => {
    if (entryMode === "preview") return;

    setSelectedFormat(format);

    // Apply formatting to the selected text
    if (selectionStart !== selectionEnd) {
      const selectedText = content.substring(selectionStart, selectionEnd);
      let formattedText;
      let newCursorPosition;

      switch (format) {
        case "bold":
          formattedText = `**${selectedText}**`;
          newCursorPosition = selectionEnd + 4; // Add 4 for the ** markers
          break;
        case "italic":
          formattedText = `_${selectedText}_`;
          newCursorPosition = selectionEnd + 2; // Add 2 for the _ markers
          break;
        case "underline":
          formattedText = `__${selectedText}__`;
          newCursorPosition = selectionEnd + 4; // Add 4 for the __ markers
          break;
        case "bullet":
          // Split by new lines and add bullets
          formattedText = selectedText
            .split("\n")
            .map((line) => (line.trim() ? `• ${line}` : line))
            .join("\n");
          newCursorPosition = selectionStart + formattedText.length;
          break;
        default:
          return;
      }

      // Replace the selected text with the formatted text
      const newContent =
        content.substring(0, selectionStart) +
        formattedText +
        content.substring(selectionEnd);

      setContent(newContent);

      // Store formatting information for rendering
      const formattingInfo = formattedContent || [];
      formattingInfo.push({
        type: format,
        start: selectionStart,
        end: selectionStart + formattedText.length,
        text: formattedText,
      });

      setFormattedContent(formattingInfo);
    } else {
      // If no text is selected, prepare to format the next typed text
      switch (format) {
        case "bullet":
          // Add a bullet at the cursor position
          const newContent =
            content.substring(0, selectionStart) +
            "• " +
            content.substring(selectionEnd);

          setContent(newContent);
          break;
        default:
          // Other formats will be applied when text is typed
          break;
      }
    }
  };

  // Handle image picking
  const pickImage = async (useCamera = false) => {
    if (entryMode === "preview") return;

    try {
      let result;

      if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 1,
        });
      }

      if (!result.canceled) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      console.log("Error picking image:", error);
    }
  };

  // Handle audio recording
  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.log("Error starting recording:", error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      // Add the recorded audio to the list of audio notes
      if (uri) {
        const newAudioNote = {
          id: Date.now().toString(),
          uri: uri,
          name: `Voice Note ${audioNotes.length + 1}`,
          date: new Date().toISOString(),
          duration: 0, // We would calculate this in a real app
        };

        setAudioNotes([...audioNotes, newAudioNote]);
      }

      setRecording(null);
    } catch (error) {
      console.log("Error stopping recording:", error);
    }
  };

  // Audio playback
  const playAudio = async (audioNote) => {
    // Stop current audio if playing
    if (playingAudio) {
      await stopAudio();
    }

    try {
      await soundObject.current.loadAsync({ uri: audioNote.uri });
      await soundObject.current.playAsync();
      setPlayingAudio(audioNote.id);

      // Update state when playback finishes
      soundObject.current.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingAudio(null);
        }
      });
    } catch (error) {
      console.log("Error playing audio:", error);
      setPlayingAudio(null);
    }
  };

  const stopAudio = async () => {
    if (!playingAudio) return;

    try {
      await soundObject.current.stopAsync();
      await soundObject.current.unloadAsync();
      setPlayingAudio(null);
    } catch (error) {
      console.log("Error stopping audio:", error);
    }
  };
  const navigateToPreviousEntry = () => {
    if (currentEntryIndex > 0) {
      const prevEntry = routeMonthEntries[currentEntryIndex - 1];
      navigation.replace("CreateEntry", {
        mode: "preview",
        entry: serializeEntryForNavigation(prevEntry),
        dayCount: routeDayCount,
        totalDays: routeTotalDays,
        monthEntries: routeMonthEntries.map(serializeEntryForNavigation),
      });
    }
  };

  const navigateToNextEntry = () => {
    if (currentEntryIndex < routeMonthEntries.length - 1) {
      const nextEntry = routeMonthEntries[currentEntryIndex + 1];
      navigation.replace("CreateEntry", {
        mode: "preview",
        entry: serializeEntryForNavigation(nextEntry),
        dayCount: routeDayCount,
        totalDays: routeTotalDays,
        monthEntries: routeMonthEntries.map(serializeEntryForNavigation),
      });
    }
  };

  // Add delete confirmation dialog
  const confirmDeleteEntry = () => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this entry? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: handleDeleteEntry,
        },
      ]
    );
  };

  // Add delete entry function
  const handleDeleteEntry = async () => {
    try {
      if (routeEntry?.id) {
        await deleteEntry(routeEntry.id);

        // Navigate back after deletion
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      Alert.alert("Error", "Could not delete entry. Please try again.");
    }
  };
  // Tag management
  const addTag = () => {
    if (newTag.trim() === "") return;

    if (!tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
    }

    setNewTag("");
    setShowTagInput(false);
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Handle media removal
  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const removeAudioNote = (id) => {
    setAudioNotes(audioNotes.filter((note) => note.id !== id));
    if (playingAudio === id) {
      stopAudio();
    }
  };

  // Save entry
  const saveEntry = async () => {
    if (title.trim() === "") {
      alert("Please enter a title for your journal entry");
      return;
    }

    setIsSaving(true);

    try {
      // Structure the entry data
      const entryData = {
        id: routeEntry?.id || undefined, // Let storage manager assign ID if new
        title,
        content,
        formattedContent,
        date: selectedDate,
        mood: selectedMood,
        tags,
        images,
        audioNotes,
      };

      // Save to storage
      if (routeEntry?.id) {
        // Update existing entry
        await updateEntry(routeEntry.id, entryData);
      } else {
        // Add new entry
        await addEntry(entryData);
      }

      // Navigate back
      if (navigation) {
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error saving entry:", error);
      alert("Failed to save entry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle between edit and preview modes
  const toggleMode = () => {
    setEntryMode(entryMode === "edit" ? "preview" : "edit");
  };

  // Handle selection change in the text input
  const handleSelectionChange = (event) => {
    if (entryMode === "edit") {
      setSelectionStart(event.nativeEvent.selection.start);
      setSelectionEnd(event.nativeEvent.selection.end);
    }
  };

  // Get formatted date with appropriate styling based on available data
  const getFormattedDate = () => {
    if (!selectedDate) return "";
    return format(selectedDate, "MMMM dd, yyyy");
  };
  // Add this function to calculate the day count for the selected date
  const calculateDayCount = (date) => {
    if (!serviceInfo?.startDate) {
      return null; // No service info, return null
    }

    const startDate = new Date(serviceInfo.startDate);
    const currentDate = new Date(date);

    // Reset time components for proper comparison
    startDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    // Calculate the difference in days
    const diffTime = Math.abs(currentDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Add 1 because the start day is day 1
    return diffDays + 1;
  };

  // Get service day text or empty if no service info
  const getDayText = () => {
    if (!serviceInfo?.startDate) {
      return "";
    }

    const startDate = new Date(serviceInfo.startDate);
    const selectedDateObj = new Date(selectedDate);

    // Reset time components for proper comparison
    startDate.setHours(0, 0, 0, 0);
    selectedDateObj.setHours(0, 0, 0, 0);

    // Calculate the difference in days
    const diffTime = Math.abs(selectedDateObj - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Add 1 because the start day is day 1
    const dayCount = diffDays + 1;
    const totalDays = serviceInfo.totalDays || 365;

    return `Day ${dayCount} of ${totalDays}`;
  };

  // Render formatted content for preview mode - enhanced version
  const renderFormattedContent = () => {
    if (!content) {
      return (
        <View style={styles.emptyContentContainer}>
          <Feather name="file-text" size={40} color={COLORS.primaryLight} />
          <Text style={styles.emptyContentText}>No content in this entry</Text>
        </View>
      );
    }

    // For a real implementation, use a proper markdown or rich text renderer
    // This is a simplified approach
    let displayText = content;

    // Apply bold, italic, etc. based on the markers in the text
    displayText = displayText
      .replace(/\*\*(.*?)\*\*/g, "**$1**") // Bold
      .replace(/_(.*?)_/g, "_$1_") // Italic
      .replace(/__(.*?)__/g, "__$1__") // Underline
      .replace(/• (.*?)(?:\n|$)/g, "• $1\n"); // Bullets

    return <Text style={styles.previewContent}>{displayText}</Text>;
  };

  // Platform-specific date picker implementation
  const showDatePickerModal = () => {
    // First check if we have service info
    if (!serviceInfo?.startDate) {
      Alert.alert(
        "Service Info Missing",
        "Please set your service start date in settings first.",
        [{ text: "OK" }]
      );
      return;
    }

    // Now check for unsaved changes
    if (title || content || images.length > 0 || audioNotes.length > 0) {
      Alert.alert(
        "Change Date",
        "Changing the date will either load an existing entry or create a new one. Any unsaved changes will be lost.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            onPress: () => {
              setShowDatePicker(true);
            },
          },
        ]
      );
    } else {
      setShowDatePicker(true);
    }
  };

  return (
    <SafeAreaView style={styles.container} className="pt-6">
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          {getDayText() ? (
            <Text style={styles.dayCounter}>{getDayText()}</Text>
          ) : (
            <Text style={styles.dayCounterDisabled}>Service info not set</Text>
          )}

          <TouchableOpacity
            onPress={() => entryMode === "edit" && showDatePickerModal()}
            style={styles.dateSelector}
            disabled={entryMode !== "edit"}
          >
            <Text style={styles.dateText}>{getFormattedDate()}</Text>
            {/* {entryMode === "edit" && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Feather name="calendar" size={16} color={COLORS.primary} />
                <Text
                  style={{
                    fontSize: 10,
                    color: COLORS.textMuted,
                    marginLeft: 4,
                  }}
                >
                  {serviceInfo?.startDate
                    ? `(${format(
                        new Date(serviceInfo.startDate),
                        "MMM d, yyyy"
                      )} - Today)`
                    : "(Select a date)"}
                </Text>
              </View>
            )} */}
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          {entryMode === "edit" ? (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={toggleMode}
                accessibilityLabel="Preview entry"
              >
                <Feather name="eye" size={20} color={COLORS.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={saveEntry}
                accessibilityLabel="Save entry"
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={toggleMode}
                accessibilityLabel="Edit entry"
              >
                <Feather name="edit-2" size={20} color={COLORS.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={confirmDeleteEntry}
                accessibilityLabel="Delete entry"
              >
                <Feather name="trash-2" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Entry navigation controls - only in preview mode */}
      {entryMode === "preview" && routeMonthEntries.length > 1 && (
        <View style={styles.entryNavigation}>
          <TouchableOpacity
            style={[
              styles.navButton,
              currentEntryIndex === 0 && styles.navButtonDisabled,
            ]}
            onPress={navigateToPreviousEntry}
            disabled={currentEntryIndex === 0}
          >
            <Feather
              name="chevron-left"
              size={20}
              color={
                currentEntryIndex === 0 ? COLORS.textMuted : COLORS.primary
              }
            />
          </TouchableOpacity>

          <Text style={styles.entryCountText}>
            {currentEntryIndex + 1} of {routeMonthEntries.length}
          </Text>

          <TouchableOpacity
            style={[
              styles.navButton,
              currentEntryIndex === routeMonthEntries.length - 1 &&
                styles.navButtonDisabled,
            ]}
            onPress={navigateToNextEntry}
            disabled={currentEntryIndex === routeMonthEntries.length - 1}
          >
            <Feather
              name="chevron-right"
              size={20}
              color={
                currentEntryIndex === routeMonthEntries.length - 1
                  ? COLORS.textMuted
                  : COLORS.primary
              }
            />
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          entryMode === "preview" && styles.previewContainer,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title Input/Display */}
        {entryMode === "edit" ? (
          <TextInput
            style={styles.titleInput}
            placeholder="Entry Title"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={COLORS.textMuted}
            maxLength={100}
            autoCapitalize="sentences"
          />
        ) : (
          <Text style={styles.previewTitle}>{title || "Untitled Entry"}</Text>
        )}

        {/* Formatting Toolbar - only in edit mode */}
        {entryMode === "edit" && (
          <View style={styles.toolbar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {/* <TouchableOpacity
                style={[
                  styles.toolbarButton,
                  selectedFormat === "bold" && styles.toolbarButtonActive,
                ]}
                onPress={() => applyFormat("bold")}
              >
                <Text
                  style={[styles.toolbarButtonText, { fontWeight: "bold" }]}
                >
                  B
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toolbarButton,
                  selectedFormat === "italic" && styles.toolbarButtonActive,
                ]}
                onPress={() => applyFormat("italic")}
              >
                <Text
                  style={[styles.toolbarButtonText, { fontStyle: "italic" }]}
                >
                  I
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toolbarButton,
                  selectedFormat === "underline" && styles.toolbarButtonActive,
                ]}
                onPress={() => applyFormat("underline")}
              >
                <Text
                  style={[
                    styles.toolbarButtonText,
                    { textDecorationLine: "underline" },
                  ]}
                >
                  U
                </Text>
              </TouchableOpacity>

              <View style={styles.toolbarDivider} />

              <TouchableOpacity
                style={[
                  styles.toolbarButton,
                  selectedFormat === "bullet" && styles.toolbarButtonActive,
                ]}
                onPress={() => applyFormat("bullet")}
              >
                <MaterialIcons
                  name="format-list-bulleted"
                  size={18}
                  color={COLORS.text}
                />
              </TouchableOpacity>

              <View style={styles.toolbarDivider} /> */}

              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={() => setShowMoodSelector(true)}
              >
                <Ionicons name="happy-outline" size={18} color={COLORS.text} />
                <Text style={styles.toolbarButtonLabel}>Mood</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={() => setShowTagInput(true)}
              >
                <Feather name="tag" size={16} color={COLORS.text} />
                <Text style={styles.toolbarButtonLabel}>Tags</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={() => pickImage(false)}
              >
                <Feather name="image" size={16} color={COLORS.text} />
                <Text style={styles.toolbarButtonLabel}>Image</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolbarButton}
                onPress={() => pickImage(true)}
              >
                <Feather name="camera" size={16} color={COLORS.text} />
                <Text style={styles.toolbarButtonLabel}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toolbarButton,
                  isRecording && styles.toolbarButtonRecording,
                ]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <Feather
                  name={isRecording ? "square" : "mic"}
                  size={16}
                  color={isRecording ? COLORS.error : COLORS.text}
                />
                <Text
                  style={[
                    styles.toolbarButtonLabel,
                    isRecording && { color: COLORS.error },
                  ]}
                >
                  {isRecording ? "Stop" : "Voice"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Preview mode date displayed prominently */}
        {entryMode === "preview" && (
          <View style={styles.previewDateContainer}>
            <Feather name="calendar" size={16} color={COLORS.textLight} />
            <Text style={styles.previewDateText}>{getFormattedDate()}</Text>
          </View>
        )}

        {/* Mood display if selected */}
        {selectedMood && (
          <View
            style={[
              styles.selectedMoodContainer,
              entryMode === "preview" && styles.previewMoodContainer,
            ]}
          >
            <Text style={styles.moodLabel}>
              Feeling: {MOODS.find((m) => m.id === selectedMood)?.label || ""}
            </Text>
            <Text style={styles.moodEmoji}>
              {MOODS.find((m) => m.id === selectedMood)?.emoji || ""}
            </Text>

            {entryMode === "edit" && (
              <TouchableOpacity
                style={styles.removeMoodButton}
                onPress={() => setSelectedMood(null)}
              >
                <Feather name="x" size={16} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tags display if any */}
        {tags.length > 0 && (
          <View
            style={[
              styles.tagsContainer,
              entryMode === "preview" && styles.previewTagsContainer,
            ]}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>

                  {entryMode === "edit" && (
                    <TouchableOpacity
                      style={styles.removeTagButton}
                      onPress={() => removeTag(tag)}
                    >
                      <Feather name="x" size={14} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Content Input/Display */}
        {entryMode === "edit" ? (
          <TextInput
            ref={contentRef}
            style={styles.contentInput}
            placeholder="What's on your mind today?"
            value={content}
            onChangeText={setContent}
            onSelectionChange={handleSelectionChange}
            placeholderTextColor={COLORS.textMuted}
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
          />
        ) : (
          <View style={styles.previewContentContainer}>
            {renderFormattedContent()}
          </View>
        )}

        {/* Images Display - enhanced for preview mode */}
        {images.length > 0 && (
          <View
            style={[
              styles.imagesContainer,
              entryMode === "preview" && styles.previewImagesContainer,
            ]}
          >
            {entryMode === "preview" && (
              <Text style={styles.previewSectionTitle}>Photos</Text>
            )}

            <FlatList
              data={images}
              keyExtractor={(item, index) => `image-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <View
                  style={[
                    styles.imageWrapper,
                    entryMode === "preview" && styles.previewImageWrapper,
                  ]}
                >
                  <Image
                    source={{ uri: item }}
                    style={[
                      styles.image,
                      entryMode === "preview" && styles.previewImage,
                    ]}
                  />

                  {entryMode === "edit" && (
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Feather name="trash-2" size={16} color={COLORS.white} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          </View>
        )}

        {/* Audio Notes Display - enhanced for preview mode */}
        {audioNotes.length > 0 && (
          <View
            style={[
              styles.audioNotesContainer,
              entryMode === "preview" && styles.previewAudioNotesContainer,
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                entryMode === "preview" && styles.previewSectionTitle,
              ]}
            >
              Voice Notes
            </Text>

            {audioNotes.map((note) => (
              <View
                key={note.id}
                style={[
                  styles.audioNoteCard,
                  entryMode === "preview" && styles.previewAudioNoteCard,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.playButton,
                    playingAudio === note.id && styles.playingButton,
                  ]}
                  onPress={() =>
                    playingAudio === note.id ? stopAudio() : playAudio(note)
                  }
                >
                  <Feather
                    name={playingAudio === note.id ? "pause" : "play"}
                    size={18}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>

                <View style={styles.audioNoteInfo}>
                  <Text style={styles.audioNoteName}>{note.name}</Text>
                  <Text style={styles.audioNoteDate}>
                    {format(new Date(note.date), "MMM d, h:mm a")}
                  </Text>
                </View>

                {entryMode === "edit" && (
                  <TouchableOpacity
                    style={styles.removeAudioButton}
                    onPress={() => removeAudioNote(note.id)}
                  >
                    <Feather
                      name="trash-2"
                      size={16}
                      color={COLORS.textLight}
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Bottom padding for scrolling */}
        <View style={{ height: 80 }} />
      </KeyboardAwareScrollView>

      {/* Date Picker Modal - Platform specific implementations */}
      {showDatePicker &&
        (Platform.OS === "ios" ? (
          <Modal
            isVisible={showDatePicker}
            onBackdropPress={() => setShowDatePicker(false)}
            backdropOpacity={0.5}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            style={styles.modal}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={maxValidDate}
                minimumDate={minValidDate}
                textColor={COLORS.text}
                style={{ width: "100%" }}
              />
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalAddButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.modalAddText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : (
          // Android date picker
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={maxValidDate}
            minimumDate={minValidDate}
          />
        ))}

      {/* Mood Selector Modal */}
      <Modal
        isVisible={showMoodSelector}
        onBackdropPress={() => setShowMoodSelector(false)}
        backdropOpacity={0.5}
        animationIn="fadeIn"
        animationOut="fadeOut"
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>How are you feeling?</Text>

          <View style={styles.moodGrid}>
            {MOODS.map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.moodOption,
                  selectedMood === mood.id && styles.selectedMoodOption,
                ]}
                onPress={() => {
                  setSelectedMood(mood.id);
                  setShowMoodSelector(false);
                }}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={styles.moodText}>{mood.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowMoodSelector(false)}
          >
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Tag Input Modal */}
      <Modal
        isVisible={showTagInput}
        onBackdropPress={() => setShowTagInput(false)}
        backdropOpacity={0.5}
        animationIn="fadeIn"
        animationOut="fadeOut"
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Tag</Text>

          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              placeholder="Enter tag (no # needed)"
              value={newTag}
              onChangeText={setNewTag}
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={addTag}
              maxLength={20}
            />
          </View>

          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowTagInput(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalAddButton}
              onPress={addTag}
              disabled={!newTag.trim()}
            >
              <Text style={styles.modalAddText}>Add Tag</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...shadowStyles.small,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  dayCounter: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 2,
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  dateText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "500",
    marginRight: 5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginLeft: 8,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.text,
    padding: 0,
    marginBottom: 15,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 15,
  },
  toolbar: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 4,
    marginBottom: 15,
    ...shadowStyles.small,
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 2,
  },
  toolbarButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },
  toolbarButtonRecording: {
    backgroundColor: "rgba(224, 125, 107, 0.1)",
  },
  toolbarButtonText: {
    fontWeight: "700",
    fontSize: 15,
    color: COLORS.text,
  },
  toolbarButtonLabel: {
    fontSize: 12,
    color: COLORS.text,
    marginLeft: 4,
  },
  toolbarDivider: {
    width: 1,
    height: "80%",
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
    alignSelf: "center",
  },
  contentInput: {
    minHeight: 150,
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text,
    padding: 0,
    textAlignVertical: "top",
  },
  previewContent: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text,
    minHeight: 100,
  },
  selectedMoodContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    padding: 8,
    borderRadius: 8,
    marginBottom: 15,
    alignSelf: "flex-start",
  },
  moodLabel: {
    fontSize: 14,
    color: COLORS.primaryDark,
    fontWeight: "500",
  },
  moodEmoji: {
    fontSize: 18,
    marginLeft: 5,
  },
  removeMoodButton: {
    padding: 3,
    marginLeft: 5,
  },
  tagsContainer: {
    flexDirection: "row",
    marginBottom: 15,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(61, 179, 137, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 5,
  },
  tagText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "500",
  },
  removeTagButton: {
    padding: 3,
    marginLeft: 3,
  },
  imagesContainer: {
    marginVertical: 10,
  },
  imageWrapper: {
    position: "relative",
    marginRight: 10,
    borderRadius: 8,
    overflow: "hidden",
    ...shadowStyles.small,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 15,
    padding: 6,
  },
  audioNotesContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 10,
  },
  audioNoteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    ...shadowStyles.small,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  audioNoteInfo: {
    flex: 1,
  },
  audioNoteName: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  audioNoteDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  removeAudioButton: {
    padding: 6,
  },
  modal: {
    margin: 0,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...shadowStyles.medium,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 20,
    textAlign: "center",
  },
  modalCloseButton: {
    backgroundColor: COLORS.primaryLight,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCloseText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 16,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  moodOption: {
    width: "23%",
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  selectedMoodOption: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  moodText: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 5,
    textAlign: "center",
  },
  tagInputContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  tagInput: {
    height: 45,
    fontSize: 16,
    color: COLORS.text,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "#f1f1f1",
  },
  modalCancelText: {
    color: COLORS.textLight,
    fontWeight: "600",
    fontSize: 16,
  },
  modalAddButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalAddText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 16,
  },

  dayCounterDisabled: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 2,
    fontStyle: "italic",
  },
  entryNavigation: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
  },
  navButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  entryCountText: {
    marginHorizontal: 15,
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  deleteButton: {
    padding: 8,
    marginLeft: 5,
  },
  previewContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    marginHorizontal: 0,
    paddingHorizontal: 20,
    paddingVertical: 25,
    ...shadowStyles.small,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 15,
  },
  previewDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  previewDateText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 6,
  },
  previewContentContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
  },
  previewContent: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text,
  },
  previewMoodContainer: {
    marginBottom: 20,
    padding: 10,
  },
  previewTagsContainer: {
    marginBottom: 20,
  },
  previewImagesContainer: {
    marginTop: 25,
    marginBottom: 15,
  },
  previewImageWrapper: {
    marginRight: 15,
    borderRadius: 12,
  },
  previewImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
  },
  previewSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 15,
  },
  previewAudioNotesContainer: {
    marginTop: 25,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 15,
  },
  previewAudioNoteCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  playingButton: {
    backgroundColor: COLORS.primary,
  },
  emptyContentContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContentText: {
    marginTop: 10,
    color: COLORS.textLight,
    fontSize: 16,
  },
});

export default CreateEntryScreen;
