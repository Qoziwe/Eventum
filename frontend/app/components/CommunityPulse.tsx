import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, spacing, borderRadius, typography } from "../theme/colors"
import { useThemeColors } from '../store/themeStore';

interface CommunityPulseProps {
  title?: string
  subtitle?: string
  onViewAll?: () => void
  children?: React.ReactNode
}

export default function CommunityPulse({
  title = "Сообщества",
  subtitle = "Активные сообщества по интересам",
  onViewAll,
  children,
}: CommunityPulseProps) {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  return (
    <View style={styles.container}>
      {/* View All Button */}
      <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
        <Text style={styles.viewAllText}>Все сообщества</Text>
        <Ionicons name="arrow-forward" size={16} color={themeColors.foreground} />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveIndicator} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>{subtitle}</Text>

      {/* Communities List - Empty container */}
      <View style={styles.communitiesList}>{children}</View>
    </View>
  )
}

const createStyles = (tc: any) => StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: tc.border,
    borderRadius: borderRadius.lg,
  },
  viewAllText: {
    fontSize: typography.sm,
    color: tc.foreground,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: typography.xl,
    fontWeight: "700",
    color: tc.foreground,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: tc.secondary,
    borderRadius: borderRadius.md,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: tc.accent,
  },
  liveText: {
    fontSize: typography.xs,
    fontWeight: "500",
    color: tc.foreground,
  },
  subtitle: {
    fontSize: typography.xs,
    color: tc.mutedForeground,
  },
  communitiesList: {
    gap: spacing.md,
    minHeight: 100,
  },
})
