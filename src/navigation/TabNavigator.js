import React, { useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Animated,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTheme } from "../context/ThemeContext";
import { Feather } from "@expo/vector-icons";

// Import screens
import HomeScreen from "../screens/HomeScreen";
import CreateEntryScreen from "../screens/CreateEntryScreen";
import GalleryScreen from "../screens/GalleryScreen";

const Tab = createBottomTabNavigator();

// Custom tab bar component
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { theme } = useTheme();

  // Create all animation values at once - this ensures hook count consistency
  const animation0 = useRef(
    new Animated.Value(state.index === 0 ? 1 : 0)
  ).current;
  const animation1 = useRef(
    new Animated.Value(state.index === 1 ? 1 : 0)
  ).current;
  const animation2 = useRef(
    new Animated.Value(state.index === 2 ? 1 : 0)
  ).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  // Create a stable array reference for animations
  const animationArray = [animation0, animation1, animation2];

  // Update animations when selected tab changes
  useEffect(() => {
    // Animate the selected tab
    Animated.timing(animationArray[state.index], {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // Reset other tabs
    for (let i = 0; i < 3; i++) {
      if (i !== state.index) {
        Animated.timing(animationArray[i], {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [state.index, animation0, animation1, animation2]);

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: theme.colors.tabBar || "#FFFFFF",
          borderTopColor: theme.colors.border || "#E0E0E0",
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel || options.title || route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Center button (Create Entry) is special
        const isCreateButton = route.name === "CreateEntry";

        const onPressIn = () => {
          if (isCreateButton) {
            Animated.spring(scaleAnimation, {
              toValue: 0.9,
              useNativeDriver: true,
            }).start();
          }
        };

        const onPressOut = () => {
          if (isCreateButton) {
            Animated.spring(scaleAnimation, {
              toValue: 1,
              friction: 5,
              tension: 40,
              useNativeDriver: true,
            }).start();
          }
        };

        // Define which icon to show based on route name
        const getIcon = () => {
          const size = isCreateButton ? 24 : 22;
          const color = isFocused
            ? theme.colors.primary || "#6200EE"
            : theme.colors.textLight || "#757575";

          switch (route.name) {
            case "Home":
              return <Feather name="home" size={size} color={color} />;
            case "Gallery":
              return <Feather name="image" size={size} color={color} />;
            case "CreateEntry":
              return <Feather name="edit-3" size={size} color="#fff" />;
            default:
              return null;
          }
        };

        // Get the appropriate animation for this tab
        const indicatorOpacity = animationArray[index];

        if (isCreateButton) {
          return (
            <Animated.View
              key={index}
              style={[
                styles.createButtonContainer,
                {
                  transform: [{ scale: scaleAnimation }],
                },
              ]}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Create new journal entry"
                onPress={onPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={[
                  styles.createButton,
                  { backgroundColor: theme.colors.primary || "#6200EE" },
                ]}
              >
                {getIcon()}
              </TouchableOpacity>
            </Animated.View>
          );
        }

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabButton}
          >
            <View style={styles.tabContent}>
              {getIcon()}

              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused
                      ? theme.colors.primary || "#6200EE"
                      : theme.colors.textLight || "#757575",
                    opacity: isFocused ? 1 : 0.7,
                  },
                ]}
              >
                {label}
              </Text>

              {/* Fixed width indicator with animated opacity */}
              <Animated.View
                style={[
                  styles.tabIndicator,
                  {
                    opacity: indicatorOpacity,
                    backgroundColor: theme.colors.primary || "#6200EE",
                  },
                ]}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Tab Navigator
const TabNavigator = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary || "#6200EE",
        tabBarInactiveTintColor: theme.colors.textLight || "#757575",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "Journal" }}
      />
      <Tab.Screen
        name="CreateEntry"
        component={CreateEntryScreen}
        options={{
          tabBarLabel: "Write",
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            // For now, let's navigate to a smart create entry
            navigation.navigate("CreateEntry", {
              mode: "edit",
              entry: null,
              checkTodayEntry: true, // Flag to check for today's entry in CreateEntry screen
            });
          },
        })}
      />
      <Tab.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{ tabBarLabel: "Gallery" }}
      />
      {/* Removed Milestones and Progress tabs */}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    height: 80,
    borderTopWidth: 1,
    elevation: 10,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    paddingHorizontal: 10,
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 10,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  createButtonContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -40,
    height: 80,
    width: 60,
  },
  createButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  tabIndicator: {
    height: 3,
    width: 20,
    borderRadius: 3,
    marginTop: 4,
  },
});

export default TabNavigator;
