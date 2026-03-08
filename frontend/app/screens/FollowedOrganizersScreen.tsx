import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../store/userStore';
import { useEventStore } from '../store/eventStore';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';
import Header from '../components/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FollowedOrganizersScreen() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const navigation = useNavigation<any>();
  const { user, registeredUsers, toggleFollow } = useUserStore();
  const { events } = useEventStore();
  const insets = useSafeAreaInsets();

  const followedOrganizers = useMemo(() => {
    const ids = user.followingOrganizerIds || [];
    return ids
      .map(id => {
        // Ищем в зарегистрированных
        const regUser = registeredUsers.find(u => u.id === id);
        if (regUser) return regUser;

        // Если нет, ищем в событиях (мок-авторы)
        const eventWithOrg = events.find(e => e.organizerId === id);
        if (eventWithOrg) {
          return {
            id: id,
            name: eventWithOrg.organizerName,
            avatarInitials: eventWithOrg.organizerName[0].toUpperCase(),
            location: 'Алматы',
          };
        }
        return null;
      })
      .filter(item => item !== null);
  }, [user.followingOrganizerIds, registeredUsers, events]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={themeColors.background} />

      <Header
        title="Мои авторы"
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      <FlatList
        data={followedOrganizers}
        keyExtractor={item => item!.id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + 60 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate('OrganizerProfile', { organizerId: item!.id })
            }
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item!.avatarInitials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item!.name}</Text>
              <Text style={styles.location}>{item!.location}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleFollow(item!.id)}>
              <Text style={styles.unfollow}>Отписаться</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="people-outline"
              size={60}
              color={themeColors.mutedForeground}
            />
            <Text style={styles.emptyText}>Вы еще ни на кого не подписаны</Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: tc.background },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tc.card,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: tc.border,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: tc.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '700' },
  name: { fontWeight: '700', fontSize: 15 },
  location: { fontSize: typography.sm, color: tc.mutedForeground },
  unfollow: { color: tc.destructive, fontWeight: '600', fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 12, color: tc.mutedForeground },
});
