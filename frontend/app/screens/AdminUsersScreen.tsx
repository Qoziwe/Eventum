import React, { useState, useCallback } from 'react';
import {
  ScrollView, StyleSheet, View, Text, TouchableOpacity,
  RefreshControl, TextInput, Modal, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useAdminStore } from '../store/adminStore';

const FILTER_TABS = [
  { key: '', label: 'Все' },
  { key: 'organizer', label: 'Организаторы' },
  { key: 'explorer', label: 'Исследователи' },
  { key: 'banned', label: 'Забаненные' },
];

export default function AdminUsersScreen() {
  const navigation = useNavigation<any>();
  const { users, fetchUsers, banUser, changeUserRole, isLoading } = useAdminStore();
  const [activeTab, setActiveTab] = useState('');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [banModal, setBanModal] = useState<{ visible: boolean; userId: string; name: string; action: string }>({ visible: false, userId: '', name: '', action: '' });
  const [banReason, setBanReason] = useState('');

  const loadUsers = useCallback(async () => {
    const filters: Record<string, string> = {};
    if (search.trim()) filters.search = search.trim();
    if (activeTab === 'banned') {
      filters.banned = 'true';
    } else if (activeTab) {
      filters.userType = activeTab;
    }
    await fetchUsers(filters);
  }, [activeTab, search]);

  useFocusEffect(useCallback(() => { loadUsers(); }, [loadUsers]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleBanAction = async () => {
    try {
      await banUser(banModal.userId, banModal.action, banReason);
      setBanModal({ visible: false, userId: '', name: '', action: '' });
      setBanReason('');
      await loadUsers();
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
  };

  const handleRoleChange = (userId: string, name: string, currentType: string) => {
    const newType = currentType === 'organizer' ? 'explorer' : 'organizer';
    const newLabel = newType === 'organizer' ? 'Организатор' : 'Исследователь';
    Alert.alert('Изменить роль', `Сменить роль ${name} на "${newLabel}"?`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Сменить', onPress: async () => {
        try { await changeUserRole(userId, newType); await loadUsers(); } catch (e: any) { Alert.alert('Ошибка', e.message); }
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.screenWrapper} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={colors.light.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Пользователи</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {FILTER_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.filtersRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={colors.light.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по имени, email..."
            placeholderTextColor={colors.light.mutedForeground}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadUsers}
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {users.length === 0 && !isLoading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.light.mutedForeground} />
            <Text style={styles.emptyText}>Нет пользователей</Text>
          </View>
        )}

        {users.map(user => (
          <View key={user.id} style={[styles.userCard, user.isBanned && styles.userCardBanned]}>
            <View style={styles.userHeader}>
              <View style={[styles.userAvatar, user.isBanned && { opacity: 0.5 }]}>
                <Text style={styles.userInitial}>{user.name?.[0] || '?'}</Text>
              </View>
              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
                  {user.isAdmin && (
                    <View style={styles.adminBadge}>
                      <Ionicons name="shield-checkmark" size={10} color="#8B5CF6" />
                      <Text style={styles.adminBadgeText}>Админ</Text>
                    </View>
                  )}
                  {user.isBanned && (
                    <View style={styles.bannedBadge}>
                      <Text style={styles.bannedBadgeText}>Бан</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.userUsername}>@{user.username}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <View style={styles.userTypeBadge}>
                <Text style={styles.userTypeText}>
                  {user.userType === 'organizer' ? '🎪' : '🔍'} {user.userType === 'organizer' ? 'Орг.' : 'Иссл.'}
                </Text>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.light.mutedForeground} />
                <Text style={styles.statText}>{user.eventsCount} мероп.</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="document-text-outline" size={14} color={colors.light.mutedForeground} />
                <Text style={styles.statText}>{user.postsCount} постов</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="people-outline" size={14} color={colors.light.mutedForeground} />
                <Text style={styles.statText}>{user.followersCount} подп.</Text>
              </View>
              {user.registeredAt && (
                <Text style={styles.registeredAt}>
                  📅 {new Date(user.registeredAt).toLocaleDateString('ru-RU')}
                </Text>
              )}
            </View>

            {user.banReason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Причина бана:</Text>
                <Text style={styles.reasonText}>{user.banReason}</Text>
              </View>
            )}

            {/* Actions */}
            {!user.isAdmin && (
              <View style={styles.actionsRow}>
                {user.isBanned ? (
                  <TouchableOpacity
                    style={styles.unbanBtn}
                    onPress={() => setBanModal({ visible: true, userId: user.id, name: user.name, action: 'unban' })}
                  >
                    <Ionicons name="lock-open-outline" size={16} color="#059669" />
                    <Text style={styles.unbanBtnText}>Разбанить</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.banBtn}
                    onPress={() => setBanModal({ visible: true, userId: user.id, name: user.name, action: 'ban' })}
                  >
                    <Ionicons name="ban-outline" size={16} color="#DC2626" />
                    <Text style={styles.banBtnText}>Забанить</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.roleBtn}
                  onPress={() => handleRoleChange(user.id, user.name, user.userType)}
                >
                  <Ionicons name="swap-horizontal" size={16} color={colors.light.primary} />
                  <Text style={styles.roleBtnText}>Роль</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Ban/Unban Modal */}
      <Modal visible={banModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {banModal.action === 'ban' ? 'Забанить пользователя' : 'Разбанить пользователя'}
            </Text>
            <Text style={styles.modalSubtitle}>{banModal.name}</Text>
            {banModal.action === 'ban' && (
              <TextInput
                style={styles.modalInput}
                placeholder="Причина бана..."
                placeholderTextColor={colors.light.mutedForeground}
                value={banReason}
                onChangeText={setBanReason}
                multiline
                numberOfLines={3}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setBanModal({ visible: false, userId: '', name: '', action: '' }); setBanReason(''); }}>
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, banModal.action === 'unban' && { backgroundColor: '#059669' }]}
                onPress={handleBanAction}
              >
                <Text style={styles.modalConfirmText}>
                  {banModal.action === 'ban' ? 'Забанить' : 'Разбанить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: colors.light.background },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.light.border,
  },
  headerBack: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.light.foreground },
  tabsContainer: { backgroundColor: colors.light.background, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  tabsScroll: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  tab: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, backgroundColor: colors.light.secondary,
  },
  tabActive: { backgroundColor: colors.light.primary },
  tabText: { fontSize: typography.sm, fontWeight: '600', color: colors.light.mutedForeground },
  tabTextActive: { color: colors.light.primaryForeground },
  filtersRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, gap: spacing.sm,
  },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.light.secondary, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, height: 40,
  },
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: typography.sm, color: colors.light.foreground },
  emptyContainer: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: typography.base, color: colors.light.mutedForeground, marginTop: spacing.md },
  userCard: {
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    backgroundColor: colors.light.card, borderRadius: borderRadius.xl,
    padding: spacing.md, borderWidth: 1, borderColor: colors.light.border,
  },
  userCardBanned: { borderColor: '#FECACA', backgroundColor: '#FFF5F5' },
  userHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  userAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.light.secondary,
    justifyContent: 'center', alignItems: 'center',
  },
  userInitial: { fontSize: typography.lg, fontWeight: '700', color: colors.light.foreground },
  userInfo: { flex: 1, marginLeft: spacing.sm },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  userName: { fontSize: typography.base, fontWeight: '700', color: colors.light.foreground },
  userUsername: { fontSize: typography.sm, color: colors.light.mutedForeground, marginTop: 1 },
  userEmail: { fontSize: typography.xs, color: colors.light.mutedForeground },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#EDE9FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full,
  },
  adminBadgeText: { fontSize: 9, fontWeight: '700', color: '#8B5CF6' },
  bannedBadge: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full,
  },
  bannedBadgeText: { fontSize: 9, fontWeight: '700', color: '#DC2626' },
  userTypeBadge: {
    backgroundColor: colors.light.secondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full,
  },
  userTypeText: { fontSize: typography.xs, fontWeight: '600', color: colors.light.foreground },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm, gap: spacing.md, alignItems: 'center' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: typography.xs, color: colors.light.mutedForeground },
  registeredAt: { fontSize: typography.xs, color: colors.light.mutedForeground, marginLeft: 'auto' },
  reasonBox: {
    marginTop: spacing.sm, padding: spacing.sm,
    backgroundColor: '#FEE2E2', borderRadius: borderRadius.md,
  },
  reasonLabel: { fontSize: typography.xs, fontWeight: '700', color: '#DC2626' },
  reasonText: { fontSize: typography.xs, color: '#991B1B', marginTop: 2 },
  actionsRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  banBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEE2E2', borderRadius: borderRadius.lg, paddingVertical: spacing.sm, gap: 4,
  },
  banBtnText: { fontSize: typography.sm, fontWeight: '700', color: '#DC2626' },
  unbanBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#D1FAE5', borderRadius: borderRadius.lg, paddingVertical: spacing.sm, gap: 4,
  },
  unbanBtnText: { fontSize: typography.sm, fontWeight: '700', color: '#059669' },
  roleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.light.secondary, borderRadius: borderRadius.lg, paddingVertical: spacing.sm, gap: 4,
  },
  roleBtnText: { fontSize: typography.sm, fontWeight: '700', color: colors.light.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: colors.light.background, borderRadius: borderRadius.xl, padding: spacing.xl },
  modalTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.light.foreground },
  modalSubtitle: { fontSize: typography.sm, color: colors.light.mutedForeground, marginTop: 4, marginBottom: spacing.md },
  modalInput: {
    backgroundColor: colors.light.secondary, borderRadius: borderRadius.lg,
    padding: spacing.md, fontSize: typography.base, color: colors.light.foreground,
    minHeight: 80, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.sm },
  modalCancel: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.light.secondary, alignItems: 'center' },
  modalCancelText: { fontSize: typography.base, fontWeight: '600', color: colors.light.foreground },
  modalConfirm: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: '#DC2626', alignItems: 'center' },
  modalConfirmText: { fontSize: typography.base, fontWeight: '700', color: '#fff' },
});
