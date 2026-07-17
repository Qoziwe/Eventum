import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  TouchableWithoutFeedback,
  FlatList,
  ViewStyle,
  Dimensions,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors, useThemeStore } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { ALL_INTERESTS } from '../data/userMockData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const calculateUserAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  const today = new Date();
  const birthDateObj = new Date(birthDate);
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const m = today.getMonth() - birthDateObj.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }
  return age;
};

interface FilterItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface FilterOption {
  id: string;
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface HeroSectionProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (text: string) => void;
  onSearchClear?: () => void;
  onApplyFilters?: (filters: Record<string, string>) => void;
  activeFilters?: Record<string, string>;
  compact?: boolean;
  containerStyle?: ViewStyle;
  autoApply?: boolean;
  showApplyButton?: boolean;
  onFocus?: () => void;
  autoFocus?: boolean;
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Music: 'musical-notes-outline',
  Sport: 'fitness-outline',
  Movie: 'videocam-outline',
  Food: 'restaurant-outline',
  Technologies: 'hardware-chip-outline',
  Art: 'color-palette-outline',
  Education: 'school-outline',
  Business: 'briefcase-outline',
  Trips: 'airplane-outline',
  'Nightlife': 'wine-outline',
  Games: 'game-controller-outline',
  Theater: 'film-outline',
  'Active leisure': 'bicycle-outline',
  Exhibitions: 'images-outline',
};

const FILTERS_CONFIG: FilterItem[] = [
  { id: 'sort', label: 'Sorting', icon: 'options-outline' },
  { id: 'date', label: 'Date', icon: 'calendar-outline' },
  { id: 'category', label: 'Category', icon: 'apps-outline' },
  { id: 'price', label: 'Price', icon: 'card-outline' },
  { id: 'vibe', label: 'Vibe', icon: 'sparkles-outline' },
  { id: 'age', label: 'Age', icon: 'people-outline' },
  { id: 'district', label: 'District', icon: 'map-outline' },
];

const FILTER_OPTIONS: Record<string, FilterOption[]> = {
  sort: [
    { id: 's1', label: 'Popular', value: 'popular', icon: 'flame-outline' },
    { id: 's2', label: 'Nearest', value: 'soon', icon: 'time-outline' },
  ],
  category: ALL_INTERESTS.map((interest, index) => ({
    id: `cat-${index}`,
    label: interest,
    value: interest.toLowerCase(),
    icon: CATEGORY_ICONS[interest] || 'bookmark-outline',
  })),
  price: [
    { id: 'p1', label: 'Free', value: 'free', icon: 'gift-outline' },
    { id: 'p2', label: 'to 5 000$', value: 'low', icon: 'wallet-outline' },
    { id: 'p3', label: '5 000$ - 15 000$', value: 'medium', icon: 'cash-outline' },
    { id: 'p4', label: 'from 15 000$', value: 'high', icon: 'diamond-outline' },
  ],
  vibe: [
    { id: 'v1', label: 'Active', value: 'active', icon: 'flash-outline' },
    { id: 'v2', label: 'Calm', value: 'chill', icon: 'leaf-outline' },
    { id: 'v3', label: 'Family', value: 'family', icon: 'people-outline' },
    { id: 'v4', label: 'Romantic', value: 'heart-outline' },
    { id: 'v5', label: 'Party', value: 'wine-outline' },
  ],
  age: [
    { id: 'a1', label: '0+', value: '0' },
    { id: 'a2', label: '6+', value: '6' },
    { id: 'a3', label: '12+', value: '12' },
    { id: 'a4', label: '16+', value: '16' },
    { id: 'a5', label: '18+', value: '18' },
    { id: 'a6', label: '21+', value: '21' },
  ],
  district: [
    { id: 'l1', label: 'Almalinsky', value: 'Almalinsky' },
    { id: 'l2', label: 'Medeusky', value: 'Medeusky' },
    { id: 'l3', label: 'Bostandyksky', value: 'Bostandyksky' },
    { id: 'l4', label: 'Turksibsky', value: 'Turksibsky' },
    { id: 'l5', label: 'Auezovsky', value: 'Auezovsky' },
    { id: 'l6', label: 'Zhetysusky', value: 'Zhetysusky' },
    { id: 'l7', label: 'Nauryzbay', value: 'Nauryzbay' },
    { id: 'l8', label: 'Alatau', value: 'Alatau' },
  ],
};

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  id: `d${i + 1}`,
  label: `${i + 1}`,
  value: `${i + 1}`,
}));
const MONTHS = [
  { id: 'm0', label: 'Jan', value: '0' },
  { id: 'm1', label: 'Feb', value: '1' },
  { id: 'm2', label: 'Mar', value: '2' },
  { id: 'm3', label: 'Apr', value: '3' },
  { id: 'm4', label: 'May', value: '4' },
  { id: 'm5', label: 'Jun', value: '5' },
  { id: 'm6', label: 'Jul', value: '6' },
  { id: 'm7', label: 'Aug', value: '7' },
  { id: 'm8', label: 'Sep', value: '8' },
  { id: 'm9', label: 'Oct', value: '9' },
  { id: 'm10', label: 'Nov', value: '10' },
  { id: 'm11', label: 'Dec', value: '11' },
];

