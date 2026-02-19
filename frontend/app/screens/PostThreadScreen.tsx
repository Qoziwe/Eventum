import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useDiscussionStore } from '../store/discussionStore';
import { useUserStore } from '../store/userStore';
import { useToast } from '../components/ToastProvider';
import { calculateUserAge } from '../utils/dateUtils';
import { sanitizeText } from '../utils/security';
import Header from '../components/Header'; // Импорт Header

export default function PostThreadScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { postId } = route.params || {};
  const { showToast } = useToast();

  const { user } = useUserStore();
  const {
    posts,
    getCommentsByPostId,
    addComment,
    votePost,
    fetchComments,
    joinPost,
    leavePost,
  } = useDiscussionStore();

  const post = (posts || []).find(p => p.id === postId);
  const comments = getCommentsByPostId(postId);

  const userAge = useMemo(() => calculateUserAge(user.birthDate), [user.birthDate]);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (postId) {
      fetchComments(postId);
      joinPost(postId);
    }
    return () => {
      if (postId) leavePost(postId);
    };
  }, [postId]);

  const hasAccess = useMemo(() => {
    if (!post) return false;
    return userAge >= (post.ageLimit || 0);
  }, [post, userAge]);

  if (!post) {
    return (
      <View style={styles.fullContainer}>
        <Header title="Ошибка" showBack={true} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Обсуждение не найдено</Text>
        </View>
      </View>
    );
  }

  if (!hasAccess) {
    return (
      <View style={styles.fullContainer}>
        <Header title="Доступ ограничен" showBack={true} />
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={80} color={colors.light.mutedForeground} />
          <Text style={styles.deniedTitle}>Вам меньше {post.ageLimit} лет</Text>
          <Text style={styles.deniedText}>
            Это обсуждение содержит контент, который не предназначен для вашего возраста.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Вернуться назад</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleVote = (type: 'up' | 'down') => {
    if (!user.id) {
      showToast({ message: 'Войдите, чтобы голосовать', type: 'error' });
      return;
    }
    votePost(postId, type);
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    if (!user.id) {
      showToast({ message: 'Сначала авторизуйтесь', type: 'error' });
      return;
    }

    try {
      const sanitizedComment = sanitizeText(commentText.trim());
      setCommentText('');
      await addComment(postId, user.id, user.name, sanitizedComment);
      showToast({ message: 'Комментарий добавлен', type: 'success' });
    } catch (error: any) {
      showToast({
        message: error.message || 'Ошибка при добавлении комментария',
        type: 'error',
      });
    }
  };

  const userVote = post.votedUsers?.[user.id];

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />

      <Header
        title="Обсуждение"
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
          automaticallyAdjustKeyboardInsets={true}
        >
          <View style={styles.postSection}>
            <View style={styles.postHeader}>
              <View style={styles.authorBadge}>
                <Text style={styles.authorName}>{post.authorName}</Text>
              </View>
              <View style={styles.rightHeader}>
                {post.ageLimit > 0 && (
                  <View style={styles.ageBadge}>
                    <Text style={styles.ageBadgeText}>{post.ageLimit}+</Text>
                  </View>
                )}
                <Text style={styles.postTime}>
                  {new Date(post.timestamp).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <Text style={styles.postContent}>{post.content}</Text>

            <View style={styles.postActions}>
              <View style={styles.voteContainer}>
                <TouchableOpacity onPress={() => handleVote('up')} style={styles.voteBtn}>
                  <Ionicons
                    name={
                      userVote === 'up' ? 'arrow-up-circle' : 'arrow-up-circle-outline'
                    }
                    size={26}
                    color={
                      userVote === 'up'
                        ? colors.light.primary
                        : colors.light.mutedForeground
                    }
                  />
                </TouchableOpacity>
                <Text
                  style={[styles.voteCount, userVote && { color: colors.light.primary }]}
                >
                  {post.upvotes - post.downvotes}
                </Text>
                <TouchableOpacity
                  onPress={() => handleVote('down')}
                  style={styles.voteBtn}
                >
                  <Ionicons
                    name={
                      userVote === 'down'
                        ? 'arrow-down-circle'
                        : 'arrow-down-circle-outline'
                    }
                    size={26}
                    color={userVote === 'down' ? '#EF4444' : colors.light.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Комментарии ({post.commentCount})</Text>
            {comments.length > 0 ? (
              comments.map(comment => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                    <Text style={styles.commentTime}>
                      {new Date(comment.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.commentText}>{comment.content}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyComments}>
                Пока нет комментариев. Будьте первым!
              </Text>
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Написать ответ..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
            onPress={handleSendComment}
            disabled={!commentText.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: colors.light.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorText: { color: colors.light.mutedForeground, fontSize: 16 },
  deniedTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 20,
    color: colors.light.foreground,
  },
  deniedText: {
    textAlign: 'center',
    color: colors.light.mutedForeground,
    marginTop: 10,
    lineHeight: 22,
  },
  backButton: {
    marginTop: 30,
    backgroundColor: colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
  },
  backButtonText: { color: '#fff', fontWeight: '700' },
  container: { flex: 1 },
  scrollContentContainer: { flexGrow: 1 },
  postSection: {
    padding: spacing.lg,
    backgroundColor: colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  authorBadge: {
    backgroundColor: colors.light.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  authorName: { fontWeight: '700', fontSize: 13, color: colors.light.primary },
  rightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ageBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ageBadgeText: { fontSize: 10, fontWeight: '800', color: '#EF4444' },
  postTime: { fontSize: 12, color: colors.light.mutedForeground },
  postContent: {
    fontSize: 17,
    lineHeight: 24,
    color: colors.light.foreground,
    marginBottom: 20,
  },
  postActions: { flexDirection: 'row', alignItems: 'center' },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.secondary,
    borderRadius: 30,
    paddingHorizontal: 4,
  },
  voteBtn: { padding: 8 },
  voteCount: {
    fontSize: 16,
    fontWeight: '800',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  commentsSection: { padding: spacing.lg },
  commentsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  commentItem: {
    backgroundColor: colors.light.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: { fontWeight: '700', fontSize: 13 },
  commentTime: { fontSize: 10, color: colors.light.mutedForeground },
  commentText: { fontSize: 14, color: colors.light.foreground, lineHeight: 18 },
  emptyComments: {
    textAlign: 'center',
    color: colors.light.mutedForeground,
    marginTop: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.light.background,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.light.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
