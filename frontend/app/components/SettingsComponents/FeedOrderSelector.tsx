import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme/colors';

/**
 * FeedOrderSelector
 * 
 * Controls how events are ordered across ALL feeds.
 * 
 * Options:
 * - Random order (default): Events appear in randomized order
 * - Oldest to newest: Sorted by event creation date ascending
 * - Newest to oldest: Sorted by event creation date descending
 * 
 * NOTE: When sorting by creation date, events are secondarily
 * ordered by event happening datetime to maintain visual consistency.
 * This ensures events on the same creation date still appear in
 * a logical chronological order based on when they occur.
 */

export type FeedOrderOption = 'random' | 'oldest_first' | 'newest_first';

interface FeedOrderSelectorProps {
  selectedOrder: FeedOrderOption;
  onOrderChange: (order: FeedOrderOption) => void;
}

const ORDER_OPTIONS: { value: FeedOrderOption; label: string; description: string }[] = [
  {
    value: 'random',
    label: 'Random',
    description: 'Events in randomized order',
  },
  {
    value: 'oldest_first',
    label: 'Oldest first',
    description: 'By creation date, oldest first',
  },
  {
    value: 'newest_first',
    label: 'Newest first',
    description: 'By creation date, newest first',
  },
];

export function FeedOrderSelector({
  selectedOrder,
  onOrderChange,
}: FeedOrderSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Feed Ordering</Text>
      <Text style={styles.sectionDescription}>
        Control how events are ordered in all feeds
      </Text>

      <View style={styles.optionsContainer}>
        {ORDER_OPTIONS.map((option) => {
          const isSelected = selectedOrder === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionItem,
                isSelected && styles.optionItemSelected,
              ]}
              onPress={() => onOrderChange(option.value)}
              activeOpacity={0.7}
            >
              <View style={styles.radioOuter}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <View style={styles.optionTextContainer}>
                <Text
                  style={[
                    styles.optionLabel,
                    isSelected && styles.optionLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
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
  optionsContainer: {
    gap: spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionItemSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: colors.chartPrimary,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.chartPrimary,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  optionLabelSelected: {
    color: colors.chartAccent,
  },
  optionDescription: {
    fontSize: typography.sm,
    color: '#6B7280',
    marginTop: 2,
  },
});
