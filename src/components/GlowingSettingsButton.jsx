// Create a new component: src/components/GlowingSettingsButton.jsx
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, View, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import UpdateService from '../services/UpdateService';

const GlowingSettingsButton = ({ onPress, style, iconColor, iconSize = 20 }) => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    checkForUpdates();
    
    // Check every 5 minutes
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hasUpdate) {
      startPulseAnimation();
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasUpdate]);

  const checkForUpdates = async () => {
    try {
      const result = await UpdateService.checkForUpdates();
      setHasUpdate(result.hasUpdate);
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  return (
    <TouchableOpacity onPress={onPress} style={style}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Feather name="settings" size={iconSize} color={iconColor} />
        {hasUpdate && (
          <View style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#FF4444',
          }} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default GlowingSettingsButton;