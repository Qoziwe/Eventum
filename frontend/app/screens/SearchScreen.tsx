import React, {
  useState,
  useLayoutEffect,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Keyboard,
  RefreshControl,
  TouchableOpacity,
  InteractionManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';

import HeroSection from '../components/HeroSection';
import EventCard from '../components/EventCard';
import Header from '../components/Header';
import { useEventStore } from '../store/eventStore';
import { useUserStore } from '../store/userStore';
import { calculateUserAge } from '../utils/dateUtils';

export default function SearchScreen() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { events, fetchEvents } = useEventStore();
  const { user } = useUserStore();
  const insets = useSafeAreaInsets();

  const [searchValue, setSearchValue] = useState('');
  const [currentFilters, setCurrentFilters] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  const userAge = useMemo(() => calculateUserAge(user.birthDate), [user.birthDate]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, [fetchEvents]);

  useEffect(() => {
    if (route.params?.incomingFilters) {
      setCurrentFilters(prev => ({ ...prev, ...route.params.incomingFilters }));
      navigation.setParams({ incomingFilters: undefined });
    }
  }, [route.params?.incomingFilters]);

  useEffect(() => {
    if (route.params?.initialSearch !== undefined) {
      setSearchValue(route.params.initialSearch);
      navigation.setParams({ initialSearch: undefined });
    }
  }, [route.params?.initialSearch]);

  useEffect(() => {
    if (route.params?.shouldAutoFocus) {
      // Используем InteractionManager чтобы дождаться завершения анимации навигации
      InteractionManager.runAfterInteractions(() => {
        // Небольшая задержка для гарантии что компонент отрендерился
        setTimeout(() => {
          setShouldAutoFocus(true);
        }, 100);
      });
      navigation.setParams({ shouldAutoFocus: undefined });
    }
  }, [route.params?.shouldAutoFocus]);

  const isSearching = searchValue.length > 0 || Object.keys(currentFilters).length > 0;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const filteredEvents = useMemo(() => {
    let result = events.filter(e => userAge >= (e.ageLimit || 0));

    if (isSearching) {
      result = result.filter(event => {
        if (searchValue.length > 0) {
          const s = searchValue.toLowerCase();
          const matches =
            event.title.toLowerCase().includes(s) ||
            event.location.toLowerCase().includes(s) ||
            (event.tags && event.tags.some(t => t.toLowerCase().includes(s)));
          if (!matches) return false;
        }

        if (
          currentFilters.date_day ||
          currentFilters.date_month ||
          currentFilters.date_year
        ) {
          const evDate = new Date(event.timestamp);
          if (
            currentFilters.date_day &&
            evDate.getDate() !== parseInt(currentFilters.date_day)
          )
            return false;
          if (
            currentFilters.date_month &&
            evDate.getMonth() !== parseInt(currentFilters.date_month)
          )
            return false;
          if (
            currentFilters.date_year &&
            evDate.getFullYear() !== parseInt(currentFilters.date_year)
          )
            return false;
        }

        for (const [key, value] of Object.entries(currentFilters)) {
          if (!value || value === 'any' || key.startsWith('date_')) continue;
          if (key === 'district' && event.district !== value) return false;
          if (key === 'vibe' && event.vibe !== value) return false;
          if (key === 'age' && event.ageLimit < parseInt(value)) return false;
          if (key === 'category') {
            const hasCat = event.categories?.some(
              c => c.toLowerCase() === value.toLowerCase()
            );
            if (!hasCat) return false;
          }
          if (key === 'price') {
            const p = event.priceValue || 0;
            if (value === 'free' && p !== 0) return false;
            if (value === 'low' && p > 5000) return false;
            if (value === 'medium' && (p < 5000 || p > 15000)) return false;
            if (value === 'high' && p < 15000) return false;
          }
        }
        return true;
      });
    }

    const sortMode = currentFilters['sort'];
    return [...result].sort((a, b) => {
      if (sortMode === 'popular') return (b.stats || 0) - (a.stats || 0);
      if (sortMode === 'soon') return (a.timestamp || 0) - (b.timestamp || 0);
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [events, searchValue, currentFilters, isSearching, userAge]);

  const handleReset = () => {
    setSearchValue('');
    setCurrentFilters({});
    Keyboard.dismiss();
  };

  return (
    <View style={styles.fullContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={themeColors.background} />

      <Header title="Поиск" showBack={true} onBackPress={() => navigation.goBack()} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[themeColors.primary]}
            tintColor={themeColors.primary}
          />
        }
      >
        <HeroSection
          searchPlaceholder="Поиск мероприятий..."
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onSearchClear={() => setSearchValue('')}
          activeFilters={currentFilters}
          onApplyFilters={setCurrentFilters}
          autoApply={true}
          showApplyButton={false}
          compact={false}
          autoFocus={false}
        />

        <View style={styles.listContent}>
          <View style={styles.resHead}>
            <Text style={styles.resTitle}>
              {isSearching ? `Найдено: ${filteredEvents.length}` : 'Все мероприятия'}
            </Text>
            {isSearching && (
              <TouchableOpacity onPress={handleReset}>
                <Text style={styles.resetTxt}>Сбросить</Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredEvents.length > 0 ? (
            filteredEvents.map(event => (
              <EventCard
                key={event.id}
                {...event}
                style={styles.eventCardOverride}
                onPress={() => navigation.navigate('EventDetail', { ...event })}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons
                  name={isSearching ? 'search-outline' : 'calendar-clear-outline'}
                  size={60}
                  color={themeColors.mutedForeground || themeColors.foreground}
                />
              </View>
              <Text style={styles.emptyTextTitle}>
                {isSearching ? 'Ничего не найдено' : 'Мероприятий пока нет'}
              </Text>
              <Text style={styles.emptyTextSub}>
                {isSearching
                  ? 'Попробуйте изменить поисковый запрос или фильтры'
                  : 'На данный момент список мероприятий пуст. Загляните позже!'}
              </Text>
            </View>
          )}
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: tc.background },
  container: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing["4xl"],
  },
  resHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  resTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: tc.foreground,
  },
  resetTxt: {
    color: tc.primary,
    fontWeight: '600',
    fontSize: typography.base,
  },
  eventCardOverride: { width: '100%', marginBottom: spacing.md },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${tc.primary}08`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTextTitle: {
    fontSize: typography["2xl"],
    fontWeight: '800',
    color: tc.foreground,
    marginBottom: spacing.sm,
  },
  emptyTextSub: {
    color: tc.mutedForeground || tc.mutedForeground,
    fontSize: typography.base,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
});
