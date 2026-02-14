import React, { useState, useCallback } from 'react';
import {
  ScrollView, StyleSheet, View, Text, TouchableOpacity,
  RefreshControl, TextInput, Modal, Alert, Image
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

export default function AdminEventsScreen() {
  const navigation = useNavigation<any>();
  const { events, fetchEvents, moderateEvent, deleteEvent, isLoading } = useAdminStore();
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ visible: boolean; eventId: string; title: string }>({ visible: false, eventId: '', title: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const loadEvents = useCallback(async () => {
    const filters: Record<string, string> = { status: activeTab };
    if (search.trim()) filters.search = search.trim();
    if (sortBy) filters.sortBy = sortBy;
    await fetchEvents(filters);
  }, [activeTab, search, sortBy]);

  useFocusEffect(useCallback(() => { loadEvents(); }, [loadEvents]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const handleApprove = async (id: string) => {
    try {
      await moderateEvent(id, 'approve');
      await loadEvents();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  const handleReject = async () => {
    try {
      await moderateEvent(rejectModal.eventId, 'reject', rejectReason);
      setRejectModal({ visible: false, eventId: '', title: '' });
      setRejectReason('');
      await loadEvents();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  const handleDelete = (id: string, title: string) => {
    setRejectModal({ visible: true, eventId: id, title });
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={colors.light.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Модерация мероприятий</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
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

      {/* Search + Sort */}
      <View style={styles.filtersRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={colors.light.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по названию..."
            placeholderTextColor={colors.light.mutedForeground}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={loadEvents}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortBy(sortBy === 'newest' ? 'oldest' : sortBy === 'oldest' ? 'views' : 'newest')}
        >
          <Ionicons name="swap-vertical" size={18} color={colors.light.foreground} />
          <Text style={styles.sortText}>{sortBy === 'newest' ? 'Новые' : sortBy === 'oldest' ? 'Старые' : 'Просмотры'}</Text>
        </TouchableOpacity>
      </View>

      {/* Event List */}
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {events.length === 0 && !isLoading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.light.mutedForeground} />
            <Text style={styles.emptyText}>Нет мероприятий</Text>
          </View>
        )}

        {events.map(event => (
          <View key={event.id} style={styles.eventCard}>
            <View style={styles.eventHeader}>
              {event.image ? (
                <Image source={{ uri: event.image }} style={styles.eventImage} />
              ) : (
                <View style={[styles.eventImage, styles.eventImagePlaceholder]}>
                  <Ionicons name="calendar" size={24} color={colors.light.mutedForeground} />
                </View>
              )}
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                <Text style={styles.eventOrganizer}>{event.organizerName}</Text>
                <Text style={styles.eventDate}>{event.date}</Text>
              </View>
              {getStatusBadge(event.moderationStatus)}
            </View>

            {event.fullDescription && (
              <Text style={styles.eventDesc} numberOfLines={3}>{event.fullDescription}</Text>
            )}

            <View style={styles.eventMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="eye-outline" size={14} color={colors.light.mutedForeground} />
                <Text style={styles.metaText}>{event.views}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="pricetag-outline" size={14} color={colors.light.mutedForeground} />
                <Text style={styles.metaText}>{event.priceValue ? `₸${event.priceValue}` : 'Бесплатно'}</Text>
              </View>
              {event.categories && event.categories.length > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons name="folder-outline" size={14} color={colors.light.mutedForeground} />
                  <Text style={styles.metaText}>{event.categories.join(', ')}</Text>
                </View>
              )}
            </View>

            {event.rejectionReason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Причина отклонения:</Text>
                <Text style={styles.reasonText}>{event.rejectionReason}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionsRow}>
              {event.moderationStatus === 'pending' && (
                <>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(event.id)}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.approveBtnText}>Одобрить</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => setRejectModal({ visible: true, eventId: event.id, title: event.title })}>
                    <Ionicons name="close" size={16} color="#DC2626" />
                    <Text style={styles.rejectBtnText}>Отклонить</Text>
                  </TouchableOpacity>
                </>
              )}
              {event.moderationStatus === 'rejected' && (
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(event.id)}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.approveBtnText}>Одобрить</Text>
                </TouchableOpacity>
              )}
              {event.moderationStatus !== 'rejected' && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(event.id, event.title)}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Reject Modal */}
      <Modal visible={rejectModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Отклонить мероприятие</Text>
            <Text style={styles.modalSubtitle}>"{rejectModal.title}"</Text>
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
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setRejectModal({ visible: false, eventId: '', title: '' }); setRejectReason(''); }}>
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
  sortButton: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
    height: 40, borderRadius: borderRadius.lg, backgroundColor: colors.light.secondary, gap: 4,
  },
  sortText: { fontSize: typography.xs, fontWeight: '600', color: colors.light.foreground },
  emptyContainer: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { fontSize: typography.base, color: colors.light.mutedForeground, marginTop: spacing.md },
  eventCard: {
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    backgroundColor: colors.light.card, borderRadius: borderRadius.xl,
    padding: spacing.md, borderWidth: 1, borderColor: colors.light.border,
  },
  eventHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  eventImage: { width: 64, height: 64, borderRadius: borderRadius.lg },
  eventImagePlaceholder: { backgroundColor: colors.light.secondary, justifyContent: 'center', alignItems: 'center' },
  eventInfo: { flex: 1, marginLeft: spacing.md },
  eventTitle: { fontSize: typography.base, fontWeight: '700', color: colors.light.foreground },
  eventOrganizer: { fontSize: typography.sm, color: colors.light.mutedForeground, marginTop: 2 },
  eventDate: { fontSize: typography.xs, color: colors.light.mutedForeground, marginTop: 2 },
  eventDesc: { fontSize: typography.sm, color: colors.light.mutedForeground, marginTop: spacing.sm, lineHeight: 18 },
  eventMeta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm, gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: typography.xs, color: colors.light.mutedForeground },
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
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    width: '85%', backgroundColor: colors.light.background, borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  modalTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.light.foreground },
  modalSubtitle: { fontSize: typography.sm, color: colors.light.mutedForeground, marginTop: 4, marginBottom: spacing.md },
  modalInput: {
    backgroundColor: colors.light.secondary, borderRadius: borderRadius.lg,
    padding: spacing.md, fontSize: typography.base, color: colors.light.foreground,
    minHeight: 80, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.sm },
  modalCancel: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg,
    backgroundColor: colors.light.secondary, alignItems: 'center',
  },
  modalCancelText: { fontSize: typography.base, fontWeight: '600', color: colors.light.foreground },
  modalConfirm: {
    flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg,
    backgroundColor: '#DC2626', alignItems: 'center',
  },
  modalConfirmText: { fontSize: typography.base, fontWeight: '700', color: '#fff' },
});
