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
import { useThemeColors } from '../store/themeStore';
import { useDiscussionStore } from '../store/discussionStore';
import { useUserStore } from '../store/userStore';
import { useToast } from '../components/ToastProvider';
import { calculateUserAge } from '../utils/dateUtils';
import { sanitizeText } from '../utils/security';
import Header from '../components/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PostThreadScreen() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
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
  const insets = useSafeAreaInsets();

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
          <Ionicons name="lock-closed" size={80} color={themeColors.mutedForeground} />
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
      <StatusBar barStyle="dark-content" backgroundColor={themeColors.background} />

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
          contentContainerStyle={[styles.scrollContentContainer, { paddingTop: insets.top + 60 }]}
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
                        ? themeColors.primary
                        : themeColors.mutedForeground
                    }
                  />
                </TouchableOpacity>
                <Text
                  style={[styles.voteCount, userVote && { color: themeColors.primary }]}
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
                    color={userVote === 'down' ? themeColors.destructive : themeColors.mutedForeground}
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
            <Ionicons name="send" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: tc.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorText: { color: tc.mutedForeground, fontSize: typography.lg },
  deniedTitle: {
    fontSize: typography["2xl"],
    fontWeight: '800',
    marginTop: spacing.xl,
    color: tc.foreground,
  },
  deniedText: {
    textAlign: 'center',
    color: tc.mutedForeground,
    marginTop: 10,
    lineHeight: 22,
  },
  backButton: {
    marginTop: 30,
    backgroundColor: tc.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
  },
  backButtonText: { color: colors.white, fontWeight: '700' },
  container: { flex: 1 },
  scrollContentContainer: { flexGrow: 1 },
  postSection: {
    padding: spacing.lg,
    backgroundColor: tc.card,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
  },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  authorBadge: {
    backgroundColor: tc.secondary,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  authorName: { fontWeight: '700', fontSize: 13, color: tc.primary },
  rightHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ageBadge: {
    backgroundColor: colors.errorLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ageBadgeText: { fontSize: typography.xs, fontWeight: '800', color: tc.destructive },
  postTime: { fontSize: typography.sm, color: tc.mutedForeground },
  postContent: {
    fontSize: 17,
    lineHeight: 24,
    color: tc.foreground,
    marginBottom: spacing.xl,
  },
  postActions: { flexDirection: 'row', alignItems: 'center' },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tc.secondary,
    borderRadius: 30,
    paddingHorizontal: 4,
  },
  voteBtn: { padding: 8 },
  voteCount: {
    fontSize: typography.lg,
    fontWeight: '800',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  commentsSection: { padding: spacing.lg },
  commentsTitle: { fontSize: typography.lg, fontWeight: '700', marginBottom: 16 },
  commentItem: {
    backgroundColor: tc.card,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tc.border,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  commentAuthor: { fontWeight: '700', fontSize: 13 },
  commentTime: { fontSize: typography.xs, color: tc.mutedForeground },
  commentText: { fontSize: typography.base, color: tc.foreground, lineHeight: 18 },
  emptyComments: {
    textAlign: 'center',
    color: tc.mutedForeground,
    marginTop: spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: tc.background,
    borderTopWidth: 1,
    borderTopColor: tc.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: tc.secondary,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: tc.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
