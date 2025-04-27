/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/navigation/**/*.{js,jsx,ts,tsx}",
    "./src/screens/**/*.{js,jsx,ts,tsx}",
    "./src/context/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#66BB6A",
        primaryDark: "#388E3C",
        primaryLight: "#A5D6A7",
        secondary: "#4CAF50",
        background: "#FFFFFF",
        surface: "#F5F5F5",
        card: "#FFFFFF",
        text: "#333333",
        textLight: "#757575",
        border: "#E0E0E0",
        error: "#D32F2F",
        success: "#43A047",
        warning: "#FFA000",
        info: "#1976D2",
        disabled: "#BDBDBD",
        icon: "#616161",
        tabBar: "#FFFFFF",
        statusBar: "#66BB6A",
      },
      fontFamily: {
        poppins: ["Poppins_400Regular"],
        "poppins-medium": ["Poppins_500Medium"],
        "poppins-semibold": ["Poppins_600SemiBold"],
        "poppins-bold": ["Poppins_700Bold"],
      },
    },
  },
  plugins: [],
};
