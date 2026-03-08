import React, { useEffect } from 'react';
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
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';
import { useNotificationStore } from '../store/notificationStore';
import { useEventStore } from '../store/eventStore';
import Header from '../components/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const navigation = useNavigation<any>();
  const { notifications, fetchNotifications, markAsRead } = useNotificationStore();
  const { events } = useEventStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleNotificationPress = (notification: any) => {
    markAsRead(notification.id);

    if (notification.type === 'friend_request' || notification.type === 'friend_accept' || notification.type === 'friend_removed') {
      // For friend notifications, relatedId is the userId
      navigation.navigate('FriendProfile', { userId: notification.relatedId });
    } else if (notification.type === 'new_message') {
      // Extract sender name from content or use a default
      const senderName = notification.content.includes('от ') ? notification.content.split('от ')[1] : 'Чат';
      navigation.navigate('Chat', { userId: notification.relatedId, userName: senderName });
    } else {
      // Default to event navigation
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

  const handleMarkAllRead = () => {
    markAsRead();
  };

  const renderMarkReadButton = () => (
    <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerActionBtn}>
      <Ionicons name="checkmark-done-outline" size={24} color={themeColors.primary} />
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

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={getIconName(item.type)}
          size={24}
          color={themeColors.primary}
        />
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.content}>{item.content}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      {!item.isRead && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <Header
        title="Уведомления"
        showBack={true}
        onBackPress={() => navigation.goBack()}
        rightElement={renderMarkReadButton()}
      />

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 60 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={60}
              color={themeColors.mutedForeground}
            />
            <Text style={styles.emptyText}>У вас нет уведомлений</Text>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: tc.background },
  headerActionBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { padding: spacing.md },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: tc.card,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: tc.border,
  },
  unreadNotification: {
    backgroundColor: colors.infoLight,
    borderColor: colors.infoBorder,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tc.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contentContainer: { flex: 1 },
  content: {
    fontSize: 15,
    color: tc.foreground,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: typography.sm,
    color: tc.mutedForeground,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tc.primary,
    marginLeft: spacing.sm,
    marginTop: 6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    color: tc.mutedForeground,
    fontSize: typography.lg,
  },
});
