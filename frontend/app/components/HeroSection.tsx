import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
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
  Музыка: 'musical-notes-outline',
  Спорт: 'fitness-outline',
  Кино: 'videocam-outline',
  Еда: 'restaurant-outline',
  Технологии: 'hardware-chip-outline',
  Искусство: 'color-palette-outline',
  Образование: 'school-outline',
  Бизнес: 'briefcase-outline',
  Путешествия: 'airplane-outline',
  'Ночная жизнь': 'wine-outline',
  Игры: 'game-controller-outline',
  Театр: 'film-outline',
  'Активный отдых': 'bicycle-outline',
  Выставки: 'images-outline',
};

const FILTERS_CONFIG: FilterItem[] = [
  { id: 'sort', label: 'Сортировка', icon: 'options-outline' },
  { id: 'date', label: 'Дата', icon: 'calendar-outline' },
  { id: 'category', label: 'Категория', icon: 'apps-outline' },
  { id: 'price', label: 'Цена', icon: 'card-outline' },
  { id: 'vibe', label: 'Вайб', icon: 'sparkles-outline' },
  { id: 'age', label: 'Возраст', icon: 'people-outline' },
  { id: 'district', label: 'Район', icon: 'map-outline' },
];

const FILTER_OPTIONS: Record<string, FilterOption[]> = {
  sort: [
    { id: 's1', label: 'Популярное', value: 'popular', icon: 'flame-outline' },
    { id: 's2', label: 'Ближайшие', value: 'soon', icon: 'time-outline' },
  ],
  category: ALL_INTERESTS.map((interest, index) => ({
    id: `cat-${index}`,
    label: interest,
    value: interest.toLowerCase(),
    icon: CATEGORY_ICONS[interest] || 'bookmark-outline',
  })),
  price: [
    { id: 'p1', label: 'Бесплатно', value: 'free', icon: 'gift-outline' },
    { id: 'p2', label: 'до 5 000₸', value: 'low', icon: 'wallet-outline' },
    { id: 'p3', label: '5 000₸ - 15 000₸', value: 'medium', icon: 'cash-outline' },
    { id: 'p4', label: 'от 15 000₸', value: 'high', icon: 'diamond-outline' },
  ],
  vibe: [
    { id: 'v1', label: 'Активный', value: 'active', icon: 'flash-outline' },
    { id: 'v2', label: 'Спокойный', value: 'chill', icon: 'leaf-outline' },
    { id: 'v3', label: 'Семейный', value: 'family', icon: 'people-outline' },
    { id: 'v4', label: 'Романтичный', value: 'heart-outline' },
    { id: 'v5', label: 'Вечеринка', value: 'wine-outline' },
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
    { id: 'l1', label: 'Алмалинский', value: 'Алмалинский' },
    { id: 'l2', label: 'Медеуский', value: 'Медеуский' },
    { id: 'l3', label: 'Бостандыкский', value: 'Бостандыкский' },
    { id: 'l4', label: 'Турксибский', value: 'Турксибский' },
    { id: 'l5', label: 'Ауэзовский', value: 'Ауэзовский' },
    { id: 'l6', label: 'Жетысуский', value: 'Жетысуский' },
    { id: 'l7', label: 'Наурызбайский', value: 'Наурызбайский' },
    { id: 'l8', label: 'Алатауский', value: 'Алатауский' },
  ],
};

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  id: `d${i + 1}`,
  label: `${i + 1}`,
  value: `${i + 1}`,
}));
const MONTHS = [
  { id: 'm0', label: 'Янв', value: '0' },
  { id: 'm1', label: 'Фев', value: '1' },
  { id: 'm2', label: 'Мар', value: '2' },
  { id: 'm3', label: 'Апр', value: '3' },
  { id: 'm4', label: 'Май', value: '4' },
  { id: 'm5', label: 'Июн', value: '5' },
  { id: 'm6', label: 'Июл', value: '6' },
  { id: 'm7', label: 'Авг', value: '7' },
  { id: 'm8', label: 'Сен', value: '8' },
  { id: 'm9', label: 'Окт', value: '9' },
  { id: 'm10', label: 'Ноя', value: '10' },
  { id: 'm11', label: 'Дек', value: '11' },
];