export default function HeroSection({
  searchPlaceholder = 'Event Search...',
  searchValue = '',
  onSearchChange,
  onSearchClear,
  onApplyFilters,
  activeFilters,
  compact = false,
  containerStyle,
  autoApply = false,
  showApplyButton = true,
  onFocus,
  autoFocus = false,
}: HeroSectionProps) {
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.isDark);
  const styles = createStyles(themeColors);
  const { user } = useUserStore();
  const userAge = useMemo(() => calculateUserAge(user.birthDate), [user.birthDate]);

  const [internalFilters, setInternalFilters] = useState<Record<string, string>>(
    activeFilters || {}
  );
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dropdownRef = useRef<View>(null);

  useEffect(() => {
    if (activeFilters) setInternalFilters(activeFilters);
  }, [activeFilters]);

  // Handle Escape key and lock body scroll on web
  useEffect(() => {
    if (!isModalVisible || Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    // Block background scroll: wheel + touchmove on the overlay
    const blockScroll = (e: Event) => {
      // Allow scroll inside the dropdown content (FlatList)
      const target = e.target as HTMLElement;
      const dropdownNode = (dropdownRef.current as any)?._nativeTag ?? (dropdownRef.current as unknown as HTMLElement);
      if (dropdownNode && dropdownNode.contains && dropdownNode.contains(target)) {
        return; // Allow scroll inside dropdown
      }
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('wheel', blockScroll, { passive: false });
    document.addEventListener('touchmove', blockScroll, { passive: false });
    // Also lock overflow on body and html
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', blockScroll);
      document.removeEventListener('touchmove', blockScroll);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isModalVisible]);

  const openModal = (filterId: string) => {
    setActiveFilterId(filterId);
    setIsModalVisible(true);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.95);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 9,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      setIsModalVisible(false);
      setActiveFilterId(null);
    });
  };

  const handleOptionSelect = (key: string, value: string) => {
    const nextFilters = { ...internalFilters, [key]: value };
    setInternalFilters(nextFilters);
    if (!key.startsWith('date_')) {
      closeModal();
      if (autoApply) onApplyFilters?.(nextFilters);
    }
  };

  const isFilterActive = (filterId: string) => {
    if (filterId === 'date')
      return !!(internalFilters.date_day || internalFilters.date_month);
    return !!internalFilters[filterId];
  };

  const getDisplayLabel = (filter: FilterItem) => {
    if (filter.id === 'date') {
      const { date_day, date_month } = internalFilters;
      if (!date_day && !date_month) return 'Date';
      const mLabel = MONTHS.find(m => m.value === date_month)?.label || '';
      return `${date_day || ''} ${mLabel}`.trim();
    }
    const val = internalFilters[filter.id];
    if (!val) return filter.label;
    return (
      FILTER_OPTIONS[filter.id]?.find(opt => opt.value === val)?.label || filter.label
    );
  };

  const resetDate = () => {
    const next = { ...internalFilters };
    delete next.date_day;
    delete next.date_month;
    setInternalFilters(next);
    if (autoApply) onApplyFilters?.(next);
  };

  return (
    <>
      <View
        style={[styles.container, compact && styles.containerCompact, containerStyle]}
      >
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={themeColors.mutedForeground}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor={themeColors.mutedForeground}
            value={searchValue}
            onChangeText={onSearchChange}
            onFocus={onFocus}
            autoFocus={autoFocus}
          />
          {searchValue.length > 0 && (
            <TouchableOpacity onPress={onSearchClear}>
              <Ionicons
                name="close-circle"
                size={20}
                color={themeColors.mutedForeground}
              />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersWrapper}
        >
          {FILTERS_CONFIG.map(filter => {
            const isActive = isFilterActive(filter.id);
            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterChip, isActive && styles.activeFilterChip]}
                onPress={() => openModal(filter.id)}
              >
                <Ionicons
                  name={filter.icon}
                  size={16}
                  color={isActive ? '#fff' : themeColors.foreground}
                />
                <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                  {getDisplayLabel(filter)}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={isActive ? '#fff' : themeColors.mutedForeground}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {showApplyButton && (
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => onApplyFilters?.(internalFilters)}
          >
            <Text style={styles.applyButtonText}>Apply filters</Text>
            <Ionicons name="funnel-outline" size={18} color={themeColors.background} />
          </TouchableOpacity>
        )}
      </View>

      {isModalVisible && (
        <View
          style={styles.modalRoot}
          accessible={false}
          importantForAccessibility="yes"
          accessibilityElementsHidden={false}
        >
          <TouchableWithoutFeedback onPress={closeModal}>
            <View
              style={styles.modalOverlay}
              accessible={false}
            />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.dropdownAnimatedContainer,
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
              activeFilterId === 'date' && styles.dateDropdown
            ]}
          >
            <View
              ref={dropdownRef}
              style={[
                styles.dropdownContainer,
                activeFilterId === 'date' && styles.dateDropdown,
                {
                  backgroundColor: isDark ? 'rgba(30, 30, 30, 0.65)' : 'rgba(255, 255, 255, 0.75)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                  borderWidth: 1,
                  shadowColor: isDark ? '#000' : '#888',
                }
              ]}
            >
              <View style={styles.dropdownHeader}>
                <View>
                  <Text style={styles.dropdownTitle}>
                    {activeFilterId === 'date'
                      ? 'Select date'
                      : FILTERS_CONFIG.find(f => f.id === activeFilterId)?.label}
                  </Text>
                  <Text style={styles.dropdownSubtitle}>Customize your search options</Text>
                </View>
                {activeFilterId === 'date' && (
                  <TouchableOpacity onPress={resetDate} style={styles.resetButton}>
                    <Text style={styles.resetText}>Reset</Text>
                  </TouchableOpacity>
                )}
              </View>

              {activeFilterId === 'date' ? (
                <View style={styles.datePickerBody}>
                  {[
                    { label: 'Day', key: 'date_day', data: DAYS },
                    { label: 'Month', key: 'date_month', data: MONTHS },
                  ].map(col => (
                    <View key={col.key} style={styles.dateCol}>
                      <Text style={styles.dateColLabel}>{col.label}</Text>
                      <FlatList
                        data={col.data}
                        keyExtractor={item => item.id}
                        showsVerticalScrollIndicator={true}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            onPress={() => handleOptionSelect(col.key, item.value)}
                            style={[
                              styles.dateOpt,
                              internalFilters[col.key] === item.value &&
                              styles.dateOptActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dateOptText,
                                internalFilters[col.key] === item.value &&
                                styles.dateOptTextActive,
                              ]}
                            >
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <FlatList
                  data={FILTER_OPTIONS[activeFilterId!] || []}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.optionsList}
                  showsVerticalScrollIndicator={true}
                  renderItem={({ item }) => {
                    const isSelected = internalFilters[activeFilterId!] === item.value;
                    const isDisabled =
                      activeFilterId === 'age' && parseInt(item.value) > userAge;
                    return (
                      <TouchableOpacity
                        disabled={isDisabled}
                        style={[
                          styles.optionItem,
                          isSelected && styles.optionItemActive,
                          isDisabled && { opacity: 0.3 },
                        ]}
                        onPress={() => handleOptionSelect(activeFilterId!, item.value)}
                      >
                        <View style={styles.optionContent}>
                          <View
                            style={[
                              styles.optionIconContainer,
                              isSelected && styles.optionIconContainerActive,
                            ]}
                          >
                            <Ionicons
                              name={item.icon || 'radio-button-off'}
                              size={18}
                              color={
                                isSelected
                                  ? themeColors.primary
                                  : themeColors.mutedForeground
                              }
                            />
                          </View>
                          <View>
                            <Text
                              style={[
                                styles.optionText,
                                isSelected && styles.optionTextActive,
                              ]}
                            >
                              {item.label}
                            </Text>
                          </View>
                        </View>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={themeColors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              )}

              {activeFilterId === 'date' && (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => {
                    onApplyFilters?.(internalFilters);
                    closeModal();
                  }}
                >
                  <Text style={styles.confirmButtonText}>Ready</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>
      )}
    </>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: tc.background,
  },
  containerCompact: { paddingTop: spacing.md },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tc.card,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    height: 54,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: tc.border,
    boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.base,
    color: tc.foreground,
    fontWeight: '500',
  },
  filtersWrapper: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1.2,
    borderColor: tc.border,
    backgroundColor: tc.background,
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  activeFilterChip: {
    borderColor: tc.primary,
    backgroundColor: tc.primary,
    boxShadow: `0px 4px 8px rgba(0, 0, 0, 0.2)`,
    elevation: 3,
  },
  filterText: {
    fontSize: 13,
    color: tc.foreground,
    fontWeight: '600',
  },
  activeFilterText: {
    color: colors.white,
    fontWeight: '700',
  },
  applyButton: {
    backgroundColor: tc.foreground,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  applyButtonText: {
    color: tc.background,
    fontSize: typography.base,
    fontWeight: '800',
  },
  modalRoot: {
    ...Platform.select({
      web: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        overscrollBehavior: 'none',
      },
      default: {
        ...StyleSheet.absoluteFillObject,
      },
    }),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      },
    }),
  },
  dropdownAnimatedContainer: {
    zIndex: 1,
  },
  dropdownContainer: {
    width: SCREEN_WIDTH * 0.8,
    borderRadius: 24,
    paddingVertical: spacing.lg,
    height: 440,
    elevation: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }
    }),
  },
  dateDropdown: {},
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  dropdownTitle: {
    fontSize: typography.xl,
    fontWeight: '900',
    color: tc.foreground,
    marginBottom: 2,
  },
  dropdownSubtitle: {
    fontSize: 11,
    color: tc.mutedForeground,
    fontWeight: '500',
  },
  resetButton: {
    backgroundColor: `${tc.primary}10`,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  resetText: {
    color: tc.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  optionsList: { paddingHorizontal: spacing.md },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  optionItemActive: {
    backgroundColor: `${tc.primary}08`,
  },
  optionContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: tc.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconContainerActive: {
    backgroundColor: `${tc.primary}15`,
  },
  optionText: {
    fontSize: typography.base,
    color: tc.foreground,
    fontWeight: '600',
  },
  optionTextActive: {
    color: tc.primary,
    fontWeight: '800',
  },
  datePickerBody: { flexDirection: 'row', flex: 1, paddingHorizontal: spacing.lg },
  dateCol: { flex: 1 },
  dateColLabel: {
    textAlign: 'center',
    fontSize: typography.xs,
    color: tc.mutedForeground,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  dateOpt: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginBottom: 2,
  },
  dateOptActive: { backgroundColor: tc.primary },
  dateOptText: { fontSize: 15, color: tc.foreground, fontWeight: '500' },
  dateOptTextActive: { color: colors.white, fontWeight: '800' },
  confirmButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: tc.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: { color: tc.primaryForeground, fontWeight: '800', fontSize: typography.base },
});
