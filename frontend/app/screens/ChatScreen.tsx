import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useChatStore } from '../store/chatStore';
import { useUserStore } from '../store/userStore';
import SocketManager from '../services/SocketManager';

import Header from '../components/Header';
import Avatar from '../components/Avatar';
import { colors, spacing, borderRadius, typography } from '../theme/colors';

export default function ChatScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { userId, userName } = route.params;
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  
  const { 
    activeChatMessages, 
    joinChat, 
    leaveChat, 
    sendMessage, 
    activeChatUser,
    activeChatTypingStatus,
  } = useChatStore();
  
  const { user, getUserProfile } = useUserStore();
  const [chatUser, setChatUser] = useState<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await getUserProfile(userId);
      setChatUser(userData);
    };
    loadUser();
  }, [userId]);

  useEffect(() => {
    joinChat(userId);

    return () => {
      leaveChat();
    };
  }, [userId]);

  const handleTyping = (text: string) => {
    setInputText(text);

    if (userId) {
      // Emit typing event via SocketManager
      SocketManager.emit('typing', { recipientId: userId });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to emit stop_typing
      typingTimeoutRef.current = setTimeout(() => {
        SocketManager.emit('stop_typing', { recipientId: userId });
      }, 3000);
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (activeChatMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [activeChatMessages]);

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText.trim(), user.id);
      setInputText('');
      
      // Immediately stop typing indicator on send
      if (userId) {
        SocketManager.emit('stop_typing', { recipientId: userId });
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    }
  };

  const renderMessage = ({ item, index }: { item: any, index: number }) => {
    const isMyMessage = item.senderId === user.id;
    
    // Check if we should show timestamp (e.g. if previous message was > 5 mins ago)
    const showTimestamp = index === 0 || 
      (new Date(item.timestamp).getTime() - new Date(activeChatMessages[index - 1].timestamp).getTime() > 5 * 60 * 1000);

    return (
      <View key={item.id}>
        {showTimestamp && (
          <View style={styles.timestampContainer}>
            <Text style={styles.timestampText}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(item.timestamp).toLocaleDateString()}
            </Text>
          </View>
        )}
        <View style={[
          styles.messageRow,
          isMyMessage ? styles.myMessageRow : styles.otherMessageRow
        ]}>
          {!isMyMessage && (
            <View style={{ marginRight: spacing.sm }}>
               <Avatar uri={route.params.userAvatar} name={userName} size={32} />
            </View>
          )}
          <View style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
          ]}>
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText
            ]}>
              {item.content}
            </Text>
            <View style={styles.metaContainer}>
                <Text style={[
                styles.messageTime,
                isMyMessage ? styles.myMessageTime : styles.otherMessageTime
                ]}>
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {isMyMessage && (
                    <Ionicons 
                        name={item.isRead ? "checkmark-done" : "checkmark"} 
                        size={12} 
                        color="rgba(255,255,255,0.7)" 
                        style={{ marginLeft: 4 }} 
                    />
                )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (!activeChatUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />
      
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
             <Ionicons name="arrow-back" size={24} color={colors.light.foreground} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
             <Text style={styles.headerName}>{userName}</Text>
             {chatUser?.isOnline ? (
                <Text style={styles.headerStatusOnline}>В сети</Text>
             ) : chatUser?.lastSeen ? (
                <Text style={styles.headerStatusOffline}>
                   Был(а) {new Date(chatUser.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
             ) : (
                <Text style={styles.headerStatusOffline}>Не в сети</Text>
             )}
          </View>
          <TouchableOpacity style={{ padding: 5 }}>
              <Ionicons name="ellipsis-vertical" size={20} color={colors.light.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={flatListRef}
          data={activeChatMessages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            activeChatTypingStatus ? (
              <View style={styles.typingIndicator}>
                 <Text style={styles.typingText}>{userName} печатает...</Text>
              </View>
            ) : null
          }
        />

        <View style={styles.inputOuterContainer}>
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="add" size={24} color={colors.light.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Сообщение..."
              placeholderTextColor={colors.light.mutedForeground}
              value={inputText}
              onChangeText={handleTyping}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              disabled={!inputText.trim()}
              onPress={handleSend}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  timestampContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  timestampText: {
    fontSize: 12,
    color: colors.light.mutedForeground,
    backgroundColor: colors.light.muted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.light.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    color: colors.light.foreground,
    fontWeight: '700',
    fontSize: 14,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: colors.light.primary,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 18,
  },
  otherMessageBubble: {
    backgroundColor: colors.light.card,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  messageText: {
    fontSize: typography.base,
    marginBottom: 4,
    lineHeight: 20,
  },
  myMessageText: {
    color: colors.light.primaryForeground,
  },
  otherMessageText: {
    color: colors.light.foreground,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
    gap: 4
  },
  messageTime: {
    fontSize: 10,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherMessageTime: {
    color: colors.light.mutedForeground,
  },
  inputOuterContainer: {
    backgroundColor: colors.light.background,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingBottom: spacing.sm, 
  },
  attachButton: {
    padding: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.light.secondary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: typography.base,
    color: colors.light.foreground,
    marginHorizontal: spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.light.muted,
  },
  headerContainer: {
    height: 56,
    backgroundColor: colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerName: {
     fontSize: typography.base,
     fontWeight: '700',
     color: colors.light.foreground,
  },
  headerStatusOnline: {
     fontSize: 10,
     color: '#10B981',
     fontWeight: '600',
  },
  headerStatusOffline: {
     fontSize: 10,
     color: colors.light.mutedForeground,
  },
  typingIndicator: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.light.mutedForeground,
  },
});
