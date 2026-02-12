'use client';

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useUserStore } from '../store/userStore';
import { useNotificationStore } from '../store/notificationStore';
import { useEventStore } from '../store/eventStore';
import Avatar from './Avatar';

interface HeaderProps {
  showBack?: boolean;
  onBackPress?: () => void;
  title?: string;
  onProfilePress?: () => void;
  rightElement?: React.ReactNode;
}

const CITIES = [
  { id: '1', name: 'Астана' },
  { id: '2', name: 'Алматы' },
  { id: '3', name: 'Шымкент' },
  { id: '4', name: 'Актау' },
  { id: '5', name: 'Актобе' },
  { id: '6', name: 'Атырау' },
  { id: '7', name: 'Караганда' },
  { id: '8', name: 'Костанай' },
  { id: '9', name: 'Кызылорда' },
  { id: '10', name: 'Павлодар' },
  { id: '11', name: 'Петропавловск' },
  { id: '12', name: 'Семей' },
  { id: '13', name: 'Талдыкорган' },
  { id: '14', name: 'Тараз' },
  { id: '15', name: 'Уральск' },
  { id: '16', name: 'Усть-Каменогорск' },
  { id: '17', name: 'Экибастуз' },
];

export default function Header({
  showBack = false,
  onBackPress,
  title,
  onProfilePress,
  rightElement,
}: HeaderProps) {
  const navigation = useNavigation<any>();
  const { user } = useUserStore();
  const { events } = useEventStore();

  const { notifications, unreadCount, fetchNotifications, markAsRead, initializeSocket } =
    useNotificationStore();

  const [selectedCity, setSelectedCity] = useState('Алматы');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const dropdownRef = useRef<View>(null);

  useEffect(() => {
    if (user && user.id) {
      initializeSocket(user.id);
      fetchNotifications();
    }
  }, [user?.id]);

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setShowCityDropdown(false);
  };

  const handleAvatarPress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      // Проверяем, находимся ли мы уже на экране профиля
      const currentRoute = navigation.getState()?.routes?.[navigation.getState()?.index];

      if (currentRoute?.name === 'MainTabs') {
        // Если уже на табах, переключаемся на таб Profile
        navigation.navigate('MainTabs', { screen: 'Profile' });
      } else {
        // Если не на табах (например, в модальном стеке),
        // то переходим на табы и устанавливаем активным таб Profile
        navigation.navigate('MainTabs', {
          screen: 'Profile',
          params: {
            screen: 'ProfileMain',
          },
        });
      }
    }
  };

  const handleNotificationPress = (notification: any) => {
    markAsRead(notification.id);
    setShowNotificationsModal(false);

    if (notification.type === 'friend_request' || notification.type === 'friend_accept' || notification.type === 'friend_removed') {
       navigation.navigate('FriendProfile', { userId: notification.relatedId });
    } else if (notification.type === 'new_message') {
       const senderName = notification.content.includes('от ') ? notification.content.split('от ')[1] : 'Чат';
       navigation.navigate('Chat', { userId: notification.relatedId, userName: senderName });
    } else {
        if (notification.relatedId) {
          const targetEvent = events.find(e => e.id === notification.relatedId);
          if (targetEvent) {
            navigation.navigate('EventDetail', { ...targetEvent });
          } else {
            navigation.navigate('EventDetail', { eventId: notification.relatedId });
          }
        }
    }
  };

  const handleOpenNotifications = () => {
    setShowNotificationsModal(true);
  };

  const renderCityItem = ({ item }: { item: { id: string; name: string } }) => (
    <TouchableOpacity
      style={[styles.cityItem, selectedCity === item.name && styles.selectedCityItem]}
      onPress={() => handleCitySelect(item.name)}
      disabled={item.name !== 'Алматы'}
    >
      <View style={styles.cityItemContent}>
        <Text
          style={[
            styles.cityItemText,
            selectedCity === item.name && styles.selectedCityItemText,
            item.name !== 'Алматы' && styles.disabledCityText,
          ]}
        >
          {item.name}
        </Text>
        {item.name !== 'Алматы' && (
          <View style={styles.soonBadge}>
            <Text style={styles.soonText}>Скоро</Text>
          </View>
        )}
      </View>
      {selectedCity === item.name && (
        <Ionicons name="checkmark" size={18} color={colors.light.primary} />
      )}
    </TouchableOpacity>
  );

  const getIconName = (type: string) => {
    switch (type) {
      case 'friend_request': return 'person-add-outline';
      case 'friend_accept': return 'person-outline';
      case 'new_message': return 'chatbubble-ellipses-outline';
      case 'new_event': return 'calendar-outline';
      case 'friend_removed': return 'person-remove-outline';
      default: return 'notifications-outline';
    }
  };

  const renderNotificationItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notifIconContainer}>
        <Ionicons name={getIconName(item.type)} size={20} color={colors.light.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.notifContent}>{item.content}</Text>
        <Text style={styles.notifTime}>
          {new Date(item.timestamp).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.container}>
          {/* Центральная секция (Заголовок) - рендерим первой, чтобы была ниже по слоям */}
          {title && (
            <View style={styles.centerSection}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title}
              </Text>
            </View>
          )}

          {/* Левая секция */}
          <View style={styles.leftSection}>
            {showBack ? (
              <TouchableOpacity
                onPress={onBackPress || (() => navigation.goBack())}
                style={styles.backButton}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.light.foreground} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.logoContainer}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
              >
                <View style={styles.logoIcon}>
                  <Ionicons
                    name="flash"
                    size={20}
                    color={colors.light.primaryForeground}
                  />
                </View>
                {!title && <Text style={styles.logoText}>Eventum</Text>}
              </TouchableOpacity>
            )}

            {!showBack && !title && (
              <View ref={dropdownRef}>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={() => setShowCityDropdown(true)}
                >
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={colors.light.foreground}
                  />
                  <Text style={styles.locationText}>{selectedCity}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Правая секция */}
          <View style={styles.rightSection}>
            {rightElement}

            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleOpenNotifications}
              hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={colors.light.foreground}
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarButton}
              onPress={handleAvatarPress}
              hitSlop={{ top: 10, bottom: 10, left: 5, right: 15 }}
            >
              <Avatar 
                uri={user.avatarUrl} 
                name={user.name || user.username || "User"} 
                size={32} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <Modal
        visible={showCityDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCityDropdown(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowCityDropdown(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownContainer}>
                <Text style={styles.dropdownTitle}>Выберите город</Text>
                <FlatList
                  data={CITIES}
                  renderItem={renderCityItem}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  style={styles.cityList}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={showNotificationsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowNotificationsModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.notificationDropdownContainer}>
                <View style={styles.notifHeader}>
                  <Text style={styles.dropdownTitle}>Уведомления</Text>
                  {notifications.length > 0 && (
                    <TouchableOpacity onPress={() => markAsRead()}>
                      <Text style={styles.readAllText}>Прочитать все</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <FlatList
                  data={notifications}
                  renderItem={renderNotificationItem}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  style={styles.notificationList}
                  contentContainerStyle={notifications.length === 0 && styles.emptyList}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Ionicons
                        name="notifications-off-outline"
                        size={40}
                        color={colors.light.mutedForeground}
                      />
                      <Text style={styles.emptyText}>Нет новых уведомлений</Text>
                    </View>
                  }
                />
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => {
                    setShowNotificationsModal(false);
                    navigation.navigate('Notifications');
                  }}
                >
                  <Text style={styles.viewAllText}>Показать все</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.light.background },
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 10,
    minWidth: 40,
  },
  centerSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    // pointerEvents перенесен в стили для устранения предупреждения react-native-web
    pointerEvents: 'box-none',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    zIndex: 10,
    minWidth: 40,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.light.foreground,
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: colors.light.foreground,
    maxWidth: '55%',
    textAlign: 'center',
  },
  backButton: { padding: spacing.xs },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.light.secondary,
  },
  locationText: {
    fontSize: typography.sm,
    fontWeight: '500',
    color: colors.light.foreground,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  avatarButton: { marginLeft: spacing.xs },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.light.accentForeground,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 100,
    paddingHorizontal: spacing.lg,
  },
  dropdownContainer: {
    backgroundColor: colors.light.background,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
    elevation: 5,
  },
  notificationDropdownContainer: {
    backgroundColor: colors.light.background,
    borderRadius: borderRadius.lg,
    paddingBottom: spacing.sm,
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
    elevation: 5,
    maxHeight: 500,
    marginTop: -20,
  },
  dropdownTitle: {
    fontSize: typography.base,
    fontWeight: '600',
    color: colors.light.mutedForeground,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  readAllText: {
    fontSize: 12,
    color: colors.light.primary,
    marginRight: spacing.lg,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  cityList: { maxHeight: 300 },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    opacity: 0.7,
  },
  cityItemContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cityItemText: { fontSize: typography.base, color: colors.light.foreground },
  selectedCityItem: { backgroundColor: colors.light.secondary },
  selectedCityItemText: { fontWeight: '600', color: colors.light.primary },
  disabledCityText: { color: colors.light.mutedForeground },
  soonBadge: {
    backgroundColor: colors.light.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  soonText: {
    fontSize: typography.xs,
    color: colors.light.mutedForeground,
    fontWeight: '500',
  },
  notificationList: {
    maxHeight: 350,
  },
  emptyList: {
    padding: 20,
    alignItems: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    gap: 12,
  },
  unreadNotification: {
    backgroundColor: '#F0F9FF',
  },
  notifIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.light.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    fontSize: 14,
    color: colors.light.foreground,
    lineHeight: 18,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 11,
    color: colors.light.mutedForeground,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.light.primary,
    marginTop: 6,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    color: colors.light.mutedForeground,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  viewAllText: {
    color: colors.light.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});
