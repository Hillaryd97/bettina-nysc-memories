import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import storageManager from "../services/StoreManager";

// Color scheme matching your app
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

const ImportDataScreen = ({ navigation }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [mergeWithExisting, setMergeWithExisting] = useState(true);
  const [importStats, setImportStats] = useState(null);

  // Handle file selection and import
  // Replace your existing handleImport function with this one
// Updated handleImport function compatible with newer Expo DocumentPicker
const handleImport = async () => {
    try {
      console.log("Starting import process...");
      
      // Pick a document - using the new API format
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
  
      console.log("Document picker result:", result);
  
      // Check if canceled (using the new format where result.canceled is a boolean)
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Get the first selected file
        const selectedFile = result.assets[0];
        const fileUri = selectedFile.uri;
        
        console.log("File selected:", fileUri);
        setIsImporting(true);
        setImportProgress(10);
  
        try {
          // Read the file
          console.log("Attempting to read file...");
          const fileContent = await FileSystem.readAsStringAsync(fileUri);
          console.log("File read successful. Content length:", fileContent.length);
          setImportProgress(30);
  
          // Validate the file is JSON
          console.log("Validating JSON format...");
          try {
            JSON.parse(fileContent);
            console.log("JSON validation successful");
          } catch (jsonError) {
            console.error("JSON validation failed:", jsonError);
            throw new Error("The selected file is not a valid JSON file.");
          }
          setImportProgress(50);
  
          // Import the data
          console.log("Calling storageManager.importData...");
          console.log("Merge with existing:", mergeWithExisting);
          
          const importResult = await storageManager.importData(
            fileContent,
            mergeWithExisting
          );
          
          console.log("Import result:", importResult);
          setImportProgress(90);
  
          if (importResult.success) {
            console.log("Import successful with stats:", importResult.stats);
            setImportStats(importResult.stats);
            setImportProgress(100);
  
            // Show success message after completing import
            Alert.alert(
              "Import Successful",
              mergeWithExisting
                ? `Successfully added ${importResult.stats.entriesImported} new entries to your journal.`
                : `Successfully imported ${importResult.stats.entriesImported} entries, replacing your previous data.`,
              [
                {
                  text: "View Details",
                  onPress: () => {
                    console.log("View details pressed");
                  }, // Stats are already displayed
                },
                {
                  text: "Done",
                  onPress: () => {
                    console.log("Done pressed, navigating back");
                    // Navigate back to previous screen or home
                    navigation.goBack();
                  },
                },
              ]
            );
          } else {
            console.error("Import failed with result:", importResult);
            throw new Error(importResult.error || "Failed to import data");
          }
        } catch (fileReadError) {
          console.error("Error reading or processing file:", fileReadError);
          throw fileReadError;
        }
      } else {
        console.log("Document picker cancelled");
      }
    } catch (error) {
      console.error("Error importing data:", error);
      console.error("Error stack:", error.stack);
  
      Alert.alert(
        "Import Failed",
        error.message ||
          "There was a problem importing your data. Please try again with a valid Bettina backup file.",
        [{ text: "OK" }]
      );
      setImportProgress(0);
      setIsImporting(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          disabled={isImporting}
        >
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import Journal</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {isImporting && importProgress < 100 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              Importing your journal data...
            </Text>
            <View style={styles.progressContainer}>
              <View
                style={[styles.progressBar, { width: `${importProgress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{importProgress}%</Text>
          </View>
        ) : importStats ? (
          <View style={styles.resultsContainer}>
            <View style={styles.successIconContainer}>
              <Feather name="check-circle" size={60} color={COLORS.primary} />
            </View>

            <Text style={styles.successTitle}>Import Complete!</Text>

            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Import Summary</Text>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Journal Entries:</Text>
                <Text style={styles.statValue}>
                  {importStats.entriesImported} imported
                </Text>
              </View>

              {importStats.entriesSkipped > 0 && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Entries Skipped:</Text>
                  <Text style={styles.statValue}>
                    {importStats.entriesSkipped} (already exist)
                  </Text>
                </View>
              )}

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Settings:</Text>
                <Text style={styles.statValue}>
                  {importStats.settingsImported ? "Imported" : "Not included"}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Service Info:</Text>
                <Text style={styles.statValue}>
                  {importStats.serviceInfoImported
                    ? "Imported"
                    : "Not included"}
                </Text>
              </View>

              {importStats.badgesImported > 0 && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Badges:</Text>
                  <Text style={styles.statValue}>
                    {importStats.badgesImported} imported
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.illustrationContainer}>
              <Feather name="upload-cloud" size={70} color={COLORS.primary} />
            </View>

            <Text style={styles.subtitle}>
              Restore your journal from a backup file
            </Text>

            <View style={styles.infoBox}>
              <Feather
                name="info"
                size={20}
                color={COLORS.primary}
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                You can import a backup file that was previously exported from
                Bettina. This will restore your journal entries and settings.
              </Text>
            </View>

            <View style={styles.optionCard}>
              <View style={styles.optionHeader}>
                <Text style={styles.optionTitle}>Merge with existing data</Text>
                <Switch
                  value={mergeWithExisting}
                  onValueChange={setMergeWithExisting}
                  trackColor={{
                    false: COLORS.textMuted,
                    true: COLORS.primaryLight,
                  }}
                  thumbColor={mergeWithExisting ? COLORS.primary : "#f4f3f4"}
                />
              </View>

              <Text style={styles.optionDescription}>
                {mergeWithExisting
                  ? "New entries will be added to your existing journal. Your current entries won't be deleted."
                  : "All current entries and settings will be replaced with the imported data."}
              </Text>

              {!mergeWithExisting && (
                <View style={styles.warningBox}>
                  <Feather
                    name="alert-triangle"
                    size={18}
                    color={COLORS.error}
                    style={styles.warningIcon}
                  />
                  <Text style={styles.warningText}>
                    Warning: This will replace all your current journal data and
                    cannot be undone.
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.importButton}
              onPress={handleImport}
            >
              <Feather
                name="file-plus"
                size={20}
                color={COLORS.white}
                style={styles.buttonIcon}
              />
              <Text style={styles.importButtonText}>Select Backup File</Text>
            </TouchableOpacity>
          </>
        )}
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
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: "80%", // Ensure content fills most of the screen
  },
  illustrationContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  optionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: "#FDECEA",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
  },
  warningIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.error,
    lineHeight: 18,
  },
  importButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  importButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
  },
  progressContainer: {
    width: "100%",
    height: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 4,
    marginTop: 20,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textLight,
  },
  resultsContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 40,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 24,
  },
  statsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    marginBottom: 30,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  doneButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 16,
  },
});

export default ImportDataScreen;
