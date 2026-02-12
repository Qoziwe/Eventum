import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useUserStore } from '../store/userStore';
import { useDiscussionStore } from '../store/discussionStore';
import Header from '../components/Header';

export default function FriendProfileScreen() {
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
    outgoingRequests
  } = useUserStore();
  
  const { posts } = useDiscussionStore();

  const [profileUser, setProfileUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;
    setLoading(true);
    const data = await getUserProfile(userId);
    setProfileUser(data);
    setLoading(false);
  };

  const friendshipStatus = useMemo(() => {
    if (!userId) return 'none';
    if (friends.some(f => f.id === userId)) return 'friend';
    if (incomingRequests.some(r => r.id === userId)) return 'incoming';
    if (outgoingRequests.some(r => r.id === userId)) return 'outgoing';
    return 'none';
  }, [friends, incomingRequests, outgoingRequests, userId]);

  const handleSendRequest = async () => {
    if (userId) await sendFriendRequest(userId);
  };

  const handleAcceptRequest = async () => {
     const req = incomingRequests.find(r => r.id === userId);
     if (req) await respondFriendRequest(req.friendshipId, 'accept');
  };

  const discussionsCount = useMemo(() => {
    if (!posts || !profileUser) return 0;
    return posts.filter(p => p.authorId === profileUser.id).length;
  }, [posts, profileUser]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Загрузка профиля...</Text>
      </View>
    );
  }

  if (!profileUser) {
    return (
      <View style={styles.fullContainer}>
        <Header title="Профиль" showBack={true} onBackPress={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.light.mutedForeground} />
          <Text style={styles.errorText}>Пользователь не найден</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />
      
      <Header 
        title={profileUser.name} 
        showBack={true} 
        onBackPress={() => navigation.goBack()} 
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeaderContainer}>
          <View style={styles.topRow}>
            <View style={styles.avatar}>
              {profileUser.avatarUrl ? (
                <Image source={{ uri: profileUser.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{profileUser.avatarInitials}</Text>
              )}
            </View>
            <View style={styles.infoColumn}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{profileUser.name}</Text>
              </View>
              <Text style={styles.username}>@{profileUser.username}</Text>
              <Text style={styles.role}>{profileUser.role}</Text>
            </View>
          </View>

          <View style={styles.socialActions}>
            {friendshipStatus === 'friend' ? (
              <TouchableOpacity 
                style={[styles.actionButton, styles.messageButton]}
                onPress={() => navigation.navigate('Chat', { userId: profileUser.id, userName: profileUser.name })}
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
                <Text style={[styles.actionButtonText, { color: colors.light.mutedForeground }]}>Запрос отправлен</Text>
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
            
            {friendshipStatus !== 'friend' && (
               <TouchableOpacity 
                style={[styles.actionButton, styles.secondaryMessageButton]}
                onPress={() => navigation.navigate('Chat', { userId: profileUser.id, userName: profileUser.name })}
              >
                <Ionicons name="chatbubble-outline" size={20} color={colors.light.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="location-outline" size={20} color={colors.light.primary} />
            <Text style={styles.statValue}>{profileUser.location}</Text>
            <Text style={styles.statLabel}>Город</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={20} color={colors.light.primary} />
            <Text style={styles.statValue}>{profileUser.purchasedTickets?.length || 0}</Text>
            <Text style={styles.statLabel}>Событий</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="chatbubbles-outline" size={20} color={colors.light.primary} />
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

const styles = StyleSheet.create({
  fullContainer: { 
    flex: 1, 
    backgroundColor: colors.light.background 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.base,
    color: colors.light.mutedForeground,
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
    color: colors.light.mutedForeground,
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
  username: { color: colors.light.primary, fontSize: 14, fontWeight: '600', marginTop: 1 },
  role: { color: colors.light.mutedForeground, fontSize: 12, marginTop: 2 },
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
    gap: 8,
  },
  messageButton: {
    backgroundColor: colors.light.primary,
  },
  addButton: {
    backgroundColor: '#00b894',
  },
  acceptButton: {
    backgroundColor: '#00b894',
  },
  pendingButton: {
    backgroundColor: colors.light.secondary,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryMessageButton: {
    width: 48, 
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.background,
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
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    elevation: 2,
  },
  statValue: { fontSize: 15, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  statLabel: { fontSize: 11, color: colors.light.mutedForeground, marginTop: 2 },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
    color: colors.light.foreground,
  },
  bioCard: {
    padding: spacing.md,
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  bioText: {
    fontSize: 14,
    color: colors.light.foreground,
    lineHeight: 20,
  },
  interestsContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8 
  },
  interestBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.light.secondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  interestText: { fontSize: 13, fontWeight: '600', color: colors.light.foreground },
});
