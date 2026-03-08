import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useEventStore } from '../../store/eventStore'; // Импортируем стор ивентов
import { useUserStore } from '../../store/userStore';
import EventCard from '../EventCard';
import { spacing, typography, colors, borderRadius } from '../../theme/colors';
import { useThemeColors } from '../../store/themeStore';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function FavoritesList() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const { user, toggleFavorite } = useUserStore();
  const { events } = useEventStore(); // Получаем динамический список всех событий
  const navigation = useNavigation<any>();

  // Фильтруем ивенты по сохраненным ID из общего стора событий
  const favoriteEvents = events.filter(event => user.savedEventIds.includes(event.id));

  if (favoriteEvents.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="heart-outline" size={48} color={themeColors.mutedForeground} />
        </View>
        <Text style={styles.emptyTitle}>В избранном пока пусто</Text>
        <Text style={styles.emptyDescription}>
          Нажимайте на сердечко в карточках событий, чтобы сохранить их здесь
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {favoriteEvents.map(event => (
        <View key={event.id} style={styles.itemWrapper}>
          <EventCard
            {...event}
            style={styles.card}
            onPress={() => navigation.navigate('EventDetail', { ...event })}
          />
          <TouchableOpacity
            style={styles.favoriteInfo}
            onPress={() => toggleFavorite(event.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="heart" size={16} color={themeColors.foreground} />
            <Text style={styles.infoText}>Удалить из избранного</Text>
            <Ionicons
              name="trash-outline"
              size={14}
              color={themeColors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  itemWrapper: {
    marginBottom: spacing.lg,
    backgroundColor: tc.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tc.border,
  },
  card: {
    width: '100%',
    marginBottom: 0,
    borderWidth: 0,
    borderRadius: 0,
  },
  favoriteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: `${tc.primary}05`,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: '700',
    color: tc.foreground,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: tc.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.lg,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: tc.foreground,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: typography.sm,
    color: tc.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
});
