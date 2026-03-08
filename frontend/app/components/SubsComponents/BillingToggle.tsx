import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme/colors';
import { useThemeColors } from '../../store/themeStore';

export type BillingPeriod = '1month' | '3months' | '6months' | 'yearly';

interface BillingToggleProps {
  value: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
}

interface BillingOption {
  period: BillingPeriod;
  label: string;
  discount?: string;
}

const BILLING_OPTIONS: BillingOption[] = [
  { period: '1month', label: '1 месяц' },
  { period: '3months', label: '3 месяца', discount: '-7%' },
  { period: '6months', label: '6 месяцев', discount: '-13%' },
  { period: 'yearly', label: '1 год', discount: '-20%' },
];

export function BillingToggle({ value, onChange }: BillingToggleProps) {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  return (
    <View style={styles.container}>
      <View style={styles.optionsRow}>
        {BILLING_OPTIONS.map(option => {
          const isActive = value === option.period;

          return (
            <TouchableOpacity
              key={option.period}
              style={[styles.option, isActive && styles.optionActive]}
              onPress={() => onChange(option.period)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                {option.label}
              </Text>

              {option.discount && (
                <View
                  style={[styles.discountBadge, isActive && styles.discountBadgeActive]}
                >
                  <Text
                    style={[styles.discountText, isActive && styles.discountTextActive]}
                  >
                    {option.discount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: tc.background,
  },
  optionsRow: {
    flexDirection: 'row',
    backgroundColor: tc.secondary,
    borderRadius: borderRadius.lg,
    padding: 4,
    height: 64, // Оптимальная высота (было 80, слишком много, или 50 - мало)
  },
  option: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    gap: 2,
  },
  optionActive: {
    backgroundColor: tc.card,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  optionText: {
    fontSize: 13, // Увеличил шрифт
    fontWeight: '500',
    color: tc.mutedForeground,
    textAlign: 'center',
  },
  optionTextActive: {
    color: tc.foreground,
    fontWeight: '700',
  },
  discountBadge: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  discountBadgeActive: {
    backgroundColor: tc.primary,
  },
  discountText: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: tc.primary,
  },
  discountTextActive: {
    color: tc.primaryForeground,
  },
});
