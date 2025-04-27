import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ScrollView,
  Modal as RNModal
} from 'react-native';
import Modal from 'react-native-modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, differenceInDays, addMonths, isAfter } from 'date-fns';
import { Feather } from "@expo/vector-icons";

// Constants
const COLORS = {
  primary: "#3DB389",
  primaryLight: "#E5F5EE",
  primaryDark: "#1A6B52",
  background: "#F8FDFB",
  text: "#1E3A32",
  textLight: "#4F6E64",
  textMuted: "#8A9E97",
  white: "#FFFFFF",
  border: "rgba(0,0,0,0.05)",
  error: "#E07D6B",
  tooltip: "rgba(30, 58, 50, 0.95)",
};

const MAX_DATE_CHANGES = 3;
const GRACE_PERIOD_DAYS = 30;

const ServiceInfoModal = ({ isVisible, onSave, onSkip, existingInfo = null }) => {
  const [name, setName] = useState('');
  const [stateOfDeployment, setStateOfDeployment] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateChangesLeft, setDateChangesLeft] = useState(MAX_DATE_CHANGES);
  const [dateFirstSet, setDateFirstSet] = useState(null);
  const [errors, setErrors] = useState({});
  const [showTooltip, setShowTooltip] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Initialize with existing info if available
  useEffect(() => {
    if (existingInfo) {
      setName(existingInfo.name || '');
      setStateOfDeployment(existingInfo.stateOfDeployment || '');
      
      if (existingInfo.startDate) {
        setStartDate(new Date(existingInfo.startDate));
        setIsEditMode(true);
      }
      
      if (existingInfo.dateChangesLeft !== undefined) {
        setDateChangesLeft(existingInfo.dateChangesLeft);
      }
      
      if (existingInfo.dateFirstSet) {
        setDateFirstSet(new Date(existingInfo.dateFirstSet));
      }
    }
  }, [existingInfo, isVisible]);

  const isWithinGracePeriod = () => {
    if (!dateFirstSet) return true;
    
    const today = new Date();
    const graceEndDate = addMonths(dateFirstSet, 1);
    return isAfter(graceEndDate, today);
  };

  const canChangeDate = () => {
    return dateChangesLeft > 0 || isWithinGracePeriod();
  };

  const validateForm = () => {
    let isValid = true;
    let newErrors = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = "Please enter your name";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    // Calculate end date (one year from start date)
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Set initial date first set timestamp if not already set
    const firstSetDate = dateFirstSet || new Date();

    // Calculate remaining date changes, but don't deduct if within grace period
    let remainingChanges = dateChangesLeft;
    if (isEditMode && !isWithinGracePeriod()) {
      remainingChanges -= 1;
    }

    onSave({
      name,
      stateOfDeployment,
      startDate,
      endDate,
      totalDays: 365,
      dateChangesLeft: remainingChanges,
      dateFirstSet: firstSetDate
    });
  };

  const handleDateChange = (event, selectedDate) => {
    if (selectedDate) {
      setStartDate(selectedDate);
    }
    setShowDatePicker(Platform.OS === 'ios');
  };

  const showDatepicker = () => {
    if (!canChangeDate() && isEditMode) {
      Alert.alert(
        "Date Changes Limited",
        "You've reached the maximum number of times you can change your service start date.",
        [{ text: "OK" }]
      );
      return;
    }
    setShowDatePicker(true);
  };

  const toggleTooltip = () => {
    setShowTooltip(!showTooltip);
  };

  const getDateChangeText = () => {
    if (isWithinGracePeriod()) {
      return "Unlimited changes (First month grace period)";
    }
    return `${dateChangesLeft} change${dateChangesLeft !== 1 ? 's' : ''} remaining`;
  };

  return (
    <Modal
      isVisible={isVisible}
      backdropOpacity={0.6}
      avoidKeyboard
      useNativeDriver
      style={styles.modal}
    >
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.headerIcon}>
            <Feather name="book-open" size={48} color={COLORS.primary} />
          </View>
          
          <Text style={styles.title}>
            {isEditMode ? "Edit Your Details" : "Welcome to Bettina"}
          </Text>
          {!isEditMode && <Text style={styles.tagline}>Your NYSC Memories Vault</Text>}
          
          {!isEditMode && (
            <Text style={styles.subtitle}>
              Let's set up your service year journal to capture all your memorable moments
            </Text>
          )}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Your Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errors.name) {
                    setErrors({...errors, name: null});
                  }
                }}
                placeholder="What should we call you?"
                placeholderTextColor={COLORS.textMuted}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  Service Start Date <Text style={styles.required}>*</Text>
                </Text>
                
                {isEditMode && (
                  <View style={styles.dateChangesContainer}>
                    <Text style={styles.dateChangesText}>
                      {getDateChangeText()}
                    </Text>
                    <TouchableOpacity 
                      onPress={toggleTooltip} 
                      style={styles.infoButton}
                    >
                      <Feather name="info" size={14} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.dateInput, 
                  errors.startDate && styles.inputError,
                  (!canChangeDate() && isEditMode) && styles.disabledDateInput
                ]} 
                onPress={showDatepicker}
                disabled={!canChangeDate() && isEditMode}
              >
                <Text style={[
                  styles.dateText,
                  (!canChangeDate() && isEditMode) && styles.disabledDateText
                ]}>
                  {format(startDate, 'MMMM d, yyyy')}
                </Text>
                <Feather 
                  name="calendar" 
                  size={18} 
                  color={(!canChangeDate() && isEditMode) ? COLORS.textMuted : COLORS.primary} 
                />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                State of Deployment <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={stateOfDeployment}
                onChangeText={setStateOfDeployment}
                placeholder="Where are you serving?"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            {!isEditMode && (
              <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                <Text style={styles.skipButtonText}>Set Up Later</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.saveButton, isEditMode && styles.fullWidthButton]} 
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>
                {isEditMode ? "Save Changes" : "Continue"}
              </Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.privacyNote}>
            Your memories are stored locally on your device
          </Text>
        </ScrollView>
        
        {/* Date Change Explanation Tooltip */}
        <RNModal
          transparent={true}
          visible={showTooltip}
          animationType="fade"
          onRequestClose={toggleTooltip}
        >
          <TouchableOpacity 
            style={styles.tooltipOverlay} 
            activeOpacity={1} 
            onPress={toggleTooltip}
          >
            <View style={styles.tooltipContainer}>
              <Text style={styles.tooltipTitle}>About Service Date Changes</Text>
              <Text style={styles.tooltipText}>
                Your service start date is important as it affects your entire service timeline.
              </Text>
              <Text style={styles.tooltipText}>
                • During your first month, you can make unlimited changes to adjust for any initial setup mistakes.
              </Text>
              <Text style={styles.tooltipText}>
                • After the first month, you have {MAX_DATE_CHANGES} changes available.
              </Text>
              <Text style={styles.tooltipText}>
                • This limit helps maintain the integrity of your service timeline and ensures your memories are accurately preserved.
              </Text>
              <TouchableOpacity 
                style={styles.tooltipCloseButton}
                onPress={toggleTooltip}
              >
                <Text style={styles.tooltipCloseText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </RNModal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  headerIcon: {
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    // alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  required: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  optional: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    marginTop: 4,
    marginLeft: 4,
  },
  dateInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disabledDateInput: {
    backgroundColor: COLORS.border,
    borderColor: COLORS.border,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.text,
  },
  disabledDateText: {
    color: COLORS.textMuted,
  },
  dateChangesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateChangesText: {
    fontSize: 10,
    color: COLORS.textLight,
    marginRight: 4,
  },
  infoButton: {
    padding: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  skipButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  skipButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  fullWidthButton: {
    flex: 1,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  privacyNote: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  tooltipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltipContainer: {
    backgroundColor: COLORS.tooltip,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 350,
  },
  tooltipTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },
  tooltipText: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  tooltipCloseButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  tooltipCloseText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  }
});

export default ServiceInfoModal;