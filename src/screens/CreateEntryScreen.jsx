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
import userTierManager from "../services/UserTierManager";
import mediaManager from "../services/MediaManager";
import serviceLockManager from "../services/ServiceLockManager";

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

const CreateEntryScreen = ({ route = {}, navigation }) => {
  // Get props from route with better validation
  const routeMode = route.params?.mode || "edit"; // Always default to edit
  const routeEntry = route.params?.entry || null;
  const checkTodayEntry = route.params?.checkTodayEntry || false;
  const [isServiceLocked, setIsServiceLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState(null);

  const routeDayCount = route.params?.dayCount || null;
  const routeTotalDays = route.params?.totalDays || 365;
  const routeMonthEntries = route.params?.monthEntries || [];
  const [userTier, setUserTier] = useState(userTierManager.getCurrentTier());
  const [tierLimits, setTierLimits] = useState(userTierManager.getLimits());

  // State
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);
  const [entryMode, setEntryMode] = useState(routeMode);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [formattedContent, setFormattedContent] = useState(null);

  const [selectedDate, setSelectedDate] = useState(() => {
    // If we have a specific entry from navigation, use its date
    if (routeEntry?.date && routeMode === "preview") {
      try {
        let dateObj;

        if (typeof routeEntry.date === "number") {
          dateObj = new Date(routeEntry.date);
        } else if (typeof routeEntry.date === "string") {
          dateObj = new Date(routeEntry.date);
        } else if (routeEntry.date instanceof Date) {
          dateObj = routeEntry.date;
        }

        if (dateObj && !isNaN(dateObj.getTime())) {
          return dateObj;
        }
      } catch (error) {
        console.error("CreateEntry: Error parsing route date:", error);
      }
    }

    // Default to today for new entries or if no valid date
    return new Date();
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [tags, setTags] = useState([]);
  const [images, setImages] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioNotes, setAudioNotes] = useState([]);
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
  const soundObject = useRef(null);

  useEffect(() => {
    const checkLockStatus = async () => {
      const canEdit = await serviceLockManager.canEdit();
      const message = await serviceLockManager.getLockMessage();

      setIsServiceLocked(!canEdit);
      setLockMessage(message);

      if (!canEdit) {
        // Force into preview mode if locked
        setEntryMode("preview");
      }
    };

    checkLockStatus();
  }, []);

  useEffect(() => {
    if (checkTodayEntry && !routeEntry) {
      // Check if there's already an entry for today
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
        // Load the existing entry for today
        console.log("Found existing entry for today, loading it");
        setTitle(todayEntry.title || "");
        setContent(todayEntry.content || "");
        setFormattedContent(todayEntry.formattedContent || null);
        setSelectedMood(todayEntry.mood || null);
        setTags(Array.isArray(todayEntry.tags) ? todayEntry.tags : []);
        setImages(Array.isArray(todayEntry.images) ? todayEntry.images : []);
        setAudioNotes(
          Array.isArray(todayEntry.audioNotes) ? todayEntry.audioNotes : []
        );
        setSelectedDate(new Date(todayEntry.date));

        // Update navigation params to reflect we're editing an existing entry
        navigation.setParams({
          entry: todayEntry,
          checkTodayEntry: false,
        });
      } else {
        // No entry for today, start fresh with today's date
        console.log("No entry for today, starting fresh");
        setSelectedDate(today);
      }
    }
  }, [checkTodayEntry, routeEntry, entries, navigation]);

  useEffect(() => {
    const loadTierInfo = async () => {
      await userTierManager.loadUserTier();
      setUserTier(userTierManager.getCurrentTier());
      setTierLimits(userTierManager.getLimits());
    };
    loadTierInfo();
  }, []);

  useEffect(() => {
    if (routeEntry) {
      console.log("CreateEntry: Received entry data:", {
        id: routeEntry.id,
        title: routeEntry.title,
        dateType: typeof routeEntry.date,
        date: routeEntry.date,
        mode: routeMode,
      });
    }
  }, [routeEntry, routeMode]);

  useEffect(() => {
    if (routeEntry) {
      console.log("CreateEntry: Loading entry data for:", routeEntry.id);

      try {
        // Load entry data with validation
        setTitle(routeEntry.title || "");
        setContent(routeEntry.content || "");
        setFormattedContent(routeEntry.formattedContent || null);
        setSelectedMood(routeEntry.mood || null);
        setTags(Array.isArray(routeEntry.tags) ? routeEntry.tags : []);
        setImages(Array.isArray(routeEntry.images) ? routeEntry.images : []);
        setAudioNotes(
          Array.isArray(routeEntry.audioNotes) ? routeEntry.audioNotes : []
        );

        // Handle date separately with validation
        if (routeEntry.date) {
          try {
            let dateObj;

            if (typeof routeEntry.date === "number") {
              dateObj = new Date(routeEntry.date);
            } else if (typeof routeEntry.date === "string") {
              dateObj = new Date(routeEntry.date);
            } else if (routeEntry.date instanceof Date) {
              dateObj = routeEntry.date;
            }

            if (dateObj && !isNaN(dateObj.getTime())) {
              setSelectedDate(dateObj);
            }
          } catch (error) {
            console.error("CreateEntry: Error setting date:", error);
          }
        }

        console.log("CreateEntry: Entry data loaded successfully");
      } catch (error) {
        console.error("CreateEntry: Error loading entry data:", error);
      }
    }
  }, [routeEntry]);

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

  const getMinimumDate = () => {
    if (serviceInfo && serviceInfo.startDate) {
      // console.log(
      //   "Using settings start date as minimum:",
      //   serviceInfo.startDate
      // );
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
      // console.log("Using settings end date:", endDate);

      // Return the earlier of today or end date
      return endDate < today ? endDate : today;
    }

    return today;
  };
  const minValidDate = getMinimumDate();
  const maxValidDate = getMaximumDate();
  // console.log("Date picker valid range:", {
  //   min: minValidDate,
  //   max: maxValidDate,
  // });

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

  // Reset audio on unmount
  // Initialize sound object properly
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // Set audio mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        // Create sound object
        soundObject.current = new Audio.Sound();
      } catch (error) {
        console.error("Error initializing audio:", error);
      }
    };

    initializeAudio();

    // Cleanup function
    return () => {
      const cleanup = async () => {
        try {
          if (recording) {
            await stopRecording();
          }
          if (playingAudio) {
            setPlayingAudio(null);
          }

          // Cleanup sound object
          if (soundObject.current) {
            try {
              await soundObject.current.unloadAsync();
            } catch (error) {
              // Ignore unload errors during cleanup
            }
            soundObject.current = null;
          }
        } catch (error) {
          console.error("Cleanup error:", error);
        }
      };

      cleanup();
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
        console.log("CreateEntry: Set current entry index to:", index);
      } else {
        console.warn("CreateEntry: Could not find entry in month entries");
      }
    }
  }, [routeEntry, routeMonthEntries]);

  // Add this utility function to show time manipulation warnings:
  const showTimeManipulationWarning = (manipulationData) => {
    if (manipulationData.confidence > 75) {
      Alert.alert(
        "Security Alert",
        "Significant time inconsistencies detected. The app may restrict editing features to maintain journal integrity.",
        [{ text: "Understand" }]
      );
    } else if (manipulationData.confidence > 50) {
      // Show a less severe warning
      console.warn(
        "Moderate time manipulation detected:",
        manipulationData.reasons
      );
    }
  };

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

  // Handle image picking
  const pickImage = async (useCamera = false) => {
    if (entryMode === "preview" || isServiceLocked) return;
    // Check tier limits
    if (!userTierManager.canAddImage(images.length)) {
      Alert.alert(
        "Image Limit Reached",
        userTierManager.getUpgradeMessage("images"),
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upgrade",
            onPress: () => {
              // Navigate to upgrade screen or show upgrade modal
              console.log("Navigate to upgrade screen");
            },
          },
        ]
      );
      return;
    }

    try {
      let result;

      const imagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        // Add these options for better cropping experience
        allowsMultipleSelection: false,
        selectionLimit: 3,
      };

      if (useCamera) {
        result = await ImagePicker.launchCameraAsync(imagePickerOptions);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(imagePickerOptions);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const tempUri = result.assets[0].uri;

        // Generate a temporary entry ID if we don't have one yet
        const entryId = routeEntry?.id || `temp_${Date.now()}`;

        // Save image to permanent storage
        const permanentUri = await mediaManager.saveImage(tempUri, entryId);

        // Add permanent URI to images array
        setImages([...images, permanentUri]);

        console.log("Image saved successfully:", permanentUri);
      }
    } catch (error) {
      console.error("Error picking/saving image:", error);
      Alert.alert("Error", "Failed to save image. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  // Handle audio recording
  const startRecording = async () => {
    if (entryMode === "preview" || isServiceLocked) return;

    // Check tier limits
    if (!userTierManager.canAddAudio(audioNotes.length)) {
      Alert.alert(
        "Audio Limit Reached",
        userTierManager.getUpgradeMessage("audio"),
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upgrade",
            onPress: () => {
              // Navigate to upgrade screen or show upgrade modal
              console.log("Navigate to upgrade screen");
            },
          },
        ]
      );
      return;
    }

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
    try {
      // Stop current audio if playing
      if (playingAudio) {
        await stopAudio();
      }

      console.log("Playing audio:", audioNote.name);

      // Make sure sound object exists
      if (!soundObject.current) {
        console.log("Creating new sound object");
        soundObject.current = new Audio.Sound();
      }

      // Unload any previous sound first
      try {
        const status = await soundObject.current.getStatusAsync();
        if (status.isLoaded) {
          await soundObject.current.unloadAsync();
        }
      } catch (unloadError) {
        console.log(
          "Sound not loaded or error unloading:",
          unloadError.message
        );
      }

      // Load and play new sound
      console.log("Loading audio from:", audioNote.uri);
      await soundObject.current.loadAsync({ uri: audioNote.uri });
      await soundObject.current.playAsync();
      setPlayingAudio(audioNote.id);

      // Update state when playback finishes
      soundObject.current.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          console.log("Audio finished playing");
          setPlayingAudio(null);
          // Unload the sound after playing
          soundObject.current.unloadAsync().catch((error) => {
            console.log("Error unloading after finish:", error.message);
          });
        }
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      setPlayingAudio(null);

      // Try to recover by creating new sound object
      try {
        if (soundObject.current) {
          await soundObject.current.unloadAsync();
        }
      } catch (recoveryError) {
        // Ignore recovery errors
      }

      // Create fresh sound object for next attempt
      soundObject.current = new Audio.Sound();
    }
  };

  const stopAudio = async () => {
    if (!playingAudio || !soundObject.current) return;

    try {
      console.log("Stopping audio");

      // Check if sound is loaded before trying to stop
      const status = await soundObject.current.getStatusAsync();
      if (status.isLoaded) {
        await soundObject.current.stopAsync();
        await soundObject.current.unloadAsync();
      }

      setPlayingAudio(null);
    } catch (error) {
      console.error("Error stopping audio:", error);
      setPlayingAudio(null);

      // Create fresh sound object
      soundObject.current = new Audio.Sound();
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
        navigation.navigate("Main", { screen: "Home" });
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
      Alert.alert(
        "Missing Title",
        "Please enter a title for your journal entry"
      );
      return;
    }

    // Store checkpoint before saving
    await serviceLockManager.storeTimeCheckpoint("entry_save");

    setIsSaving(true);

    try {
      const isCreatingNew = !routeEntry || !routeEntry.id;
      const entryId = isCreatingNew ? `entry_${Date.now()}` : routeEntry.id;

      const entryData = {
        id: entryId,
        title,
        content,
        formattedContent,
        date: selectedDate,
        mood: selectedMood,
        tags,
        images,
        audioNotes,
      };

      if (isCreatingNew) {
        await addEntry(entryData);
        console.log("Created new entry:", entryId);
      } else {
        await updateEntry(routeEntry.id, entryData);
        console.log("Updated existing entry:", entryId);
      }

      navigation.navigate("Main", { screen: "Home" });
    } catch (error) {
      console.error("Error saving entry:", error);
      Alert.alert("Save Failed", "Failed to save entry. Please try again.");
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

  const renderTierInfo = () => {
    if (entryMode === "preview") return null;

    return (
      <View style={styles.tierInfoContainer}>
        <View style={styles.tierLimitsRow}>
          <Text style={styles.tierLimitText}>
            Images: {images.length}/{tierLimits.maxImagesPerEntry}
          </Text>
          <Text style={styles.tierLimitText}>
            Audio: {audioNotes.length}/{tierLimits.maxAudioNotesPerEntry}
          </Text>
          {!userTierManager.isPremium() && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => console.log("Show upgrade modal")}
            >
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
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
          onPress={() => navigation.navigate("Main", { screen: "Home" })}
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
          </TouchableOpacity>
        </View>

        {/* Updated header actions based on entry state */}
        <View style={styles.headerActions}>
          {!routeEntry || !routeEntry.id ? (
            // New entry - only show save if not locked
            !isServiceLocked && (
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={saveEntry}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            )
          ) : (
            // Existing entry - show appropriate buttons
            <>
              {entryMode === "edit" && !isServiceLocked ? (
                <>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={toggleMode}
                  >
                    <Feather name="eye" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.saveButton]}
                    onPress={saveEntry}
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
                  {!isServiceLocked && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={toggleMode}
                    >
                      <Feather name="edit-2" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                  {/* Delete button always available in preview mode */}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={confirmDeleteEntry}
                  >
                    <Feather name="trash-2" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </>
              )}
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
        {entryMode === "edit" && !isServiceLocked && (
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
        {/* {renderTierInfo()} */}
        {isServiceLocked && lockMessage && (
          <View style={styles.lockMessageContainer}>
            <Feather name="lock" size={20} color={COLORS.error} />
            <Text style={styles.lockMessageText}>{lockMessage}</Text>
          </View>
        )}
        {/* Preview mode date displayed prominently */}
        {/* {entryMode === "preview" && (
          <View style={styles.previewDateContainer}>
            <Feather name="calendar" size={16} color={COLORS.textLight} />
            <Text style={styles.previewDateText}>{getFormattedDate()}</Text>
          </View>
        )} */}
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
        {(images.length > 0 || routeEntry?.originalImageCount > 0) && (
          <View
            style={[
              styles.imagesContainer,
              entryMode === "preview" && styles.previewImagesContainer,
            ]}
          >
            {entryMode === "preview" && (
              <Text style={styles.previewSectionTitle}>Photos</Text>
            )}

            {/* Show actual images if they exist */}
            {images.length > 0 && (
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
                        <Feather
                          name="trash-2"
                          size={16}
                          color={COLORS.white}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              />
            )}

            {/* Show placeholder for imported entries that had images */}
            {images.length === 0 && routeEntry?.originalImageCount > 0 && (
              <View style={styles.mediaPlaceholder}>
                <View style={styles.mediaPlaceholderHeader}>
                  <Feather name="image" size={20} color={COLORS.textMuted} />
                  <Text style={styles.mediaPlaceholderTitle}>
                    Photos from Original Device
                  </Text>
                </View>
                <Text style={styles.mediaPlaceholderText}>
                  This entry had {routeEntry.originalImageCount} photo
                  {routeEntry.originalImageCount > 1 ? "s" : ""} on your
                  original device
                </Text>
                {routeEntry.imageFilenames &&
                  routeEntry.imageFilenames.length > 0 && (
                    <Text style={styles.mediaFilenames}>
                      Files: {routeEntry.imageFilenames.join(", ")}
                    </Text>
                  )}
              </View>
            )}
          </View>
        )}

        {/* Audio Notes Display - enhanced for preview mode */}
        {(audioNotes.length > 0 || routeEntry?.originalAudioCount > 0) && (
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

            {/* Show actual audio notes if they exist */}
            {audioNotes
              .filter((note) => !note.isPlaceholder)
              .map((note) => (
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
                      // playingAudio === note.id && styles.playingButton,
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

            {/* Show placeholder for imported entries that had audio */}
            {audioNotes.filter((note) => !note.isPlaceholder).length === 0 &&
              routeEntry?.originalAudioCount > 0 && (
                <View style={styles.mediaPlaceholder}>
                  <View style={styles.mediaPlaceholderHeader}>
                    <Feather name="mic" size={20} color={COLORS.textMuted} />
                    <Text style={styles.mediaPlaceholderTitle}>
                      Voice Notes from Original Device
                    </Text>
                  </View>
                  <Text style={styles.mediaPlaceholderText}>
                    This entry had {routeEntry.originalAudioCount} voice note
                    {routeEntry.originalAudioCount > 1 ? "s" : ""} on your
                    original device
                  </Text>
                  {routeEntry.audioNotes &&
                    routeEntry.audioNotes.some(
                      (note) => note.isPlaceholder
                    ) && (
                      <Text style={styles.mediaFilenames}>
                        Files:{" "}
                        {routeEntry.audioNotes
                          .filter((note) => note.isPlaceholder)
                          .map((note) => note.originalFilename)
                          .join(", ")}
                      </Text>
                    )}
                </View>
              )}
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
  tierInfoContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tierLimitsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tierLimitText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  upgradeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  // Update existing toolbar styles for better layout
  toolbar: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 4,
    marginBottom: 10, // Reduced from 15
    ...shadowStyles.small,
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  // Style for when image limit is reached
  toolbarButtonDisabled: {
    opacity: 0.5,
    backgroundColor: COLORS.border,
  },
  toolbarButtonDisabledText: {
    color: COLORS.textMuted,
  },
  lockMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    padding: 12,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  lockMessageText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  // Add these to your existing styles in CreateEntryScreen.jsx
  mediaPlaceholder: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
  },
  mediaPlaceholderHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  mediaPlaceholderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primaryDark,
    marginLeft: 8,
  },
  mediaPlaceholderText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
    lineHeight: 20,
  },
  mediaFilenames: {
    fontSize: 12,
    color: COLORS.textMinted,
    fontStyle: "italic",
    lineHeight: 16,
  },
});

export default CreateEntryScreen;
