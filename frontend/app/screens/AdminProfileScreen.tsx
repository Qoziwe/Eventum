import React, { useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { useAdminStore } from '../store/adminStore';
import { useToast } from '../components/ToastProvider';
import Avatar from '../components/Avatar';
import Header from '../components/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminProfileScreen() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const navigation = useNavigation<any>();
  const { user, logout } = useUserStore();
  const { dashboard, fetchDashboard } = useAdminStore();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [])
  );

  const handleLogout = () => {
    logout();
    showToast({ message: 'Вы вышли из аккаунта', type: 'info' });
  };

  const adminTools = [
    {
      id: 'dashboard',
      title: 'Дашборд',
      subtitle: 'Статистика и аналитика',
      icon: 'stats-chart',
      color: '#6C5CE7',
      screen: 'AdminDashboard',
    },
    {
      id: 'events',
      title: 'Модерация мероприятий',
      subtitle: `${dashboard?.events?.pending || 0} на рассмотрении`,
      icon: 'calendar',
      color: '#00B894',
      screen: 'AdminEvents',
    },
    {
      id: 'posts',
      title: 'Модерация постов',
      subtitle: `${dashboard?.posts?.pending || 0} на рассмотрении`,
      icon: 'document-text',
      color: '#FDCB6E',
      screen: 'AdminPosts',
    },
    {
      id: 'users',
      title: 'Пользователи',
      subtitle: `${dashboard?.users?.total || 0} зарегистрировано`,
      icon: 'people',
      color: '#E17055',
      screen: 'AdminUsers',
    },
  ];

  const quickStats = [
    { label: 'Пользователи', value: dashboard?.users?.total || 0, icon: 'people-outline', color: '#6C5CE7' },
    { label: 'Мероприятия', value: dashboard?.events?.total || 0, icon: 'calendar-outline', color: '#00B894' },
    { label: 'Посты', value: dashboard?.posts?.total || 0, icon: 'document-text-outline', color: '#FDCB6E' },
  ];

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={themeColors.background} />

      <Header
        title="Администратор"
        showBack={true}
        onBackPress={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={24} color={themeColors.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Avatar uri={user.avatarUrl} name={user.name || 'Admin'} size={64} />
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{user.name}</Text>
                <View style={styles.adminBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.white} />
                  <Text style={styles.adminBadgeText}>ADMIN</Text>
                </View>
              </View>
              <Text style={styles.profileEmail}>{user.email}</Text>
              <Text style={styles.profileRole}>Администратор платформы</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          {quickStats.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Ionicons name={stat.icon as any} size={20} color={stat.color} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Pending Alert */}
        {((dashboard?.events?.pending || 0) > 0 || (dashboard?.posts?.pending || 0) > 0) && (
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <View style={styles.alertIconCircle}>
                <Ionicons name="alert-circle" size={20} color="#F39C12" />
              </View>
              <Text style={styles.alertTitle}>Требуется внимание</Text>
            </View>
            <Text style={styles.alertText}>
              {dashboard?.events?.pending || 0} мероприятий и {dashboard?.posts?.pending || 0} постов ожидают модерации
            </Text>
          </View>
        )}

        {/* Admin Tools */}
        <Text style={styles.sectionTitle}>Панель управления</Text>
        <View style={styles.toolsGrid}>
          {adminTools.map(tool => (
            <TouchableOpacity
              key={tool.id}
              style={styles.toolCard}
              onPress={() => navigation.navigate(tool.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.toolIconCircle, { backgroundColor: `${tool.color}15` }]}>
                <Ionicons name={tool.icon as any} size={24} color={tool.color} />
              </View>
              <Text style={styles.toolTitle}>{tool.title}</Text>
              <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
              <View style={styles.toolArrow}>
                <Ionicons name="chevron-forward" size={16} color={themeColors.mutedForeground} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Быстрые действия</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="notifications-outline" size={20} color={themeColors.primary} />
            </View>
            <Text style={styles.actionText}>Уведомления</Text>
            <Ionicons name="chevron-forward" size={16} color={themeColors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="person-outline" size={20} color={themeColors.primary} />
            </View>
            <Text style={styles.actionText}>Редактировать профиль</Text>
            <Ionicons name="chevron-forward" size={16} color={themeColors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionItem, { borderBottomWidth: 0 }]}
            onPress={handleLogout}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="log-out-outline" size={20} color={themeColors.destructive} />
            </View>
            <Text style={[styles.actionText, { color: themeColors.destructive }]}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: tc.background },
  container: { flex: 1 },
  headerActionBtn: {
    width: 36, height: 36,
    justifyContent: 'center', alignItems: 'center',
  },
  profileCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: tc.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: tc.border,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  profileName: { fontSize: typography.xl, fontWeight: '700', color: tc.foreground },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: '#6C5CE7',
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  adminBadgeText: { color: colors.white, fontSize: typography.xs, fontWeight: '800' },
  profileEmail: { fontSize: 13, color: tc.mutedForeground, marginTop: 2 },
  profileRole: { fontSize: 11, color: tc.mutedForeground, marginTop: 1 },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  statCard: {
    flex: 1, padding: spacing.sm,
    backgroundColor: tc.card,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1, borderColor: tc.border,
  },
  statValue: { fontSize: typography.xl, fontWeight: '700', marginTop: 4, color: tc.foreground },
  statLabel: { fontSize: 11, color: tc.mutedForeground },
  alertCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: '#FEF9E7',
    borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  alertIconCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center', alignItems: 'center',
  },
  alertTitle: { fontSize: typography.base, fontWeight: '700', color: colors.warningText },
  alertText: { fontSize: 13, color: '#A16207', lineHeight: 18 },
  sectionTitle: {
    fontSize: typography.lg, fontWeight: '700', color: tc.foreground,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm, marginTop: spacing.sm,
  },
  toolsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  toolCard: {
    width: '48%', flexGrow: 1,
    backgroundColor: tc.card,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1, borderColor: tc.border,
    position: 'relative',
  },
  toolIconCircle: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  toolTitle: { fontSize: typography.base, fontWeight: '700', color: tc.foreground },
  toolSubtitle: { fontSize: 11, color: tc.mutedForeground, marginTop: 2 },
  toolArrow: { position: 'absolute', top: spacing.md, right: spacing.md },
  actionsContainer: {
    marginHorizontal: spacing.lg,
    backgroundColor: tc.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: tc.border,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: tc.border,
  },
  actionIconContainer: { width: 28 },
  actionText: { flex: 1, fontWeight: '600', fontSize: typography.base, color: tc.foreground },
});
