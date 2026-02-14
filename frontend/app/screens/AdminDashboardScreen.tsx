import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView, StyleSheet, View, Text, TouchableOpacity,
  RefreshControl, Dimensions, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useAdminStore } from '../store/adminStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function SimpleBarChart({ data, color, label }: { data: { name: string; count: number }[]; color: string; label: string }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.count), 1);
  
  return (
    <View style={chartStyles.container}>
      <Text style={chartStyles.label}>{label}</Text>
      {data.slice(0, 6).map((item, i) => (
        <View key={i} style={chartStyles.barRow}>
          <Text style={chartStyles.barLabel} numberOfLines={1}>{item.name}</Text>
          <View style={chartStyles.barTrack}>
            <View style={[chartStyles.barFill, { width: `${(item.count / maxVal) * 100}%`, backgroundColor: color }]} />
          </View>
          <Text style={chartStyles.barValue}>{item.count}</Text>
        </View>
      ))}
    </View>
  );
}

function MiniLineChart({ data, label }: { data: { date: string; count: number }[]; label: string }) {
  if (!data || data.length === 0) return (
    <View style={chartStyles.container}>
      <Text style={chartStyles.label}>{label}</Text>
      <Text style={chartStyles.emptyText}>Нет данных</Text>
    </View>
  );
  
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const chartHeight = 100;
  const barWidth = Math.max(3, (SCREEN_WIDTH - 80) / data.length - 2);

  return (
    <View style={chartStyles.container}>
      <Text style={chartStyles.label}>{label}</Text>
      <View style={chartStyles.lineContainer}>
        {data.map((item, i) => (
          <View key={i} style={[chartStyles.lineBar, { height: Math.max(4, (item.count / maxVal) * chartHeight), width: barWidth }]} />
        ))}
      </View>
      <View style={chartStyles.lineLabels}>
        <Text style={chartStyles.lineLabelText}>{data[0]?.date?.slice(5)}</Text>
        <Text style={chartStyles.lineLabelText}>{data[data.length - 1]?.date?.slice(5)}</Text>
      </View>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
  const {
    dashboard, fetchDashboard,
    registrationAnalytics, fetchRegistrationAnalytics,
    eventsCreatedAnalytics, fetchEventsCreatedAnalytics,
    overview, fetchOverview, isLoading
  } = useAdminStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  const loadAll = async () => {
    await Promise.all([
      fetchDashboard(),
      fetchRegistrationAnalytics(30),
      fetchEventsCreatedAnalytics(30),
      fetchOverview()
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const kpiCards = dashboard ? [
    { title: 'Пользователи', value: dashboard.users.total, icon: 'people', color: '#3B82F6', sub: `${dashboard.users.organizers} орг. / ${dashboard.users.explorers} иссл.` },
    { title: 'Мероприятия', value: dashboard.events.total, icon: 'calendar', color: '#8B5CF6', sub: `${dashboard.events.pending} ожид.` },
    { title: 'Посты', value: dashboard.posts.total, icon: 'chatbubbles', color: '#EC4899', sub: `${dashboard.posts.pending} ожид.` },
    { title: 'Выручка', value: `₸${(dashboard.totalRevenue || 0).toLocaleString()}`, icon: 'wallet', color: '#22C55E', sub: `${dashboard.tickets} билетов` },
  ] : [];

  const moderationCards = dashboard ? [
    { title: 'Мероприятия на модерации', count: dashboard.events.pending, color: '#F59E0B', screen: 'AdminEvents', icon: 'calendar-outline' },
    { title: 'Посты на модерации', count: dashboard.posts.pending, color: '#8B5CF6', screen: 'AdminPosts', icon: 'document-text-outline' },
    { title: 'Забаненные', count: dashboard.users.banned, color: '#EF4444', screen: 'AdminUsers', icon: 'person-remove-outline' },
  ] : [];

  if (isLoading && !dashboard) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screenWrapper} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={colors.light.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Админ-панель</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          {kpiCards.map((card, i) => (
            <View key={i} style={styles.kpiCard}>
              <View style={[styles.kpiIconBg, { backgroundColor: card.color + '15' }]}>
                <Ionicons name={card.icon as any} size={20} color={card.color} />
              </View>
              <Text style={styles.kpiValue}>{card.value}</Text>
              <Text style={styles.kpiTitle}>{card.title}</Text>
              <Text style={styles.kpiSub}>{card.sub}</Text>
            </View>
          ))}
        </View>

        {/* Moderation Alerts */}
        <Text style={styles.sectionTitle}>Модерация</Text>
        <View style={styles.moderationSection}>
          {moderationCards.map((card, i) => (
            <TouchableOpacity
              key={i}
              style={styles.modCard}
              onPress={() => navigation.navigate(card.screen)}
            >
              <View style={[styles.modIconBg, { backgroundColor: card.color + '15' }]}>
                <Ionicons name={card.icon as any} size={22} color={card.color} />
              </View>
              <View style={styles.modCardContent}>
                <Text style={styles.modTitle}>{card.title}</Text>
                <Text style={[styles.modCount, { color: card.color }]}>{card.count}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.light.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Разделы</Text>
        <View style={styles.actionsGrid}>
          {[
            { title: 'Мероприятия', icon: 'calendar', screen: 'AdminEvents', color: '#8B5CF6' },
            { title: 'Посты', icon: 'document-text', screen: 'AdminPosts', color: '#EC4899' },
            { title: 'Пользователи', icon: 'people', screen: 'AdminUsers', color: '#3B82F6' },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.actionCard}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={[styles.actionIconBg, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text style={styles.actionTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Analytics Charts */}
        <Text style={styles.sectionTitle}>Аналитика (30 дней)</Text>
        
        <MiniLineChart data={registrationAnalytics} label="Регистрации пользователей" />
        <MiniLineChart data={eventsCreatedAnalytics} label="Создание мероприятий" />

        {overview && (
          <>
            <SimpleBarChart data={overview.topCategories} color="#8B5CF6" label="Топ категорий" />
            <SimpleBarChart data={overview.vibeDistribution} color="#EC4899" label="Распределение по вайбу" />
            <SimpleBarChart data={overview.userTypeDistribution.map(d => ({ name: d.type === 'organizer' ? 'Организатор' : d.type === 'explorer' ? 'Исследователь' : d.type, count: d.count }))} color="#3B82F6" label="Типы пользователей" />

            {/* Overview Stats */}
            <View style={styles.overviewGrid}>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewValue}>{overview.totalViews.toLocaleString()}</Text>
                <Text style={styles.overviewLabel}>Просмотров</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewValue}>₸{overview.averageEventPrice.toLocaleString()}</Text>
                <Text style={styles.overviewLabel}>Ср. цена</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewValue}>{overview.freeEventsCount}</Text>
                <Text style={styles.overviewLabel}>Бесплатных</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewValue}>{overview.paidEventsCount}</Text>
                <Text style={styles.overviewLabel}>Платных</Text>
              </View>
            </View>

            {/* Top Organizers */}
            {overview.topOrganizers.length > 0 && (
              <View style={styles.topSection}>
                <Text style={styles.sectionTitle}>Топ организаторов</Text>
                {overview.topOrganizers.slice(0, 5).map((org, i) => (
                  <View key={i} style={styles.topOrgRow}>
                    <Text style={styles.topOrgRank}>#{i + 1}</Text>
                    <View style={styles.topOrgAvatar}>
                      <Text style={styles.topOrgInitial}>{org.name?.[0] || '?'}</Text>
                    </View>
                    <Text style={styles.topOrgName} numberOfLines={1}>{org.name}</Text>
                    <Text style={styles.topOrgCount}>{org.eventsCount} мероп.</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: colors.light.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.light.background },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.light.border,
  },
  headerBack: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.light.foreground },
  sectionTitle: {
    fontSize: typography.lg, fontWeight: '700', color: colors.light.foreground,
    paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md,
  },
  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md,
    marginTop: spacing.lg, gap: spacing.sm,
  },
  kpiCard: {
    width: (SCREEN_WIDTH - spacing.md * 2 - spacing.sm) / 2 - 1,
    backgroundColor: colors.light.card, borderRadius: borderRadius.xl,
    padding: spacing.md, borderWidth: 1, borderColor: colors.light.border,
  },
  kpiIconBg: {
    width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  kpiValue: { fontSize: typography['2xl'], fontWeight: '800', color: colors.light.foreground },
  kpiTitle: { fontSize: typography.sm, fontWeight: '600', color: colors.light.mutedForeground, marginTop: 2 },
  kpiSub: { fontSize: typography.xs, color: colors.light.mutedForeground, marginTop: 2 },
  moderationSection: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  modCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.light.card,
    borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.light.border,
  },
  modIconBg: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },
  modCardContent: { flex: 1, marginLeft: spacing.md },
  modTitle: { fontSize: typography.base, fontWeight: '600', color: colors.light.foreground },
  modCount: { fontSize: typography['2xl'], fontWeight: '800', marginTop: 2 },
  actionsGrid: {
    flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm,
  },
  actionCard: {
    flex: 1, backgroundColor: colors.light.card, borderRadius: borderRadius.lg,
    padding: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.light.border,
  },
  actionIconBg: {
    width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  actionTitle: { fontSize: typography.sm, fontWeight: '600', color: colors.light.foreground, textAlign: 'center' },
  overviewGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg,
    marginTop: spacing.md, gap: spacing.sm,
  },
  overviewCard: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2 - 1,
    backgroundColor: colors.light.card, borderRadius: borderRadius.lg,
    padding: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.light.border,
  },
  overviewValue: { fontSize: typography.xl, fontWeight: '800', color: colors.light.foreground },
  overviewLabel: { fontSize: typography.xs, color: colors.light.mutedForeground, marginTop: 2 },
  topSection: { marginBottom: spacing.lg },
  topOrgRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  topOrgRank: { fontSize: typography.sm, fontWeight: '700', color: colors.light.mutedForeground, width: 28 },
  topOrgAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.light.secondary,
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm,
  },
  topOrgInitial: { fontSize: typography.sm, fontWeight: '700', color: colors.light.foreground },
  topOrgName: { flex: 1, fontSize: typography.base, fontWeight: '600', color: colors.light.foreground },
  topOrgCount: { fontSize: typography.sm, color: colors.light.mutedForeground },
});

const chartStyles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: colors.light.card, borderRadius: borderRadius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.light.border,
  },
  label: { fontSize: typography.base, fontWeight: '700', color: colors.light.foreground, marginBottom: spacing.sm },
  emptyText: { fontSize: typography.sm, color: colors.light.mutedForeground, textAlign: 'center', paddingVertical: spacing.xl },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  barLabel: { width: 80, fontSize: typography.xs, color: colors.light.mutedForeground },
  barTrack: { flex: 1, height: 16, backgroundColor: colors.light.secondary, borderRadius: 8, overflow: 'hidden', marginHorizontal: 6 },
  barFill: { height: '100%', borderRadius: 8 },
  barValue: { width: 30, fontSize: typography.xs, fontWeight: '700', color: colors.light.foreground, textAlign: 'right' },
  lineContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 2, paddingTop: spacing.sm },
  lineBar: { backgroundColor: colors.light.primary, borderRadius: 2, minWidth: 3 },
  lineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  lineLabelText: { fontSize: 9, color: colors.light.mutedForeground },
});
