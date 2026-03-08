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
 * InterestsSection
 * 
 * Displays the user's selected interests as read-only tags
 * with an option to edit them.
 * 
 * This is UI-only; editing navigates to a separate screen
 * (not implemented here).
 */

interface InterestsSectionProps {
  interests: string[];
  onEditPress: () => void;
}

export function InterestsSection({
  interests,
  onEditPress,
}: InterestsSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>Interests & Preferences</Text>
          <Text style={styles.sectionDescription}>
            Topics that personalize your feed
          </Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={onEditPress}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil" size={14} color="#6366F1" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {interests.length > 0 ? (
        <View style={styles.tagsContainer}>
          {interests.map((interest, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{interest}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={24} color="#9CA3AF" />
          <Text style={styles.emptyText}>No interests selected</Text>
          <Text style={styles.emptySubtext}>
            Tap Edit to add interests for better recommendations
          </Text>
        </View>
      )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.chartPrimary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: typography.base,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: typography.sm,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
});
