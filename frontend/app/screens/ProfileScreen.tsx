import React, { useState, useMemo, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useUserStore } from '../store/userStore';
import { useEventStore } from '../store/eventStore';
import { useDiscussionStore } from '../store/discussionStore';
import { useToast } from '../components/ToastProvider';

import Header from '../components/Header';
import Avatar from '../components/Avatar'; // Импорт Header
import FavoritesList from '../components/ProfileComponents/FavoritesList';
import TicketsList from '../components/ProfileComponents/TicketsList';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params || {};
  const viewingUserId = params.userId;

  const { 
    user, 
    logout, 
    clearAllData, 
    becomeOrganizer, 
    getUserProfile, 
    sendFriendRequest, 
    respondFriendRequest,
    friends,
    incomingRequests,
    outgoingRequests
  } = useUserStore();
  
  const isOwnProfile = !viewingUserId || viewingUserId === user.id;
  const [profileUser, setProfileUser] = useState(isOwnProfile ? user : null);
  const [loadingProfile, setLoadingProfile] = useState(!isOwnProfile);

  useEffect(() => {
    if (isOwnProfile) {
      setProfileUser(user);
    } else {
      loadOtherProfile();
    }
  }, [user, viewingUserId]);

  const loadOtherProfile = async () => {
    if (!viewingUserId) return;
    setLoadingProfile(true);
    const data = await getUserProfile(viewingUserId);
    setProfileUser(data);
    setLoadingProfile(false);
  };
  
  const friendshipStatus = useMemo(() => {
    if (isOwnProfile || !viewingUserId) return 'self';
    if (friends.some(f => f.id === viewingUserId)) return 'friend';
    if (incomingRequests.some(r => r.id === viewingUserId)) return 'incoming';
    if (outgoingRequests.some(r => r.id === viewingUserId)) return 'outgoing';
    return 'none';
  }, [friends, incomingRequests, outgoingRequests, viewingUserId, isOwnProfile]);

  const handleSendRequest = async () => {
    if (viewingUserId) await sendFriendRequest(viewingUserId);
  };

  const handleAcceptRequest = async () => {
     const req = incomingRequests.find(r => r.id === viewingUserId);
     if (req) await respondFriendRequest(req.friendshipId, 'accept');
  };

  const { clearAllEvents } = useEventStore();
  const { clearAllDiscussions, posts } = useDiscussionStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'tickets' | 'favorites'>('tickets');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Убираем фокус с элементов при открытии модального окна на веб-платформе
  useEffect(() => {
    if (Platform.OS === 'web' && showClearConfirm) {
      // Небольшая задержка, чтобы модальное окно успело отрендериться
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined' && window.document) {
          const activeElement = window.document.activeElement as HTMLElement;
          if (activeElement && activeElement.blur) {
            // Проверяем, находится ли активный элемент в скрытом контейнере
            const hiddenParent = activeElement.closest('[aria-hidden="true"]');
            if (hiddenParent) {
              activeElement.blur();
            }
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showClearConfirm]);

  if (!profileUser) {
    return (
      <View style={[styles.fullContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Загрузка профиля...</Text>
      </View>
    );
  }

  const {
    avatarInitials,
    avatarUrl,
    name,
    email,
    role,
    userType,
    interests,
    savedEventIds,
    purchasedTickets,
  } = profileUser;

  const discussionsCount = useMemo(() => {
    if (!posts || !profileUser) return 0;
    return posts.filter(p => {
      const isAuthor = p.authorId === profileUser.id;
      // Voted logic only makes sense for own profile usually, but let's keep isAuthor
      return isAuthor;
    }).length;
  }, [posts, profileUser]);

  const handleLogout = () => {
    logout();
    showToast({ message: 'Вы вышли из аккаунта', type: 'info' });
  };

  const handleBecomeOrganizer = () => {
    becomeOrganizer();
    showToast({ message: 'Теперь вы организатор!', type: 'success' });
  };

  const handleSecretClear = async () => {
    try {
      await clearAllData();
      await clearAllEvents();
      await clearAllDiscussions();

      showToast({ message: 'Все данные (вкл. обсуждения) сброшены', type: 'success' });
      setShowClearConfirm(false);
    } catch (error: any) {
      showToast({ message: error.message || 'Ошибка при сбросе данных', type: 'error' });
      setShowClearConfirm(false);
    }
  };

  const menuItems = [
    ...(user.isAdmin
      ? [
          {
            id: 'admin_panel',
            title: 'Админ-панель',
            icon: 'shield-checkmark-outline',
            screen: 'AdminDashboard',
          },
        ]
      : []),
    ...(userType === 'explorer'
      ? [
          {
            id: 'followed_organizers',
            title: 'Мои авторы',
            icon: 'heart-outline',
            screen: 'FollowedOrganizers',
          },
        ]
      : []),
    {
      id: 'saved_events',
      title: 'Сохраненные события',
      icon: 'bookmark-outline',
      screen: 'SavedEvents',
    },
    {
      id: 'notifications',
      title: 'Уведомления',
      icon: 'notifications-outline',
      screen: 'Notifications',
    },
    {
      id: 'my_discussions',
      title: 'Мои обсуждения',
      icon: 'chatbubbles-outline',
      screen: 'MyDiscussions',
    },
  ];

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />

      <View
        accessibilityElementsHidden={showClearConfirm}
        importantForAccessibility={showClearConfirm ? 'no-hide-descendants' : 'yes'}
        style={{ flex: 1 }}
      >
        <Header 
          title={isOwnProfile ? "Профиль" : name} 
          showBack={true} 
          onBackPress={() => navigation.goBack()} 
        />

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.profileHeaderContainer}>
            <View style={styles.topRow}>
              <Avatar 
                uri={avatarUrl} 
                name={name || "User"} 
                size={64} 
                style={styles.avatar}
              />
              <View style={styles.infoColumn}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{name}</Text>
                </View>
                <Text style={styles.email}>{email}</Text>
                <Text style={styles.role}>{role}</Text>
              </View>
            </View>

            {isOwnProfile ? (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <Text style={styles.editButtonText}>Редактировать профиль</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.socialActions}>
                {friendshipStatus === 'friend' ? (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.messageButton]}
                    onPress={() => navigation.navigate('Chat', { userId: viewingUserId, userName: name, userAvatar: avatarUrl })}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Сообщение</Text>
                  </TouchableOpacity>
                ) : friendshipStatus === 'incoming' ? (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={handleAcceptRequest}
                  >
                    <Ionicons name="person-add-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Принять запрос</Text>
                  </TouchableOpacity>
                ) : friendshipStatus === 'outgoing' ? (
                  <View style={[styles.actionButton, styles.pendingButton]}>
                    <Text style={[styles.actionButtonText, { color: '#666' }]}>Запрос отправлен</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.addButton]}
                    onPress={handleSendRequest}
                  >
                    <Ionicons name="person-add-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Добавить в друзья</Text>
                  </TouchableOpacity>
                )}
                
                {/* Always show message button if friend or maybe even if not? Let's restrict to friends for now or just allow it */}
                {friendshipStatus !== 'friend' && (
                   <TouchableOpacity 
                    style={[styles.actionButton, styles.secondaryMessageButton]}
                    onPress={() => navigation.navigate('Chat', { userId: viewingUserId, userName: name, userAvatar: avatarUrl })}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color="#6C5CE7" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={20} color={colors.light.primary} />
              <Text style={styles.statValue}>{purchasedTickets.length}</Text>
              <Text style={styles.statLabel}>Билетов</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="bookmark-outline" size={20} color={colors.light.primary} />
              <Text style={styles.statValue}>{savedEventIds.length}</Text>
              <Text style={styles.statLabel}>Сохранено</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons
                name="chatbubbles-outline"
                size={20}
                color={colors.light.primary}
              />
              <Text style={styles.statValue}>{discussionsCount}</Text>
              <Text style={styles.statLabel}>Обсуждения</Text>
            </View>
          </View>

          {userType === 'explorer' && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionHeaderTitle}>Интересы</Text>
              <View style={styles.interestsContainer}>
                {interests.map((interest, index) => (
                  <View key={index} style={styles.interestBadge}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!isOwnProfile && <View style={{ height: 20 }} />}
          
          {isOwnProfile && userType !== 'organizer' && (
            <View style={styles.creatorCard}>
              <View style={styles.creatorContent}>
                <View style={styles.creatorIcon}>
                  <Ionicons name="sparkles" size={18} color={colors.light.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.creatorTitle}>
                    Хотите создавать свои мероприятия?
                  </Text>
                  <Text style={styles.creatorDescription}>
                    Станьте организатором и получите доступ к Studio
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.creatorButton}
                onPress={handleBecomeOrganizer}
              >
                <Text style={styles.creatorButtonText}>Стать организатором</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {isOwnProfile && (
            <View style={styles.sectionsContainer}>
            {menuItems.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.sectionItem}
                onPress={() => navigation.navigate(item.screen)}
              >
                <View style={styles.sectionIconContainer}>
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={colors.light.primary}
                  />
                </View>
                <Text style={styles.menuItemText}>{item.title}</Text>
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
          )}

          {isOwnProfile && (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <View style={styles.tabsContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'tickets' && styles.tabActive]}
                  onPress={() => setActiveTab('tickets')}
                >
                  <Text
                    style={[styles.tabText, activeTab === 'tickets' && styles.tabTextActive]}
                  >
                    Мои билеты
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
                  onPress={() => setActiveTab('favorites')}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'favorites' && styles.tabTextActive,
                    ]}
                  >
                    Сохраненное
                  </Text>
                </TouchableOpacity>
              </View>
              
              {activeTab === 'tickets' ? <TicketsList /> : <FavoritesList />}
            </View>
          )}

          {isOwnProfile && (
            <TouchableOpacity
              onPress={() => setShowClearConfirm(true)}
              style={styles.resetTrigger}
            >
              <Text style={styles.resetText}>v.1.0.4-production-reset</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      <Modal
        visible={showClearConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearConfirm(false)}
        accessibilityViewIsModal={true}
        presentationStyle="overFullScreen"
      >
        <View
          style={styles.modalOverlay}
          accessible={false}
          importantForAccessibility="yes"
          accessibilityElementsHidden={false}
        >
          <View
            style={styles.confirmModalContent}
            accessibilityViewIsModal={true}
            importantForAccessibility="yes"
            accessible={true}
          >
            <Text style={styles.confirmModalTitle}>Сбросить все данные?</Text>
            <Text style={styles.confirmModalText}>
              Это действие удалит все ваши данные: события, обсуждения, билеты и
              настройки. Это действие нельзя отменить.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalButtonCancel]}
                onPress={() => setShowClearConfirm(false)}
              >
                <Text style={styles.confirmModalButtonCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalButtonConfirm]}
                onPress={handleSecretClear}
              >
                <Text style={styles.confirmModalButtonConfirmText}>Сбросить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: colors.light.background },
  container: { flex: 1 },
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
  interestsSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionHeaderTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  interestsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  interestBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.light.secondary,
    borderRadius: 16,
  },
  interestText: { fontSize: 13, fontWeight: '500' },
  creatorCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  creatorContent: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  creatorIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${colors.light.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorTitle: { fontSize: 13, fontWeight: '700' },
  creatorDescription: { fontSize: 11, color: colors.light.mutedForeground, marginTop: 1 },
  creatorButton: {
    backgroundColor: colors.light.foreground,
    padding: 12,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  creatorButtonText: { color: colors.light.background, fontWeight: '700', fontSize: 14 },
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: 10,
    marginVertical: spacing.md,
  },
  tab: { flex: 1, padding: 10, borderRadius: borderRadius.lg, alignItems: 'center' },
  tabActive: { backgroundColor: colors.light.secondary },
  tabText: { fontWeight: '500', color: colors.light.mutedForeground, fontSize: 13 },
  tabTextActive: { color: colors.light.foreground, fontWeight: '700' },
  resetTrigger: { marginTop: 30, alignItems: 'center', opacity: 0.15 },
  resetText: { fontSize: 9 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  confirmModalContent: {
    backgroundColor: colors.light.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  confirmModalTitle: {
    fontSize: typography.xl,
    fontWeight: '800',
    color: colors.light.foreground,
    marginBottom: spacing.md,
  },
  confirmModalText: {
    fontSize: typography.base,
    color: colors.light.mutedForeground,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  confirmModalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  confirmModalButtonCancel: {
    backgroundColor: colors.light.secondary,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  confirmModalButtonCancelText: {
    color: colors.light.foreground,
    fontWeight: '700',
  },
  confirmModalButtonConfirm: {
    backgroundColor: '#EF4444',
  },
  confirmModalButtonConfirmText: {
    color: '#fff',
    fontWeight: '700',
  },
  socialActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    gap: 8,
  },
  messageButton: {
    backgroundColor: '#6C5CE7',
  },
  addButton: {
    backgroundColor: '#00b894',
  },
  acceptButton: {
    backgroundColor: '#00b894',
  },
  pendingButton: {
    backgroundColor: '#dfe6e9',
    borderWidth: 1,
    borderColor: '#b2bec3',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryMessageButton: {
    width: 44, 
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    flex: 0,
  }
});
