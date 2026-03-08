import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';
import { useUserStore } from '../store/userStore';

const TIERS = [
  {
    id: 'tier0',
    name: 'Tier 0',
    title: 'Entry Point',
    price: 'Бесплатно',
    priceVal: 0,
    features: [
      'Без поднятия',
      'Без рекомендаций',
      'Показ только в категории / карте',
      'Ограничение по фото, описанию',
      '1 размещение/мес бесплатно',
      'Без возможности докупки слотов'
    ],
    color: '#9CA3AF'
  },
  {
    id: 'tier1',
    name: 'Tier 1',
    title: 'Start',
    price: '5 000 ₸',
    priceVal: 5000,
    features: [
      '1 размещение/мес бесплатно + 2 слота',
      'Выделение аватарки (Color 1)',
      'Попадание в "Популярное в городе"',
      '+1 слот после лимита 4к'
    ],
    color: '#60A5FA' 
  },
  {
    id: 'tier2',
    name: 'Tier 2',
    title: 'Club & Local',
    price: '12 000 ₸',
    priceVal: 12000,
    features: [
      '1 размещение/мес бесплатно + 3 слота',
      'Выделение аватарки (Color 2)',
      'Публикация премьеры',
      'Продвинутая карточка ивента',
      'Аналитика продаж и аудитории',
      '+1 слот после лимита 3к'
    ],
    color: '#818CF8'
  },
  {
    id: 'tier3',
    name: 'Tier 3',
    title: 'Business',
    price: '30 000 ₸',
    priceVal: 30000,
    features: [
      'Всё из Tier 2',
      '1 размещение/мес бесплатно + 4 слота',
      'Закрепление в категории',
      'Push / email рассылки',
      'Подробная аналитика',
      '+1 слот после лимита 2к'
    ],
    color: colors.pink,
    popular: true
  },
  {
    id: 'tier4',
    name: 'Tier 4',
    title: 'Enterprise',
    price: '200 000 ₸',
    priceVal: 200000,
    features: [
      'Всё из Tier 3',
      'Главная страница',
      'Баннер',
      'Отдельный лендинг',
      'Лейбл "Официальное мероприятие"',
      'Поддержка менеджера'
    ],
    color: '#FBBF24'
  }
];

export default function SubscriptionScreen() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const navigation = useNavigation();
  const { user, updateSubscription } = useUserStore();
  const [selectedTier, setSelectedTier] = useState<string>(user.subscriptionStatus || 'tier0');

  const handleSubscribe = (tierId: string, tierName: string) => {
    Alert.alert(
      'Подтверждение',
      `Перейти на план ${tierName}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Подтвердить', 
          onPress: async () => {
            await updateSubscription(tierId);
            setSelectedTier(tierId);
            Alert.alert('Успешно', `Вы перешли на план ${tierName}`);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Планы подписки</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing["4xl"] }}>
        <Text style={styles.subtitle}>
          Выберите план, который подходит для масштаба ваших мероприятий
        </Text>

        {TIERS.map((tier) => {
          const isCurrent = user.subscriptionStatus === tier.id || (tier.id === 'tier0' && user.subscriptionStatus === 'none');
          const isReferenced = selectedTier === tier.id;

          return (
            <TouchableOpacity 
              key={tier.id} 
              style={[
                styles.card, 
                { borderColor: isCurrent ? themeColors.primary : themeColors.border },
                isCurrent && { borderWidth: 2 }
              ]}
              onPress={() => handleSubscribe(tier.id, tier.title)}
              activeOpacity={0.9}
            >
              {tier.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>POPULAR</Text>
                </View>
              )}
              
              <View style={[styles.cardHeader, { backgroundColor: tier.color + '20' }]}>
                <View>
                  <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
                  <Text style={styles.tierTitle}>{tier.title}</Text>
                </View>
                <Text style={styles.price}>{tier.price}</Text>
              </View>

              <View style={styles.featuresList}>
                {tier.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={themeColors.primary} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {isCurrent ? (
                <View style={styles.currentBtn}>
                  <Text style={styles.currentBtnText}>Текущий план</Text>
                </View>
              ) : (
                <View style={[styles.selectBtn, { backgroundColor: tier.color }]}>
                   <Text style={styles.selectBtnText}>Выбрать {tier.name}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (tc: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: tc.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
  },
  headerTitle: { fontSize: typography.xl, fontWeight: '700' },
  subtitle: {
    fontSize: typography.base,
    color: tc.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20
  },
  card: {
    backgroundColor: tc.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: tc.border,
    marginBottom: spacing.xl,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierName: { fontSize: typography.sm, fontWeight: '800', textTransform: 'uppercase' },
  tierTitle: { fontSize: typography["2xl"], fontWeight: '700', marginTop: 2 },
  price: { fontSize: typography.xl, fontWeight: '700' },
  featuresList: { padding: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
  featureText: { fontSize: 13, color: tc.foreground, flex: 1 },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.pink,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomLeftRadius: borderRadius.md,
    zIndex: 10
  },
  popularText: { color: colors.white, fontSize: typography.xs, fontWeight: '800' },
  currentBtn: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: tc.secondary,
    borderRadius: borderRadius.md,
    alignItems: 'center'
  },
  currentBtnText: { fontWeight: '700', color: tc.mutedForeground },
  selectBtn: {
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center'
  },
  selectBtnText: { color: colors.white, fontWeight: '700' }
});
