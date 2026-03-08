import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { Platform } from 'react-native';
import { useDiscussionStore } from '../store/discussionStore';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FriendProfileScreen() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId } = route.params || {};

  const {
    user: currentUser,
    getUserProfile,
    sendFriendRequest,
    respondFriendRequest,
    friends,
    incomingRequests,
    outgoingRequests,
    removeFriend,
  } = useUserStore();

  const { posts } = useDiscussionStore();

  const [profileUser, setProfileUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();



  useFocusEffect(
    useCallback(() => {
      loadProfile();
      // Refresh friends list to ensure status is up to date
      useUserStore.getState().fetchFriends();
    }, [userId])
  );

  const loadProfile = async () => {
    if (!userId) return;
    setLoading(true);
    const data = await getUserProfile(userId);
    setProfileUser(data);
    setLoading(false);
  };

  const friendshipStatus = useMemo(() => {
    if (!userId) return 'none';
    if (userId === currentUser?.id) return 'self';
    if (friends.some(f => f.id === userId)) return 'friend';
    if (incomingRequests.some(r => r.id === userId)) return 'incoming';
    if (outgoingRequests.some(r => r.id === userId)) return 'outgoing';
    return 'none';
  }, [friends, incomingRequests, outgoingRequests, userId, currentUser]);

  const handleSendRequest = async () => {
    if (userId) await sendFriendRequest(userId);
  };

  const handleAcceptRequest = async () => {
    const req = incomingRequests.find(r => r.id === userId);
    if (req) await respondFriendRequest(req.friendshipId, 'accept');
  };

  const handleRemoveFriend = () => {
    console.warn('Attempting to remove friend (Profile):', profileUser?.name);
    const friend = friends.find(f => f.id === userId);

    if (!friend) {
      console.warn('Friend not found in list for removal. User ID:', userId, 'Friends list size:', friends.length);
      if (Platform.OS === 'web') alert("Пользователь не найден в списке друзей");
      return;
    }

    const title = "Удалить из друзей";
    const message = `Вы уверены, что хотите удалить ${profileUser.name} из друзей?`;

    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        (async () => {
          try {
            await removeFriend(friend.friendshipId);
            console.log('Successfully removed friend from profile');
          } catch (err) {
            console.error('Failed to remove friend from profile:', err);
            alert("Ошибка: " + err);
          }
        })();
      }
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: "Отмена", style: "cancel" },
          {
            text: "Удалить",
            style: "destructive",
            onPress: async () => {
              try {
                await removeFriend(friend.friendshipId);
              } catch (err) {
                Alert.alert("Ошибка", "Не удалось удалить из друзей");
              }
            }
          }
        ]
      );
    }
  };

  const discussionsCount = useMemo(() => {
    if (!posts || !profileUser) return 0;
    return posts.filter(p => p.authorId === profileUser.id).length;
  }, [posts, profileUser]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Загрузка профиля...</Text>
      </View>
    );
  }

  if (!profileUser) {
    return (
      <View style={styles.fullContainer}>
        <Header title="Профиль" showBack={true} onBackPress={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={themeColors.mutedForeground} />
          <Text style={styles.errorText}>Пользователь не найден</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={themeColors.background} />

      <Header
        title={profileUser.name}
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeaderContainer}>
          <View style={styles.topRow}>
            <Avatar
              uri={profileUser.avatarUrl}
              name={profileUser.name}
              size={64}
              style={styles.avatar}
            />
            <View style={styles.infoColumn}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{profileUser.name}</Text>
              </View>
              <Text style={styles.username}>@{profileUser.username}</Text>
              <Text style={styles.role}>{profileUser.role}</Text>
              {profileUser.isOnline ? (
                <View style={styles.statusRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>В сети</Text>
                </View>
              ) : profileUser.lastSeen ? (
                <Text style={styles.lastSeenText}>
                  Был(а) {new Date(profileUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.socialActions}>
            {friendshipStatus === 'friend' ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.messageButton]}
                  onPress={() => navigation.navigate('Chat', { userId: profileUser.id, userName: profileUser.name, userAvatar: profileUser.avatarUrl })}
                >
                  <Ionicons name="chatbubble-outline" size={20} color={themeColors.primaryForeground} />
                  <Text style={styles.actionButtonText}>Сообщение</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.errorLightAlt, borderWidth: 1, borderColor: themeColors.destructive }]}
                  onPress={handleRemoveFriend}
                >
                  <Ionicons name="trash-outline" size={20} color={themeColors.destructive} />
                  <Text style={[styles.actionButtonText, { color: themeColors.destructive }]}>Удалить</Text>
                </TouchableOpacity>
              </>
            ) : friendshipStatus === 'incoming' ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleAcceptRequest}
              >
                <Ionicons name="person-add-outline" size={20} color={themeColors.primaryForeground} />
                <Text style={styles.actionButtonText}>Принять запрос</Text>
              </TouchableOpacity>
            ) : friendshipStatus === 'outgoing' ? (
              <View style={[styles.actionButton, styles.pendingButton]}>
                <Text style={[styles.actionButtonText, { color: themeColors.mutedForeground }]}>Запрос отправлен</Text>
              </View>
            ) : friendshipStatus === 'self' ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.pendingButton]}
                onPress={() => navigation.navigate('Profile')}
              >
                <Text style={[styles.actionButtonText, { color: themeColors.mutedForeground }]}>Это ваш профиль</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.addButton]}
                onPress={handleSendRequest}
              >
                <Ionicons name="person-add-outline" size={20} color={themeColors.primaryForeground} />
                <Text style={styles.actionButtonText}>Добавить в друзья</Text>
              </TouchableOpacity>
            )}


          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="location-outline" size={20} color={themeColors.primary} />
            <Text style={styles.statValue}>{profileUser.location}</Text>
            <Text style={styles.statLabel}>Город</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={20} color={themeColors.primary} />
            <Text style={styles.statValue}>{profileUser.purchasedTickets?.length || 0}</Text>
            <Text style={styles.statLabel}>Событий</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="chatbubbles-outline" size={20} color={themeColors.primary} />
            <Text style={styles.statValue}>{discussionsCount}</Text>
            <Text style={styles.statLabel}>Обсуждения</Text>
          </View>
        </View>

        {profileUser.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>О себе</Text>
            <View style={styles.bioCard}>
              <Text style={styles.bioText}>{profileUser.bio}</Text>
            </View>
          </View>
        ) : null}

        {profileUser.interests && profileUser.interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Интересы</Text>
            <View style={styles.interestsContainer}>
              {profileUser.interests.map((interest: string, index: number) => (
                <View key={index} style={styles.interestBadge}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: tc.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tc.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.base,
    color: tc.mutedForeground,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: typography.lg,
    color: tc.mutedForeground,
    textAlign: 'center',
  },
  container: {
    flex: 1
  },
  profileHeaderContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tc.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: typography["3xl"], fontWeight: '700', color: tc.foreground },
  infoColumn: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: typography.xl, fontWeight: '700', color: tc.foreground },
  username: { color: tc.primary, fontSize: typography.base, fontWeight: '600', marginTop: 1 },
  role: { color: tc.mutedForeground, fontSize: typography.sm, marginTop: 2 },
  socialActions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  messageButton: {
    backgroundColor: tc.primary,
  },
  addButton: {
    backgroundColor: tc.primary,
  },
  acceptButton: {
    backgroundColor: tc.primary,
  },
  pendingButton: {
    backgroundColor: tc.secondary,
    borderWidth: 1,
    borderColor: tc.border,
  },
  actionButtonText: {
    color: tc.primaryForeground,
    fontWeight: '700',
    fontSize: typography.base,
  },
  secondaryMessageButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tc.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tc.background,
    flex: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginVertical: spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: tc.card,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tc.border,
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    elevation: 2,
  },
  statValue: { fontSize: 15, fontWeight: '700', marginTop: 4, textAlign: 'center', color: tc.foreground },
  statLabel: { fontSize: 11, color: tc.mutedForeground, marginTop: 2 },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
    color: tc.foreground,
  },
  bioCard: {
    padding: spacing.md,
    backgroundColor: tc.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: tc.border,
  },
  bioText: {
    fontSize: typography.base,
    color: tc.foreground,
    lineHeight: 20,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  interestBadge: {
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    backgroundColor: tc.secondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tc.border,
  },
  interestText: { fontSize: 13, fontWeight: '600', color: tc.foreground },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  onlineText: { fontSize: typography.sm, color: colors.success, fontWeight: '600' },
  lastSeenText: { fontSize: typography.sm, color: tc.mutedForeground, marginTop: 4 },
});
