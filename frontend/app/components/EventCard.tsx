import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';
import EventPlaceholder from '../assets/placeholder.jpg';

export interface EventItem {
  id: string;
  title: string;
  date: string;
  location: string;
  price: string | number;
  priceValue?: number;
  image: any;
  categories: string[];
  views?: number;
  ageLimit?: number;
  timestamp?: number;
  moderationStatus?: 'pending' | 'approved' | 'rejected';
}

interface EventCardProps extends EventItem {
  onPress?: () => void;
  style?: ViewStyle;
}

const formatRussianDate = (dateString: string) => {
  if (!dateString) return '';
  try {
    const monthsEN = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const monthsRU = [
      'янв',
      'фев',
      'мар',
      'апр',
      'мая',
      'июн',
      'июл',
      'авг',
      'сен',
      'окт',
      'ноя',
      'дек',
    ];
    let formattedDate = dateString;
    monthsEN.forEach((monthEN, index) => {
      formattedDate = formattedDate.replace(monthEN, monthsRU[index]);
    });
    return formattedDate;
  } catch (error) {
    return dateString;
  }
};

const formatPrice = (price: string | number | undefined, priceValue?: number) => {
  if (priceValue === 0 || priceValue === undefined) {
    if (
      typeof price === 'string' &&
      (price.toLowerCase().includes('бесплат') || price === '0' || price === '0 ₸')
    ) {
      return 'Бесплатно';
    }
    return 'Бесплатно';
  }
  if (typeof price === 'string' && price.trim() !== '') return price;
  if (typeof priceValue === 'number') return `${priceValue} ₸`;
  return 'Бесплатно';
};

export default function EventCard({
  title,
  date,
  location,
  views,
  price,
  priceValue,
  image,
  onPress,
  style,
  categories,
  ageLimit,
  moderationStatus,
}: EventCardProps) {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const [imageError, setImageError] = useState(false);
  const source =
    imageError || !image || image === ''
      ? EventPlaceholder
      : typeof image === 'string'
        ? { uri: image }
        : image;

  const formattedDate = formatRussianDate(date);
  const formattedPrice = formatPrice(price, priceValue);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image
          source={source}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
        <View style={styles.badgeContainer}>
          {ageLimit !== undefined && ageLimit > 0 && (
            <View style={styles.ageBadge}>
              <Text style={styles.ageText}>{ageLimit}+</Text>
            </View>
          )}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {categories && categories.length > 0 ? categories[0] : 'Мероприятие'}
            </Text>
          </View>
        </View>
        {moderationStatus === 'pending' && (
          <View style={styles.moderationOverlay}>
            <View style={styles.moderationBadge}>
              <Ionicons name="time-outline" size={14} color={colors.warningText} />
              <Text style={styles.moderationText}>На модерации</Text>
            </View>
          </View>
        )}
        {moderationStatus === 'rejected' && (
          <View style={styles.moderationOverlayRejected}>
            <View style={styles.moderationBadgeRejected}>
              <Ionicons name="close-circle-outline" size={14} color={colors.errorText} />
              <Text style={styles.moderationTextRejected}>Отклонено</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.info}>
          <View style={styles.row}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={themeColors.mutedForeground}
            />
            <Text style={styles.infoText}>{formattedDate}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons
              name="location-outline"
              size={14}
              color={themeColors.mutedForeground}
            />
            <Text style={styles.infoText} numberOfLines={1}>
              {location}
            </Text>
          </View>
        </View>
        <View style={styles.footer}>
          <View
            style={[
              styles.priceTag,
              formattedPrice === 'Бесплатно' && styles.freePriceTag,
            ]}
          >
            <Text
              style={[
                styles.priceText,
                formattedPrice === 'Бесплатно' && styles.freePriceText,
              ]}
            >
              {formattedPrice}
            </Text>
          </View>
          {views !== undefined && (
            <Text style={styles.statsText}>{views} просмотров</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  container: {
    backgroundColor: tc.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tc.border,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  imageContainer: { height: 180 },
  image: { width: '100%', height: '100%' },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
  },
  ageBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 32,
    alignItems: 'center',
  },
  ageText: { fontSize: typography.xs, fontWeight: '900', color: colors.white },
  categoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: typography.xs,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  content: { padding: spacing.md },
  title: { fontSize: typography.lg, fontWeight: '700', height: 44, marginBottom: spacing.sm, color: tc.foreground },
  info: { gap: spacing.xs, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: tc.mutedForeground },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceTag: {
    backgroundColor: tc.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.lg,
  },
  freePriceTag: { backgroundColor: colors.successLight },
  priceText: { color: tc.foreground, fontWeight: '700', fontSize: typography.sm },
  freePriceText: { color: colors.successText },
  statsText: { fontSize: 11, color: tc.mutedForeground },
  moderationOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(251, 191, 36, 0.95)',
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  moderationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  moderationText: {
    fontSize: typography.sm,
    fontWeight: '800',
    color: colors.warningText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moderationOverlayRejected: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  moderationBadgeRejected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  moderationTextRejected: {
    fontSize: typography.sm,
    fontWeight: '800',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
