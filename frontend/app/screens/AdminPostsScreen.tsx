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

const STATUS_TABS = [
  { key: 'pending', label: 'Ожидание' },
  { key: 'approved', label: 'Одобрены' },
  { key: 'rejected', label: 'Отклонены' },
  { key: 'all', label: 'Все' },
];

export default function AdminPostsScreen() {
  const navigation = useNavigation<any>();
  const { posts, fetchPosts, moderatePost, deletePost, isLoading } = useAdminStore();
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ visible: boolean; postId: string }>({ visible: false, postId: '' });
  const [rejectReason, setRejectReason] = useState('');

  const loadPosts = useCallback(async () => {
    const filters: Record<string, string> = { status: activeTab };
    if (search.trim()) filters.search = search.trim();
    await fetchPosts(filters);
  }, [activeTab, search]);

  useFocusEffect(useCallback(() => { loadPosts(); }, [loadPosts]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleApprove = async (id: string) => {
    try {
      await moderatePost(id, 'approve');
      await loadPosts();
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
  };

  const handleReject = async () => {
    try {
      await moderatePost(rejectModal.postId, 'reject', rejectReason);
      setRejectModal({ visible: false, postId: '' });
      setRejectReason('');
      await loadPosts();
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Удалить пост', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        try { await deletePost(id); await loadPosts(); } catch (e: any) { Alert.alert('Ошибка', e.message); }
      }}
    ]);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: '#FEF3C7', text: '#D97706', label: 'Ожидание' },
      approved: { bg: '#D1FAE5', text: '#059669', label: 'Одобрено' },
      rejected: { bg: '#FEE2E2', text: '#DC2626', label: 'Отклонено' },
    };
    const s = map[status] || map.pending;
    return (
      <View style={[styles.badge, { backgroundColor: s.bg }]}>
        <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screenWrapper} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={colors.light.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Модерация постов</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {STATUS_TABS.map(tab => (
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
            placeholder="Поиск по содержанию..."
            placeholderTextColor={colors.light.mutedForeground}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadPosts}
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {posts.length === 0 && !isLoading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={colors.light.mutedForeground} />
            <Text style={styles.emptyText}>Нет постов</Text>
          </View>
        )}

        {posts.map(post => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.postAuthorAvatar}>
                <Text style={styles.postAuthorInitial}>{post.authorName?.[0] || '?'}</Text>
              </View>
              <View style={styles.postInfo}>
                <Text style={styles.postAuthor}>{post.authorName}</Text>
                <Text style={styles.postCategory}>{post.categoryName || 'Без категории'}</Text>
              </View>
              {getStatusBadge(post.moderationStatus)}
            </View>

            <Text style={styles.postContent} numberOfLines={5}>{post.content}</Text>

            <View style={styles.postMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="arrow-up" size={14} color="#059669" />
                <Text style={[styles.metaText, { color: '#059669' }]}>{post.upvotes}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="arrow-down" size={14} color="#DC2626" />
                <Text style={[styles.metaText, { color: '#DC2626' }]}>{post.downvotes}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="chatbubble-outline" size={14} color={colors.light.mutedForeground} />
                <Text style={styles.metaText}>{post.commentCount}</Text>
              </View>
              <Text style={styles.postTimestamp}>{new Date(post.timestamp).toLocaleDateString('ru-RU')}</Text>
            </View>

            {post.rejectionReason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Причина:</Text>
                <Text style={styles.reasonText}>{post.rejectionReason}</Text>
              </View>
            )}

            <View style={styles.actionsRow}>
              {post.moderationStatus === 'pending' && (
                <>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(post.id)}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.approveBtnText}>Одобрить</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => setRejectModal({ visible: true, postId: post.id })}>
                    <Ionicons name="close" size={16} color="#DC2626" />
                    <Text style={styles.rejectBtnText}>Отклонить</Text>
                  </TouchableOpacity>
                </>
              )}
              {post.moderationStatus === 'rejected' && (
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(post.id)}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.approveBtnText}>Одобрить</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(post.id)}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={rejectModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Отклонить пост</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Причина отклонения..."
              placeholderTextColor={colors.light.mutedForeground}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setRejectModal({ visible: false, postId: '' }); setRejectReason(''); }}>
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleReject}>
                <Text style={styles.modalConfirmText}>Отклонить</Text>
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
  postCard: {
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    backgroundColor: colors.light.card, borderRadius: borderRadius.xl,
    padding: spacing.md, borderWidth: 1, borderColor: colors.light.border,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center' },
  postAuthorAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.light.secondary,
    justifyContent: 'center', alignItems: 'center',
  },
  postAuthorInitial: { fontSize: typography.base, fontWeight: '700', color: colors.light.foreground },
  postInfo: { flex: 1, marginLeft: spacing.sm },
  postAuthor: { fontSize: typography.base, fontWeight: '700', color: colors.light.foreground },
  postCategory: { fontSize: typography.xs, color: colors.light.mutedForeground },
  postContent: { fontSize: typography.sm, color: colors.light.foreground, marginTop: spacing.sm, lineHeight: 20 },
  postMeta: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: typography.xs, color: colors.light.mutedForeground },
  postTimestamp: { fontSize: typography.xs, color: colors.light.mutedForeground, marginLeft: 'auto' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  badgeText: { fontSize: 10, fontWeight: '700' },
  reasonBox: {
    marginTop: spacing.sm, padding: spacing.sm,
    backgroundColor: '#FEE2E2', borderRadius: borderRadius.md,
  },
  reasonLabel: { fontSize: typography.xs, fontWeight: '700', color: '#DC2626' },
  reasonText: { fontSize: typography.xs, color: '#991B1B', marginTop: 2 },
  actionsRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#059669', borderRadius: borderRadius.lg, paddingVertical: spacing.sm, gap: 4,
  },
  approveBtnText: { fontSize: typography.sm, fontWeight: '700', color: '#fff' },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEE2E2', borderRadius: borderRadius.lg, paddingVertical: spacing.sm, gap: 4,
  },
  rejectBtnText: { fontSize: typography.sm, fontWeight: '700', color: '#DC2626' },
  deleteBtn: {
    width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.light.secondary, borderRadius: borderRadius.lg,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: colors.light.background, borderRadius: borderRadius.xl, padding: spacing.xl },
  modalTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.light.foreground, marginBottom: spacing.md },
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
