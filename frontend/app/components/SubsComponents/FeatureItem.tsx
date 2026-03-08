import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme/colors';
import { useThemeColors } from '../../store/themeStore';

interface FeatureItemProps {
  text: string;
  included: boolean;
}

export function FeatureItem({ text, included }: FeatureItemProps) {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          included ? styles.iconIncluded : styles.iconExcluded,
        ]}
      >
        {included ? (
          <Ionicons name="checkmark" size={12} color={themeColors.primary} />
        ) : (
          <Ionicons name="close" size={12} color={themeColors.mutedForeground} />
        )}
      </View>
      <Text style={[styles.text, !included && styles.textExcluded]}>{text}</Text>
    </View>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  iconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconIncluded: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)', // Легкий синий фон
  },
  iconExcluded: {
    backgroundColor: tc.secondary,
  },
  text: {
    fontSize: typography.sm,
    color: tc.foreground,
    flex: 1,
    lineHeight: 18,
  },
  textExcluded: {
    color: tc.mutedForeground,
    textDecorationLine: 'line-through',
  },
});
