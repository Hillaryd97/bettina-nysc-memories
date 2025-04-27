// import typography from './typography';
// import space from './spacing';

// Define both light and dark color palettes with soft green theme
const lightColors = {
    primary: "#5B9A8B",      // Soft green
    primaryDark: "#4A7E72",  // Darker version of primary
    primaryLight: "#E8F4F1", // Very light green
    secondary: "#3AAE7F",    // Slightly different green
    secondaryLight: "#D4E2C9", // Very light secondary
    background: "#FCFDF8",   // Light off-white with green tint
    surface: "#FFFFFF",      // White
    card: "#FFFFFF",         // Card background
    text: "#2D483E",         // Dark green-gray (primary text)
    textLight: "#6B807A",    // Medium green-gray (secondary text)
    border: "#E1E9E6",       // Light border color
    error: "#F44336",        // Error messages (kept for consistency)
    success: "#4CAF50",      // Success messages
    warning: "#FF9800",      // Warning messages
    info: "#2196F3",         // Info messages
    disabled: "#CCD5D2",     // Disabled state color
    icon: "#5B9A8B",         // Icons use primary color
    tabBar: "#FFFFFF",       // White tab bar
    statusBar: "#5B9A8B",    // Status bar uses primary color
    placeholder: "#A3B5B0",  // Placeholder text color
  };
  
  const darkColors = {
    primary: "#3AAE7F",      // Slightly lighter green for dark mode
    primaryDark: "#5B9A8B",  // Regular primary becomes dark in dark mode
    primaryLight: "#2D483E", // Darker green, but light relative to background
    secondary: "#5B9A8B",    // Secondary color
    secondaryLight: "#3D5F55", // Darker secondary light
    background: "#1A2923",   // Dark background with green tint
    surface: "#263C33",      // Surface color, slightly lighter than background
    card: "#263C33",         // Card background
    text: "#E8F4F1",         // Light text color
    textLight: "#A3B5B0",    // Secondary text color
    border: "#3D5F55",       // Border color for dark mode
    error: "#EF5350",        // Error messages
    success: "#66BB6A",      // Success messages
    warning: "#FFA726",      // Warning messages
    info: "#42A5F5",         // Info messages
    disabled: "#4D5E59",     // Disabled state color
    icon: "#3AAE7F",         // Icons use primary color
    tabBar: "#263C33",       // Tab bar matches surface
    statusBar: "#1A2923",    // Status bar matches background
    placeholder: "#6B807A",  // Placeholder text color
  };
  
  // Color definitions for service month cards (light mode)
  export const serviceMonthColors = {
    april: { bg: "#C9E7DF", text: "#5B9A8B" },    // Pastel green
    may: { bg: "#D4E2C9", text: "#739268" },      // Pastel lime
    june: { bg: "#E7E2C9", text: "#A39E66" },     // Pastel yellow-green
    july: { bg: "#E7D4C9", text: "#A37B66" },     // Pastel peach
    august: { bg: "#E7C9D4", text: "#A36683" },   // Pastel pink
    september: { bg: "#D4C9E7", text: "#6E5FA3" }, // Pastel purple
    october: { bg: "#C9D4E7", text: "#5F76A3" },  // Pastel blue
    november: { bg: "#C9E7E2", text: "#5FA3A0" }, // Pastel teal
    december: { bg: "#D9E7C9", text: "#81A35F" }, // Pastel olive
    january: { bg: "#E7D9C9", text: "#A38A5F" },  // Pastel tan
    february: { bg: "#E7C9CA", text: "#A35F61" }, // Pastel coral
    march: { bg: "#CAC9E7", text: "#615FA3" },    // Pastel indigo
  };
  
  // Light theme
  const lightTheme = {
    colors: lightColors,
  //   typography,
  //   spacing: space,
    isDark: false,
  };
  
  // Dark theme
  const darkTheme = {
    colors: darkColors,
  //   typography,
  //   spacing: space,
    isDark: true,
  };
  
  export { lightTheme, darkTheme };