export default function HeroSection({
  searchPlaceholder = 'Поиск событий...',
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
  const { user } = useUserStore();
  const userAge = useMemo(() => calculateUserAge(user.birthDate), [user.birthDate]);

  const [internalFilters, setInternalFilters] = useState<Record<string, string>>(
    activeFilters || {}
  );
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (activeFilters) setInternalFilters(activeFilters);
  }, [activeFilters]);

  const openModal = (filterId: string) => {
    setActiveFilterId(filterId);
    setIsModalVisible(true);
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
      if (!date_day && !date_month) return 'Дата';
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
            color={colors.light.mutedForeground}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.light.mutedForeground}
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
                color={colors.light.mutedForeground}
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
                  color={isActive ? '#fff' : colors.light.foreground}
                />
                <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                  {getDisplayLabel(filter)}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={isActive ? '#fff' : colors.light.mutedForeground}
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
            <Text style={styles.applyButtonText}>Применить фильтры</Text>
            <Ionicons name="funnel-outline" size={18} color={colors.light.background} />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
        accessibilityViewIsModal={true}
        presentationStyle="overFullScreen"
      >
        <View
          style={styles.modalRoot}
          accessible={false}
          importantForAccessibility="yes"
          accessibilityElementsHidden={false}
        >
          <TouchableWithoutFeedback onPress={closeModal}>
            <Animated.View
              style={[styles.modalOverlay, { opacity: fadeAnim }]}
              accessible={false}
            />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.dropdownContainer,
              activeFilterId === 'date' && styles.dateDropdown,
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <View style={styles.dropdownHeader}>
              <View>
                <Text style={styles.dropdownTitle}>
                  {activeFilterId === 'date'
                    ? 'Выберите дату'
                    : FILTERS_CONFIG.find(f => f.id === activeFilterId)?.label}
                </Text>
                <Text style={styles.dropdownSubtitle}>Настройте параметры поиска</Text>
              </View>
              {activeFilterId === 'date' && (
                <TouchableOpacity onPress={resetDate} style={styles.resetButton}>
                  <Text style={styles.resetText}>Сброс</Text>
                </TouchableOpacity>
              )}
            </View>

            {activeFilterId === 'date' ? (
              <View style={styles.datePickerBody}>
                {[
                  { label: 'День', key: 'date_day', data: DAYS },
                  { label: 'Месяц', key: 'date_month', data: MONTHS },
                ].map(col => (
                  <View key={col.key} style={styles.dateCol}>
                    <Text style={styles.dateColLabel}>{col.label}</Text>
                    <FlatList
                      data={col.data}
                      keyExtractor={item => item.id}
                      showsVerticalScrollIndicator={false}
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
                showsVerticalScrollIndicator={false}
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
                                ? colors.light.primary
                                : colors.light.mutedForeground
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
                          color={colors.light.primary}
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
                <Text style={styles.confirmButtonText}>Подтвердить</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: colors.light.background,
  },
  containerCompact: { paddingTop: spacing.md },
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
  filtersWrapper: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1.2,
    borderColor: colors.light.border,
    backgroundColor: colors.light.background,
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  activeFilterChip: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primary,
    boxShadow: `0px 4px 8px rgba(0, 0, 0, 0.2)`,
    elevation: 3,
  },
  filterText: {
    fontSize: 13,
    color: colors.light.foreground,
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '700',
  },
  applyButton: {
    backgroundColor: colors.light.foreground,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  applyButtonText: {
    color: colors.light.background,
    fontSize: typography.base,
    fontWeight: '800',
  },
  modalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  dropdownContainer: {
    width: SCREEN_WIDTH * 0.8,
    backgroundColor: colors.light.background,
    borderRadius: 20,
    paddingVertical: spacing.lg,
    maxHeight: '70%',
    elevation: 10,
    boxShadow: '0px 8px 15px rgba(0, 0, 0, 0.2)',
  },
  dateDropdown: { height: 440 },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.light.foreground,
    marginBottom: 2,
  },
  dropdownSubtitle: {
    fontSize: 11,
    color: colors.light.mutedForeground,
    fontWeight: '500',
  },
  resetButton: {
    backgroundColor: `${colors.light.primary}10`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  resetText: {
    color: colors.light.primary,
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
    marginBottom: 4,
  },
  optionItemActive: {
    backgroundColor: `${colors.light.primary}08`,
  },
  optionContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.light.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconContainerActive: {
    backgroundColor: `${colors.light.primary}15`,
  },
  optionText: {
    fontSize: 14,
    color: colors.light.foreground,
    fontWeight: '600',
  },
  optionTextActive: {
    color: colors.light.primary,
    fontWeight: '800',
  },
  datePickerBody: { flexDirection: 'row', flex: 1, paddingHorizontal: spacing.lg },
  dateCol: { flex: 1 },
  dateColLabel: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.light.mutedForeground,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  dateOpt: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 2,
  },
  dateOptActive: { backgroundColor: colors.light.primary },
  dateOptText: { fontSize: 15, color: colors.light.foreground, fontWeight: '500' },
  dateOptTextActive: { color: '#fff', fontWeight: '800' },
  confirmButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.light.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
