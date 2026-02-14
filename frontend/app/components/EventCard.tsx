import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
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
              <Ionicons name="time-outline" size={14} color="#92400E" />
              <Text style={styles.moderationText}>На модерации</Text>
            </View>
          </View>
        )}
        {moderationStatus === 'rejected' && (
          <View style={styles.moderationOverlayRejected}>
            <View style={styles.moderationBadgeRejected}>
              <Ionicons name="close-circle-outline" size={14} color="#991B1B" />
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
              color={colors.light.mutedForeground}
            />
            <Text style={styles.infoText}>{formattedDate}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons
              name="location-outline"
              size={14}
              color={colors.light.mutedForeground}
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.light.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.light.border,
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
  },
  ageBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  ageText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.light.primary,
    textTransform: 'uppercase',
  },
  content: { padding: spacing.md },
  title: { fontSize: 16, fontWeight: '700', height: 44, marginBottom: 8 },
  info: { gap: 4, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: colors.light.mutedForeground },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceTag: {
    backgroundColor: colors.light.foreground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.lg,
  },
  freePriceTag: { backgroundColor: colors.light.primary },
  priceText: { color: colors.light.background, fontWeight: '700', fontSize: 12 },
  freePriceText: { color: '#fff' },
  statsText: { fontSize: 11, color: colors.light.mutedForeground },
  moderationOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(251, 191, 36, 0.95)',
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moderationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moderationText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
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
  },
  moderationBadgeRejected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moderationTextRejected: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
