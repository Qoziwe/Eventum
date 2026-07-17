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
    price: 'Free',
    priceVal: 0,
    features: [
      'Without lifting',
      'No recommendations',
      'Showing only in category / map',
      'Limitation on photo, description',
      '1 accommodation/free month',
      'Without the possibility of purchasing additional slots'
    ],
    color: '#9CA3AF'
  },
  {
    id: 'tier1',
    name: 'Tier 1',
    title: 'Start',
    price: '5 000 $',
    priceVal: 5000,
    features: [
      '1 accommodation/free month + 2 slot',
      'Avatar selection (Color 1)',
      'Hitting "Popular in the city"',
      '+1 slot after limit 4To'
    ],
    color: '#60A5FA' 
  },
  {
    id: 'tier2',
    name: 'Tier 2',
    title: 'Club & Local',
    price: '12 000 $',
    priceVal: 12000,
    features: [
      '1 accommodation/free month + 3 slot',
      'Avatar selection (Color 2)',
      'Publication of the premiere',
      'Advanced Event Card',
      'Sales and audience analytics',
      '+1 slot after limit 3To'
    ],
    color: '#818CF8'
  },
  {
    id: 'tier3',
    name: 'Tier 3',
    title: 'Business',
    price: '30 000 $',
    priceVal: 30000,
    features: [
      'All from Tier 2',
      '1 accommodation/free month + 4 slot',
      'Pin in category',
      'Push / email mailings',
      'Detailed analytics',
      '+1 slot after limit 2To'
    ],
    color: colors.pink,
    popular: true
  },
  {
    id: 'tier4',
    name: 'Tier 4',
    title: 'Enterprise',
    price: '200 000 $',
    priceVal: 200000,
    features: [
      'All from Tier 3',
      'Home page',
      'Banner',
      'Separate landing page',
      'Label "Official event"',
      'Manager support'
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
      'Confirmation',
      `Go to plan ${tierName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            await updateSubscription(tierId);
            setSelectedTier(tierId);
            Alert.alert('Successfully', `You have switched to plan ${tierName}`);
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
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing["4xl"] }}>
        <Text style={styles.subtitle}>
          Choose a plan that suits the size of your events
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
                  <Text style={styles.currentBtnText}>Current plan</Text>
                </View>
              ) : (
                <View style={[styles.selectBtn, { backgroundColor: tier.color }]}>
                   <Text style={styles.selectBtnText}>Choose {tier.name}</Text>
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
