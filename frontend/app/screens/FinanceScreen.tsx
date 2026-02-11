import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, borderRadius } from '../theme/colors';
import { useUserStore } from '../store/userStore';
import { format } from 'date-fns';

export default function FinanceScreen() {
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
          <Ionicons name="arrow-back" size={24} color={colors.light.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Финансы</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.balanceContainer}>
        <Text style={{ fontSize: 12, color: colors.light.mutedForeground }}>
          Доступно к выводу
        </Text>
        <Text style={{ fontSize: 32, fontWeight: '800', marginVertical: 8 }}>
          {organizerStats.totalRevenue.toLocaleString()} ₸
        </Text>
        <TouchableOpacity style={styles.btn}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Вывести средства</Text>
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
          <Text style={{ textAlign: 'center', color: colors.light.mutedForeground, marginTop: 20 }}>
            Транзакций пока нет
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  balanceContainer: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  btn: {
    backgroundColor: colors.light.foreground,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: borderRadius.lg,
    marginTop: 20,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  tTitle: { fontWeight: '600', fontSize: 14, marginBottom: 4 },
  tSub: { color: colors.light.mutedForeground, fontSize: 12 },
  tAmount: { fontWeight: '700', color: '#22C55E' },
  tDate: { color: colors.light.mutedForeground, fontSize: 10 },
});
