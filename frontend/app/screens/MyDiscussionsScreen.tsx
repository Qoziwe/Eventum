import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { colors, spacing, borderRadius, typography } from '../theme/colors';
import DiscussionCard from '../components/DiscussionComponents/DiscussionCard';
import { useDiscussionStore } from '../store/discussionStore';
import { useUserStore } from '../store/userStore';
import { DISCUSSION_CATEGORIES } from '../data/discussionMockData';
import { calculateUserAge } from '../utils/dateUtils';
import Header from '../components/Header';

export default function MyDiscussionsScreen() {
  const navigation = useNavigation<any>();
  const { posts, fetchPosts } = useDiscussionStore();
  const { user } = useUserStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchValue, setSearchValue] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const userAge = useMemo(() => calculateUserAge(user.birthDate), [user.birthDate]);
  const categories = DISCUSSION_CATEGORIES || [];

  // Авто-обновление при фокусе на экран
  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, [fetchPosts]);

  const filteredPosts = useMemo(() => {
    const currentPosts = posts || [];
    return currentPosts.filter(p => {
      // ПРОВЕРКА НА ВЗАИМОДЕЙСТВИЕ: Пользователь автор ИЛИ пользователь голосовал
      const isInteracted =
        p.authorId === user.id ||
        (p.votedUsers && Object.keys(p.votedUsers).includes(user.id.toString()));

      if (!isInteracted) return false;

      const isAgeAppropriate = userAge >= (p.ageLimit || 0);
      if (!isAgeAppropriate) return false;

      const matchesSearch =
        p.content.toLowerCase().includes(searchValue.toLowerCase()) ||
        p.authorName.toLowerCase().includes(searchValue.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || p.categorySlug === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchValue, selectedCategory, posts, userAge, user.id]);

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />

      <Header
        title="Мои обсуждения"
        showBack={true}
        onBackPress={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateDiscussion')}
            style={{ padding: 4 }}
          >
            <Ionicons name="add" size={28} color={colors.light.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.light.primary]}
            tintColor={colors.light.primary}
          />
        }
      >
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color={colors.light.mutedForeground}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск в моих темах..."
              placeholderTextColor={colors.light.mutedForeground}
              value={searchValue}
              onChangeText={setSearchValue}
            />
            {searchValue.length > 0 && (
              <TouchableOpacity onPress={() => setSearchValue('')}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.light.mutedForeground}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.filtersSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
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
                  <Text
                    style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.listContent}>
          {filteredPosts.length > 0 ? (
            filteredPosts.map(post => (
              <DiscussionCard
                key={post.id}
                {...post}
                onPress={() => {
                  if (post.moderationStatus && post.moderationStatus !== 'approved') {
                    Alert.alert(
                      post.moderationStatus === 'pending' ? 'На модерации' : 'Отклонено',
                      post.moderationStatus === 'pending'
                        ? 'Ваше обсуждение ещё проходит модерацию.'
                        : 'Ваше обсуждение было отклонено модератором.'
                    );
                    return;
                  }
                  navigation.navigate('PostThread', { postId: post.id });
                }}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={60}
                  color={colors.light.mutedForeground}
                />
              </View>
              <Text style={styles.emptyTextTitle}>Вы пока не участвовали</Text>
              <Text style={styles.emptyTextSub}>
                Здесь появятся обсуждения, которые вы создали или в которых голосовали.
              </Text>
            </View>
          )}
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: colors.light.background },
  container: { flex: 1 },
  searchWrapper: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    height: 54,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
    boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.base,
    color: colors.light.foreground,
    fontWeight: '500',
  },
  filtersSection: {
    backgroundColor: colors.light.background,
  },
  categoriesContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1.2,
    borderColor: colors.light.border,
    backgroundColor: colors.light.background,
  },
  categoryChipActive: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primary,
    boxShadow: `0px 4px 8px ${colors.light.primary}33`,
    elevation: 3,
  },
  categoryLabel: {
    fontSize: 13,
    color: colors.light.foreground,
    fontWeight: '600',
  },
  categoryLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.light.primary}08`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTextTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.light.foreground,
    marginBottom: 8,
  },
  emptyTextSub: {
    color: colors.light.mutedForeground,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
});
