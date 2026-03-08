'use client';

import React from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme/colors';

/**
 * DiscoveryToggle
 * 
 * Controls the personalization level of event feeds.
 * 
 * When ON: Feeds adapt to user's selected interests,
 * prioritizing events that match their preferences.
 * 
 * When OFF: Feeds show all events equally without
 * any personalization or interest-based filtering.
 */

interface DiscoveryToggleProps {
  isPersonalized: boolean;
  onToggle: (value: boolean) => void;
}

export function DiscoveryToggle({
  isPersonalized,
  onToggle,
}: DiscoveryToggleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Discovery Preferences</Text>
      <Text style={styles.sectionDescription}>
        Control how events are recommended to you
      </Text>

      <View style={styles.toggleRow}>
        <View style={styles.toggleTextContainer}>
          <Text style={styles.toggleLabel}>Personalize feeds based on my interests</Text>
          <Text style={styles.toggleDescription}>
            {isPersonalized
              ? 'Feeds adapt to your interests'
              : 'All events shown equally'}
          </Text>
        </View>
        <Switch
          value={isPersonalized}
          onValueChange={onToggle}
          trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
          thumbColor={isPersonalized ? colors.chartPrimary : '#F4F4F5'}
          ios_backgroundColor="#D1D5DB"
        />
      </View>
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  toggleDescription: {
    fontSize: typography.sm,
    color: '#6B7280',
    marginTop: 2,
  },
});
