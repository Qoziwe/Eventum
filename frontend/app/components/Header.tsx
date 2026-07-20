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
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors, useThemeStore } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { useNotificationStore } from '../store/notificationStore';
import { useEventStore } from '../store/eventStore';
import Avatar from './Avatar';
import { useConfigStore } from '../store/configStore';

interface HeaderProps {
  showBack?: boolean;
  onBackPress?: () => void;
  title?: string;
  onProfilePress?: () => void;
  onSearchPress?: () => void;
  rightElement?: React.ReactNode;
}



export default function Header({
  showBack = false,
  onBackPress,
  title,
  onProfilePress,
  rightElement,
}: HeaderProps) {
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.isDark);
  const styles = createStyles(themeColors);
  const navigation = useNavigation<any>();
  const { user } = useUserStore();
  const { events } = useEventStore();
  const { platformName, cities, selectedCity, setSelectedCity } = useConfigStore();

  const { notifications, unreadCount, fetchNotifications, markAsRead } =
    useNotificationStore();

  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const dropdownRef = useRef<View>(null);

  useEffect(() => {
    if (user && user.id) {
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
      // Checking if we are already on the profile screen
      const currentRoute = navigation.getState()?.routes?.[navigation.getState()?.index];

      if (currentRoute?.name === 'MainTabs') {
        // If already on tabs, switch to tabs Profile
        navigation.navigate('MainTabs', { screen: 'Profile' });
      } else {
        // If not on tabs (for example in a modal stack),
        // then go to tabs and set active tab Profile
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

    // Ban notifications should not navigate anywhere
    if (notification.type === 'account_banned') {
      return;
    }

    if (notification.type === 'friend_request' || notification.type === 'friend_accept' || notification.type === 'friend_removed') {
      navigation.navigate('FriendProfile', { userId: notification.relatedId });
    } else if (notification.type === 'new_message') {
      const senderName = notification.content.includes('from ') ? notification.content.split('from ')[1] : 'Chat';
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
    >
      <View style={styles.cityItemContent}>
        <Text
          style={[
            styles.cityItemText,
            selectedCity === item.name && styles.selectedCityItemText,
          ]}
        >
          {item.name}
        </Text>
      </View>
      {selectedCity === item.name && (
        <Ionicons name="checkmark" size={18} color={themeColors.primary} />
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
        <Ionicons name={getIconName(item.type)} size={20} color={themeColors.primary} />
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
      <BlurView
        intensity={Platform.OS === 'android' ? 100 : 80}
        tint={isDark ? "dark" : "light"}
        style={[
          styles.glassHeader,
          {
            backgroundColor: isDark ? 'rgba(30, 30, 30, 0.4)' : 'rgba(255, 255, 255, 0.5)',
            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
            borderBottomWidth: 1,
            shadowColor: isDark ? '#000' : '#888',
          }
        ]}
      >
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.container}>
            {/* Central section (Heading) - render the first one so that it is lower in layers */}
            {title && (
              <View style={styles.centerSection}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {title}
                </Text>
              </View>
            )}

            {/* Left section */}
            <View style={styles.leftSection}>
              {showBack ? (
                <TouchableOpacity
                  onPress={() => {
                    if (onBackPress) {
                      onBackPress();
                    } else if (navigation.canGoBack()) {
                      navigation.goBack();
                    } else {
                      navigation.navigate('MainTabs', { screen: 'Home' });
                    }
                  }}
                  style={styles.backButton}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Ionicons name="arrow-back" size={24} color={themeColors.foreground} />
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
                      color={themeColors.primaryForeground}
                    />
                  </View>
                  {!title && <Text style={styles.logoText}>{platformName}</Text>}
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
                      color={themeColors.foreground}
                    />
                    <Text style={styles.locationText}>{selectedCity}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Right section */}
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
                  color={themeColors.foreground}
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
      </BlurView>

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
                <Text style={styles.dropdownTitle}>Select a city</Text>
                <FlatList
                  data={cities}
                  renderItem={renderCityItem}
                  keyExtractor={item => item.id.toString()}
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
                  <Text style={styles.dropdownTitle}>Notifications</Text>
                  {notifications.length > 0 && (
                    <TouchableOpacity onPress={() => markAsRead()}>
                      <Text style={styles.readAllText}>Read all</Text>
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
                        color={themeColors.mutedForeground}
                      />
                      <Text style={styles.emptyText}>No new notifications</Text>
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
                  <Text style={styles.viewAllText}>Show all</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  glassHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    // Add subtle shadow for depth
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(20px)',
      }
    }),
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  safeArea: { backgroundColor: 'transparent' },
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
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
    // pointerEvents moved to styles to eliminate warning react-native-web
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
    backgroundColor: tc.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: tc.foreground,
  },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: tc.foreground,
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
    backgroundColor: tc.secondary,
  },
  locationText: {
    fontSize: typography.sm,
    fontWeight: '500',
    color: tc.foreground,
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
    backgroundColor: tc.destructive,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: typography.xs,
    fontWeight: 'bold',
  },
  avatarButton: { marginLeft: spacing.xs },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: tc.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: tc.accentForeground,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 100,
    paddingHorizontal: spacing.lg,
  },
  dropdownContainer: {
    backgroundColor: tc.card,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
    elevation: 5,
  },
  notificationDropdownContainer: {
    backgroundColor: tc.card,
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
    color: tc.mutedForeground,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
  },
  readAllText: {
    fontSize: typography.sm,
    color: tc.primary,
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
    borderBottomColor: tc.border,
    opacity: 0.7,
  },
  cityItemContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cityItemText: { fontSize: typography.base, color: tc.foreground },
  selectedCityItem: { backgroundColor: tc.secondary },
  selectedCityItemText: { fontWeight: '600', color: tc.primary },
  disabledCityText: { color: tc.mutedForeground },
  soonBadge: {
    backgroundColor: tc.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  soonText: {
    fontSize: typography.xs,
    color: tc.mutedForeground,
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
    borderBottomColor: tc.border,
    gap: spacing.md,
  },
  unreadNotification: {
    backgroundColor: colors.infoLight,
  },
  notifIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tc.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    fontSize: typography.base,
    color: tc.foreground,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  notifTime: {
    fontSize: 11,
    color: tc.mutedForeground,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tc.primary,
    marginTop: 6,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    color: tc.mutedForeground,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: tc.border,
  },
  viewAllText: {
    color: tc.primary,
    fontWeight: '600',
    fontSize: typography.base,
  },
});
