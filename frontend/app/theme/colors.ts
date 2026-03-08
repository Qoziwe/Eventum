export const colors = {
  // Constants
  white: "#FFFFFF",
  black: "#000000",
  shadow: "#000000",
  overlay: "rgba(0,0,0,0.5)",

  // Light Theme
  light: {
    background: "#FFFFFF",
    foreground: "#0A0A0A",
    card: "#FFFFFF",
    cardForeground: "#0A0A0A",
    primary: "#0A0A0A",
    primaryForeground: "#FAFAFA",
    secondary: "#F5F5F5",
    secondaryForeground: "#0A0A0A",
    muted: "#F5F5F5",
    mutedForeground: "#737373",
    accent: "#F5F5F5",
    accentForeground: "#0A0A0A",
    destructive: "#EF4444",
    border: "#E5E5E5",
    input: "#E5E5E5",
  },
  // Dark Theme
  dark: {
    background: "#121212",
    foreground: "#EAEAEA",
    card: "#1A1A1A",
    cardForeground: "#EAEAEA",
    primary: "#EAEAEA",
    primaryForeground: "#121212",
    secondary: "#2A2A2A",
    secondaryForeground: "#EAEAEA",
    muted: "#2A2A2A",
    mutedForeground: "#A3A3A3",
    accent: "#2A2A2A",
    accentForeground: "#EAEAEA",
    destructive: "#DC2626",
    border: "#2A2A2A",
    input: "#2A2A2A",
  },
  // Category Colors
  categories: {
    music: "#8B5CF6",
    tech: "#3B82F6",
    art: "#EC4899",
    food: "#F97316",
    business: "#22C55E",
    sport: "#EF4444",
    health: "#14B8A6",
  },
  // Semantic Colors
  success: "#10B981",
  successLight: "#F0FDF4",
  successBorder: "#BBF7D0",
  successText: "#166534",
  warning: "#FBBF24",
  warningLight: "#FEF9C3",
  warningText: "#92400E",
  info: "#3B82F6",
  infoLight: "#EFF6FF",
  infoBorder: "#DBEAFE",
  infoText: "#1E40AF",
  errorLight: "#FEE2E2",
  errorLightAlt: "#FEF2F2",
  errorBorder: "#FECACA",
  errorText: "#991B1B",
  gold: "#FFD700",
  pink: "#F472B6",
  // Chart Colors
  chartPrimary: "#6366F1",
  chartAccent: "#4F46E5",
  chartMuted: "#6B7280",
  chartBackground: "#F3F4F6",
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
}

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  "2xl": 16,
  "3xl": 30,
  full: 9999,
}

export const typography = {
  // Font sizes
  xs: 10,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 18,
  "2xl": 20,
  "3xl": 24,
  "4xl": 30,
  "5xl": 36,
}

export const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  lg: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
}
