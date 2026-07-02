export type ThemeColors = {
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryPressed: string;
  primaryDisabled: string;
  danger: string;
  overlay: string;
  navbar: string;
  sidebar: string;
  inputBackground: string;
  inputBorder: string;
  badge: {
    success: { bg: string; text: string };
    warning: { bg: string; text: string };
    error: { bg: string; text: string };
    info: { bg: string; text: string };
    neutral: { bg: string; text: string };
    purple: { bg: string; text: string };
  };
};

export const darkColors: ThemeColors = {
  background: "#101936",
  backgroundSecondary: "#1A2547",
  backgroundTertiary: "#243056",
  surface: "#1E2A4A",
  border: "#2D3A5C",
  textPrimary: "#F0F4FF",
  textSecondary: "#8B9DC3",
  textMuted: "#5A6B8A",
  primary: "#00C9A7",
  primaryPressed: "#00A88C",
  primaryDisabled: "rgba(0, 201, 167, 0.4)",
  danger: "#EF4444",
  overlay: "rgba(16, 25, 54, 0.75)",
  navbar: "#1A2547",
  sidebar: "#101936",
  inputBackground: "#243056",
  inputBorder: "#2D3A5C",
  badge: {
    success: { bg: "rgba(0, 201, 167, 0.15)", text: "#00C9A7" },
    warning: { bg: "rgba(245, 158, 11, 0.15)", text: "#F59E0B" },
    error: { bg: "rgba(239, 68, 68, 0.15)", text: "#EF4444" },
    info: { bg: "rgba(79, 124, 255, 0.15)", text: "#4F7CFF" },
    neutral: { bg: "rgba(100, 116, 139, 0.15)", text: "#94A3B8" },
    purple: { bg: "rgba(139, 92, 246, 0.15)", text: "#8B5CF6" },
  },
};

export const lightColors: ThemeColors = {
  background: "#F4F6FB",
  backgroundSecondary: "#FFFFFF",
  backgroundTertiary: "#E8ECF4",
  surface: "#FFFFFF",
  border: "#D8DEE9",
  textPrimary: "#101936",
  textSecondary: "#4A5568",
  textMuted: "#8896AB",
  primary: "#00C9A7",
  primaryPressed: "#00A88C",
  primaryDisabled: "rgba(0, 201, 167, 0.4)",
  danger: "#EF4444",
  overlay: "rgba(16, 25, 54, 0.45)",
  navbar: "#FFFFFF",
  sidebar: "#101936",
  inputBackground: "#E8ECF4",
  inputBorder: "#D8DEE9",
  badge: {
    success: { bg: "rgba(0, 201, 167, 0.12)", text: "#00A88C" },
    warning: { bg: "rgba(245, 158, 11, 0.12)", text: "#D97706" },
    error: { bg: "rgba(239, 68, 68, 0.12)", text: "#DC2626" },
    info: { bg: "rgba(79, 124, 255, 0.12)", text: "#3B6FE8" },
    neutral: { bg: "rgba(100, 116, 139, 0.12)", text: "#64748B" },
    purple: { bg: "rgba(139, 92, 246, 0.12)", text: "#7C3AED" },
  },
};
