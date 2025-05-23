import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useTheme } from "../context/ThemeContext";
import TabNavigator from "./TabNavigator";
import TimelineScreen from "../screens/TimelineScreen";
import AllEntriesScreen from "../screens/AllEntriesScreen";
import CreateEntryScreen from "../screens/CreateEntryScreen";
import SettingsScreen from "../screens/Settings";
import AboutAppScreen from "../screens/AboutApp";
import HomeScreen from "../screens/HomeScreen";
import ExportDataScreen from "../screens/ExportDataScreen";
import ImportDataScreen from "../screens/ImportDataScreen";
import UpdatesScreen from "../screens/UpdatesScreen";
import { DataManagementScreen } from "../components/DataManagementScreen";

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { theme } = useTheme();

  return (
    <NavigationContainer
      theme={{
        dark: theme.isDark,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.card,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.primary,
        },
      }}
    >
      <Stack.Navigator
        initialRouteName="Main"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="AllEntries" component={AllEntriesScreen} />
        <Stack.Screen name="Timeline" component={TimelineScreen} />
        <Stack.Screen name="CreateEntry" component={CreateEntryScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="AboutApp" component={AboutAppScreen} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="ExportData" component={ExportDataScreen} />
        <Stack.Screen name="ImportData" component={ImportDataScreen} />
        <Stack.Screen name="Updates" component={UpdatesScreen} />
        <Stack.Screen name="DataManagement" component={DataManagementScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
