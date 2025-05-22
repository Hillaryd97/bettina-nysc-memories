import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Share,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, AntDesign } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import * as DocumentPicker from "expo-document-picker";
import * as MediaLibrary from "expo-media-library";
import * as JSZip from "jszip";
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

const ExportDataScreen = ({ navigation }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState(null); // 'json', 'pdf', or 'images'
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportedFilePath, setExportedFilePath] = useState(null);
  const [exportFileName, setExportFileName] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Export data as JSON
  const exportAsJson = async () => {
    try {
      setExportType("json");
      setIsExporting(true);
      setExportProgress(10);

      // Get data from storage manager
      const jsonData = await storageManager.exportData();
      setExportProgress(50);

      // Create a file in the app's documents directory
      const fileName = `bettina_journal_${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, jsonData);
      setExportProgress(80);
      setExportProgress(100);

      // Store the file path for later sharing
      setExportedFilePath(filePath);
      setExportFileName(fileName);

      // Show success message
      setExportComplete(true);
      setShowCompletionModal(true);
    } catch (error) {
      console.error("Error exporting data:", error);
      Alert.alert(
        "Export Failed",
        "There was a problem exporting your data. Please try again.",
        [{ text: "OK" }]
      );
      resetExportState();
    }
  };

  // Reset export state
  const resetExportState = () => {
    setIsExporting(false);
    setExportProgress(0);
    setExportComplete(false);
    setExportedFilePath(null);
    setExportFileName(null);
  };

  // Generate HTML for PDF export
  const generatePdfHtml = async () => {
    try {
      // Get all entries
      const entries = await storageManager.getEntries();
      const serviceInfo = await storageManager.getServiceInfo();

      // Sort entries by date (newest first)
      entries.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Generate HTML header with styling
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Bettina Journal</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Montserrat:wght@400;500;600;700&display=swap');
            
            body {
              font-family: 'Lora', serif;
              line-height: 1.8;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 30px;
              background-color: #FFFFFF;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px double ${COLORS.primary};
            }
            
            .header h1 {
              font-family: 'Montserrat', sans-serif;
              color: ${COLORS.primaryDark};
              margin-bottom: 10px;
            }
            
            .entry {
              margin-bottom: 40px;
              padding-bottom: 30px;
              border-bottom: 1px solid #e0e0e0;
              page-break-inside: avoid;
            }
            
            .entry-title {
              font-family: 'Montserrat', sans-serif;
              font-size: 22px;
              font-weight: 600;
              color: ${COLORS.primaryDark};
              margin-bottom: 8px;
              padding-bottom: 8px;
              border-bottom: 1px solid ${COLORS.primaryLight};
            }
            
            .entry-date {
              color: ${COLORS.primary};
              font-size: 15px;
              font-style: italic;
              margin-bottom: 16px;
            }
            
            .entry-content {
              margin-top: 15px;
              white-space: pre-wrap;
              font-size: 16px;
              line-height: 1.8;
            }
            
            .tags {
              margin-top: 20px;
              display: flex;
              flex-wrap: wrap;
            }
            
            .tag {
              display: inline-block;
              background-color: ${COLORS.primaryLight};
              color: ${COLORS.primaryDark};
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 12px;
              margin-right: 6px;
              margin-bottom: 6px;
              font-family: 'Montserrat', sans-serif;
            }
            
            .summary {
              margin-top: 30px;
              text-align: center;
              font-style: italic;
              color: ${COLORS.textLight};
              padding: 20px;
              border-top: 1px solid #e0e0e0;
            }
            
            .page-break {
              page-break-after: always;
            }
            
            .cover-page {
              height: 90vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              background: linear-gradient(to bottom, white, ${
                COLORS.primaryLight
              });
              border-radius: 5px;
              border: 1px solid #e0e0e0;
              padding: 40px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            }
            
            .logo-placeholder {
              width: 100px;
              height: 100px;
              border-radius: 50%;
              background-color: ${COLORS.primary};
              display: flex;
              justify-content: center;
              align-items: center;
              margin-bottom: 30px;
              color: white;
              font-family: 'Montserrat', sans-serif;
              font-weight: bold;
              font-size: 24px;
            }
            
            .cover-title {
              font-family: 'Montserrat', sans-serif;
              font-size: 42px;
              font-weight: bold;
              color: ${COLORS.primaryDark};
              margin-bottom: 20px;
            }
            
            .cover-subtitle {
              font-family: 'Lora', serif;
              font-size: 20px;
              font-style: italic;
              color: ${COLORS.textLight};
              margin-bottom: 60px;
              border-bottom: 1px solid ${COLORS.primaryLight};
              padding-bottom: 10px;
            }
            
            .cover-info {
              margin-top: 60px;
              font-size: 16px;
              color: ${COLORS.text};
              background-color: rgba(255,255,255,0.7);
              border-radius: 8px;
              padding: 20px 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }
            
            .image-note {
              background-color: #FFF8E1;
              border-left: 4px solid ${COLORS.primary};
              padding: 10px 15px;
              margin: 20px 0;
              font-size: 14px;
              line-height: 1.5;
              font-style: italic;
              color: #666;
              border-radius: 0 4px 4px 0;
            }
            
            .page-number {
              text-align: center;
              font-size: 12px;
              color: ${COLORS.textMuted};
              margin-top: 30px;
              font-family: 'Montserrat', sans-serif;
            }
            
            .entry-metadata {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              color: ${COLORS.textMuted};
              margin-top: 15px;
              font-family: 'Montserrat', sans-serif;
            }
          </style>
        </head>
        <body>
          <div class="cover-page">
            <div class="logo-placeholder">B</div>
            <div class="cover-title">Bettina Journal</div>
            <div class="cover-subtitle">Your NYSC Service Journey</div>
            ${
              serviceInfo
                ? `
              <div class="cover-info">
                <p><strong>${serviceInfo.name || "Corps Member"}</strong></p>
                <p>${serviceInfo.stateOfDeployment || "Nigeria"}</p>
                ${
                  serviceInfo.startDate
                    ? `
                  <p>Service Period: ${new Date(
                    serviceInfo.startDate
                  ).toLocaleDateString()} - 
                     ${
                       serviceInfo.endDate
                         ? new Date(serviceInfo.endDate).toLocaleDateString()
                         : "Present"
                     }</p>
                `
                    : ""
                }
                <p>Exported on ${new Date().toLocaleDateString()}</p>
                <p>Total Entries: ${entries.length}</p>
              </div>
            `
                : `
              <div class="cover-info">
                <p><strong>Corps Member Journal</strong></p>
                <p>Exported on ${new Date().toLocaleDateString()}</p>
                <p>Total Entries: ${entries.length}</p>
              </div>
            `
            }
          </div>

          <div class="page-break"></div>

          <div class="header">
            <h1>My NYSC Journal</h1>
          </div>
          
          <div class="image-note">
            Note: This PDF contains the text content of your journal entries. 
            Images from your entries are not included in this export format.
          </div>
      `;

      // Add entries
      if (entries.length === 0) {
        html += `
          <div class="entry">
            <p style="text-align: center; font-style: italic; color: ${COLORS.textMuted};">
              No journal entries found.
            </p>
          </div>
        `;
      } else {
        entries.forEach((entry, index) => {
          // Format entry date nicely
          const entryDate =
            entry.date || entry.createdAt || new Date().toISOString();
          const formattedDate = new Date(entryDate).toLocaleDateString(
            "en-US",
            {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }
          );

          // Calculate days in service when entry was written (if service info exists)
          let daysInService = "";
          if (serviceInfo && serviceInfo.startDate) {
            const startDate = new Date(serviceInfo.startDate);
            const entryDateTime = new Date(entryDate);

            if (entryDateTime >= startDate) {
              const diffTime = Math.abs(entryDateTime - startDate);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              daysInService = `Day ${diffDays} of service`;
            }
          }

          // Format mood if available
          let moodHtml = "";
          if (entry.mood) {
            let moodEmoji = "";
            switch (entry.mood.toLowerCase()) {
              case "happy":
              case "excited":
              case "great":
                moodEmoji = "😊";
                break;
              case "good":
              case "positive":
                moodEmoji = "🙂";
                break;
              case "neutral":
              case "okay":
                moodEmoji = "😐";
                break;
              case "sad":
              case "down":
                moodEmoji = "😔";
                break;
              case "stressed":
              case "anxious":
                moodEmoji = "😓";
                break;
              case "frustrated":
              case "angry":
                moodEmoji = "😠";
                break;
              default:
                moodEmoji = "";
            }

            if (moodEmoji) {
              moodHtml = `<span style="margin-left: 10px; font-size: 18px;">${moodEmoji}</span>`;
            }
          }

          // Create entry HTML with better formatting
          html += `
            <div class="entry">
              <div class="entry-title">
                ${entry.title || "Untitled Entry"}
                ${moodHtml}
              </div>
              
              <div class="entry-date">
                ${formattedDate}
                ${
                  daysInService
                    ? `<span style="margin-left: 12px; font-weight: 500; color: ${COLORS.primary};">${daysInService}</span>`
                    : ""
                }
              </div>
              
              <div class="entry-content">
                ${
                  entry.content
                    ? entry.content.replace(/\n/g, "<br>")
                    : "<em>No content</em>"
                }
              </div>
          `;

          // Note about images if entry has images
          if (entry.images && entry.images.length > 0) {
            html += `
              <div class="image-note" style="margin-top: 15px; font-size: 13px;">
                <strong>Note:</strong> This entry contains ${
                  entry.images.length
                } image${entry.images.length > 1 ? "s" : ""} 
                that are not included in this PDF. Export images separately to view them.
              </div>
            `;
          }

          // Add tags if present
          if (entry.tags && entry.tags.length > 0) {
            html += `<div class="tags">`;
            entry.tags.forEach((tag) => {
              html += `<span class="tag">${tag}</span>`;
            });
            html += `</div>`;
          }

          // Add entry metadata (created/modified dates)
          html += `
            <div class="entry-metadata">
              <span>Created: ${new Date(
                entry.createdAt || entryDate
              ).toLocaleDateString()}</span>
              ${
                entry.updatedAt && entry.updatedAt !== entry.createdAt
                  ? `<span>Updated: ${new Date(
                      entry.updatedAt
                    ).toLocaleDateString()}</span>`
                  : ""
              }
            </div>
          `;

          html += `</div>`;

          // Add page break every 3 entries (except last one) for better readability
          if (index > 0 && index % 3 === 0 && index < entries.length - 1) {
            html += `
              <div class="page-number">Page ${Math.floor(index / 3) + 1}</div>
              <div class="page-break"></div>
            `;
          }
        });
      }

      // Calculate total stats for summary
      const wordCount = entries.reduce((count, entry) => {
        return (
          count +
          (entry.content
            ? entry.content.split(/\s+/).filter((word) => word.length > 0)
                .length
            : 0)
        );
      }, 0);

      const earliestEntry =
        entries.length > 0
          ? new Date(
              Math.min(
                ...entries.map((e) => new Date(e.date || e.createdAt).getTime())
              )
            )
          : null;

      const latestEntry =
        entries.length > 0
          ? new Date(
              Math.max(
                ...entries.map((e) => new Date(e.date || e.createdAt).getTime())
              )
            )
          : null;

      // Count entries by month
      const entriesByMonth = {};
      entries.forEach((entry) => {
        const date = new Date(entry.date || entry.createdAt);
        const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;
        entriesByMonth[monthYear] = (entriesByMonth[monthYear] || 0) + 1;
      });

      // Add page break before summary
      html += `<div class="page-break"></div>`;

      // Add journaling stats summary page
      html += `
        <div class="header">
          <h1>Journal Summary</h1>
        </div>
        
        <div style="background-color: ${
          COLORS.primaryLight
        }; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: ${
            COLORS.primaryDark
          }; font-family: 'Montserrat', sans-serif; margin-top: 0;">Journal Statistics</h2>
          
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
            <div style="background-color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px; min-width: 45%;">
              <h3 style="color: ${
                COLORS.primary
              }; margin-top: 0; margin-bottom: 8px; font-family: 'Montserrat', sans-serif;">Words</h3>
              <p style="font-size: 32px; font-weight: bold; margin: 0; color: ${
                COLORS.text
              };">${wordCount.toLocaleString()}</p>
              <p style="color: ${
                COLORS.textMuted
              }; margin-top: 4px;">Total words written</p>
            </div>
            
            ${
              earliestEntry
                ? `
            <div style="background-color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px; min-width: 45%;">
              <h3 style="color: ${
                COLORS.primary
              }; margin-top: 0; margin-bottom: 8px; font-family: 'Montserrat', sans-serif;">First Entry</h3>
              <p style="font-size: 18px; font-weight: bold; margin: 0; color: ${
                COLORS.text
              };">${earliestEntry.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}</p>
              <p style="color: ${
                COLORS.textMuted
              }; margin-top: 4px;">Date of first journal entry</p>
            </div>
            `
                : ""
            }
            
            ${
              latestEntry
                ? `
            <div style="background-color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px; min-width: 45%;">
              <h3 style="color: ${
                COLORS.primary
              }; margin-top: 0; margin-bottom: 8px; font-family: 'Montserrat', sans-serif;">Latest Entry</h3>
              <p style="font-size: 18px; font-weight: bold; margin: 0; color: ${
                COLORS.text
              };">${latestEntry.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}</p>
              <p style="color: ${
                COLORS.textMuted
              }; margin-top: 4px;">Date of most recent entry</p>
            </div>
            `
                : ""
            }
            
            ${
              serviceInfo && serviceInfo.startDate
                ? `
            <div style="background-color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px; min-width: 45%;">
              <h3 style="color: ${
                COLORS.primary
              }; margin-top: 0; margin-bottom: 8px; font-family: 'Montserrat', sans-serif;">Service Period</h3>
              <p style="font-size: 18px; font-weight: bold; margin: 0; color: ${
                COLORS.text
              };">
                ${new Date(serviceInfo.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })} — 
                ${
                  serviceInfo.endDate
                    ? new Date(serviceInfo.endDate).toLocaleDateString(
                        "en-US",
                        { month: "short", year: "numeric" }
                      )
                    : "Present"
                }
              </p>
              <p style="color: ${
                COLORS.textMuted
              }; margin-top: 4px;">NYSC service timeframe</p>
            </div>
            `
                : ""
            }
          </div>
        </div>
        
        ${
          Object.keys(entriesByMonth).length > 0
            ? `
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #eee;">
          <h2 style="color: ${
            COLORS.text
          }; font-family: 'Montserrat', sans-serif; margin-top: 0; margin-bottom: 16px;">Journal Activity</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 8px; border-bottom: 2px solid ${
                  COLORS.primaryLight
                }; font-family: 'Montserrat', sans-serif;">Month</th>
                <th style="text-align: right; padding: 8px; border-bottom: 2px solid ${
                  COLORS.primaryLight
                }; font-family: 'Montserrat', sans-serif;">Entries</th>
              </tr>
            </thead>
            <tbody>
              ${Object.keys(entriesByMonth)
                .sort((a, b) => b.localeCompare(a)) // Sort by date descending
                .map((monthYear) => {
                  const [year, month] = monthYear.split("-");
                  const date = new Date(year, month - 1, 1);
                  const formattedMonth = date.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  });
                  return `
                    <tr>
                      <td style="padding: 8px; border-bottom: 1px solid #eee;">${formattedMonth}</td>
                      <td style="text-align: right; padding: 8px; border-bottom: 1px solid #eee; font-weight: 600;">${entriesByMonth[monthYear]}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
        `
            : ""
        }
        
        <div class="summary">
          <p>This journal contains ${
            entries.length
          } entries with ${wordCount.toLocaleString()} words from your NYSC service.</p>
          <p>Generated by Bettina App on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: ${
          COLORS.textMuted
        };">
          <p>To view any images from your journal entries, please use the "Export Images" option in the app.</p>
          <p>You can restore your full journal data by using the "Complete Backup" option.</p>
        </div>
        
      </body>
      </html>
      `;

      return html;

      return html;
    } catch (error) {
      console.error("Error generating PDF HTML:", error);
      throw error;
    }
  };

  // Export data as PDF
  const exportAsPdf = async () => {
    try {
      setExportType("pdf");
      setIsExporting(true);
      setExportProgress(10);

      // Generate HTML for PDF
      const html = await generatePdfHtml();
      setExportProgress(40);

      // Create PDF file
      const { uri } = await Print.printToFileAsync({ html });
      setExportProgress(70);

      // Create a more user-friendly filename
      const fileName = `bettina_journal_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      const newUri = FileSystem.documentDirectory + fileName;

      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });
      setExportProgress(90);
      setExportProgress(100);

      // Store the file path for later sharing
      setExportedFilePath(newUri);
      setExportFileName(fileName);

      // Show success message
      setExportComplete(true);
      setShowCompletionModal(true);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      Alert.alert(
        "Export Failed",
        "There was a problem creating your PDF. Please try again.",
        [{ text: "OK" }]
      );
      resetExportState();
    }
  };

  // Export images as ZIP
  const exportImagesAsZip = async () => {
    try {
      setExportType("images");
      setIsExporting(true);
      setExportProgress(10);

      // Get all entries with images
      const entries = await storageManager.getEntries();
      let imageCount = 0;

      // Check if any entries have images
      const entriesWithImages = entries.filter(
        (entry) => entry.images && entry.images.length > 0
      );

      if (entriesWithImages.length === 0) {
        Alert.alert(
          "No Images Found",
          "There are no images in your journal entries to export.",
          [{ text: "OK" }]
        );
        resetExportState();
        return;
      }

      setExportProgress(20);

      // Create a new JSZip instance
      const zip = new JSZip();

      // Add each image to the zip
      for (let i = 0; i < entriesWithImages.length; i++) {
        const entry = entriesWithImages[i];
        const entryDate = new Date(entry.date || entry.createdAt)
          .toISOString()
          .split("T")[0];

        for (let j = 0; j < entry.images.length; j++) {
          try {
            const imagePath = entry.images[j];
            const imageData = await FileSystem.readAsStringAsync(imagePath, {
              encoding: FileSystem.EncodingType.Base64,
            });

            // Create a folder structure by date
            const fileName = `${entryDate}/${entry.id}_image${j + 1}.jpg`;
            zip.file(fileName, imageData, { base64: true });
            imageCount++;
          } catch (imgError) {
            console.error("Error adding image to zip:", imgError);
            // Continue with other images
          }
        }

        // Update progress based on how many entries we've processed
        setExportProgress(
          20 + Math.floor((60 * (i + 1)) / entriesWithImages.length)
        );
      }

      setExportProgress(80);

      // Generate the zip file
      const zipContent = await zip.generateAsync({ type: "base64" });

      // Save zip file
      const fileName = `bettina_journal_images_${new Date()
        .toISOString()
        .slice(0, 10)}.zip`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, zipContent, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setExportProgress(95);

      // Store the file path for later sharing
      setExportedFilePath(filePath);
      setExportFileName(fileName);

      // Show success message
      setExportProgress(100);
      setExportComplete(true);
      setShowCompletionModal(true);
    } catch (error) {
      console.error("Error exporting images:", error);
      Alert.alert(
        "Export Failed",
        "There was a problem exporting your images. Please try again.",
        [{ text: "OK" }]
      );
      resetExportState();
    }
  };

  // Share the exported file
  const shareExportedFile = async () => {
    try {
      if (!exportedFilePath) {
        throw new Error("No file to share");
      }
      
      // First check if the file exists
      const fileInfo = await FileSystem.getInfoAsync(exportedFilePath);
      if (!fileInfo.exists) {
        throw new Error("File doesn't exist at path: " + exportedFilePath);
      }
      
      console.log("Sharing file:", exportedFilePath);
      
      if (await Sharing.isAvailableAsync()) {
        try {
          // Attempt to share
          await Sharing.shareAsync(exportedFilePath, {
            mimeType: exportType === 'json' 
              ? 'application/json' 
              : exportType === 'pdf'
              ? 'application/pdf'
              : 'application/zip',
            dialogTitle: `Share your ${exportType.toUpperCase()} file`,
            UTI: exportType === 'json' 
              ? 'public.json' 
              : exportType === 'pdf'
              ? 'com.adobe.pdf'
              : 'public.archive'
          });
        } catch (shareError) {
          console.error("Share error:", shareError);
          // If direct sharing fails, try a different approach for Android
          if (Platform.OS === 'android') {
            // Ensure the file exists in a more accessible location
            const destinationUri = `${FileSystem.cacheDirectory}${exportFileName}`;
            await FileSystem.copyAsync({
              from: exportedFilePath,
              to: destinationUri
            });
            
            // Try sharing from cache directory
            await Sharing.shareAsync(destinationUri);
          } else {
            throw shareError; // Re-throw for iOS
          }
        }
      } else {
        // If sharing is not available, provide an alternative message
        Alert.alert(
          "Sharing Unavailable",
          "Your device doesn't support direct sharing. The file has been saved to your app's documents folder.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error sharing file:", error);
      Alert.alert(
        "Sharing Failed",
        "There was a problem sharing your file. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  // Save the exported file to device
  const saveToDevice = async () => {
    try {
      if (!exportedFilePath) {
        throw new Error("No file to save");
      }

      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Bettina needs permission to save files to your device.",
          [{ text: "OK" }]
        );
        return;
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(exportedFilePath);
      if (!fileInfo.exists) {
        throw new Error("File doesn't exist at path: " + exportedFilePath);
      }

      // Different approach depending on the file type
      let savedFileUri;

      try {
        // Try the direct method first
        const asset = await MediaLibrary.createAssetAsync(exportedFilePath);
        console.log("Asset created:", asset);
        savedFileUri = asset.uri;

        // Try to create album if we got here without errors
        try {
          const album = await MediaLibrary.getAlbumAsync("Bettina");
          if (album) {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          } else {
            await MediaLibrary.createAlbumAsync("Bettina", asset, false);
          }
        } catch (albumError) {
          console.log("Album error (non-critical):", albumError);
          // Continue even if album creation fails
        }
      } catch (assetError) {
        console.log(
          "Asset creation error, trying alternative method:",
          assetError
        );

        // Alternative approach - create a copy in the Pictures directory
        // This is a fallback that works on more devices
        const extension = exportedFilePath.split(".").pop();
        const destinationUri = FileSystem.documentDirectory + exportFileName;

        await FileSystem.copyAsync({
          from: exportedFilePath,
          to: destinationUri,
        });

        // Use sharing as fallback since direct save failed
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(destinationUri);
          savedFileUri = destinationUri;
        } else {
          throw new Error("Sharing is not available on this device");
        }
      }

      if (savedFileUri) {
        Alert.alert(
          "File Saved",
          `${exportFileName} has been saved to your device. You can access it from your downloads or gallery.`,
          [{ text: "OK" }]
        );
      } else {
        throw new Error("Could not save file");
      }
    } catch (error) {
      console.error("Error saving file:", error);

      // Special messaging for known errors
      let errorMessage = "There was a problem saving your file to your device.";

      if (error.message && error.message.includes("Could not create asset")) {
        errorMessage =
          "Your device doesn't support direct saving. Please use the Share option instead and save the file from there.";
      }

      Alert.alert("Save Failed", errorMessage, [
        {
          text: "Share Instead",
          onPress: () => shareExportedFile(),
        },
        { text: "Cancel" },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          disabled={isExporting}
        >
          <Feather name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export Journal</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {isExporting ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              {exportType === "json"
                ? "Preparing your journal data..."
                : exportType === "pdf"
                ? "Creating your journal PDF..."
                : "Packaging your journal images..."}
            </Text>
            <View style={styles.progressContainer}>
              <View
                style={[styles.progressBar, { width: `${exportProgress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{exportProgress}%</Text>
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Choose how you'd like to export your journal
            </Text>

            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.optionCard}
                onPress={exportAsJson}
              >
                <View style={styles.optionIconContainer}>
                  <Feather name="database" size={32} color={COLORS.primary} />
                </View>
                <Text style={styles.optionTitle}>Complete Backup</Text>
                <Text style={styles.optionDescription}>
                  Export all your journal entries, images, and settings as a
                  data file you can use to restore your journal on another
                  device.
                </Text>
                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <Feather name="check" size={14} color={COLORS.primary} />
                    <Text style={styles.featureText}>All journal entries</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Feather name="check" size={14} color={COLORS.primary} />
                    <Text style={styles.featureText}>Includes images</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Feather name="check" size={14} color={COLORS.primary} />
                    <Text style={styles.featureText}>Profile and settings</Text>
                  </View>
                </View>
                <View style={styles.optionButton}>
                  <Text style={styles.optionButtonText}>Create Backup</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionCard} onPress={exportAsPdf}>
                <View style={styles.optionIconContainer}>
                  <Feather name="file-text" size={32} color={COLORS.primary} />
                </View>
                <Text style={styles.optionTitle}>PDF Journal</Text>
                <Text style={styles.optionDescription}>
                  Create a readable PDF document with all your journal entries
                  that you can read, print, or share.
                </Text>
                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <Feather name="check" size={14} color={COLORS.primary} />
                    <Text style={styles.featureText}>All journal entries</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Feather name="x" size={14} color={COLORS.textMuted} />
                    <Text style={styles.featureTextDisabled}>
                      Images not included
                    </Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Feather name="check" size={14} color={COLORS.primary} />
                    <Text style={styles.featureText}>Printable format</Text>
                  </View>
                </View>
                <View style={styles.optionButton}>
                  <Text style={styles.optionButtonText}>Create PDF</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={exportImagesAsZip}
              >
                <View style={styles.optionIconContainer}>
                  <Feather name="image" size={32} color={COLORS.primary} />
                </View>
                <Text style={styles.optionTitle}>Export Images</Text>
                <Text style={styles.optionDescription}>
                  Export all images from your journal entries as a separate zip
                  file that you can save to your device.
                </Text>
                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <Feather name="x" size={14} color={COLORS.textMuted} />
                    <Text style={styles.featureTextDisabled}>
                      No journal text
                    </Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Feather name="check" size={14} color={COLORS.primary} />
                    <Text style={styles.featureText}>All images included</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Feather name="check" size={14} color={COLORS.primary} />
                    <Text style={styles.featureText}>Organized by date</Text>
                  </View>
                </View>
                <View style={styles.optionButton}>
                  <Text style={styles.optionButtonText}>Export Images</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Feather
                name="info"
                size={20}
                color={COLORS.primary}
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                Your data never leaves your device during export. Files are
                created locally and only shared when you choose to.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Export Completion Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCompletionModal}
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View className="flex-row w-full justify-end items-center mb-4">
                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={() => {
                    setShowCompletionModal(false);
                    resetExportState();
                  }}
                >
                  <AntDesign name="close" size={24} color="black" />
                </TouchableOpacity>
              </View>
              <View style={styles.successIconContainer}>
                <Feather name="check-circle" size={40} color={COLORS.primary} />
              </View>
              <Text style={styles.modalTitle}>Export Complete!</Text>
            </View>

            <Text style={styles.modalDescription}>
              {exportType === "json"
                ? "Your journal backup has been created successfully."
                : exportType === "pdf"
                ? "Your journal PDF has been created successfully."
                : "Your journal images have been exported successfully."}
            </Text>

            <Text style={styles.modalFilename}>{exportFileName}</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalPrimaryButton, { flex: 2 }]}
                onPress={() => {
                  shareExportedFile();
                  setShowCompletionModal(false);
                }}
              >
                <Feather
                  name="share-2"
                  size={16}
                  color={COLORS.white}
                  style={styles.modalButtonIcon}
                />
                <Text style={styles.modalPrimaryButtonText}>Share/Save</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHelpText}>
              Use the "Share" option to save the file to your device or send it
              to another app.
            </Text>
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

  modalHelpText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
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
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 10,
    marginBottom: 20,
    textAlign: "center",
  },
  optionsContainer: {
    marginBottom: 30,
  },
  optionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
    lineHeight: 20,
  },
  featureList: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
  },
  featureTextDisabled: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  optionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  optionButtonText: {
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
  infoBox: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  successIconContainer: {
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 22,
  },
  modalFilename: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 20,
    padding: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 6,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalPrimaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginLeft: 8,
  },
  modalPrimaryButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 16,
  },
  modalSecondaryButton: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryButtonText: {
    color: COLORS.textLight,
    fontWeight: "600",
    fontSize: 16,
  },
  modalActionButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginHorizontal: 8,
  },
  modalActionButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 16,
  },
  modalButtonIcon: {
    marginRight: 6,
  },
});

export default ExportDataScreen;
