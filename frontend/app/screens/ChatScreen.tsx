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
  Alert,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useChatStore } from '../store/chatStore';
import { useUserStore } from '../store/userStore';
import SocketManager from '../services/SocketManager';

import Header from '../components/Header';
import Avatar from '../components/Avatar';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';

export default function ChatScreen() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
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
    clearChatHistory,
    activeChatUser,
    activeChatTypingStatus,
  } = useChatStore();

  const { user, getUserProfile } = useUserStore();
  const [chatUser, setChatUser] = useState<any>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
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

  const handleMoreOptions = () => {
    setShowOptionsModal(true);
  };

  const handleAction = (action: string) => {
    setShowOptionsModal(false);
    if (action === 'clear') {
      clearChatHistory();
      if (Platform.OS === 'web') window.alert('История очищена');
      else Alert.alert('Очистка', 'История очищена');
    } else if (action === 'block') {
      if (Platform.OS === 'web') window.alert('Пользователь заблокирован');
      else Alert.alert('Блокировка', 'Пользователь заблокирован');
    } else if (action === 'report') {
      if (Platform.OS === 'web') window.alert('Жалоба отправлена');
      else Alert.alert('Жалоба', 'Жалоба отправлена');
    }
  };

  const handleAttachImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const b64 = result.assets[0].base64;
      // Send base64 to ensure it renders cross-platform
      sendMessage(`[Изображение прикреплено] data:image/png;base64,${b64}`, user.id);
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
            {item.content.startsWith('[Изображение прикреплено] ') ? (
              <Image
                source={{ uri: item.content.replace('[Изображение прикреплено] ', '') }}
                style={{ width: 200, height: 200, borderRadius: 12, marginBottom: 8 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={[
                styles.messageText,
                isMyMessage ? styles.myMessageText : styles.otherMessageText
              ]}>
                {item.content}
              </Text>
            )}
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
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={themeColors.background} />

      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerName}>{userName}</Text>
            {chatUser?.isOnline ? (
              <Text style={styles.headerStatusOnline}>В сети</Text>
            ) : chatUser?.lastSeen ? (
              <Text style={styles.headerStatusOffline}>
                Был(а) {new Date(chatUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            ) : (
              <Text style={styles.headerStatusOffline}>Не в сети</Text>
            )}
          </View>
          <TouchableOpacity style={{ padding: 5 }} onPress={handleMoreOptions}>
            <Ionicons name="ellipsis-vertical" size={20} color={themeColors.foreground} />
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
            <TouchableOpacity style={styles.attachButton} onPress={handleAttachImage}>
              <Ionicons name="add" size={24} color={themeColors.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Сообщение..."
              placeholderTextColor={themeColors.mutedForeground}
              value={inputText}
              onChangeText={handleTyping}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              disabled={!inputText.trim()}
              onPress={handleSend}
            >
              <Ionicons name="send" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showOptionsModal} transparent animationType="fade" onRequestClose={() => setShowOptionsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
          <View style={styles.optionsSheet}>
            <TouchableOpacity style={styles.optionButton} onPress={() => handleAction('clear')}>
              <Ionicons name="trash-outline" size={20} color={colors.errorLight} />
              <Text style={[styles.optionText, { color: colors.errorLight }]}>Очистить историю</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => handleAction('block')}>
              <Ionicons name="ban-outline" size={20} color={themeColors.foreground} />
              <Text style={[styles.optionText, { color: themeColors.foreground }]}>Заблокировать пользователя</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => handleAction('report')}>
              <Ionicons name="alert-circle-outline" size={20} color={themeColors.foreground} />
              <Text style={[styles.optionText, { color: themeColors.foreground }]}>Пожаловаться</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionButton, { borderBottomWidth: 0, justifyContent: 'center' }]} onPress={() => setShowOptionsModal(false)}>
              <Text style={[styles.optionText, { color: themeColors.mutedForeground, textAlign: 'center' }]}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tc.background,
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
    fontSize: typography.sm,
    color: tc.mutedForeground,
    backgroundColor: tc.muted,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
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
    backgroundColor: tc.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    color: tc.foreground,
    fontWeight: '700',
    fontSize: typography.base,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: tc.primary,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 18,
  },
  otherMessageBubble: {
    backgroundColor: tc.card,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 18,
    borderWidth: 1,
    borderColor: tc.border,
  },
  messageText: {
    fontSize: typography.base,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  myMessageText: {
    color: tc.primaryForeground,
  },
  otherMessageText: {
    color: tc.foreground,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
    gap: spacing.xs
  },
  messageTime: {
    fontSize: typography.xs,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherMessageTime: {
    color: tc.mutedForeground,
  },
  inputOuterContainer: {
    backgroundColor: tc.background,
    borderTopWidth: 1,
    borderTopColor: tc.border,
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
    backgroundColor: tc.secondary,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    fontSize: typography.base,
    color: tc.foreground,
    marginHorizontal: spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tc.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: tc.muted,
  },
  headerContainer: {
    height: 56,
    backgroundColor: tc.background,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
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
    color: tc.foreground,
  },
  headerStatusOnline: {
    fontSize: typography.xs,
    color: colors.success,
    fontWeight: '600',
  },
  headerStatusOffline: {
    fontSize: typography.xs,
    color: tc.mutedForeground,
  },
  typingIndicator: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  typingText: {
    fontSize: typography.sm,
    fontStyle: 'italic',
    color: tc.mutedForeground,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optionsSheet: {
    backgroundColor: tc.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
    gap: spacing.md,
  },
  optionText: {
    fontSize: typography.base,
    fontWeight: '600',
  },
});
