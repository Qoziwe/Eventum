import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

/**
 * AppPreferencesSection
 * 
 * General app-wide settings:
 * - Theme selection (Light / Dark / System)
 * - Language selection (placeholder dropdown)
 * 
 * No persistence logic; state managed by parent.
 */

export type ThemeOption = 'light' | 'dark' | 'system';
export type LanguageOption = 'en' | 'uk' | 'ru';

interface AppPreferencesSectionProps {
  selectedTheme: ThemeOption;
  selectedLanguage: LanguageOption;
  onThemeChange: (theme: ThemeOption) => void;
  onLanguagePress: () => void;
}

const THEME_OPTIONS: { value: ThemeOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

const LANGUAGE_LABELS: Record<LanguageOption, string> = {
  en: 'English',
  uk: 'Українська',
  ru: 'Русский',
};

export function AppPreferencesSection({
  selectedTheme,
  selectedLanguage,
  onThemeChange,
  onLanguagePress,
}: AppPreferencesSectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>App Preferences</Text>
      <Text style={styles.sectionDescription}>
        Customize your app experience
      </Text>

      {/* Theme Selection */}
      <Text style={styles.subsectionLabel}>Theme</Text>
      <View style={styles.segmentedControl}>
        {THEME_OPTIONS.map((option) => {
          const isSelected = selectedTheme === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.segmentItem,
                isSelected && styles.segmentItemSelected,
              ]}
              onPress={() => onThemeChange(option.value)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={option.icon}
                size={16}
                color={isSelected ? colors.chartPrimary : '#6B7280'}
              />
              <Text
                style={[
                  styles.segmentLabel,
                  isSelected && styles.segmentLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Language Selection */}
      <Text style={styles.subsectionLabel}>Language</Text>
      <TouchableOpacity
        style={styles.languageSelector}
        onPress={onLanguagePress}
        activeOpacity={0.7}
      >
        <View style={styles.languageLeft}>
          <Ionicons name="language-outline" size={20} color="#6B7280" />
          <Text style={styles.languageText}>
            {LANGUAGE_LABELS[selectedLanguage]}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  subsectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.sm,
    marginTop: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    gap: spacing.xs,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  segmentItemSelected: {
    backgroundColor: colors.white,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  segmentLabelSelected: {
    color: colors.chartPrimary,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  languageText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
});
