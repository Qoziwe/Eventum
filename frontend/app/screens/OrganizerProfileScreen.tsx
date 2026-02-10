import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useUserStore } from '../store/userStore';
import { useEventStore } from '../store/eventStore';
import { useToast } from '../components/ToastProvider';
import EventCard from '../components/EventCard';
import Header from '../components/Header'; // Импорт Header

export default function OrganizerProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    user: currentUser,
    logout,
    clearAllData,
    registeredUsers,
    toggleFollow,
    isFollowing,
  } = useUserStore();
  const { events, clearAllEvents } = useEventStore();
  const { showToast } = useToast();

  const routeOrganizerId = route.params?.organizerId;

  const isOwnProfile =
    currentUser.userType === 'organizer' &&
    (!routeOrganizerId || routeOrganizerId === currentUser.id);

  const organizerData = useMemo(() => {
    if (isOwnProfile) return currentUser;
    const found = registeredUsers.find(u => u.id === routeOrganizerId);
    if (found) return found;

    return {
      id: routeOrganizerId,
      name: route.params?.organizerName || 'Организатор',
      avatarInitials: (route.params?.organizerName || 'OR')[0].toUpperCase(),
      location: 'Алматы',
      avatarUrl: route.params?.organizerAvatar || null,
    };
  }, [isOwnProfile, routeOrganizerId, registeredUsers, currentUser, route.params]);

  const myEvents = useMemo(
    () => events.filter(e => e.organizerId === organizerData.id),
    [events, organizerData.id]
  );

  const totalViews = useMemo(
    () => myEvents.reduce((acc, curr) => acc + (curr.stats || 0), 0),
    [myEvents]
  );

  const following = isFollowing(organizerData.id);

  const handleFollow = () => {
    if (currentUser.userType !== 'explorer') {
      showToast({ message: 'Только исследователи могут подписываться', type: 'error' });
      return;
    }
    toggleFollow(organizerData.id);
    showToast({
      message: following ? 'Вы отписались' : 'Вы подписались на автора',
      type: 'success',
    });
  };

  const handleLogout = () => {
    logout();
    showToast({ message: 'Вы вышли из аккаунта', type: 'info' });
  };

  const tools = [
    {
      id: 'create',
      title: 'Опубликовать мероприятие',
      icon: 'add-circle-outline',
      screen: 'CreateEvent',
    },
    {
      id: 'analytics',
      title: 'Аналитика продаж',
      icon: 'bar-chart-outline',
      screen: 'Analytics',
    },
    {
      id: 'finance',
      title: 'Финансы и выплаты',
      icon: 'wallet-outline',
      screen: 'Finance',
    },
  ];

  const renderSettingsButton = () =>
    isOwnProfile ? (
      <TouchableOpacity
        style={styles.headerActionBtn}
        onPress={() => navigation.navigate('Settings')}
      >
        <Ionicons name="settings-outline" size={24} color={colors.light.foreground} />
      </TouchableOpacity>
    ) : null;

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />

      <Header
        title={isOwnProfile ? 'Creator Studio' : 'Профиль автора'}
        showBack={true}
        onBackPress={() => navigation.goBack()}
        rightElement={renderSettingsButton()}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeaderContainer}>
          <View style={styles.topRow}>
            <View style={styles.avatar}>
              {organizerData.avatarUrl ? (
                <Image
                  source={{ uri: organizerData.avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{organizerData.avatarInitials}</Text>
              )}
            </View>
            <View style={styles.infoColumn}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{organizerData.name}</Text>
                <View style={styles.organizerBadge}>
                  <Text style={styles.organizerBadgeText}>CREATOR</Text>
                </View>
              </View>
              <Text style={styles.email}>{organizerData.location || 'Алматы'}</Text>
              <Text style={styles.role}>Организатор мероприятий</Text>
            </View>
          </View>

          {isOwnProfile ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('EditStudio')}
            >
              <Text style={styles.editButtonText}>Настроить профиль студии</Text>
            </TouchableOpacity>
          ) : (
            currentUser.userType === 'explorer' && (
              <TouchableOpacity
                style={[styles.followBtn, following && styles.followBtnActive]}
                onPress={handleFollow}
              >
                <Ionicons
                  name={following ? 'checkmark-circle' : 'person-add-outline'}
                  size={18}
                  color={following ? colors.light.foreground : colors.light.background}
                />
                <Text
                  style={[styles.followBtnText, following && styles.followBtnTextActive]}
                >
                  {following ? 'Вы подписаны' : 'Подписаться'}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {isOwnProfile && (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="cash-outline" size={20} color={colors.light.primary} />
                <Text style={styles.statValue}>0 ₸</Text>
                <Text style={styles.statLabel}>Баланс</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="ticket-outline" size={20} color={colors.light.primary} />
                <Text style={styles.statValue}>0</Text>
                <Text style={styles.statLabel}>Продано</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons
                  name="trending-up-outline"
                  size={20}
                  color={colors.light.primary}
                />
                <Text style={styles.statValue}>{totalViews}</Text>
                <Text style={styles.statLabel}>Охват</Text>
              </View>
            </View>

            <View style={styles.toolHeader}>
              <Text style={styles.sectionHeaderTitle}>Инструменты студии</Text>
            </View>

            <View style={styles.sectionsContainer}>
              {tools.map(tool => (
                <TouchableOpacity
                  key={tool.id}
                  style={styles.sectionItem}
                  onPress={() => navigation.navigate(tool.screen)}
                >
                  <View style={styles.sectionIconContainer}>
                    <Ionicons
                      name={tool.icon as any}
                      size={20}
                      color={colors.light.primary}
                    />
                  </View>
                  <Text style={styles.menuItemText}>{tool.title}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.light.mutedForeground}
                  />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.sectionItem, { borderBottomWidth: 0 }]}
                onPress={handleLogout}
              >
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </View>
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>
                  Выйти из аккаунта
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.publicationsHeader}>
          <Text style={styles.sectionHeaderTitle}>
            {isOwnProfile ? 'Мои публикации' : 'Мероприятия автора'} ({myEvents.length})
          </Text>
        </View>

        <View style={styles.eventsList}>
          {myEvents.length > 0 ? (
            myEvents.map(event => (
              <View key={event.id} style={styles.eventWrapper}>
                <EventCard
                  {...event}
                  style={{ width: '100%', borderWidth: 0 }}
                  onPress={() => navigation.navigate('EventDetail', { ...event })}
                />
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Публикаций пока нет</Text>
            </View>
          )}
        </View>

        {isOwnProfile && (
          <TouchableOpacity
            onPress={async () => {
              await clearAllData();
              await clearAllEvents();
              showToast({ message: 'Данные сброшены', type: 'success' });
            }}
            style={styles.resetTrigger}
          >
            <Text style={styles.resetText}>v.1.0.4-production-reset</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: colors.light.background },
  container: { flex: 1 },
  headerActionBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.light.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 24, fontWeight: '700' },
  infoColumn: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 18, fontWeight: '700' },
  organizerBadge: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  organizerBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  email: { color: colors.light.mutedForeground, fontSize: 13, marginTop: 1 },
  role: { color: colors.light.mutedForeground, fontSize: 11 },
  editButton: {
    marginTop: spacing.md,
    padding: 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
  },
  editButtonText: { fontWeight: '700', fontSize: 14 },
  followBtn: {
    marginTop: spacing.md,
    padding: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.light.foreground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  followBtnActive: {
    backgroundColor: colors.light.secondary,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  followBtnText: { color: colors.light.background, fontWeight: '700', fontSize: 14 },
  followBtnTextActive: { color: colors.light.foreground },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  statValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  statLabel: { fontSize: 11, color: colors.light.mutedForeground },
  toolHeader: { paddingHorizontal: spacing.lg, marginBottom: 4 },
  publicationsHeader: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: 8,
  },
  sectionHeaderTitle: { fontSize: 16, fontWeight: '700' },
  sectionsContainer: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.light.border,
    overflow: 'hidden',
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  sectionIconContainer: { width: 28 },
  menuItemText: { flex: 1, fontWeight: '600', fontSize: 14 },
  eventsList: { paddingHorizontal: spacing.lg },
  eventWrapper: {
    marginBottom: spacing.md,
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  eventStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: `${colors.light.primary}05`,
  },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatText: { fontSize: 11, color: colors.light.mutedForeground },
  editIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editText: { fontSize: 11, color: colors.light.primary, fontWeight: '700' },
  emptyState: { padding: 30, alignItems: 'center' },
  emptyText: { color: colors.light.mutedForeground, fontSize: 13 },
  resetTrigger: { marginTop: 30, alignItems: 'center', opacity: 0.15 },
  resetText: { fontSize: 9 },
});
