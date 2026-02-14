import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useUserStore, FriendData, FriendRequest } from '../store/userStore';
import { useChatStore, Conversation } from '../store/chatStore';
import { useDiscussionStore } from '../store/discussionStore';
import DiscussionCard from '../components/DiscussionComponents/DiscussionCard';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { DISCUSSION_CATEGORIES } from '../data/discussionMockData';
import { calculateUserAge } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

type TabType = 'chats' | 'friends' | 'search' | 'discussions';

export default function CommunicationHubScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [activeTab, setActiveTab] = useState<TabType>(route.params?.initialTab || 'chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Discussion State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [discussionSearch, setDiscussionSearch] = useState<string>('');

  const { 
    user, 
    friends, 
    incomingRequests, 
    outgoingRequests,
    fetchFriends, 
    searchUsers, 
    sendFriendRequest, 
    respondFriendRequest,
    removeFriend,
    updateFriendStatus,
  } = useUserStore();

  const { 
    conversations, 
    fetchConversations, 
    connectSocket, 
    socket,
    activeChatUser,
    updateConversationStatus
  } = useChatStore();

  const { posts, fetchPosts, isLoading: discussionsLoading } = useDiscussionStore();

  const userAge = useMemo(() => user.birthDate ? calculateUserAge(user.birthDate) : 18, [user.birthDate]);
  const categories = DISCUSSION_CATEGORIES || [];


  // Listen for friend requests
  useEffect(() => {
    if (socket) {
      const handleFriendRequest = () => {
        console.log('Friend request update received, refreshing...');
        fetchFriends();
      };
      
      const handleUserStatusUpdate = (data: { userId: string, isOnline: boolean, lastSeen?: string }) => {
        console.log('User status update:', data);
        updateFriendStatus(data.userId, data.isOnline, data.lastSeen);
        updateConversationStatus(data.userId, data.isOnline, data.lastSeen);
      };

      socket.on('friend_request', handleFriendRequest);
      socket.on('user_status_update', handleUserStatusUpdate);
      
      return () => {
        socket.off('friend_request', handleFriendRequest);
        socket.off('user_status_update', handleUserStatusUpdate);
      };
    }
  }, [socket]);

  // Fetch data on focus or tab change
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'chats') fetchConversations();
      if (activeTab === 'friends') fetchFriends();
      if (activeTab === 'discussions') fetchPosts();
    }, [activeTab])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    if (activeTab === 'chats') await fetchConversations();
    if (activeTab === 'friends') await fetchFriends();
    if (activeTab === 'discussions') await fetchPosts();
    setIsRefreshing(false);
  };

  const handleUserSearch = async (text: string) => {
    setSearchQuery(text);
    if (activeTab === 'search' && text.length > 2) {
      setIsSearching(true);
      const results = await searchUsers(text);
      setSearchResults(results);
      setIsSearching(false);
    }
  };

  const handleRemoveFriend = (friend: FriendData) => {
    console.warn('Attempting to remove friend:', friend.name);
    const title = "Удалить из друзей";
    const message = `Вы уверены, что хотите удалить ${friend.name} из друзей?`;
    
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        (async () => {
          try {
            await removeFriend(friend.friendshipId);
            console.log('Successfully removed friend');
          } catch (err) {
            console.error('Failed to remove friend:', err);
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

  const renderEmptyState = (icon: string, title: string, subtext?: string) => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name={icon as any} size={64} color={colors.light.mutedForeground} style={{ opacity: 0.3 }} />
      </View>
      <Text style={styles.emptyText}>{title}</Text>
      {subtext && <Text style={styles.emptySubtext}>{subtext}</Text>}
    </View>
  );

  // Filter Discussions
  const filteredPosts = useMemo(() => {
    const currentPosts = posts || [];
    const userId = user?.id;
    return currentPosts.filter(p => {
      const isAgeAppropriate = userAge >= (p.ageLimit || 0);
      if (!isAgeAppropriate) return false;

      // Only show approved posts on the main screen
      if (p.moderationStatus && p.moderationStatus !== 'approved') return false;

      const matchesSearch =
        p.content.toLowerCase().includes(discussionSearch.toLowerCase()) ||
        p.authorName.toLowerCase().includes(discussionSearch.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || p.categorySlug === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [discussionSearch, selectedCategory, posts, userAge, user?.id]);

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <View style={styles.tabsRow}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'chats' && styles.activeTab]} 
          onPress={() => setActiveTab('chats')}
        >
          <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]} numberOfLines={1}>Чаты</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]} 
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]} numberOfLines={1}>Друзья</Text>
          {incomingRequests.length > 0 && (
             <View style={styles.requestsBadge} />
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'search' && styles.activeTab]} 
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]} numberOfLines={1}>Поиск</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'discussions' && styles.activeTab]} 
          onPress={() => setActiveTab('discussions')}
        >
          <Text style={[styles.tabText, activeTab === 'discussions' && styles.activeTabText]} numberOfLines={1}>Обсуждения</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderChatsTuple = ({ item }: { item: Conversation }) => (
    <TouchableOpacity 
      style={styles.chatItem} 
      onPress={() => navigation.navigate('Chat', { userId: item.userId, userName: item.name, userAvatar: item.avatarUrl })}
    >
      <Avatar uri={item.avatarUrl} name={item.name} size={50} style={{ marginRight: spacing.md }} />
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.name}</Text>
          <Text style={styles.chatTime}>
            {new Date(item.lastMessageTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
        </View>
        <Text style={[styles.lastMessage, !item.isRead && styles.unreadMessage]} numberOfLines={1}>
          {item.lastMessage}
        </Text>
        {item.isOnline ? (
           <Text style={styles.onlineText}>В сети</Text>
        ) : item.lastSeen ? (
           <Text style={styles.lastSeenText}>Был(а) {new Date(item.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
        ) : null}
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderFriendItem = ({ item }: { item: FriendData }) => (
    <View style={styles.friendItem}>
      <TouchableOpacity 
        style={styles.friendInfoRow}
        onPress={() => navigation.navigate('FriendProfile', { userId: item.id })}
      >
        <Avatar uri={item.avatarUrl} name={item.name} size={50} style={{ marginRight: spacing.md }} />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.name}</Text>
          <Text style={styles.friendUsername}>@{item.username}</Text>
          {item.isOnline ? (
             <Text style={styles.onlineText}>В сети</Text>
          ) : item.lastSeen ? (
             <Text style={styles.lastSeenText}>Был(а) {new Date(item.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
      
      <View style={styles.friendActions}>
        <TouchableOpacity 
          style={styles.messageButton}
          onPress={() => navigation.navigate('Chat', { userId: item.id, userName: item.name, userAvatar: item.avatarUrl })}
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.light.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.messageButton, { backgroundColor: '#FEE2E2' }]} // light red bg
          onPress={() => handleRemoveFriend(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRequestItem = ({ item, type }: { item: FriendRequest, type: 'incoming' | 'outgoing' }) => (
    <View style={styles.requestItem}>
      <Avatar uri={item.avatarUrl} name={item.name} size={50} style={{ marginRight: spacing.md }} />
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{item.name}</Text>
        <Text style={styles.requestType}>
          {type === 'incoming' ? 'Хочет добавить вас в друзья' : 'Запрос отправлен'}
        </Text>
      </View>
      {type === 'incoming' ? (
        <View style={styles.requestActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => respondFriendRequest(item.friendshipId, 'accept')}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => respondFriendRequest(item.friendshipId, 'reject')}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>Ожидание</Text>
        </View>
      )}
    </View>
  );

  const renderSearchItem = ({ item }: { item: any }) => {
    const isFriend = friends.some(f => f.id === item.id);
    const isIncoming = incomingRequests.some(r => r.id === item.id);
    const isOutgoing = outgoingRequests.some(r => r.id === item.id);
    const isSelf = item.id === user.id;

    return (
      <View style={styles.searchItem}>
        <TouchableOpacity 
          style={styles.searchItemContent}
          onPress={() => {
            if (isSelf) {
              navigation.navigate('Profile');
            } else {
              navigation.navigate('FriendProfile', { userId: item.id });
            }
          }}
        >
          <Avatar uri={item.avatarUrl} name={item.name} size={50} style={{ marginRight: spacing.md }} />
          <View style={styles.searchInfo}>
            <Text style={styles.searchName}>{item.name}</Text>
            <Text style={styles.searchUsername}>@{item.username}</Text>
          </View>
        </TouchableOpacity>
        
        {!isSelf && (
          <View>
            {isFriend ? (
              <TouchableOpacity 
                style={styles.messageButtonSmall}
                onPress={() => navigation.navigate('Chat', { userId: item.id, userName: item.name, userAvatar: item.avatarUrl })}
              >
                <Ionicons name="chatbubble-ellipses" size={24} color={colors.light.primary} />
              </TouchableOpacity>
            ) : isIncoming ? (
              <TouchableOpacity 
                style={styles.statusButton}
                onPress={() => setActiveTab('friends')}
              >
                <Text style={styles.statusButtonText}>Запрос</Text>
              </TouchableOpacity>
            ) : isOutgoing ? (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>Отправлено</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => sendFriendRequest(item.id)}
              >
                <Ionicons name="person-add" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderDiscussionsHeader = () => (
    <View>
       <View style={styles.discSearchWrapper}>
          <View style={styles.discSearchContainer}>
            <Ionicons name="search-outline" size={20} color={colors.light.mutedForeground} />
            <TextInput
              style={styles.discSearchInput}
              placeholder="Поиск тем..."
              placeholderTextColor={colors.light.mutedForeground}
              value={discussionSearch}
              onChangeText={setDiscussionSearch}
            />
             {discussionSearch.length > 0 && (
              <TouchableOpacity onPress={() => setDiscussionSearch('')}>
                <Ionicons name="close-circle" size={20} color={colors.light.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
            {categories.map(category => {
              const isActive = selectedCategory === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={16}
                    color={isActive ? '#fff' : colors.light.foreground}
                  />
                  <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Header 
        title="Общение" 
        rightElement={
            activeTab === 'discussions' ? (
                <TouchableOpacity onPress={() => navigation.navigate('CreateDiscussion')}>
                    <Ionicons name="add-circle-outline" size={28} color={colors.light.primary} />
                </TouchableOpacity>
            ) : undefined
        }
      />

      {renderTabs()}

      <View style={styles.content}>
        {activeTab === 'chats' && (
          <FlatList
            data={conversations}
            renderItem={renderChatsTuple}
            keyExtractor={item => item.userId}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={renderEmptyState(
              "chatbubbles-outline", 
              "Нет активных чатов", 
              "Найдите друзей в поиске, чтобы начать общение"
            )}
          />
        )}

        {activeTab === 'friends' && (
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={item => item.id}
            ListHeaderComponent={
              <>
                {incomingRequests.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Запросы в друзья</Text>
                    {incomingRequests.map(req => (
                      <View key={req.id}>{renderRequestItem({ item: req, type: 'incoming' })}</View>
                    ))}
                  </View>
                )}
                
                {outgoingRequests.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Исходящие запросы</Text>
                    {outgoingRequests.map(req => (
                      <View key={req.id}>{renderRequestItem({ item: req, type: 'outgoing' })}</View>
                    ))}
                  </View>
                )}

              </>
            }
            ListEmptyComponent={
                friends.length === 0 && incomingRequests.length === 0 && outgoingRequests.length === 0 ? 
                    renderEmptyState("people-outline", "Список друзей пуст") : null
            }
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          />
        )}

        {activeTab === 'search' && (
            <View style={{ flex: 1 }}>
                <View style={styles.mainSearchContainer}>
                    <Ionicons name="search" size={20} color={colors.light.mutedForeground} />
                    <TextInput
                        style={styles.mainSearchInput}
                        placeholder="Поиск пользователей..."
                        placeholderTextColor={colors.light.mutedForeground}
                        value={searchQuery}
                        onChangeText={handleUserSearch}
                    />
                     {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => {setSearchQuery(''); setSearchResults([]);}}>
                            <Ionicons name="close-circle" size={20} color={colors.light.mutedForeground} />
                        </TouchableOpacity>
                    )}
                </View>
                <FlatList
                    data={searchResults}
                    renderItem={renderSearchItem}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                    isSearching ? (
                        <ActivityIndicator size="large" color={colors.light.primary} style={{ marginTop: 20 }} />
                    ) : (
                        renderEmptyState(
                            searchQuery.length > 0 ? "person-remove-outline" : "search-outline", 
                            searchQuery.length > 0 ? "Пользователи не найдены" : "Введите имя для поиска"
                        )
                    )
                    }
                />
            </View>
        )}

        {activeTab === 'discussions' && (
          <FlatList
            data={filteredPosts}
            renderItem={({ item }) => (
              <DiscussionCard
                {...item}
                onPress={() => {
                  if (item.moderationStatus && item.moderationStatus !== 'approved') {
                    Alert.alert(
                      item.moderationStatus === 'pending' ? 'На модерации' : 'Отклонено',
                      item.moderationStatus === 'pending'
                        ? 'Ваше обсуждение ещё проходит модерацию.'
                        : 'Ваше обсуждение было отклонено модератором.'
                    );
                    return;
                  }
                  navigation.navigate('PostThread', { postId: item.id });
                }}
              />
            )}
            keyExtractor={item => item.id}
            ListHeaderComponent={renderDiscussionsHeader}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={renderEmptyState("chatbox-ellipses-outline", "Обсуждений не найдено")}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  tabContainer: {
    backgroundColor: colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    paddingVertical: spacing.md,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    justifyContent: 'space-between',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.light.border,
    backgroundColor: colors.light.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primary,
  },
  onlineText: {
    fontSize: typography.xs,
    color: '#10B981', // green
    fontWeight: '600',
    marginTop: 2
  },
  lastSeenText: {
    fontSize: typography.xs,
    color: colors.light.mutedForeground,
    marginTop: 2
  },
  tabText: {
    fontSize: 12,
    color: colors.light.foreground,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeTabText: {
    color: colors.light.primaryForeground,
    fontWeight: '700',
  },
  requestsBadge: {
      position: 'absolute',
      top: 10,
      right: 5,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.light.destructive,
  },
  content: {
    flex: 1,
  },
  // Chats
  chatItem: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: spacing.md,
    backgroundColor: colors.light.secondary,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: typography.base,
    fontWeight: '700',
    color: colors.light.foreground,
  },
  chatTime: {
    fontSize: typography.sm,
    color: colors.light.mutedForeground,
  },
  lastMessage: {
    fontSize: typography.sm,
    color: colors.light.mutedForeground,
  },
  unreadMessage: {
    color: colors.light.foreground,
    fontWeight: '600',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.light.primary,
    marginLeft: spacing.sm,
  },
  // Friends
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.card,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  friendInfoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendActions: {
    flexDirection: 'row',
    gap: 8,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: typography.base,
    fontWeight: '700',
    color: colors.light.foreground,
    marginBottom: 4,
  },
  friendUsername: {
    fontSize: typography.sm,
    color: colors.light.mutedForeground,
  },
  messageButton: {
    padding: spacing.sm,
    backgroundColor: colors.light.secondary,
    borderRadius: borderRadius.full,
  },
  section: {
      paddingBottom: spacing.md,
  },
  sectionHeader: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.light.muted,
  },
  sectionTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: colors.light.mutedForeground,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.card,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.light.primary,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: typography.base,
    fontWeight: '700',
    color: colors.light.foreground,
  },
  requestType: {
    fontSize: typography.sm,
    color: colors.light.mutedForeground,
  },
  requestActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  acceptButton: {
    backgroundColor: '#10B981', // green-500
  },
  rejectButton: {
    backgroundColor: '#EF4444', // red-500
  },
  pendingBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.light.muted,
    borderRadius: borderRadius.md,
  },
  pendingText: {
    fontSize: typography.xs,
    color: colors.light.mutedForeground,
  },
  // Search
  mainSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.card,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    height: 48,
    borderWidth: 1,
    borderColor: colors.light.border,
    gap: spacing.sm,
  },
  mainSearchInput: {
      flex: 1,
      fontSize: typography.base,
      color: colors.light.foreground,
      fontWeight: '500',
  },
  searchIcon: {
      marginRight: spacing.sm,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.card,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  searchItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchName: {
    fontSize: typography.base,
    fontWeight: '700',
    color: colors.light.foreground,
    marginBottom: 4,
  },
  searchUsername: {
    fontSize: typography.sm,
    color: colors.light.mutedForeground,
  },
  searchInfo: {
    marginLeft: 0,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageButtonSmall: {
    padding: spacing.xs,
  },
  statusButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.light.secondary,
    borderRadius: borderRadius.full,
  },
  statusButtonText: {
    color: colors.light.primary,
    fontWeight: '600',
    fontSize: typography.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.light.muted,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    color: colors.light.mutedForeground,
    fontSize: typography.xs,
  },
  // Discussion Filters
  discSearchWrapper: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
  },
  discSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  discSearchInput: {
    flex: 1,
    fontSize: typography.base,
    color: colors.light.foreground,
    fontWeight: '500',
  },
  categoriesContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.light.border,
    backgroundColor: colors.light.background,
  },
  categoryChipActive: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primary,
  },
  categoryLabel: {
    fontSize: 13,
    color: colors.light.foreground,
    fontWeight: '600',
  },
  categoryLabelActive: {
    color: colors.light.primaryForeground,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: typography.lg,
    color: colors.light.mutedForeground,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typography.sm,
    color: colors.light.mutedForeground,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
