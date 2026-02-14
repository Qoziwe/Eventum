import React, { useState, useMemo, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  InteractionManager,
  NativeSyntheticEvent,
  NativeScrollEvent,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/colors';

import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import ForYouSection from '../components/ribbons/ForYouSection';
import NextWeekFeed from '../components/ribbons/NextWeekFeed';
import EventsGrid from '../components/EventsGrid';
import Footer from '../components/Footer';
import EventCard from '../components/EventCard';

import { useEventStore } from '../store/eventStore';
import { useUserStore } from '../store/userStore';
import { useDiscussionStore } from '../store/discussionStore';
import { calculateUserAge } from '../utils/dateUtils';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { events, fetchEvents, isLoading: eventsLoading } = useEventStore();
  const { user } = useUserStore();
  const { posts, fetchPosts, isLoading: postsLoading } = useDiscussionStore();

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [visiblePopularCount, setVisiblePopularCount] = useState(8);
  const [refreshing, setRefreshing] = useState(false);
  const [homeSearchValue, setHomeSearchValue] = useState('');

  const userAge = useMemo(() => calculateUserAge(user.birthDate), [user.birthDate]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
      fetchPosts();
      setHomeSearchValue('');
      setActiveFilters({});
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchEvents(), fetchPosts()]);
    setRefreshing(false);
  }, [fetchEvents, fetchPosts]);

  const ageAppropriateEvents = useMemo(() => {
    return events.filter(e => userAge >= (e.ageLimit || 0) && (!e.moderationStatus || e.moderationStatus === 'approved'));
  }, [events, userAge]);

  const forYouEvents = useMemo(() => {
    if (!user.interests || user.interests.length === 0) {
      return ageAppropriateEvents.filter(e => e.isForYou).slice(0, 20);
    }

    const userInterestsLower = user.interests.map(i => i.toLowerCase().trim());

    return ageAppropriateEvents
      .filter(e => {
        if (!e.categories || e.categories.length === 0) return false;
        return e.categories.some(cat =>
          userInterestsLower.includes(cat.toLowerCase().trim())
        );
      })
      .sort((a, b) => {
        if (a.isForYou && !b.isForYou) return -1;
        if (!a.isForYou && b.isForYou) return 1;
        return (b.stats || 0) - (a.stats || 0);
      })
      .slice(0, 20);
  }, [ageAppropriateEvents, user.interests]);

  const displayInterests = useMemo(() => {
    if (!user.interests || user.interests.length === 0) return 'Рекомендации для всех';
    return `Ваши интересы: ${user.interests.slice(0, 3).join(', ')}${user.interests.length > 3 ? '...' : ''}`;
  }, [user.interests]);

  const nextWeekEvents = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    let daysToMonday = currentDay === 0 ? 1 : 8 - currentDay;
    const nextMon = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysToMonday
    ).getTime();
    const nextSunEnd = nextMon + 7 * 24 * 60 * 60 * 1000 - 1;

    const strict = ageAppropriateEvents.filter(
      e => e.timestamp >= nextMon && e.timestamp <= nextSunEnd
    );
    const future = ageAppropriateEvents.filter(e => e.timestamp > nextSunEnd);
    return strict.concat(future).slice(0, 20);
  }, [ageAppropriateEvents]);

  const popularEvents = useMemo(() => {
    return [...ageAppropriateEvents]
      .sort((a, b) => (b.stats || 0) - (a.stats || 0))
      .slice(0, visiblePopularCount);
  }, [ageAppropriateEvents, visiblePopularCount]);

  const trendingDiscussions = useMemo(() => {
    return [...(posts || [])]
      .filter(p => userAge >= (p.ageLimit || 0) && (!p.moderationStatus || p.moderationStatus === 'approved'))
      .sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes))
      .slice(0, 2);
  }, [posts, userAge]);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 500) {
      if (visiblePopularCount < ageAppropriateEvents.length) {
        InteractionManager.runAfterInteractions(() =>
          setVisiblePopularCount(prev => prev + 8)
        );
      }
    }
  }

  const handleApplyFilters = (filters: Record<string, string>) => {
    navigation.navigate('MainTabs', {
      screen: 'Search',
      params: {
        incomingFilters: filters,
        initialSearch: homeSearchValue,
      },
    });
  };

  return (
    <View style={styles.screenWrapper}>
      <Header
        onSearchPress={() => navigation.navigate('MainTabs', { screen: 'Search' })}
        onProfilePress={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
      />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.light.primary]}
            tintColor={colors.light.primary}
          />
        }
      >
        <View style={styles.heroTitleContainer}>
          <Text style={styles.heroTitle}>Твой город. Твои люди.</Text>
          <Text style={styles.heroTitle}>Твой следующий шаг.</Text>
        </View>

        <HeroSection
          searchValue={homeSearchValue}
          onSearchChange={setHomeSearchValue}
          onApplyFilters={handleApplyFilters}
          activeFilters={activeFilters}
          autoApply={false}
          showApplyButton={true}
        />

        {forYouEvents.length > 0 && (
          <ForYouSection title="Для вас" subtitle={displayInterests}>
            {forYouEvents.map((e, i) => (
              <EventCard
                key={`f-${e.id}-${i}`}
                {...e}
                onPress={() => navigation.navigate('EventDetail', { ...e })}
                style={styles.horizontalCard}
              />
            ))}
          </ForYouSection>
        )}

        {nextWeekEvents.length > 0 && (
          <NextWeekFeed
            title="На следующей неделе"
            events={nextWeekEvents}
            onEventPress={e => navigation.navigate('EventDetail', { ...e })}
            cardStyle={styles.horizontalCard}
          />
        )}

        {popularEvents.length > 0 && (
          <EventsGrid
            title="Популярное в городе"
            onViewAll={() => navigation.navigate('MainTabs', { screen: 'Search' })}
          >
            {popularEvents.map((e, i) => (
              <EventCard
                key={`p-${e.id}-${i}`}
                {...e}
                onPress={() => navigation.navigate('EventDetail', { ...e })}
                style={styles.gridCard}
              />
            ))}
          </EventsGrid>
        )}

        <View style={styles.discussionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Тренды обсуждений</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveIndicator} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>Активные темы в сообществах</Text>

          {trendingDiscussions.map(post => (
            <TouchableOpacity
              key={post.id}
              style={styles.discussionCard}
              onPress={() => navigation.navigate('PostThread', { postId: post.id })}
            >
              <View style={styles.discussionHeader}>
                <Text style={styles.discussionCommunity}>{post.categoryName}</Text>
                <Text style={styles.discussionTime}>
                  {new Date(post.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={styles.discussionContent} numberOfLines={2}>
                {post.content}
              </Text>
              <View style={styles.discussionFooter}>
                <View style={styles.statItem}>
                  <Ionicons name="arrow-up" size={14} color={colors.light.primary} />
                  <Text style={styles.statText}>{post.upvotes - post.downvotes}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={14}
                    color={colors.light.mutedForeground}
                  />
                  <Text style={styles.statText}>{post.commentCount}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.viewAllCommunitiesButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'CommunicationHub', params: { initialTab: 'discussions' } })}
          >
            <Text style={styles.viewAllText}>Все обсуждения</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.light.foreground} />
          </TouchableOpacity>
        </View>

        <Footer />
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.light.background },
  heroTitleContainer: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.light.background,
  },
  heroTitle: {
    fontSize: typography['3xl'],
    fontWeight: '700',
    color: colors.light.foreground,
    textAlign: 'center',
    lineHeight: 38,
  },
  gridCard: { width: 280, marginRight: spacing.md, marginBottom: spacing.md },
  horizontalCard: { width: 280, marginRight: spacing.md },
  discussionsSection: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.light.foreground,
  },
  sectionSubtitle: {
    fontSize: typography.xs,
    color: colors.light.mutedForeground,
    marginBottom: spacing.md,
    marginTop: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.light.secondary,
    borderRadius: borderRadius.md,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.light.accent,
    marginRight: 4,
  },
  liveText: { fontSize: 10, fontWeight: '700', color: colors.light.foreground },
  discussionCard: {
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  discussionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  discussionCommunity: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.light.primary,
  },
  discussionTime: { fontSize: typography.xs, color: colors.light.mutedForeground },
  discussionContent: {
    fontSize: typography.base,
    color: colors.light.foreground,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  discussionFooter: { flexDirection: 'row' },
  statItem: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.md },
  statText: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: colors.light.mutedForeground,
    marginLeft: 4,
  },
  viewAllCommunitiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.light.card,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  viewAllText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: colors.light.foreground,
    marginRight: spacing.sm,
  },
});
