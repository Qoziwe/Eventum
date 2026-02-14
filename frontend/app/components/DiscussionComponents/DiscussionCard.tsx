import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme/colors';

interface DiscussionCardProps {
  authorName: string;
  categoryName: string;
  content: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  timestamp: string;
  onPress: () => void;
  moderationStatus?: string;
}

export default function DiscussionCard({
  authorName,
  categoryName,
  content,
  upvotes,
  downvotes,
  commentCount,
  timestamp,
  onPress,
  moderationStatus,
}: DiscussionCardProps) {
  const rating = upvotes - downvotes;

  // Форматирование времени (упрощенное)
  const timeLabel = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.headerRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{categoryName}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {moderationStatus && moderationStatus !== 'approved' && (
            <View style={[
              styles.moderationBadge,
              moderationStatus === 'pending' ? styles.moderationPending : styles.moderationRejected
            ]}>
              <Ionicons
                name={moderationStatus === 'pending' ? 'time-outline' : 'close-circle-outline'}
                size={10}
                color={moderationStatus === 'pending' ? '#D97706' : '#DC2626'}
              />
              <Text style={[
                styles.moderationText,
                { color: moderationStatus === 'pending' ? '#D97706' : '#DC2626' }
              ]}>
                {moderationStatus === 'pending' ? 'На модерации' : 'Отклонено'}
              </Text>
            </View>
          )}
          <Text style={styles.timeText}>{timeLabel}</Text>
        </View>
      </View>

      <Text style={styles.authorText}>{authorName}</Text>
      <Text style={styles.contentText} numberOfLines={2}>
        {content}
      </Text>

      <View style={styles.footer}>
        <View style={styles.statGroup}>
          <Ionicons name="arrow-up" size={14} color={colors.light.primary} />
          <Text style={[styles.statText, { color: colors.light.primary }]}>{rating}</Text>
        </View>
        <View style={styles.statGroup}>
          <Ionicons
            name="chatbubble-outline"
            size={14}
            color={colors.light.mutedForeground}
          />
          <Text style={styles.statText}>{commentCount} ответов</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: colors.light.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.light.primary,
    textTransform: 'uppercase',
  },
  timeText: {
    fontSize: 11,
    color: colors.light.mutedForeground,
  },
  authorText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.foreground,
    marginBottom: 4,
  },
  contentText: {
    fontSize: 15,
    color: colors.light.foreground,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: 10,
  },
  statGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.mutedForeground,
  },
  moderationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  moderationPending: {
    backgroundColor: '#FEF3C7',
  },
  moderationRejected: {
    backgroundColor: '#FEE2E2',
  },
  moderationText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
