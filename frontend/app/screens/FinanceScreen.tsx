import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../theme/colors';
import { useThemeColors } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { format } from 'date-fns';

export default function FinanceScreen() {
  const themeColors = useThemeColors();
  const styles = createStyles(themeColors);
  const navigation = useNavigation();
  const { organizerStats, fetchOrganizerStats, transactions, fetchTransactions } = useUserStore();

  useFocusEffect(
    React.useCallback(() => {
      fetchOrganizerStats();
      fetchTransactions();
    }, [])
  );

  const renderTransaction = ({ item }: { item: any }) => (
    <View style={styles.transactionCard}>
      <View>
        <Text style={styles.tTitle}>{item.eventTitle}</Text>
        <Text style={styles.tSub}>{item.buyerName} • {item.quantity} шт.</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.tAmount}>+{item.totalAmount} ₸</Text>
        <Text style={styles.tDate}>{format(new Date(item.date), 'dd.MM HH:mm')}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Финансы</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.balanceContainer}>
        <Text style={{ fontSize: typography.sm, color: themeColors.mutedForeground }}>
          Доступно к выводу
        </Text>
        <Text style={{ fontSize: 32, fontWeight: '800', marginVertical: 8 }}>
          {organizerStats.totalRevenue.toLocaleString()} ₸
        </Text>
        <TouchableOpacity style={styles.btn}>
          <Text style={{ color: colors.white, fontWeight: '700' }}>Вывести средства</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>История транзакций</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={{ padding: spacing.lg }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: themeColors.mutedForeground, marginTop: spacing.xl }}>
            Транзакций пока нет
          </Text>
        }
      />
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
  balanceContainer: {
    padding: spacing["2xl"],
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
  },
  btn: {
    backgroundColor: tc.foreground,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: { fontSize: typography.xl, fontWeight: '600' },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: tc.border,
  },
  tTitle: { fontWeight: '600', fontSize: typography.base, marginBottom: spacing.xs },
  tSub: { color: tc.mutedForeground, fontSize: typography.sm },
  tAmount: { fontWeight: '700', color: colors.success },
  tDate: { color: tc.mutedForeground, fontSize: typography.xs },
});
